"""Seed demo data for Sakan Home finance tracker.

Creates two users in the right groups:
    - admin / admin12345   (role: Admin)
    - user  / user12345    (role: Standard)

Plus currencies (USD/EUR/AED), FX rates, accounts, categories, sample
orders, expenses, payments, an asset, and a liability.
"""
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand
from django.db import transaction
from rest_framework.authtoken.models import Token

from finance.models import (
    Currency, FxRate, Account, Category, Vendor, Customer,
    Order, OrderItem, Expense, Asset, Liability, Payment,
    Task, TaskComment, AuditLog,
)
from finance.permissions import ADMIN_GROUP, STANDARD_GROUP


class Command(BaseCommand):
    help = 'Seed demo data for Sakan Home.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing data first.')

    @transaction.atomic
    def handle(self, *args, **opts):
        if opts['reset']:
            self.stdout.write('Resetting demo data…')
            for M in (Payment, OrderItem, Order, Expense, Asset, Liability,
                      FxRate, Account, Category, Vendor, Customer, Currency):
                M.objects.all().delete()

        # Groups
        admin_group, _ = Group.objects.get_or_create(name=ADMIN_GROUP)
        standard_group, _ = Group.objects.get_or_create(name=STANDARD_GROUP)

        # Users
        admin_user, created = User.objects.get_or_create(
            username='admin', defaults={'email': 'admin@sakanhome.test', 'is_staff': True, 'is_superuser': True},
        )
        admin_user.set_password('admin12345')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.is_active = True
        admin_user.save()
        admin_user.groups.add(admin_group)
        Token.objects.get_or_create(user=admin_user)

        std_user, _ = User.objects.get_or_create(
            username='user', defaults={'email': 'user@sakanhome.test'},
        )
        std_user.set_password('user12345')
        std_user.is_active = True
        std_user.save()
        std_user.groups.clear()
        std_user.groups.add(standard_group)
        Token.objects.get_or_create(user=std_user)

        # Currencies
        usd, _ = Currency.objects.get_or_create(code='USD', defaults={'name': 'US Dollar'})
        eur, _ = Currency.objects.get_or_create(code='EUR', defaults={'name': 'Euro'})
        aed, _ = Currency.objects.get_or_create(code='AED', defaults={'name': 'UAE Dirham'})
        lbp, _ = Currency.objects.get_or_create(code='LBP', defaults={'name': 'Lebanese Pound'})
        sar, _ = Currency.objects.get_or_create(code='SAR', defaults={'name': 'Saudi Riyal'})
        try_, _ = Currency.objects.get_or_create(code='TRY', defaults={'name': 'Turkish Lira'})

        today = date.today()
        # FX rates (1 unit of currency in USD)
        FxRate.objects.update_or_create(currency=usd, date=today, defaults={'rate_to_usd': Decimal('1')})
        FxRate.objects.update_or_create(currency=eur, date=today, defaults={'rate_to_usd': Decimal('1.08')})
        FxRate.objects.update_or_create(currency=aed, date=today, defaults={'rate_to_usd': Decimal('0.27')})
        FxRate.objects.update_or_create(currency=lbp, date=today, defaults={'rate_to_usd': Decimal('0.00001117')})
        FxRate.objects.update_or_create(currency=sar, date=today, defaults={'rate_to_usd': Decimal('0.2667')})
        FxRate.objects.update_or_create(currency=try_, date=today, defaults={'rate_to_usd': Decimal('0.0260')})

        # Accounts
        bank, _ = Account.objects.get_or_create(
            name='Business Bank', defaults={'type': Account.BANK, 'currency': usd, 'opening_balance': Decimal('10000')}
        )
        stripe, _ = Account.objects.get_or_create(
            name='Stripe', defaults={'type': Account.STRIPE, 'currency': usd}
        )
        petty, _ = Account.objects.get_or_create(
            name='Petty Cash', defaults={'type': Account.CASH, 'currency': usd, 'opening_balance': Decimal('250')}
        )

        # Categories
        cat_sales, _ = Category.objects.get_or_create(name='Online sales', kind=Category.INCOME)
        cat_mkt, _ = Category.objects.get_or_create(name='Marketing', kind=Category.EXPENSE)
        cat_ship, _ = Category.objects.get_or_create(name='Shipping', kind=Category.EXPENSE)
        cat_pkg, _ = Category.objects.get_or_create(name='Packaging', kind=Category.EXPENSE)
        cat_fees, _ = Category.objects.get_or_create(name='Processing fees', kind=Category.EXPENSE)
        cat_equip, _ = Category.objects.get_or_create(name='Equipment', kind=Category.ASSET)

        # Vendors
        meta, _ = Vendor.objects.get_or_create(name='Meta Ads')
        fedex, _ = Vendor.objects.get_or_create(name='FedEx')
        pack_co, _ = Vendor.objects.get_or_create(name='EcoPack Co.')
        stripe_vendor, _ = Vendor.objects.get_or_create(name='Stripe')

        # Customers & orders
        customers = [
            Customer.objects.get_or_create(email='jane@example.com', defaults={'name': 'Jane Doe'})[0],
            Customer.objects.get_or_create(email='omar@example.com', defaults={'name': 'Omar Al Hosani'})[0],
            Customer.objects.get_or_create(email='lea@example.com', defaults={'name': 'Lea Martin'})[0],
        ]
        products = [
            ('SH-CUSH-01', 'Linen Cushion Cover', Decimal('29.00'), usd),
            ('SH-VASE-02', 'Ceramic Vase', Decimal('45.00'), usd),
            ('SH-LAMP-03', 'Brass Table Lamp', Decimal('120.00'), usd),
            ('SH-RUG-04', 'Wool Rug 4x6', Decimal('240.00'), usd),
        ]

        for i in range(12):
            c = customers[i % len(customers)]
            sku, name, price, cur = products[i % len(products)]
            qty = Decimal('1') + Decimal(i % 3)
            subtotal = qty * price
            shipping = Decimal('8.00')
            tax = (subtotal * Decimal('0.05')).quantize(Decimal('0.01'))
            total = subtotal + shipping + tax
            d = today - timedelta(days=i * 2)
            order = Order.objects.create(
                external_id=f'SH{1000 + i}', source=Order.MANUAL, customer=c,
                placed_at=d, currency=cur, subtotal=subtotal, tax=tax,
                shipping=shipping, total=total, status=Order.PAID,
            )
            OrderItem.objects.create(order=order, sku=sku, name=name, quantity=qty, unit_price=price)
            Payment.objects.create(
                direction=Payment.IN, date=d, account=stripe, currency=cur,
                amount=total, method='stripe', order=order, memo=f'Order {order.external_id}',
            )
            # Stripe fee
            fee = (total * Decimal('0.029') + Decimal('0.30')).quantize(Decimal('0.01'))
            Expense.objects.create(
                date=d, vendor=stripe_vendor, category=cat_fees,
                currency=cur, amount=fee, account=stripe,
                memo=f'Stripe fee — {order.external_id}',
            )

        # Expenses
        Expense.objects.create(
            date=today - timedelta(days=4), vendor=meta, category=cat_mkt,
            currency=usd, amount=Decimal('320.00'), account=bank, memo='Instagram ads',
        )
        Expense.objects.create(
            date=today - timedelta(days=8), vendor=fedex, category=cat_ship,
            currency=usd, amount=Decimal('185.00'), account=bank, memo='Bulk shipping labels',
        )
        Expense.objects.create(
            date=today - timedelta(days=15), vendor=pack_co, category=cat_pkg,
            currency=eur, amount=Decimal('420.00'), account=bank, memo='Eco boxes — 500 units',
        )

        # Asset
        Asset.objects.get_or_create(
            name='MacBook Pro 14"', defaults={
                'purchase_date': today - timedelta(days=180),
                'currency': usd, 'cost': Decimal('2200.00'),
                'category': cat_equip, 'account': bank,
            }
        )

        # Liability
        Liability.objects.get_or_create(
            name='SBA startup loan', defaults={
                'currency': usd, 'principal': Decimal('15000'), 'balance': Decimal('12500'),
                'account': bank, 'opened_at': today - timedelta(days=240),
            }
        )

        # Tasks
        t1, _ = Task.objects.get_or_create(
            title='Reconcile October bank statement',
            defaults={
                'description': 'Match every Stripe payout to the corresponding bank deposit.',
                'assigned_to': std_user, 'created_by': admin_user,
                'priority': Task.HIGH, 'due_date': today + timedelta(days=5),
            },
        )
        TaskComment.objects.get_or_create(
            task=t1, body='Downloaded Stripe CSV, working through it.', author=std_user,
        )
        Task.objects.get_or_create(
            title='Upload Shopify orders for last month',
            defaults={
                'description': 'Export Shopify > Orders > CSV and import via /imports page.',
                'assigned_to': std_user, 'created_by': admin_user,
                'priority': Task.MEDIUM, 'status': Task.IN_PROGRESS,
            },
        )
        Task.objects.get_or_create(
            title='Prepare Q1 P&L for investors',
            defaults={
                'description': 'Export P&L from reports, polish into PDF.',
                'assigned_to': admin_user, 'created_by': admin_user,
                'priority': Task.HIGH, 'status': Task.OPEN,
            },
        )

        self.stdout.write(self.style.SUCCESS('Seeded Sakan Home demo data.'))
        self.stdout.write('')
        self.stdout.write('Login credentials:')
        self.stdout.write('  Admin    → username: admin   password: admin12345')
        self.stdout.write('  Standard → username: user    password: user12345')
