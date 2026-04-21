"""Test suite for the finance app."""
import io
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import Group, User
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import (
    Account, Currency, Customer, Expense, FxRate, Order, OrderItem,
    Payment, Task, TaskComment, AuditLog, Vendor, Category,
)
from .permissions import ADMIN_GROUP, STANDARD_GROUP
from .fx import to_usd
from . import reports, importers


def _make_users():
    admin = User.objects.create_user(username='admin', password='a12345', email='admin@test')
    std = User.objects.create_user(username='user', password='u12345', email='user@test')
    ag, _ = Group.objects.get_or_create(name=ADMIN_GROUP)
    sg, _ = Group.objects.get_or_create(name=STANDARD_GROUP)
    admin.groups.add(ag)
    admin.is_superuser = True
    admin.is_staff = True
    admin.save()
    std.groups.add(sg)
    return admin, std


class FxTests(TestCase):
    def test_usd_is_identity(self):
        usd = Currency.objects.create(code='USD', name='USD')
        self.assertEqual(to_usd(Decimal('10'), usd, date.today()), Decimal('10.00'))

    def test_eur_uses_latest_on_or_before(self):
        eur = Currency.objects.create(code='EUR', name='EUR')
        FxRate.objects.create(currency=eur, date=date(2024, 1, 1), rate_to_usd=Decimal('1.1'))
        FxRate.objects.create(currency=eur, date=date(2024, 6, 1), rate_to_usd=Decimal('1.08'))
        self.assertEqual(to_usd(Decimal('100'), eur, date(2024, 3, 1)), Decimal('110.00'))
        self.assertEqual(to_usd(Decimal('100'), eur, date(2024, 7, 1)), Decimal('108.00'))

    def test_eur_falls_back_when_before_first_rate(self):
        eur = Currency.objects.create(code='EUR', name='EUR')
        FxRate.objects.create(currency=eur, date=date(2024, 6, 1), rate_to_usd=Decimal('1.08'))
        self.assertEqual(to_usd(Decimal('100'), eur, date(2023, 1, 1)), Decimal('108.00'))


class ReportsTests(TestCase):
    def setUp(self):
        self.usd = Currency.objects.create(code='USD', name='USD')
        self.eur = Currency.objects.create(code='EUR', name='EUR')
        FxRate.objects.create(currency=self.eur, date=date.today(), rate_to_usd=Decimal('1.2'))
        self.account = Account.objects.create(name='Bank', currency=self.usd)

    def test_pnl_totals(self):
        today = date.today()
        Order.objects.create(
            placed_at=today, currency=self.usd, total=Decimal('200'),
            status=Order.PAID,
        )
        Order.objects.create(
            placed_at=today, currency=self.eur, total=Decimal('50'),
            status=Order.PAID,
        )
        Expense.objects.create(date=today, currency=self.usd, amount=Decimal('30'))
        Expense.objects.create(date=today, currency=self.eur, amount=Decimal('10'))  # 12 USD

        data = reports.profit_and_loss(today, today)
        self.assertEqual(data['revenue_total'], 260.0)  # 200 + 50 * 1.2
        self.assertEqual(data['expenses_total'], 42.0)  # 30 + 10 * 1.2
        self.assertEqual(data['net_profit'], 218.0)

    def test_cash_flow_nets(self):
        today = date.today()
        Payment.objects.create(
            direction=Payment.IN, date=today, account=self.account,
            currency=self.usd, amount=Decimal('500'),
        )
        Payment.objects.create(
            direction=Payment.OUT, date=today, account=self.account,
            currency=self.usd, amount=Decimal('150'),
        )
        data = reports.cash_flow(today, today)
        self.assertEqual(data['inflow_total'], 500.0)
        self.assertEqual(data['outflow_total'], 150.0)
        self.assertEqual(data['net_cash_flow'], 350.0)

    def test_balance_sheet_cash_rollup(self):
        today = date.today()
        self.account.opening_balance = Decimal('1000')
        self.account.save()
        Payment.objects.create(
            direction=Payment.IN, date=today, account=self.account,
            currency=self.usd, amount=Decimal('200'),
        )
        Payment.objects.create(
            direction=Payment.OUT, date=today, account=self.account,
            currency=self.usd, amount=Decimal('50'),
        )
        data = reports.balance_sheet(today)
        self.assertEqual(data['cash_by_account']['Bank'], 1150.0)


