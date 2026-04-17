from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.utils import timezone
from django.db.models import Sum

from expenses.models import Expense
from expenses.serializers import ExpenseSerializer
from goals.models import Goal
from investments.models import Investment
from investments.serializers import InvestmentSerializer

from .ai_logic import FinoraAI


def _get_month_start():
    now = timezone.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _build_ai_engine(user, include_investments=False, include_categories=False, include_recent=False):
    """
    Helper: gather financial context for a user and return a loaded FinoraAI instance.
    """
    month_start = _get_month_start()

    expense_only = (
        Expense.objects.filter(user=user, date__gte=month_start, transaction_type='expense')
        .aggregate(total=Sum('amount'))['total'] or 0
    )
    total_income = (
        Expense.objects.filter(user=user, date__gte=month_start, transaction_type='income')
        .aggregate(total=Sum('amount'))['total'] or 0
    )
    balance       = float(total_income) - float(expense_only)
    goals_count   = Goal.objects.filter(user=user).count()
    completed     = Goal.objects.filter(user=user, is_completed=True).count()
    active_goals  = list(Goal.objects.filter(user=user, is_completed=False))

    spending_by_category = []
    if include_categories:
        rows = (
            Expense.objects.filter(user=user, date__gte=month_start, transaction_type='expense')
            .values('category')
            .annotate(total=Sum('amount'))
            .order_by('-total')[:5]
        )
        spending_by_category = [
            {'category': r['category'], 'total': float(r['total'] or 0)} for r in rows
        ]

    recent_transactions = []
    if include_recent:
        qs = Expense.objects.filter(user=user).order_by('-date')[:12]
        recent_transactions = ExpenseSerializer(qs, many=True).data

    investments = []
    if include_investments:
        inv_qs = Investment.objects.filter(user=user).order_by('-purchase_date')[:15]
        investments = InvestmentSerializer(inv_qs, many=True).data

    return FinoraAI(
        user=user,
        balance=balance,
        income=total_income,
        expenses=expense_only,
        budget=float(user.monthly_budget),
        goals_count=goals_count,
        completed_goals=completed,
        recent_transactions=recent_transactions,
        active_goals=active_goals,
        spending_by_category=spending_by_category,
        investments=investments,
    )


# ── Views ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def insight_view(request):
    """
    GET /api/ai/insight/
    Returns a single AI-generated daily financial suggestion for the dashboard.
    Lightweight — no recent transactions or investments loaded.
    """
    try:
        engine = _build_ai_engine(request.user)
        return Response({'ai_suggestion': engine.generate_daily_suggestion()})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_view(request):
    """
    POST /api/ai/chat/
    Body: { "message": "..." }
    Returns: { "reply": "..." }
    Full context: categories, recent transactions, investments.
    """
    message = request.data.get('message', '').strip()
    if not message:
        return Response({'error': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        engine = _build_ai_engine(
            request.user,
            include_investments=True,
            include_categories=True,
            include_recent=True,
        )
        reply = engine.process_chat_message(message)
        return Response({'reply': reply})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
