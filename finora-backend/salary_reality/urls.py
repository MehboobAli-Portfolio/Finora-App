from django.urls import path
from .views import analyse_view

urlpatterns = [
    path('analyse/', analyse_view, name='salary-analyse'),
]
