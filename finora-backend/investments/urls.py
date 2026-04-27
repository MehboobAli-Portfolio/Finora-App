from django.urls import path
from .views import (
    AssetListView,
    AssetDetailView,
    HoldingListCreateView,
    HoldingDetailView,
    PriceHistoryListView,
)

urlpatterns = [
    # New asset catalog
    path('assets/', AssetListView.as_view(), name='asset-list'),
    path('assets/<uuid:pk>/', AssetDetailView.as_view(), name='asset-detail'),
    # User portfolio holdings
    path('holdings/', HoldingListCreateView.as_view(), name='holding-list'),
    path('holdings/<uuid:pk>/', HoldingDetailView.as_view(), name='holding-detail'),
    # Price history (for charts & AI)
    path('price-history/', PriceHistoryListView.as_view(), name='price-history'),
]
