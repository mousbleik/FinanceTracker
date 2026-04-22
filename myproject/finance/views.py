import csv
from datetime import date, datetime, timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.models import User, Group
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.core.mail import EmailMessage
from django.conf import settings as dj_settings

from django.utils import timezone

from rest_framework.decorators import action

from .models import (
    Currency, FxRate, Account, Category, Vendor, Customer,
    Order, Expense, Asset, Liability, Payment, ImportBatch,
    Task, TaskComment, AuditLog, Notification,
)
from .audit import log as audit_log
from .notifications import notify, admin_users
from .serializers import (
    CurrencySerializer, FxRateSerializer, AccountSerializer,
    CategorySerializer, VendorSerializer, CustomerSerializer,
    OrderSerializer, ExpenseSerializer, AssetSerializer,
    LiabilitySerializer, PaymentSerializer, ImportBatchSerializer,
    LoginSerializer, UserSerializer, CreateUserSerializer,
    TaskSerializer, TaskCommentSerializer, BroadcastEmailSerializer,
    AuditLogSerializer, NotificationSerializer,
)
from .permissions import (
    AdminOrStandardReadWrite, IsAdmin, is_admin, ADMIN_GROUP, STANDARD_GROUP,
)
from . import reports, importers


def _actor_name(user):
    if user is None or not getattr(user, 'is_authenticated', False):
        return 'Someone'
    return user.get_full_name() or user.username


# ---- Auth ----

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        username = s.validated_data['username']
        user = authenticate(username=username, password=s.validated_data['password'])
        if user is None or not user.is_active:
            AuditLog.objects.create(
                username=username, action=AuditLog.LOGIN_FAILED,
                description='Invalid credentials',
                ip=request.META.get('REMOTE_ADDR'),
            )
            return Response({'detail': 'Invalid credentials'}, status=401)
        token, _ = Token.objects.get_or_create(user=user)
        audit_log(AuditLog.LOGIN_SUCCESS, user=user, request=request)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    def post(self, request):
        audit_log(AuditLog.LOGOUT, user=request.user, request=request)
        Token.objects.filter(user=request.user).delete()
        return Response(status=204)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ---- Users (admin-only) ----

class UserViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    def list(self, request):
        users = User.objects.all().order_by('username')
        return Response(UserSerializer(users, many=True).data)

    def create(self, request):
        s = CreateUserSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        return Response(UserSerializer(user).data)

    def partial_update(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        role = request.data.get('role')
        password = request.data.get('password')
        is_active = request.data.get('is_active')
        if role in (ADMIN_GROUP, STANDARD_GROUP):
            user.groups.clear()
            group, _ = Group.objects.get_or_create(name=role)
            user.groups.add(group)
        if password:
            user.set_password(password)
        if is_active is not None:
            user.is_active = bool(is_active)
        user.save()
        return Response(UserSerializer(user).data)

    def destroy(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            return Response({'detail': "You can't delete your own account."}, status=400)
        user.delete()
        return Response(status=204)


# ---- Generic CRUD viewsets ----

class AuditedModelViewSet(viewsets.ModelViewSet):
    """ModelViewSet that records create/update/delete to AuditLog."""

    def perform_create(self, serializer):
        instance = serializer.save()
        audit_log(
            AuditLog.CREATE, user=self.request.user, request=self.request,
            target=instance, description=f'Created {instance.__class__.__name__}',
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        audit_log(
            AuditLog.UPDATE, user=self.request.user, request=self.request,
            target=instance, description=f'Updated {instance.__class__.__name__}',
        )

    def perform_destroy(self, instance):
        target_type = instance.__class__.__name__
        target_id = instance.pk
        instance.delete()
        audit_log(
            AuditLog.DELETE, user=self.request.user, request=self.request,
            target_type=target_type, target_id=target_id,
            description=f'Deleted {target_type}#{target_id}',
        )


class BaseFinanceViewSet(AuditedModelViewSet):
    permission_classes = [AdminOrStandardReadWrite]


class CurrencyViewSet(BaseFinanceViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer


class FxRateViewSet(viewsets.ModelViewSet):
    queryset = FxRate.objects.select_related('currency').all()
    serializer_class = FxRateSerializer

    def get_permissions(self):
        # FX rate writes are admin-only; reads are open to authenticated.
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]


class AccountViewSet(BaseFinanceViewSet):
    queryset = Account.objects.select_related('currency').all()
    serializer_class = AccountSerializer


class CategoryViewSet(BaseFinanceViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class VendorViewSet(BaseFinanceViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        notify(
            admin_users(exclude_user=self.request.user),
            Notification.VENDOR_CREATED,
            title=f'New vendor: {instance.name}',
            body=f'Added by {_actor_name(self.request.user)}.',
            target=instance, url=f'/vendors', actor=self.request.user,
        )


class CustomerViewSet(BaseFinanceViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        notify(
            admin_users(exclude_user=self.request.user),
            Notification.CUSTOMER_CREATED,
            title=f'New customer: {instance.code or instance.name}',
            body=f'{instance.name} added by {_actor_name(self.request.user)}.',
            target=instance, url=f'/customers', actor=self.request.user,
        )


class OrderViewSet(BaseFinanceViewSet):
    queryset = Order.objects.select_related('customer', 'currency').prefetch_related('items').all()
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        if p.get('from'):
            qs = qs.filter(placed_at__gte=p['from'])
        if p.get('to'):
            qs = qs.filter(placed_at__lte=p['to'])
        if p.get('source'):
            qs = qs.filter(source=p['source'])
        if p.get('q'):
            qs = qs.filter(external_id__icontains=p['q'])
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        who = instance.customer.name if instance.customer_id else '(guest)'
        notify(
            admin_users(exclude_user=self.request.user),
            Notification.ORDER_CREATED,
            title=f'New order {instance.total} {instance.currency.code}',
            body=f'{who} — added by {_actor_name(self.request.user)}.',
            target=instance, url=f'/orders', actor=self.request.user,
        )


class PaymentFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get('direction'):
            qs = qs.filter(direction=p['direction'])
        if p.get('from'):
            qs = qs.filter(date__gte=p['from'])
        if p.get('to'):
            qs = qs.filter(date__lte=p['to'])
        if p.get('account'):
            qs = qs.filter(account_id=p['account'])
        return qs


class ExpenseViewSet(BaseFinanceViewSet):
    queryset = Expense.objects.select_related('vendor', 'category', 'currency', 'account').all()
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get('from'):
            qs = qs.filter(date__gte=p['from'])
        if p.get('to'):
            qs = qs.filter(date__lte=p['to'])
        if p.get('category'):
            qs = qs.filter(category_id=p['category'])
        if p.get('vendor'):
            qs = qs.filter(vendor_id=p['vendor'])
        if p.get('currency'):
            qs = qs.filter(currency__code=p['currency'].upper())
        if p.get('q'):
            qs = qs.filter(memo__icontains=p['q'])
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        vendor = instance.vendor.name if instance.vendor_id else ''
        memo = instance.memo or vendor or 'Expense'
        notify(
            admin_users(exclude_user=self.request.user),
            Notification.EXPENSE_CREATED,
            title=f'New expense {instance.amount} {instance.currency.code}',
            body=f'{memo} — added by {_actor_name(self.request.user)}.',
            target=instance, url=f'/expenses', actor=self.request.user,
        )


class AssetViewSet(BaseFinanceViewSet):
    queryset = Asset.objects.select_related('currency', 'category', 'account').all()
    serializer_class = AssetSerializer

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        notify(
            admin_users(exclude_user=self.request.user),
            Notification.ASSET_CREATED,
            title=f'New asset: {instance.name}',
            body=f'{instance.cost} {instance.currency.code} — added by {_actor_name(self.request.user)}.',
            target=instance, url=f'/assets', actor=self.request.user,
        )


class LiabilityViewSet(BaseFinanceViewSet):
    queryset = Liability.objects.select_related('currency', 'account').all()
    serializer_class = LiabilitySerializer

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        notify(
            admin_users(exclude_user=self.request.user),
            Notification.LIABILITY_CREATED,
            title=f'New liability: {instance.name}',
            body=f'Balance {instance.balance} {instance.currency.code} — added by {_actor_name(self.request.user)}.',
            target=instance, url=f'/liabilities', actor=self.request.user,
        )


class PaymentViewSet(PaymentFilterMixin, BaseFinanceViewSet):
    queryset = Payment.objects.select_related('account', 'currency', 'order', 'expense', 'liability').all()
    serializer_class = PaymentSerializer

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        dir_label = 'Incoming' if instance.direction == Payment.IN else 'Outgoing'
        notify(
            admin_users(exclude_user=self.request.user),
            Notification.PAYMENT_CREATED,
            title=f'{dir_label} payment {instance.amount} {instance.currency.code}',
            body=f'{instance.account.name} — added by {_actor_name(self.request.user)}.',
            target=instance, url=f'/payments', actor=self.request.user,
        )


# ---- Tasks ----

class TaskViewSet(viewsets.ModelViewSet):
    """All authenticated users see tasks. Standard users can only edit their own
    tasks; admins can edit all. Delete is admin-only."""
    serializer_class = TaskSerializer
    queryset = Task.objects.select_related('assigned_to', 'created_by').prefetch_related('comments')

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        if p.get('priority'):
            qs = qs.filter(priority=p['priority'])
        if p.get('assigned_to'):
            qs = qs.filter(assigned_to_id=p['assigned_to'])
        if p.get('mine') in ('1', 'true', 'yes'):
            qs = qs.filter(assigned_to=self.request.user)
        if p.get('q'):
            qs = qs.filter(title__icontains=p['q'])
        return qs

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        if task.assigned_to_id and task.assigned_to_id != getattr(self.request.user, 'id', None):
            notify(
                [task.assigned_to], Notification.TASK_ASSIGNED,
                title=f'Task assigned: {task.title}',
                body=f'Assigned by {_actor_name(self.request.user)}.',
                target=task, url=f'/tasks', actor=self.request.user,
            )

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        if not is_admin(request.user) and task.assigned_to_id != request.user.id and task.created_by_id != request.user.id:
            return Response({'detail': 'Only admins or the task owner can edit.'}, status=403)
        self._pre_update_snapshot = {
            'status': task.status,
            'assigned_to_id': task.assigned_to_id,
        }
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        task = serializer.save()
        snap = getattr(self, '_pre_update_snapshot', {})
        actor = self.request.user
        # Notify on status changes — inform creator + assignee (except the actor).
        if snap.get('status') is not None and snap['status'] != task.status:
            recipients = set()
            if task.created_by_id and task.created_by_id != getattr(actor, 'id', None):
                recipients.add(task.created_by)
            if task.assigned_to_id and task.assigned_to_id != getattr(actor, 'id', None):
                recipients.add(task.assigned_to)
            # Admins also want to see task status changes when a standard user moves them.
            for a in admin_users(exclude_user=actor):
                recipients.add(a)
            if recipients:
                notify(
                    list(recipients), Notification.TASK_STATUS,
                    title=f'Task "{task.title}" — {task.get_status_display()}',
                    body=f'Status changed by {_actor_name(actor)} (was {snap["status"]}).',
                    target=task, url=f'/tasks', actor=actor,
                )
        # Notify new assignee if assignment changed.
        if snap.get('assigned_to_id') != task.assigned_to_id and task.assigned_to_id \
                and task.assigned_to_id != getattr(actor, 'id', None):
            notify(
                [task.assigned_to], Notification.TASK_ASSIGNED,
                title=f'Task assigned: {task.title}',
                body=f'Assigned by {_actor_name(actor)}.',
                target=task, url=f'/tasks', actor=actor,
            )

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({'detail': 'Only admins can delete tasks.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class TaskCommentViewSet(viewsets.ModelViewSet):
    serializer_class = TaskCommentSerializer
    queryset = TaskComment.objects.select_related('author', 'task').all()

    def get_queryset(self):
        qs = super().get_queryset()
        task_id = self.request.query_params.get('task')
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        task = comment.task
        actor = self.request.user
        recipients = set()
        if task.created_by_id and task.created_by_id != getattr(actor, 'id', None):
            recipients.add(task.created_by)
        if task.assigned_to_id and task.assigned_to_id != getattr(actor, 'id', None):
            recipients.add(task.assigned_to)
        for a in admin_users(exclude_user=actor):
            recipients.add(a)
        if recipients:
            body = (comment.body or '').strip()
            preview = body[:140] + ('…' if len(body) > 140 else '')
            notify(
                list(recipients), Notification.TASK_COMMENT,
                title=f'Comment on "{task.title}"',
                body=f'{_actor_name(actor)}: {preview}',
                target=task, url=f'/tasks', actor=actor,
            )


# ---- Notifications ----

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """List the authenticated user's notifications and mark them read."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        p = self.request.query_params
        if p.get('unread') in ('1', 'true', 'yes'):
            qs = qs.filter(read_at__isnull=True)
        if p.get('kind'):
            qs = qs.filter(kind=p['kind'])
        return qs

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        n = get_object_or_404(Notification, pk=pk, recipient=request.user)
        if n.read_at is None:
            n.read_at = timezone.now()
            n.save(update_fields=['read_at'])
        return Response(NotificationSerializer(n).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        now = timezone.now()
        updated = Notification.objects.filter(
            recipient=request.user, read_at__isnull=True
        ).update(read_at=now)
        return Response({'updated': updated})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(
            recipient=request.user, read_at__isnull=True
        ).count()
        return Response({'count': count})


# ---- Admin broadcast email ----

class BroadcastEmailView(APIView):
    permission_classes = [IsAdmin]
    parser_classes_override = None

    def post(self, request):
        s = BroadcastEmailSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        subject = s.validated_data['subject']
        body = s.validated_data['body']
        attachments = request.FILES.getlist('attachments') or []

        recipients = list(
            User.objects.filter(groups__name='Standard', is_active=True)
            .exclude(email='').values_list('email', flat=True).distinct()
        )
        if not recipients:
            return Response(
                {'detail': 'No standard users with email addresses on file.', 'sent': 0},
                status=200,
            )

        from_email = getattr(dj_settings, 'DEFAULT_FROM_EMAIL', 'no-reply@sakanhome.local')
        email = EmailMessage(subject=subject, body=body, from_email=from_email, bcc=recipients)
        for f in attachments:
            email.attach(f.name, f.read(), f.content_type or 'application/octet-stream')
        email.send(fail_silently=False)
        audit_log(
            AuditLog.EMAIL_BROADCAST, user=request.user, request=request,
            target_type='Broadcast',
            description=f'Sent "{subject}" to {len(recipients)} standard user(s) with {len(attachments)} attachment(s)',
        )
        standard_users = list(
            User.objects.filter(groups__name=STANDARD_GROUP, is_active=True).distinct()
        )
        notify(
            standard_users, Notification.BROADCAST_SENT,
            title=f'Announcement: {subject}',
            body=(body or '')[:500],
            url='', actor=request.user,
        )
        return Response({'sent': len(recipients), 'recipients': recipients})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    permission_classes = [IsAdmin]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get('action'):
            qs = qs.filter(action=p['action'])
        if p.get('user'):
            qs = qs.filter(user_id=p['user'])
        if p.get('q'):
            qs = qs.filter(description__icontains=p['q'])
        if p.get('from'):
            qs = qs.filter(timestamp__date__gte=p['from'])
        if p.get('to'):
            qs = qs.filter(timestamp__date__lte=p['to'])
        return qs


class ImportBatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ImportBatch.objects.all()
    serializer_class = ImportBatchSerializer


# ---- Imports ----

class _ImportBase(APIView):
    permission_classes = [IsAuthenticated]
    source = ''
    runner = None

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file uploaded.'}, status=400)
        batch = ImportBatch.objects.create(
            source=self.source, file=file_obj, created_by=request.user,
        )
        audit_log(
            AuditLog.UPLOAD, user=request.user, request=request, target=batch,
            description=f'Uploaded {self.source}: {file_obj.name}',
        )
        batch.file.open('rb')
        try:
            self.runner(batch.file, batch)
        finally:
            batch.file.close()
        audit_log(
            AuditLog.IMPORT_RUN, user=request.user, request=request, target=batch,
            description=f'Imported {batch.success_count}/{batch.row_count} rows ({self.source})',
        )
        notify(
            admin_users(exclude_user=request.user),
            Notification.IMPORT_DONE,
            title=f'Import finished: {batch.get_source_display()}',
            body=f'{batch.success_count}/{batch.row_count} rows imported by {_actor_name(request.user)}.',
            target=batch, url='/imports', actor=request.user,
        )
        return Response(ImportBatchSerializer(batch).data, status=201)


class ShopifyImportView(_ImportBase):
    source = ImportBatch.SHOPIFY_ORDERS

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.runner = importers.import_shopify_orders


class StripeImportView(_ImportBase):
    source = ImportBatch.STRIPE_PAYOUTS

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.runner = importers.import_stripe_payouts


class GenericExpensesImportView(_ImportBase):
    source = ImportBatch.GENERIC_EXPENSES

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.runner = importers.import_generic_expenses


# ---- Reports ----

def _parse_date(val, default):
    if not val:
        return default
    try:
        return datetime.strptime(val, '%Y-%m-%d').date()
    except ValueError:
        return default


def _report_response(data, fmt, filename, request=None):
    if fmt != 'csv':
        return Response(data)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'
    writer = csv.writer(response)
    writer.writerow(['key', 'value'])
    _flatten(data, writer)
    if request is not None:
        audit_log(
            AuditLog.DOWNLOAD, user=request.user, request=request,
            target_type='Report', target_id=filename,
            description=f'Downloaded {filename}.csv',
        )
    return response


def _flatten(data, writer, prefix=''):
    for k, v in data.items():
        label = f'{prefix}{k}' if not prefix else f'{prefix}.{k}'
        if isinstance(v, dict):
            _flatten(v, writer, label)
        elif isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    _flatten(item, writer, f'{label}[{i}]')
                else:
                    writer.writerow([f'{label}[{i}]', item])
        else:
            writer.writerow([label, v])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_pnl(request):
    today = date.today()
    start = _parse_date(request.query_params.get('from'), today.replace(day=1))
    end = _parse_date(request.query_params.get('to'), today)
    data = reports.profit_and_loss(start, end)
    return _report_response(data, request.query_params.get('format'), 'pnl', request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_cashflow(request):
    today = date.today()
    start = _parse_date(request.query_params.get('from'), today.replace(day=1))
    end = _parse_date(request.query_params.get('to'), today)
    data = reports.cash_flow(start, end)
    return _report_response(data, request.query_params.get('format'), 'cashflow', request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_balance_sheet(request):
    today = date.today()
    as_of = _parse_date(request.query_params.get('as_of'), today)
    data = reports.balance_sheet(as_of)
    return _report_response(data, request.query_params.get('format'), 'balance_sheet', request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    from collections import defaultdict as _dd
    from decimal import Decimal as _D
    from .fx import to_usd as _to_usd

    today = date.today()
    p = request.query_params
    start = _parse_date(p.get('from'), today.replace(day=1))
    end = _parse_date(p.get('to'), today)
    currency_code = (p.get('currency') or '').upper().strip() or None
    status_q = p.get('status') or None
    category_id = p.get('category') or None

    # Filtered querysets
    orders_qs = Order.objects.filter(placed_at__gte=start, placed_at__lte=end)
    expenses_qs = Expense.objects.filter(date__gte=start, date__lte=end)
    payments_qs = Payment.objects.filter(date__gte=start, date__lte=end)
    if currency_code:
        orders_qs = orders_qs.filter(currency__code=currency_code)
        expenses_qs = expenses_qs.filter(currency__code=currency_code)
        payments_qs = payments_qs.filter(currency__code=currency_code)
    if status_q:
        orders_qs = orders_qs.filter(status=status_q)
    if category_id:
        expenses_qs = expenses_qs.filter(category_id=category_id)

    # USD aggregates within range
    revenue_usd = _D('0')
    revenue_count = 0
    by_month_rev = _dd(lambda: _D('0'))
    by_customer = _dd(lambda: _D('0'))
    for o in orders_qs.filter(status=Order.PAID).select_related('currency', 'customer'):
        usd = _to_usd(o.total, o.currency, o.placed_at)
        revenue_usd += usd
        revenue_count += 1
        by_month_rev[o.placed_at.strftime('%Y-%m')] += usd
        cname = o.customer.name if o.customer_id else '(guest)'
        by_customer[cname] += usd

    expense_usd = _D('0')
    by_month_exp = _dd(lambda: _D('0'))
    by_vendor = _dd(lambda: _D('0'))
    by_category = _dd(lambda: _D('0'))
    for e in expenses_qs.select_related('currency', 'vendor', 'category'):
        usd = _to_usd(e.amount, e.currency, e.date)
        expense_usd += usd
        by_month_exp[e.date.strftime('%Y-%m')] += usd
        by_vendor[e.vendor.name if e.vendor_id else '(none)'] += usd
        by_category[e.category.name if e.category_id else 'Uncategorized'] += usd

    inflow = _D('0')
    outflow = _D('0')
    for pay in payments_qs.select_related('currency'):
        usd = _to_usd(pay.amount, pay.currency, pay.date)
        if pay.direction == Payment.IN:
            inflow += usd
        else:
            outflow += usd

    net_profit = revenue_usd - expense_usd
    margin = float(net_profit / revenue_usd) if revenue_usd else 0.0
    aov = float(revenue_usd / revenue_count) if revenue_count else 0.0

    # Runway: cash today / avg monthly burn over period
    bs = reports.balance_sheet(end)
    months_span = max(1, ((end.year - start.year) * 12 + end.month - start.month) or 1)
    monthly_burn = float(expense_usd / months_span) if months_span else float(expense_usd)
    runway_months = (bs['cash_total'] / monthly_burn) if monthly_burn > 0 else None

    def _sorted(d, n=5):
        return [{'label': k, 'usd': float(v)} for k, v in sorted(d.items(), key=lambda kv: kv[1], reverse=True)[:n]]

    status_breakdown = {
        s: orders_qs.filter(status=s).count() for s, _ in Order.STATUS_CHOICES
    }

    tasks_by_status = {
        s: Task.objects.filter(status=s).count() for s, _ in Task.STATUS_CHOICES
    }
    my_tasks_open = Task.objects.filter(
        assigned_to=request.user
    ).exclude(status=Task.DONE).count()

    counters = {
        'orders_in_range': orders_qs.count(),
        'orders_paid': orders_qs.filter(status=Order.PAID).count(),
        'orders_pending': orders_qs.filter(status=Order.PENDING).count(),
        'orders_refunded': orders_qs.filter(status=Order.REFUNDED).count(),
        'expenses_in_range': expenses_qs.count(),
        'customers': Customer.objects.count(),
        'vendors': Vendor.objects.count(),
        'assets': Asset.objects.filter(disposed_at__isnull=True).count(),
        'liabilities': Liability.objects.count(),
        'accounts': Account.objects.filter(active=True).count(),
    }

    last_orders = list(
        orders_qs.order_by('-placed_at')[:5]
        .values('id', 'external_id', 'total', 'currency__code', 'status', 'placed_at',
                'customer__name')
    )
    last_expenses = list(
        expenses_qs.order_by('-date')[:5]
        .values('id', 'memo', 'amount', 'currency__code', 'date',
                'vendor__name', 'category__name')
    )
    last_payments = list(
        payments_qs.order_by('-date')[:5]
        .values('id', 'direction', 'amount', 'currency__code', 'date',
                'method', 'account__name')
    )

    recent_audit = []
    if is_admin(request.user):
        recent_audit = list(
            AuditLog.objects.order_by('-timestamp')[:10]
            .values('id', 'timestamp', 'username', 'action', 'target_type',
                    'target_id', 'description', 'ip')
        )

    def _timeline(months_dict):
        return [{'month': k, 'usd': float(v)} for k, v in sorted(months_dict.items())]

    return Response({
        'today': today.isoformat(),
        'store': 'Sakan Home',
        'base_currency': 'USD',
        'range': {'from': start.isoformat(), 'to': end.isoformat()},
        'filters': {'currency': currency_code, 'status': status_q, 'category': category_id},
        'kpis': {
            'revenue_usd': float(revenue_usd),
            'expenses_usd': float(expense_usd),
            'net_profit_usd': float(net_profit),
            'margin_pct': margin * 100,
            'inflow_usd': float(inflow),
            'outflow_usd': float(outflow),
            'net_cash_flow_usd': float(inflow - outflow),
            'orders_paid': revenue_count,
            'avg_order_value_usd': aov,
            'runway_months': runway_months,
            'cash_total_usd': bs['cash_total'],
        },
        'timeline': {
            'revenue': _timeline(by_month_rev),
            'expenses': _timeline(by_month_exp),
        },
        'top_vendors': _sorted(by_vendor),
        'top_categories': _sorted(by_category),
        'top_customers': _sorted(by_customer),
        'order_status_breakdown': status_breakdown,
        'balance_sheet': bs,
        'counters': counters,
        'tasks_by_status': tasks_by_status,
        'my_tasks_open': my_tasks_open,
        'recent_orders': last_orders,
        'recent_expenses': last_expenses,
        'recent_payments': last_payments,
        'recent_audit': recent_audit,
    })
