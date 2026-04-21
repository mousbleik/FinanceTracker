from decimal import Decimal
from django.conf import settings
from django.db import models


AMOUNT_MAX_DIGITS = 14
AMOUNT_DECIMAL_PLACES = 2


class Currency(models.Model):
    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=64)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return self.code


class FxRate(models.Model):
    """Exchange rate: 1 unit of `currency` = `rate_to_usd` USD on `date`."""
    currency = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='rates')
    date = models.DateField()
    rate_to_usd = models.DecimalField(max_digits=18, decimal_places=8)

    class Meta:
        unique_together = ('currency', 'date')
        ordering = ['-date']

    def __str__(self):
        return f'{self.currency.code} {self.date}: {self.rate_to_usd}'


class Account(models.Model):
    BANK = 'bank'
    CASH = 'cash'
    CARD = 'card'
    STRIPE = 'stripe'
    PAYPAL = 'paypal'
    OTHER = 'other'
    TYPE_CHOICES = [
        (BANK, 'Bank'),
        (CASH, 'Cash'),
        (CARD, 'Credit card'),
        (STRIPE, 'Stripe'),
        (PAYPAL, 'PayPal'),
        (OTHER, 'Other'),
    ]

    name = models.CharField(max_length=128)
    type = models.CharField(max_length=16, choices=TYPE_CHOICES, default=BANK)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    opening_balance = models.DecimalField(
        max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES, default=Decimal('0')
    )
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.currency.code})'


class Category(models.Model):
    INCOME = 'income'
    EXPENSE = 'expense'
    ASSET = 'asset'
    LIABILITY = 'liability'
    KIND_CHOICES = [
        (INCOME, 'Income'),
        (EXPENSE, 'Expense'),
        (ASSET, 'Asset'),
        (LIABILITY, 'Liability'),
    ]

    name = models.CharField(max_length=128)
    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children'
    )

    class Meta:
        ordering = ['kind', 'name']
        unique_together = ('name', 'kind', 'parent')

    def __str__(self):
        return f'{self.get_kind_display()} / {self.name}'


class Vendor(models.Model):
    name = models.CharField(max_length=128, unique=True)
    contact = models.CharField(max_length=256, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Customer(models.Model):
    name = models.CharField(max_length=128)
    email = models.EmailField(blank=True)
    external_id = models.CharField(max_length=128, blank=True, db_index=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Order(models.Model):
    PENDING = 'pending'
    PAID = 'paid'
    REFUNDED = 'refunded'
    CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (PAID, 'Paid'),
        (REFUNDED, 'Refunded'),
        (CANCELLED, 'Cancelled'),
    ]

    MANUAL = 'manual'
    SHOPIFY = 'shopify'
    WOOCOMMERCE = 'woocommerce'
    SOURCE_CHOICES = [
        (MANUAL, 'Manual'),
        (SHOPIFY, 'Shopify'),
        (WOOCOMMERCE, 'WooCommerce'),
    ]

    external_id = models.CharField(max_length=128, blank=True, db_index=True)
    source = models.CharField(max_length=16, choices=SOURCE_CHOICES, default=MANUAL)
    customer = models.ForeignKey(
        Customer, null=True, blank=True, on_delete=models.SET_NULL, related_name='orders'
    )
    placed_at = models.DateField()
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    subtotal = models.DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES, default=Decimal('0'))
    tax = models.DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES, default=Decimal('0'))
    shipping = models.DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES, default=Decimal('0'))
    total = models.DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES, default=Decimal('0'))
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=PENDING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-placed_at', '-id']
        indexes = [models.Index(fields=['source', 'external_id'])]

    def __str__(self):
        return f'Order #{self.pk} {self.total} {self.currency.code}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    sku = models.CharField(max_length=64, blank=True)
    name = models.CharField(max_length=256)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1'))
    unit_price = models.DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES, default=Decimal('0'))

    def line_total(self):
        return (self.quantity or Decimal('0')) * (self.unit_price or Decimal('0'))


class Expense(models.Model):
    date = models.DateField()
    vendor = models.ForeignKey(Vendor, null=True, blank=True, on_delete=models.SET_NULL, related_name='expenses')
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name='expenses')
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES)
    account = models.ForeignKey(Account, null=True, blank=True, on_delete=models.SET_NULL, related_name='expenses')
    memo = models.CharField(max_length=512, blank=True)
    receipt = models.FileField(upload_to='receipts/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f'{self.date} {self.amount} {self.currency.code}'


class Asset(models.Model):
    name = models.CharField(max_length=128)
    purchase_date = models.DateField()
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    cost = models.DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name='assets')
    account = models.ForeignKey(Account, null=True, blank=True, on_delete=models.SET_NULL, related_name='assets')
    disposed_at = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-purchase_date']

    def __str__(self):
        return f'{self.name} ({self.cost} {self.currency.code})'


