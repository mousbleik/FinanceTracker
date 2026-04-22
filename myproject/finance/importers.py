"""CSV importers for Shopify orders, Stripe payouts, and a generic expenses template."""
import csv
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Iterable, Tuple

from django.db import transaction

from .models import (
    Currency, Customer, Order, OrderItem, Expense, Payment, Vendor,
    Category, Account, ImportBatch,
)


def _decode_file(file_obj) -> str:
    data = file_obj.read()
    if isinstance(data, bytes):
        for encoding in ('utf-8-sig', 'utf-8', 'latin-1'):
            try:
                return data.decode(encoding)
            except UnicodeDecodeError:
                continue
        return data.decode('utf-8', errors='replace')
    return data


def _read_rows(file_obj) -> Iterable[dict]:
    text = _decode_file(file_obj)
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        yield {(k or '').strip(): (v if v is not None else '') for k, v in row.items()}


def _parse_decimal(val, default=Decimal('0')) -> Decimal:
    if val is None or val == '':
        return default
    try:
        return Decimal(str(val).replace(',', '').strip())
    except (InvalidOperation, ValueError):
        return default


def _parse_date(val):
    if not val:
        return None
    val = str(val).strip()
    # Accept several common formats
    for fmt in ('%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d %H:%M:%S %z', '%Y-%m-%dT%H:%M:%S%z',
                '%m/%d/%Y', '%d/%m/%Y'):
        try:
            return datetime.strptime(val[:len(fmt) + 5] if '%z' in fmt else val[:len(fmt) + 2], fmt).date()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(val.replace('Z', '+00:00')).date()
    except ValueError:
        return None


def _currency(code: str) -> Currency:
    code = (code or 'USD').upper().strip() or 'USD'
    cur, _ = Currency.objects.get_or_create(code=code, defaults={'name': code})
    return cur


# ---- Shopify orders ----
# Expected columns (standard Shopify export):
#   Name, Email, Financial Status, Paid at, Subtotal, Shipping, Taxes, Total,
#   Currency, Lineitem quantity, Lineitem name, Lineitem price, Lineitem sku
# Shopify exports one row per line item; rows with same Name belong to one order.

@transaction.atomic
def import_shopify_orders(file_obj, batch: ImportBatch) -> Tuple[int, int, list]:
    rows = list(_read_rows(file_obj))
    batch.row_count = len(rows)

    success = 0
    errors: list[str] = []
    orders_by_name: dict[str, Order] = {}

    for i, row in enumerate(rows, start=2):
        try:
            name = row.get('Name') or row.get('Order') or ''
            if not name:
                continue
            currency = _currency(row.get('Currency') or 'USD')

            order = orders_by_name.get(name)
            if order is None:
                placed = _parse_date(row.get('Paid at') or row.get('Created at') or '') or datetime.utcnow().date()
                status_raw = (row.get('Financial Status') or '').lower()
                status = {
                    'paid': Order.PAID,
                    'refunded': Order.REFUNDED,
                    'partially_refunded': Order.REFUNDED,
                    'voided': Order.CANCELLED,
                }.get(status_raw, Order.PENDING)

                customer = None
                email = (row.get('Email') or '').strip()
                cname = (row.get('Billing Name') or row.get('Shipping Name') or email or 'Customer').strip()
                if email or cname:
                    customer, _ = Customer.objects.get_or_create(
                        email=email, defaults={'name': cname or email}
                    )

                order = Order.objects.create(
                    external_id=name,
                    source=Order.SHOPIFY,
                    customer=customer,
                    placed_at=placed,
                    currency=currency,
                    subtotal=_parse_decimal(row.get('Subtotal')),
                    tax=_parse_decimal(row.get('Taxes')),
                    shipping=_parse_decimal(row.get('Shipping')),
                    total=_parse_decimal(row.get('Total')),
                    status=status,
                )
                orders_by_name[name] = order

            item_name = row.get('Lineitem name') or row.get('Name')
            qty = _parse_decimal(row.get('Lineitem quantity'), Decimal('1'))
            price = _parse_decimal(row.get('Lineitem price'))
            sku = row.get('Lineitem sku') or ''
            if item_name:
                OrderItem.objects.create(
                    order=order, sku=sku, name=item_name,
                    quantity=qty, unit_price=price,
                )
            success += 1
        except Exception as exc:  # pragma: no cover
            errors.append(f'Row {i}: {exc}')

    batch.success_count = success
    batch.error_count = len(errors)
    batch.log = '\n'.join(errors)
    batch.save()
    return success, len(errors), errors


