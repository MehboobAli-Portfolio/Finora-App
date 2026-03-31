from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'username', 'is_staff', 'created_at')
    search_fields = ('email', 'full_name', 'username')
    ordering = ('-created_at',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Finora Profile', {'fields': ('full_name', 'avatar', 'monthly_budget', 'currency')}),
    )
