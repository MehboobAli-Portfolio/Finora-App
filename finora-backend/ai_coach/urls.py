from django.urls import path
from .views import ai_chat_view

urlpatterns = [
    path('chat/', ai_chat_view, name='ai_chat'),
]