# ---- Stripe payouts / balance transactions ----
# Expected columns from Stripe's balance report:
#   id, Type, Created (UTC), Amount, Fee, Net, Currency, Description

@transaction.atomic
def import_stripe_payouts(file_obj, batch: ImportBatch, stripe_account: Account = None) -> Tuple[int, int, list]:
    rows = list(_read_rows(file_obj))
    batch.row_count = len(rows)

    if stripe_account is None:
        default_cur = _currency('USD')
        stripe_account, _ = Account.objects.get_or_create(
            name='Stripe', defaults={'type': Account.STRIPE, 'currency': default_cur}
        )
    vendor_stripe, _ = Vendor.objects.get_or_create(name='Stripe')
    cat_fees, _ = Category.objects.get_or_create(name='Processing fees', kind=Category.EXPENSE)

    success = 0
    errors: list[str] = []

    for i, row in enumerate(rows, start=2):
        try:
            currency = _currency(row.get('Currency') or 'USD')
            amount = _parse_decimal(row.get('Amount'))
            fee = _parse_decimal(row.get('Fee'))
            net = _parse_decimal(row.get('Net'), amount - fee)
            date = (
                _parse_date(row.get('Created (UTC)'))
                or _parse_date(row.get('Created'))
                or _parse_date(row.get('Available On (UTC)'))
                or datetime.utcnow().date()
            )
            descr = row.get('Description') or row.get('Type') or 'Stripe transaction'

            if amount > 0:
                Payment.objects.create(
                    direction=Payment.IN, date=date, account=stripe_account,
                    currency=currency, amount=amount, method='stripe', memo=descr,
                )
            elif amount < 0:
                Payment.objects.create(
                    direction=Payment.OUT, date=date, account=stripe_account,
                    currency=currency, amount=-amount, method='stripe', memo=descr,
                )

            if fee and fee > 0:
                Expense.objects.create(
                    date=date, vendor=vendor_stripe, category=cat_fees,
                    currency=currency, amount=fee, account=stripe_account,
                    memo=f'Stripe fee: {descr}',
                )
            success += 1
        except Exception as exc:  # pragma: no cover
            errors.append(f'Row {i}: {exc}')

    batch.success_count = success
    batch.error_count = len(errors)
    batch.log = '\n'.join(errors)
    batch.save()
    return success, len(errors), errors


# ---- Generic expenses template ----
# Expected columns: date, vendor, category, currency, amount, account, memo

@transaction.atomic
def import_generic_expenses(file_obj, batch: ImportBatch) -> Tuple[int, int, list]:
    rows = list(_read_rows(file_obj))
    batch.row_count = len(rows)

    success = 0
    errors: list[str] = []

    for i, row in enumerate(rows, start=2):
        try:
            date = _parse_date(row.get('date')) or datetime.utcnow().date()
            currency = _currency(row.get('currency') or 'USD')
            amount = _parse_decimal(row.get('amount'))
            if amount <= 0:
                errors.append(f'Row {i}: amount must be > 0')
                continue

            vendor = None
            vname = (row.get('vendor') or '').strip()
            if vname:
                vendor, _ = Vendor.objects.get_or_create(name=vname)

            category = None
            cname = (row.get('category') or '').strip()
            if cname:
                category, _ = Category.objects.get_or_create(name=cname, kind=Category.EXPENSE)

            account = None
            aname = (row.get('account') or '').strip()
            if aname:
                account = Account.objects.filter(name=aname).first()

            Expense.objects.create(
                date=date, vendor=vendor, category=category,
                currency=currency, amount=amount, account=account,
                memo=row.get('memo') or '',
            )
            success += 1
        except Exception as exc:  # pragma: no cover
            errors.append(f'Row {i}: {exc}')

    batch.success_count = success
    batch.error_count = len(errors)
    batch.log = '\n'.join(errors)
    batch.save()
    return success, len(errors), errors
