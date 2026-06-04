from django.urls import path
from .views import (
    TransactionListCreateView,
    TransactionDetailView,
    scan_receipt_view,
    transactions_analytics_view
)

urlpatterns = [
    path('', TransactionListCreateView.as_view(), name='transaction-list'),
    path('<uuid:pk>/', TransactionDetailView.as_view(), name='transaction-detail'),
    path('scan/', scan_receipt_view, name='scan-receipt'),
    path('analytics/', transactions_analytics_view, name='transaction-analytics'),
]
