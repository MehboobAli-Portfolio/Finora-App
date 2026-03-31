from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'amount', 'category', 'transaction_type', 'date')
    list_filter = ('transaction_type', 'category', 'date')
    search_fields = ('title', 'user__email')
    ordering = ('-date',)
