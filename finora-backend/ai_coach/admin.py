from django.contrib import admin
from .models import AIConversation, AIMessage, AIRecommendation


class AIMessageInline(admin.TabularInline):
    model = AIMessage
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(AIConversation)
class AIConversationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'started_at', 'last_active')
    list_filter = ('started_at', 'last_active')
    inlines = [AIMessageInline]


@admin.register(AIMessage)
class AIMessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'user', 'role', 'intent', 'created_at')
    list_filter = ('role', 'intent', 'created_at')


@admin.register(AIRecommendation)
class AIRecommendationAdmin(admin.ModelAdmin):
    list_display = ('user', 'asset', 'action', 'confidence', 'created_at')
    list_filter = ('action', 'created_at')