class Liability(models.Model):
    name = models.CharField(max_length=128)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    principal = models.DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES)
    balance = models.DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES)
    account = models.ForeignKey(Account, null=True, blank=True, on_delete=models.SET_NULL, related_name='liabilities')
    opened_at = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.balance} {self.currency.code})'


class Payment(models.Model):
    IN = 'in'
    OUT = 'out'
    DIRECTION_CHOICES = [(IN, 'Incoming'), (OUT, 'Outgoing')]

    METHOD_CHOICES = [
        ('card', 'Card'),
        ('bank_transfer', 'Bank transfer'),
        ('cash', 'Cash'),
        ('stripe', 'Stripe'),
        ('paypal', 'PayPal'),
        ('other', 'Other'),
    ]

    direction = models.CharField(max_length=3, choices=DIRECTION_CHOICES)
    date = models.DateField()
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='payments')
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES)
    method = models.CharField(max_length=16, choices=METHOD_CHOICES, default='bank_transfer')
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL, related_name='payments')
    expense = models.ForeignKey(Expense, null=True, blank=True, on_delete=models.SET_NULL, related_name='payments')
    liability = models.ForeignKey(Liability, null=True, blank=True, on_delete=models.SET_NULL, related_name='payments')
    memo = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        sign = '+' if self.direction == self.IN else '-'
        return f'{self.date} {sign}{self.amount} {self.currency.code}'


class Task(models.Model):
    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    DONE = 'done'
    BLOCKED = 'blocked'
    STATUS_CHOICES = [
        (OPEN, 'Open'),
        (IN_PROGRESS, 'In progress'),
        (BLOCKED, 'Blocked'),
        (DONE, 'Done'),
    ]

    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    PRIORITY_CHOICES = [(LOW, 'Low'), (MEDIUM, 'Medium'), (HIGH, 'High')]

    title = models.CharField(max_length=256)
    description = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='assigned_tasks',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='created_tasks',
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=OPEN)
    priority = models.CharField(max_length=8, choices=PRIORITY_CHOICES, default=MEDIUM)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.status}] {self.title}'


class TaskComment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Comment on #{self.task_id}'


class AuditLog(models.Model):
    LOGIN_SUCCESS = 'login_success'
    LOGIN_FAILED = 'login_failed'
    LOGOUT = 'logout'
    CREATE = 'create'
    UPDATE = 'update'
    DELETE = 'delete'
    UPLOAD = 'upload'
    DOWNLOAD = 'download'
    IMPORT_RUN = 'import_run'
    EMAIL_BROADCAST = 'email_broadcast'
    ACTION_CHOICES = [
        (LOGIN_SUCCESS, 'Login success'),
        (LOGIN_FAILED, 'Login failed'),
        (LOGOUT, 'Logout'),
        (CREATE, 'Create'),
        (UPDATE, 'Update'),
        (DELETE, 'Delete'),
        (UPLOAD, 'Upload'),
        (DOWNLOAD, 'Download'),
        (IMPORT_RUN, 'Import run'),
        (EMAIL_BROADCAST, 'Email broadcast'),
    ]

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='audit_logs',
    )
    username = models.CharField(max_length=150, blank=True)
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=64, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    description = models.CharField(max_length=512, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [models.Index(fields=['action']), models.Index(fields=['target_type'])]

    def __str__(self):
        who = self.username or (self.user.username if self.user_id else 'anon')
        return f'{self.timestamp:%Y-%m-%d %H:%M} {who} {self.action}'


class ImportBatch(models.Model):
    SHOPIFY_ORDERS = 'shopify_orders'
    STRIPE_PAYOUTS = 'stripe_payouts'
    GENERIC_EXPENSES = 'generic_expenses'
    SOURCE_CHOICES = [
        (SHOPIFY_ORDERS, 'Shopify orders'),
        (STRIPE_PAYOUTS, 'Stripe payouts'),
        (GENERIC_EXPENSES, 'Generic expenses'),
    ]

    source = models.CharField(max_length=32, choices=SOURCE_CHOICES)
    file = models.FileField(upload_to='imports/', blank=True, null=True)
    row_count = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    log = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_source_display()} ({self.success_count}/{self.row_count})'
