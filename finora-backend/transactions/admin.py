from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'txn_type', 'amount', 'category', 'date', 'created_at')
    list_filter = ('txn_type', 'category', 'date')
    search_fields = ('description', 'user__email')
    ordering = ('-date',)
    readonly_fields = ('id', 'created_at')
