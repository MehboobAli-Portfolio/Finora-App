from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from expenses.models import Expense
from goals.models import Goal
from .ai_logic import FinoraAI

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat_view(request):
    """Answers user queries based on their financial profile."""
    user = request.user
    message = request.data.get('message', '')
    
    # Pre-calculate simple profile context for the rule-based AI
    from django.utils import timezone
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    expenses_only = Expense.objects.filter(user=user, date__gte=month_start, transaction_type='expense').aggregate(total=Sum('amount'))['total'] or 0
    total_income = Expense.objects.filter(user=user, date__gte=month_start, transaction_type='income').aggregate(total=Sum('amount'))['total'] or 0
    balance = float(total_income) - float(expenses_only)
    goals_count = Goal.objects.filter(user=user).count()
    completed_goals = Goal.objects.filter(user=user, is_completed=True).count()
    
    ai_engine = FinoraAI(
        user=user, balance=balance, income=total_income, expenses=expenses_only,
        budget=user.monthly_budget, goals_count=goals_count, completed_goals=completed_goals,
        recent_transactions=[]
    )
    
    reply = ai_engine.process_chat_message(message)
    return Response({'reply': reply})
