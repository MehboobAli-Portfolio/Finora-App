from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from .models import Goal
from .serializers import GoalSerializer


class GoalListCreateView(generics.ListCreateAPIView):
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'goal_type']
    ordering_fields = ['created_at', 'target_date', 'target_amount']

    def get_queryset(self):
        queryset = Goal.objects.filter(user=self.request.user)
        goal_type = self.request.query_params.get('type')
        is_completed = self.request.query_params.get('completed')
        if goal_type:
            queryset = queryset.filter(goal_type=goal_type)
        if is_completed is not None:
            queryset = queryset.filter(is_completed=is_completed.lower() == 'true')
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class GoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)
