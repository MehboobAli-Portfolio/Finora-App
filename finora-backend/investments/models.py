from django.db import models
from django.conf import settings


class Investment(models.Model):
    INVESTMENT_TYPES = [
        ('stocks', 'Stocks'),
        ('crypto', 'Cryptocurrency'),
        ('real_estate', 'Real Estate'),
        ('bonds', 'Bonds'),
        ('mutual_funds', 'Mutual Funds'),
        ('etf', 'ETF'),
        ('gold', 'Gold'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='investments')
    name = models.CharField(max_length=200)
    symbol = models.CharField(max_length=20, blank=True)
    investment_type = models.CharField(max_length=20, choices=INVESTMENT_TYPES, default='stocks')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchase_date = models.DateField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-purchase_date']

    @property
    def return_amount(self):
        return float(self.current_value) - float(self.amount)

    @property
    def return_percentage(self):
        if self.amount == 0:
            return 0
        return round(((float(self.current_value) - float(self.amount)) / float(self.amount)) * 100, 2)

    def __str__(self):
        return f"{self.user.email} - {self.name}"
