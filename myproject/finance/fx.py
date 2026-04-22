"""FX conversion helpers. All reports normalise to USD."""
from datetime import date as _date
from decimal import Decimal
from typing import Optional

from .models import Currency, FxRate


def get_rate_to_usd(currency: Currency, on_date: _date) -> Optional[Decimal]:
    """Return the FX rate for `currency` on or before `on_date`.

    USD always has rate 1. For other currencies, use the latest rate on or
    before the requested date; fall back to the earliest known rate if none
    exists before that point. Returns None if no rate is on file at all.
    """
    if currency.code == 'USD':
        return Decimal('1')

    rate = (
        FxRate.objects.filter(currency=currency, date__lte=on_date)
        .order_by('-date')
        .first()
    )
    if rate is None:
        rate = FxRate.objects.filter(currency=currency).order_by('date').first()
    return rate.rate_to_usd if rate else None


def to_usd(amount: Decimal, currency: Currency, on_date: _date) -> Decimal:
    rate = get_rate_to_usd(currency, on_date)
    if rate is None:
        return Decimal('0')
    return (Decimal(amount) * rate).quantize(Decimal('0.01'))
