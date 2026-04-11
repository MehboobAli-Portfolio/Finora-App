from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, ProfileView, dashboard_view, dashboard_insight_view, ai_chat_view

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('dashboard/', dashboard_view, name='dashboard'),
    path('dashboard-insight/', dashboard_insight_view, name='dashboard_insight'),
    path('chat/', ai_chat_view, name='ai_chat'),
]
