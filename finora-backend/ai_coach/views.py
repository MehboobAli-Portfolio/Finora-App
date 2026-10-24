from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

from django.utils import timezone
from django.db.models import Sum, Case, When, DecimalField, Value

from transactions.models import Transaction
from transactions.serializers import TransactionSerializer
from goals.models import Goal
from investments.serializers import HoldingSerializer
from investments.models import Holding

from .ai_logic import FinoraAI
from .models import AIConversation, AIMessage
from .smart_router import SmartRouter


def _get_month_start():
    now = timezone.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


_CHAT_HISTORY_CHAR_CAP = 4000


def _build_ai_engine(user, include_investments=False, include_categories=False, include_recent=False):
    month_start = _get_month_start()
    aggregates = Transaction.objects.filter(user=user).aggregate(
        monthly_expenses=Sum(
            Case(
                When(date__gte=month_start, txn_type='expense', then='amount'),
                default=Value(0), output_field=DecimalField(),
            )
        ),
        monthly_income=Sum(
            Case(
                When(date__gte=month_start, txn_type='income', then='amount'),
                default=Value(0), output_field=DecimalField(),
            )
        ),
    )
    expense_only = aggregates['monthly_expenses'] or 0
    total_income = aggregates['monthly_income'] or 0
    balance = float(total_income) - float(expense_only)
    goals_count = Goal.objects.filter(user=user).count()
    completed = Goal.objects.filter(user=user, status='completed').count()
    active_goals = list(Goal.objects.filter(user=user, status='active'))
    spending_by_category = []
    if include_categories:
        rows = (
            Transaction.objects.filter(user=user, date__gte=month_start, txn_type='expense')
            .values('category')
            .annotate(total=Sum('amount'))
            .order_by('-total')[:5]
        )
        spending_by_category = [{'category': r['category'], 'total': float(r['total'] or 0)} for r in rows]
    recent_transactions = []
    if include_recent:
        qs = Transaction.objects.filter(user=user).order_by('-date')[:8]
        recent_transactions = TransactionSerializer(qs, many=True).data
    investments = []
    if include_investments:
        inv_qs = Holding.objects.filter(user=user).order_by('-last_updated')[:10]
        investments = HoldingSerializer(inv_qs, many=True).data
    return FinoraAI(
        user=user,
        balance=balance,
        income=total_income,
        expenses=expense_only,
        budget=float(user.monthly_budget or 0),
        goals_count=goals_count,
        completed_goals=completed,
        recent_transactions=recent_transactions,
        active_goals=active_goals,
        spending_by_category=spending_by_category,
        investments=investments,
    )


def _cap_chat_history(message_history, char_cap=_CHAT_HISTORY_CHAR_CAP):
    total = 0
    capped = []
    for m in reversed(message_history):
        entry_len = len(m.get('content', '')) + 50
        if total + entry_len > char_cap:
            break
        capped.insert(0, m)
        total += entry_len
    return capped


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def insight_view(request):
    try:
        engine = _build_ai_engine(
            request.user,
            include_investments=True,
            include_categories=True,
            include_recent=True,
        )
        insights = []
        if engine.balance < 0:
            insights.append('Your balance is negative. Focus on reducing expenses.')
        elif engine.balance > 0:
            insights.append(f'Your current balance is {engine.balance:.2f}.')
        if engine.budget > 0:
            pct = (engine.expenses / engine.budget) * 100 if engine.budget > 0 else 0
            if pct > 100:
                insights.append(f'You have exceeded your monthly budget by {pct - 100:.1f}%')
            elif pct > 80:
                insights.append(f'You have used {pct:.1f}% of your monthly budget.')
            else:
                insights.append(f'You are within budget ({pct:.1f}% used).')
        if engine.goals_count > 0:
            insights.append(f'You have {engine.goals_count} active goals, {engine.completed_goals} completed.')
        if not insights:
            insights.append('Keep tracking your finances to get personalized insights.')
        return Response({
            'insights': insights,
            'balance': engine.balance,
            'monthly_income': engine.income,
            'monthly_expenses': engine.expenses,
            'budget': engine.budget,
        })
    except Exception as e:
        logger.exception('AI insight failed: %s', str(e))
        return Response({'error': 'Insight service temporarily unavailable. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_view(request):
    message_text = request.data.get('message', '').strip()
    if not message_text:
        return Response({'error': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)
    conversation_id = request.data.get('conversation_id')
    if conversation_id:
        try:
            conversation = AIConversation.objects.get(id=conversation_id, user=request.user)
        except AIConversation.DoesNotExist:
            return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        conversation = AIConversation.objects.create(
            user=request.user,
            title=message_text[:50] + '...' if len(message_text) > 50 else message_text
        )
    user_msg = AIMessage.objects.create(
        conversation=conversation,
        user=request.user,
        role='user',
        content=message_text
    )
    recent_messages = conversation.messages.order_by('-created_at')[:15]
    chat_history = [
        {'role': m.role, 'content': m.content, 'intent': m.intent}
        for m in reversed(recent_messages)
    ]
    chat_history = _cap_chat_history(chat_history)
    try:
        engine = _build_ai_engine(
            request.user,
            include_investments=True,
            include_categories=True,
            include_recent=True,
        )
        router = SmartRouter(engine)
        reply, intent, entities = router.process_message(message_text, chat_history=chat_history)
        AIMessage.objects.create(
            conversation=conversation,
            user=request.user,
            role='assistant',
            content=reply,
            intent=intent,
            entities=entities
        )
        return Response({
            'reply': reply,
            'intent': intent,
            'entities': entities,
            'conversation_id': conversation.id
        })
    except Exception as e:
        logger.exception('AI chat failed: %s', str(e))
        return Response({'error': 'AI service temporarily unavailable. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history_view(request):
    conversations = AIConversation.objects.filter(user=request.user).order_by('-last_active')
    data = []
    for conv in conversations:
        messages = conv.messages.order_by('created_at')
        msg_data = [
            {
                'id': msg.id,
                'role': msg.role,
                'content': msg.content,
                'intent': msg.intent,
                'entities': msg.entities,
                'created_at': msg.created_at
            } for msg in messages
        ]
        data.append({
            'id': conv.id,
            'title': conv.title,
            'started_at': conv.started_at,
            'last_active': conv.last_active,
            'messages': msg_data
        })
    return Response(data)
