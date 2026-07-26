from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Sum, Case, When, DecimalField, Value
from django.db.models.functions import TruncWeek, TruncDate
from django.utils import timezone
from datetime import timedelta

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

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Single query: monthly + all-time aggregation via Case/When ────
    aggregates = Transaction.objects.filter(user=user).aggregate(
        monthly_income=Sum(
            Case(
                When(date__gte=month_start, txn_type='income', then='amount'),
                default=Value(0), output_field=DecimalField(),
            )
        ),
        monthly_expenses=Sum(
            Case(
                When(date__gte=month_start, txn_type='expense', then='amount'),
                default=Value(0), output_field=DecimalField(),
            )
        ),
        alltime_income=Sum(
            Case(
                When(txn_type='income', then='amount'),
                default=Value(0), output_field=DecimalField(),
            )
        ),
        alltime_expenses=Sum(
            Case(
                When(txn_type='expense', then='amount'),
                default=Value(0), output_field=DecimalField(),
            )
        ),
    )
    monthly_income = aggregates['monthly_income'] or 0
    monthly_expenses = aggregates['monthly_expenses'] or 0
    total_in = aggregates['alltime_income'] or 0
    total_ex = aggregates['alltime_expenses'] or 0
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

    # Spending by Category (All time, to handle older data)
    categories = Transaction.objects.filter(user=user, txn_type='expense').values('category').annotate(total=Sum('amount')).order_by('-total')
    spending_by_category = [{"label": c['category'], "value": float(c['total'])} for c in categories]

    # Income by Category (All time)
    income_categories = Transaction.objects.filter(user=user, txn_type='income').values('category').annotate(total=Sum('amount')).order_by('-total')
    income_by_category = [{"label": c['category'], "value": float(c['total'])} for c in income_categories]

    # Weekly Spending Trend (Last 8 weeks to capture older data nicely)
    eight_weeks_ago = now - timedelta(days=56)
    weekly_qs = Transaction.objects.filter(user=user, txn_type='expense', date__gte=eight_weeks_ago)
    weekly = weekly_qs.annotate(week=TruncWeek('date')).values('week').annotate(total=Sum('amount')).order_by('week')
    weekly_spending = [{"date": str(w['week']) if w['week'] else '', "total": float(w['total'])} for w in weekly]

    return Response({
        'balance': balance,
        'total_income': float(monthly_income),
        'total_expenses': float(monthly_expenses),
        'alltime_income': float(total_in),
        'alltime_expenses': float(total_ex),
        'total_investments': total_investments,
        'goals_count': goals_count,
        'completed_goals': completed_goals,
        'monthly_budget': float(user.monthly_budget),
        'recent_transactions': recent_data,
        'spending_by_category': spending_by_category,
        'income_by_category': income_by_category,
        'weekly_spending': weekly_spending,
    })

