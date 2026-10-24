from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, ProfileView, dashboard_view, password_reset_request_view, password_reset_confirm_view, logout_view

urlpatterns = [
    path('register/',  RegisterView.as_view(),      name='register'),
    path('login/',     TokenObtainPairView.as_view(), name='login'),
    path('refresh/',   TokenRefreshView.as_view(),   name='token_refresh'),
    path('profile/',   ProfileView.as_view(),        name='profile'),
    path('dashboard/', dashboard_view,               name='dashboard'),
    path('password-reset/',  password_reset_request_view, name='password-reset-request'),
    path('password-reset/confirm/',  password_reset_confirm_view, name='password-reset-confirm'),
    path('logout/',    logout_view,                  name='logout'),
]
