from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from .models import Investment
from .serializers import InvestmentSerializer


class InvestmentListCreateView(generics.ListCreateAPIView):
    serializer_class = InvestmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'symbol', 'investment_type']
    ordering_fields = ['purchase_date', 'amount', 'current_value']

    def get_queryset(self):
        queryset = Investment.objects.filter(user=self.request.user)
        investment_type = self.request.query_params.get('type')
        if investment_type:
            queryset = queryset.filter(investment_type=investment_type)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InvestmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InvestmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user)
