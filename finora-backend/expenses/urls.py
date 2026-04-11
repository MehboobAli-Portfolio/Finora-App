from django.urls import path
from .views import ExpenseListCreateView, ExpenseDetailView, scan_receipt_view

urlpatterns = [
    path('scan/', scan_receipt_view, name='expense-scan'),
    path('', ExpenseListCreateView.as_view(), name='expense-list'),
    path('<int:pk>/', ExpenseDetailView.as_view(), name='expense-detail'),
]
