from django.contrib import admin
from .models import (
    Currency, FxRate, Account, Category, Vendor, Customer,
    Order, OrderItem, Expense, Asset, Liability, Payment, ImportBatch,
)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')


@admin.register(FxRate)
class FxRateAdmin(admin.ModelAdmin):
    list_display = ('currency', 'date', 'rate_to_usd')
    list_filter = ('currency',)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'currency', 'opening_balance', 'active')
    list_filter = ('type', 'currency', 'active')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'kind', 'parent')
    list_filter = ('kind',)


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact')
    search_fields = ('name',)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'external_id')
    search_fields = ('name', 'email', 'external_id')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'placed_at', 'customer', 'total', 'currency', 'status', 'source')
    list_filter = ('status', 'source', 'currency')
    inlines = [OrderItemInline]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('date', 'vendor', 'category', 'amount', 'currency', 'account')
    list_filter = ('currency', 'category')


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('name', 'purchase_date', 'cost', 'currency', 'disposed_at')


@admin.register(Liability)
class LiabilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'balance', 'currency')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('date', 'direction', 'amount', 'currency', 'account', 'method')
    list_filter = ('direction', 'method', 'currency')


@admin.register(ImportBatch)
class ImportBatchAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'source', 'row_count', 'success_count', 'error_count', 'created_by')
    list_filter = ('source',)
