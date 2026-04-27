from rest_framework import generics, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Goal, GoalDeposit
from .serializers import GoalSerializer, GoalDepositSerializer


class GoalListCreateView(generics.ListCreateAPIView):
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'category']
    ordering_fields = ['created_at', 'target_date', 'target_amount']

    def get_queryset(self):
        queryset = Goal.objects.filter(user=self.request.user)
        category = self.request.query_params.get('category')
        status = self.request.query_params.get('status')
        if category:
            queryset = queryset.filter(category=category)
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class GoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)


class GoalDepositListCreateView(generics.ListCreateAPIView):
    serializer_class = GoalDepositSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GoalDeposit.objects.filter(user=self.request.user, goal_id=self.kwargs['goal_id'])

    def perform_create(self, serializer):
        goal = generics.get_object_or_404(Goal, id=self.kwargs['goal_id'], user=self.request.user)
        serializer.save(user=self.request.user, goal=goal)
