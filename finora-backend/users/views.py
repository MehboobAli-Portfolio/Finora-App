from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Sum

from transactions.models import Transaction
from goals.models import Goal
from investments.models import Holding
from transactions.serializers import TransactionSerializer

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    user = request.user

    from django.utils import timezone
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Monthly Transaction aggregation
    monthly_income = Transaction.objects.filter(
        user=user, date__gte=month_start, txn_type='income'
    ).aggregate(total=Sum('amount'))['total'] or 0

    monthly_expenses = Transaction.objects.filter(
        user=user, date__gte=month_start, txn_type='expense'
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Cumulative Balance
    total_in = Transaction.objects.filter(user=user, txn_type='income').aggregate(total=Sum('amount'))['total'] or 0
    total_ex = Transaction.objects.filter(user=user, txn_type='expense').aggregate(total=Sum('amount'))['total'] or 0
    balance = float(total_in) - float(total_ex)

    # Portfolio value
    holdings = Holding.objects.filter(user=user)
    total_investments = sum(h.market_value for h in holdings)

    # Goals summary
    goals_count = Goal.objects.filter(user=user).count()
    completed_goals = Goal.objects.filter(user=user, status='completed').count()

    # Recent transactions
    recent_transactions = Transaction.objects.filter(user=user).order_by('-date')[:5]
    recent_data = TransactionSerializer(recent_transactions, many=True).data

    return Response({
        'balance': balance,
        'total_income': float(monthly_income),
        'total_expenses': float(monthly_expenses),
        'total_investments': total_investments,
        'goals_count': goals_count,
        'completed_goals': completed_goals,
        'monthly_budget': float(user.monthly_budget),
        'recent_transactions': recent_data,
    })