class LoginAndPermissionTests(TestCase):
    def setUp(self):
        self.admin, self.std = _make_users()
        self.client = APIClient()

    def test_login_success_and_audit(self):
        resp = self.client.post('/api/auth/login/', {'username': 'admin', 'password': 'a12345'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('token', resp.data)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.LOGIN_SUCCESS, username='admin').exists())

    def test_login_failed_audit(self):
        resp = self.client.post('/api/auth/login/', {'username': 'admin', 'password': 'wrong'}, format='json')
        self.assertEqual(resp.status_code, 401)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.LOGIN_FAILED, username='admin').exists())

    def test_standard_cannot_delete_expense(self):
        token = Token.objects.get_or_create(user=self.std)[0].key
        usd = Currency.objects.create(code='USD', name='USD')
        exp = Expense.objects.create(date=date.today(), currency=usd, amount=Decimal('10'))
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        resp = self.client.delete(f'/api/expenses/{exp.pk}/')
        self.assertEqual(resp.status_code, 403)

    def test_admin_can_delete_expense(self):
        token = Token.objects.get_or_create(user=self.admin)[0].key
        usd = Currency.objects.create(code='USD', name='USD')
        exp = Expense.objects.create(date=date.today(), currency=usd, amount=Decimal('10'))
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        resp = self.client.delete(f'/api/expenses/{exp.pk}/')
        self.assertEqual(resp.status_code, 204)
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.DELETE, target_type='Expense').exists())

    def test_standard_cannot_create_user(self):
        token = Token.objects.get_or_create(user=self.std)[0].key
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        resp = self.client.post('/api/users/', {'username': 'x', 'password': 'xyz123', 'role': STANDARD_GROUP}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_admin_can_create_user(self):
        token = Token.objects.get_or_create(user=self.admin)[0].key
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        resp = self.client.post('/api/users/', {'username': 'newbie', 'password': 'xyz12345', 'role': STANDARD_GROUP}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(User.objects.filter(username='newbie', groups__name=STANDARD_GROUP).exists())


class TaskTests(TestCase):
    def setUp(self):
        self.admin, self.std = _make_users()
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.get_or_create(user=self.admin)[0].key}')

    def test_admin_assign_task_and_comment(self):
        resp = self.client.post('/api/tasks/', {
            'title': 'Upload Shopify CSV', 'description': 'October export',
            'assigned_to': self.std.id, 'priority': 'high',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        task_id = resp.data['id']
        # Standard user adds a follow-up comment
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.get_or_create(user=self.std)[0].key}')
        resp = self.client.post('/api/task-comments/', {'task': task_id, 'body': 'In progress'}, format='json')
        self.assertEqual(resp.status_code, 201)
        # And marks it done
        resp = self.client.patch(f'/api/tasks/{task_id}/', {'status': 'done'}, format='json')
        self.assertEqual(resp.status_code, 200)


class BroadcastEmailTests(TestCase):
    def setUp(self):
        self.admin, self.std = _make_users()
        self.client = APIClient()
        token = Token.objects.get_or_create(user=self.admin)[0].key
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')

    def test_admin_broadcast_to_standard_users(self):
        # A second standard user to verify BCC fan-out
        User.objects.create_user(username='u2', password='u2', email='u2@test').groups.add(
            Group.objects.get(name=STANDARD_GROUP)
        )
        resp = self.client.post('/api/broadcast/email/', {
            'subject': 'Team update',
            'body': 'Hi team, Q1 close is done.',
        }, format='multipart')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['sent'], 2)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(set(mail.outbox[0].bcc), {'user@test', 'u2@test'})
        self.assertTrue(AuditLog.objects.filter(action=AuditLog.EMAIL_BROADCAST).exists())

    def test_broadcast_with_attachment(self):
        attachment = SimpleUploadedFile('notes.txt', b'hello', content_type='text/plain')
        resp = self.client.post('/api/broadcast/email/', {
            'subject': 'Report', 'body': 'See attached.', 'attachments': [attachment],
        }, format='multipart')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox[0].attachments), 1)

    def test_standard_cannot_broadcast(self):
        token = Token.objects.get_or_create(user=self.std)[0].key
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        resp = self.client.post('/api/broadcast/email/', {'subject': 's', 'body': 'b'}, format='multipart')
        self.assertEqual(resp.status_code, 403)


