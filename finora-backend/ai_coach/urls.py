from django.urls import path
from .views import insight_view, chat_view

urlpatterns = [
    path('insight/', insight_view, name='ai-insight'),
    path('chat/',    chat_view,    name='ai-chat'),
]
