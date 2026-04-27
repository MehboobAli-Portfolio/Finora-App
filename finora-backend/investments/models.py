import uuid
from django.db import models
from django.conf import settings


class Asset(models.Model):
    ASSET_TYPE_CHOICES = [
        ('stock', 'Stock'),
        ('crypto', 'Cryptocurrency'),
        ('forex', 'Forex'),
        ('etf', 'ETF'),
        ('commodity', 'Commodity'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    symbol = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES)
    exchange = models.CharField(max_length=50)
    sector = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.symbol})"


class Holding(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='holdings')
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='holders')
    quantity = models.DecimalField(max_digits=18, decimal_places=8)
    avg_buy_price = models.DecimalField(max_digits=18, decimal_places=8)
    current_price = models.DecimalField(max_digits=18, decimal_places=8, default=0)
    unrealized_pnl = models.DecimalField(max_digits=18, decimal_places=8, default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'asset')

    def __str__(self):
        return f"{self.user.email} - {self.asset.symbol}"


class PriceHistory(models.Model):
    INTERVAL_CHOICES = [
        ('1m', '1 Minute'),
        ('1h', '1 Hour'),
        ('1d', '1 Day'),
        ('1w', '1 Week'),
    ]

    # BigAutoField as requested for fast inserts
    id = models.BigAutoField(primary_key=True)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='prices')
    open = models.DecimalField(max_digits=18, decimal_places=8)
    high = models.DecimalField(max_digits=18, decimal_places=8)
    low = models.DecimalField(max_digits=18, decimal_places=8)
    close = models.DecimalField(max_digits=18, decimal_places=8)
    volume = models.BigIntegerField()
    interval = models.CharField(max_length=5, choices=INTERVAL_CHOICES)
    recorded_at = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['asset', 'interval', 'recorded_at']),
        ]
        verbose_name_plural = "Price histories"
