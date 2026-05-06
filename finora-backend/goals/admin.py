from django.contrib import admin
from .models import Goal, GoalDeposit


class GoalDepositInline(admin.TabularInline):
    model = GoalDeposit
    extra = 0


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'category', 'target_amount', 'current_amount', 'status', 'deadline')
    list_filter = ('category', 'status', 'deadline')
    search_fields = ('name', 'user__email')
    inlines = [GoalDepositInline]


@admin.register(GoalDeposit)
class GoalDepositAdmin(admin.ModelAdmin):
    list_display = ('user', 'goal', 'amount', 'deposited_at')
    list_filter = ('deposited_at',)
