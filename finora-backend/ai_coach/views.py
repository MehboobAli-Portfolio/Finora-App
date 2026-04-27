from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.utils import timezone
from django.db.models import Sum

from transactions.models import Transaction
from transactions.serializers import TransactionSerializer
from goals.models import Goal
from investments.serializers import HoldingSerializer
from investments.models import Holding

from .ai_logic import FinoraAI
from .models import AIConversation, AIMessage


def _get_month_start():
    now = timezone.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _build_ai_engine(user, include_investments=False, include_categories=False, include_recent=False):
    """
    Helper: gather financial context for a user and return a loaded FinoraAI instance.
    """
    month_start = _get_month_start()

    expense_only = (
        Transaction.objects.filter(user=user, date__gte=month_start, txn_type='expense')
        .aggregate(total=Sum('amount'))['total'] or 0
    )
    total_income = (
        Transaction.objects.filter(user=user, date__gte=month_start, txn_type='income')
        .aggregate(total=Sum('amount'))['total'] or 0
    )
    balance       = float(total_income) - float(expense_only)
    goals_count   = Goal.objects.filter(user=user).count()
    completed     = Goal.objects.filter(user=user, status='completed').count()
    active_goals  = list(Goal.objects.filter(user=user, status='active'))

    spending_by_category = []
    if include_categories:
        rows = (
            Transaction.objects.filter(user=user, date__gte=month_start, txn_type='expense')
            .values('category')
            .annotate(total=Sum('amount'))
            .order_by('-total')[:5]
        )
        spending_by_category = [
            {'category': r['category'], 'total': float(r['total'] or 0)} for r in rows
        ]

    recent_transactions = []
    if include_recent:
        qs = Transaction.objects.filter(user=user).order_by('-date')[:12]
        recent_transactions = TransactionSerializer(qs, many=True).data

    investments = []
    if include_investments:
        inv_qs = Holding.objects.filter(user=user).order_by('-last_updated')[:15]
        investments = HoldingSerializer(inv_qs, many=True).data

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
    Body: { "message": "...", "conversation_id": "optional-uuid" }
    Returns: { "reply": "...", "intent": "...", "conversation_id": "..." }
    Full context: categories, recent transactions, investments.
    """
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
            title=message_text[:50] + "..." if len(message_text) > 50 else message_text
        )

    # Save User Message
    user_msg = AIMessage.objects.create(
        conversation=conversation,
        user=request.user,
        role='user',
        content=message_text
    )

    # Fetch last 15 messages for context
    recent_messages = conversation.messages.order_by('-created_at')[:15]
    chat_history = [
        {"role": m.role, "content": m.content, "intent": m.intent}
        for m in reversed(recent_messages)
    ]

    try:
        engine = _build_ai_engine(
            request.user,
            include_investments=True,
            include_categories=True,
            include_recent=True,
        )
        reply, intent, entities = engine.process_chat_message(message_text, chat_history=chat_history)
        
        # Save Assistant Reply
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
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history_view(request):
    """
    GET /api/ai/chat/history/
    Returns all user conversations with their messages.
    """
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
