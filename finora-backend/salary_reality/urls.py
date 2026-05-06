from django.urls import path
from .views import analyse_view, SalaryProfileView

urlpatterns = [
    path('analyse/', analyse_view, name='salary-analyse'),
    path('profile/', SalaryProfileView.as_view(), name='salary-profile'),
]
