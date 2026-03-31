from django.contrib import admin
from .models import Investment


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'symbol', 'investment_type', 'amount', 'current_value', 'return_percentage')
    list_filter = ('investment_type',)
    search_fields = ('name', 'symbol', 'user__email')
