from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Sum, Case, When, DecimalField, Value
from django.db.models.functions import TruncWeek, TruncDate
from django.utils import timezone
from datetime import timedelta

from transactions.models import Transaction
from goals.models import Goal
from investments.models import Holding
from transactions.serializers import TransactionSerializer

from .serializers import RegisterSerializer, UserSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer

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


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    """
    POST /api/auth/password-reset/
    Request a password reset email. Always returns success to prevent email enumeration.
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    users = User.objects.filter(email=email)

    if users.exists():
        user = users.first()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_link = f'{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}'

        try:
            send_mail(
                subject='Finora - Password Reset Request',
                message=f'Click the link to reset your password: {reset_link}',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception:
            # Log error but don't reveal to user
            pass

    # Always return success to prevent email enumeration
    return Response({'message': 'If an account exists with this email, a reset link has been sent.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """
    POST /api/auth/password-reset/confirm/
    Confirm password reset with uidb64 and token.
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(serializer.validated_data['uidb64']))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'error': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

    token = serializer.validated_data['token']
    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)

    # Set new password
    user.set_password(serializer.validated_data['password'])
    user.save()

    # Blacklist all existing tokens for this user (force re-login)
    try:
        tokens = OutstandingToken.objects.filter(user=user)
        for token_obj in tokens:
            BlacklistedToken.objects.get_or_create(token=token_obj)
    except Exception:
        pass

    return Response({'message': 'Password reset successfully. Please log in with your new password.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    POST /api/auth/logout/
    Blacklist the refresh token to invalidate it.
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass
    return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
