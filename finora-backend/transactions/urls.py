from django.urls import path
from .views import TransactionListCreateView, TransactionDetailView, scan_receipt_view

urlpatterns = [
    path('scan/', scan_receipt_view, name='transaction-scan'),
    path('', TransactionListCreateView.as_view(), name='transaction-list'),
    path('<uuid:pk>/', TransactionDetailView.as_view(), name='transaction-detail'),
]
