from django.contrib.auth.models import User, Group
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from .models import (
    Currency, FxRate, Account, Category, Vendor, Customer,
    Order, OrderItem, Expense, Asset, Liability, Payment, ImportBatch,
    Task, TaskComment, AuditLog,
)
from .permissions import ADMIN_GROUP, STANDARD_GROUP, is_admin


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ['id', 'code', 'name']


class FxRateSerializer(serializers.ModelSerializer):
    currency_code = serializers.CharField(source='currency.code', read_only=True)

    class Meta:
        model = FxRate
        fields = ['id', 'currency', 'currency_code', 'date', 'rate_to_usd']


class AccountSerializer(serializers.ModelSerializer):
    currency_code = serializers.CharField(source='currency.code', read_only=True)

    class Meta:
        model = Account
        fields = ['id', 'name', 'type', 'currency', 'currency_code', 'opening_balance', 'active']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'kind', 'parent']


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'name', 'contact']


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'email', 'external_id']


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'sku', 'name', 'quantity', 'unit_price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, required=False)
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='')

    class Meta:
        model = Order
        fields = [
            'id', 'external_id', 'source', 'customer', 'customer_name',
            'placed_at', 'currency', 'currency_code', 'subtotal', 'tax',
            'shipping', 'total', 'status', 'notes', 'items', 'created_at',
        ]
        read_only_fields = ['created_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = Order.objects.create(**validated_data)
        for item in items_data:
            OrderItem.objects.create(order=order, **item)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                OrderItem.objects.create(order=instance, **item)
        return instance


class ExpenseSerializer(serializers.ModelSerializer):
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, default='')
    category_name = serializers.CharField(source='category.name', read_only=True, default='')

    class Meta:
        model = Expense
        fields = [
            'id', 'date', 'vendor', 'vendor_name', 'category', 'category_name',
            'currency', 'currency_code', 'amount', 'account', 'memo', 'receipt',
            'created_at',
        ]
        read_only_fields = ['created_at']


class AssetSerializer(serializers.ModelSerializer):
    currency_code = serializers.CharField(source='currency.code', read_only=True)

    class Meta:
        model = Asset
        fields = [
            'id', 'name', 'purchase_date', 'currency', 'currency_code',
            'cost', 'category', 'account', 'disposed_at', 'notes',
        ]


class LiabilitySerializer(serializers.ModelSerializer):
    currency_code = serializers.CharField(source='currency.code', read_only=True)

    class Meta:
        model = Liability
        fields = [
            'id', 'name', 'currency', 'currency_code', 'principal', 'balance',
            'account', 'opened_at', 'notes',
        ]


class PaymentSerializer(serializers.ModelSerializer):
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'direction', 'date', 'account', 'account_name', 'currency',
            'currency_code', 'amount', 'method', 'order', 'expense', 'liability',
            'memo', 'created_at',
        ]
        read_only_fields = ['created_at']


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ['id', 'timestamp', 'user', 'username', 'action',
                  'target_type', 'target_id', 'description', 'ip']


class TaskCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True, default='')

    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'author', 'author_username', 'body', 'created_at']
        read_only_fields = ['author', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True, default='')
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default='')
    comments = TaskCommentSerializer(many=True, read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'assigned_to', 'assigned_to_username',
            'created_by', 'created_by_username', 'status', 'priority', 'due_date',
            'comments', 'comments_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class BroadcastEmailSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    body = serializers.CharField()
    attachments = serializers.ListField(
        child=serializers.FileField(), required=False, allow_empty=True,
    )


class ImportBatchSerializer(serializers.ModelSerializer):
    source_label = serializers.CharField(source='get_source_display', read_only=True)

    class Meta:
        model = ImportBatch
        fields = [
            'id', 'source', 'source_label', 'file', 'row_count',
            'success_count', 'error_count', 'log', 'created_at',
        ]
        read_only_fields = ['row_count', 'success_count', 'error_count', 'log', 'created_at']


# --- Auth / user management ---

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'is_active', 'role', 'is_admin', 'password']

    def get_role(self, obj):
        if is_admin(obj):
            return ADMIN_GROUP
        if obj.groups.filter(name=STANDARD_GROUP).exists():
            return STANDARD_GROUP
        return ''

    def get_is_admin(self, obj):
        return is_admin(obj)


class CreateUserSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=[ADMIN_GROUP, STANDARD_GROUP], default=STANDARD_GROUP)

    def create(self, validated_data):
        role = validated_data.pop('role')
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
        )
        group, _ = Group.objects.get_or_create(name=role)
        user.groups.add(group)
        Token.objects.get_or_create(user=user)
        return user
