from django.urls import path
from .views import (
    AssetListView,
    AssetDetailView,
    HoldingListCreateView,
    HoldingDetailView,
    PriceHistoryListView,
    live_quote_view,
    refresh_prices_view,
    search_symbol_view,
    investment_chart_view,
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
    # Live price lookup (any symbol)
    path('quote/', live_quote_view, name='live-quote'),
    # Refresh all market-tracked holdings
    path('refresh-prices/', refresh_prices_view, name='refresh-prices'),
    # Search for symbols
    path('search/', search_symbol_view, name='search-symbol'),
    # Chart data for symbol
    path('chart/', investment_chart_view, name='investment-chart'),
]
