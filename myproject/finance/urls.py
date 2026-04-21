from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views


router = DefaultRouter()
router.register(r'currencies', views.CurrencyViewSet)
router.register(r'fxrates', views.FxRateViewSet)
router.register(r'accounts', views.AccountViewSet)
router.register(r'categories', views.CategoryViewSet)
router.register(r'vendors', views.VendorViewSet)
router.register(r'customers', views.CustomerViewSet)
router.register(r'orders', views.OrderViewSet)
router.register(r'expenses', views.ExpenseViewSet)
router.register(r'assets', views.AssetViewSet)
router.register(r'liabilities', views.LiabilityViewSet)
router.register(r'payments', views.PaymentViewSet)
router.register(r'imports', views.ImportBatchViewSet)
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'task-comments', views.TaskCommentViewSet, basename='taskcomment')
router.register(r'audit-logs', views.AuditLogViewSet, basename='auditlog')


urlpatterns = [
    path('auth/login/', views.LoginView.as_view(), name='api-login'),
    path('auth/logout/', views.LogoutView.as_view(), name='api-logout'),
    path('auth/me/', views.MeView.as_view(), name='api-me'),
    path('imports/shopify-orders/', views.ShopifyImportView.as_view()),
    path('imports/stripe-payouts/', views.StripeImportView.as_view()),
    path('imports/expenses-generic/', views.GenericExpensesImportView.as_view()),
    path('reports/pnl/', views.report_pnl),
    path('reports/cashflow/', views.report_cashflow),
    path('reports/balance-sheet/', views.report_balance_sheet),
    path('reports/dashboard/', views.dashboard_summary),
    path('broadcast/email/', views.BroadcastEmailView.as_view()),
    path('', include(router.urls)),
]
