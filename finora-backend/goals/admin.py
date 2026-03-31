from django.contrib import admin
from .models import Goal


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'goal_type', 'target_amount', 'current_amount', 'progress_percentage', 'is_completed')
    list_filter = ('goal_type', 'is_completed')
    search_fields = ('title', 'user__email')
