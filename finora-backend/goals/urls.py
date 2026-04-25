from django.urls import path
from .views import GoalListCreateView, GoalDetailView, GoalDepositListCreateView

urlpatterns = [
    path('', GoalListCreateView.as_view(), name='goal-list'),
    path('<uuid:pk>/', GoalDetailView.as_view(), name='goal-detail'),
    path('<uuid:goal_id>/deposits/', GoalDepositListCreateView.as_view(), name='goal-deposits'),
]
