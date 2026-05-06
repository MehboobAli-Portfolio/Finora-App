from django.urls import path
from .views import insight_view, chat_view, chat_history_view

urlpatterns = [
    path('insight/', insight_view, name='ai-insight'),
    path('chat/',    chat_view,    name='ai-chat'),
    path('chat/history/', chat_history_view, name='ai-chat-history'),
]