class ImporterTests(TestCase):
    def test_generic_expenses_importer(self):
        from .models import ImportBatch
        csv_bytes = (
            'date,vendor,category,currency,amount,account,memo\n'
            '2024-06-10,Acme,Marketing,USD,120.00,,Ad spend\n'
            '2024-06-12,FedEx,Shipping,EUR,30.00,,Labels\n'
        ).encode()
        batch = ImportBatch.objects.create(source=ImportBatch.GENERIC_EXPENSES)
        importers.import_generic_expenses(io.BytesIO(csv_bytes), batch)
        batch.refresh_from_db()
        self.assertEqual(batch.success_count, 2)
        self.assertEqual(Expense.objects.count(), 2)

    def test_shopify_orders_importer(self):
        from .models import ImportBatch
        csv_bytes = (
            'Name,Email,Financial Status,Paid at,Subtotal,Shipping,Taxes,Total,Currency,'
            'Lineitem quantity,Lineitem name,Lineitem price,Lineitem sku\n'
            '#1001,j@e.com,paid,2024-06-10,100,8,5,113,USD,2,Cushion,50,SH-1\n'
            '#1001,j@e.com,paid,2024-06-10,,,,,USD,1,Vase,45,SH-2\n'
        ).encode()
        batch = ImportBatch.objects.create(source=ImportBatch.SHOPIFY_ORDERS)
        importers.import_shopify_orders(io.BytesIO(csv_bytes), batch)
        batch.refresh_from_db()
        self.assertEqual(Order.objects.count(), 1)
        order = Order.objects.get()
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(order.status, Order.PAID)

    def test_stripe_payouts_importer(self):
        from .models import ImportBatch
        csv_bytes = (
            'id,Type,Created (UTC),Amount,Fee,Net,Currency,Description\n'
            'txn_1,charge,2024-06-10 12:00:00,100,3.20,96.80,USD,Customer charge\n'
            'txn_2,refund,2024-06-11 09:00:00,-20,0,-20,USD,Refund\n'
        ).encode()
        batch = ImportBatch.objects.create(source=ImportBatch.STRIPE_PAYOUTS)
        importers.import_stripe_payouts(io.BytesIO(csv_bytes), batch)
        batch.refresh_from_db()
        self.assertEqual(batch.success_count, 2)
        self.assertEqual(Payment.objects.count(), 2)
        # There should be one Stripe fee expense (for the positive charge)
        self.assertEqual(Expense.objects.filter(vendor__name='Stripe').count(), 1)


class DashboardTests(TestCase):
    def test_dashboard_kpis(self):
        admin, _ = _make_users()
        client = APIClient()
        token = Token.objects.get_or_create(user=admin)[0].key
        client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        usd = Currency.objects.create(code='USD', name='USD')
        today = date.today()
        Order.objects.create(placed_at=today, currency=usd, total=Decimal('100'), status=Order.PAID)
        Expense.objects.create(date=today, currency=usd, amount=Decimal('40'))

        resp = client.get(f'/api/reports/dashboard/?from={today.isoformat()}&to={today.isoformat()}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['kpis']['revenue_usd'], 100.0)
        self.assertEqual(resp.data['kpis']['expenses_usd'], 40.0)
        self.assertEqual(resp.data['kpis']['net_profit_usd'], 60.0)
        self.assertEqual(resp.data['store'], 'Sakan Home')
