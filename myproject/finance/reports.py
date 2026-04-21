"""Financial reports: P&L, cash flow, balance sheet — all normalised to USD."""
from collections import defaultdict
from datetime import date as _date
from decimal import Decimal

from .fx import to_usd
from .models import Account, Expense, Order, Payment, Asset, Liability


Z = Decimal('0')


def profit_and_loss(start: _date, end: _date) -> dict:
    """Revenue (paid orders) and expenses in USD for [start, end]."""
    revenue_by_cat = defaultdict(lambda: Z)
    revenue_total = Z
    for order in Order.objects.filter(
        placed_at__gte=start, placed_at__lte=end, status=Order.PAID
    ).select_related('currency'):
        usd = to_usd(order.total, order.currency, order.placed_at)
        revenue_by_cat['Sales'] += usd
        revenue_total += usd

    expense_by_cat = defaultdict(lambda: Z)
    expense_total = Z
    for exp in Expense.objects.filter(
        date__gte=start, date__lte=end
    ).select_related('currency', 'category'):
        usd = to_usd(exp.amount, exp.currency, exp.date)
        label = exp.category.name if exp.category_id else 'Uncategorized'
        expense_by_cat[label] += usd
        expense_total += usd

    return {
        'start': start.isoformat(),
        'end': end.isoformat(),
        'base_currency': 'USD',
        'revenue': {k: float(v) for k, v in revenue_by_cat.items()},
        'revenue_total': float(revenue_total),
        'expenses': {k: float(v) for k, v in expense_by_cat.items()},
        'expenses_total': float(expense_total),
        'net_profit': float(revenue_total - expense_total),
    }


def cash_flow(start: _date, end: _date) -> dict:
    """Incoming and outgoing payments in USD for [start, end], grouped by account."""
    by_account: dict[str, dict] = defaultdict(lambda: {'in': Z, 'out': Z, 'net': Z})
    inflow_total = Z
    outflow_total = Z

    for p in Payment.objects.filter(
        date__gte=start, date__lte=end
    ).select_related('currency', 'account'):
        usd = to_usd(p.amount, p.currency, p.date)
        row = by_account[p.account.name]
        if p.direction == Payment.IN:
            row['in'] += usd
            inflow_total += usd
        else:
            row['out'] += usd
            outflow_total += usd
        row['net'] = row['in'] - row['out']

    return {
        'start': start.isoformat(),
        'end': end.isoformat(),
        'base_currency': 'USD',
        'by_account': {
            k: {'in': float(v['in']), 'out': float(v['out']), 'net': float(v['net'])}
            for k, v in by_account.items()
        },
        'inflow_total': float(inflow_total),
        'outflow_total': float(outflow_total),
        'net_cash_flow': float(inflow_total - outflow_total),
    }


def balance_sheet(as_of: _date) -> dict:
    """Assets (cash + fixed) and liabilities in USD as of a date."""
    cash_by_account = {}
    cash_total = Z
    for acc in Account.objects.filter(active=True).select_related('currency'):
        balance = acc.opening_balance or Z
        for p in acc.payments.filter(date__lte=as_of):
            if p.direction == Payment.IN:
                balance += p.amount
            else:
                balance -= p.amount
        usd = to_usd(balance, acc.currency, as_of)
        cash_by_account[acc.name] = float(usd)
        cash_total += usd

    fixed_assets_total = Z
    fixed_assets = []
    for a in Asset.objects.filter(purchase_date__lte=as_of).select_related('currency'):
        if a.disposed_at and a.disposed_at <= as_of:
            continue
        usd = to_usd(a.cost, a.currency, a.purchase_date)
        fixed_assets.append({'name': a.name, 'usd': float(usd)})
        fixed_assets_total += usd

    liabilities_total = Z
    liabilities = []
    for lia in Liability.objects.all().select_related('currency'):
        usd = to_usd(lia.balance, lia.currency, as_of)
        liabilities.append({'name': lia.name, 'usd': float(usd)})
        liabilities_total += usd

    total_assets = cash_total + fixed_assets_total
    return {
        'as_of': as_of.isoformat(),
        'base_currency': 'USD',
        'cash_by_account': cash_by_account,
        'cash_total': float(cash_total),
        'fixed_assets': fixed_assets,
        'fixed_assets_total': float(fixed_assets_total),
        'total_assets': float(total_assets),
        'liabilities': liabilities,
        'liabilities_total': float(liabilities_total),
        'equity': float(total_assets - liabilities_total),
    }
