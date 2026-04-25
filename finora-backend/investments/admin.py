from django.contrib import admin
from .models import Asset, Holding, PriceHistory


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('name', 'symbol', 'asset_type', 'exchange', 'is_active')
    list_filter = ('asset_type', 'exchange', 'is_active')
    search_fields = ('name', 'symbol')


@admin.register(Holding)
class HoldingAdmin(admin.ModelAdmin):
    list_display = ('user', 'asset', 'quantity', 'avg_buy_price', 'current_price', 'last_updated')
    list_filter = ('last_updated',)
    search_fields = ('user__email', 'asset__symbol')


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ('asset', 'interval', 'close', 'recorded_at')
    list_filter = ('interval', 'recorded_at')
