from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/expenses/', include('expenses.urls')),
    path('api/goals/', include('goals.urls')),
    path('api/investments/', include('investments.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
