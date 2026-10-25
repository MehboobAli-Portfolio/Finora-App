from django.urls import path
from .views import insight_view, chat_view, chat_stream_view, chat_history_view

urlpatterns = [
    path('insight/',       insight_view,       name='ai-insight'),
    path('chat/',          chat_view,          name='ai-chat'),
    path('chat/stream/',   chat_stream_view,   name='ai-chat-stream'),
    path('chat/history/',  chat_history_view,  name='ai-chat-history'),
]
