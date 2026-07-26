from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.db.models import Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from .models import Transaction
from .serializers import TransactionSerializer
import re

READER = None
_OCR_UNAVAILABLE = False


def _get_receipt_reader():
    """Lazy-load EasyOCR so Django can start without easyocr installed."""
    global READER, _OCR_UNAVAILABLE
    if _OCR_UNAVAILABLE:
        return None
    if READER is None:
        try:
            import easyocr
        except ImportError:
            _OCR_UNAVAILABLE = True
            return None
        try:
            READER = easyocr.Reader(['en'])
        except Exception:
            _OCR_UNAVAILABLE = True
            return None
    return READER


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def scan_receipt_view(request):
    reader = _get_receipt_reader()
    if reader is None:
        return Response(
            {
                'error': (
                    'Receipt scanning needs the easyocr package. '
                    'Install it in your virtualenv: pip install easyocr'
                )
            },
            status=503,
        )

    file_obj = request.FILES.get('receipt')
    if not file_obj:
        return Response({'error': 'No receipt image provided'}, status=400)

    image_bytes = file_obj.read()
    results = reader.readtext(image_bytes, detail=0)
    raw_text = " ".join(results).lower()

    # ── Multi-currency amount extraction ──────────────────────────────
    # Matches: $100.50, Rs 1500, Rs.1500, PKR 25000, ₹500, 1,500.00,
    # and plain large numbers like 25000 (common in PKR receipts)
    amount_patterns = [
        r'(?:rs\.?|pkr|₹|\$|inr|aed|sar)\s*([\d,]+(?:\.\d{1,2})?)',  # Currency prefix
        r'([\d,]+\.\d{2})',                                            # Decimal amounts
        r'total\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)',                   # "Total: 1500"
        r'amount\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)',                  # "Amount: 1500"
        r'grand\s*total\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)',           # "Grand Total"
    ]

    max_amount = 0.0
    for pattern in amount_patterns:
        matches = re.findall(pattern, raw_text)
        for amt_str in matches:
            try:
                val = float(amt_str.replace(',', ''))
                if val > max_amount:
                    max_amount = val
            except ValueError:
                pass

    # ── Category detection with local + international merchants ───────
    category = "other"
    food_keywords = [
        'coffee', 'restaurant', 'cafe', 'food', 'mcdonald', 'starbucks',
        'burger', 'pizza', 'kfc', 'subway', 'foodpanda', 'daraz food',
        'student biryani', 'dominos', 'bakery', 'sweets', 'chai',
        'dhaba', 'eatery', 'kitchen', 'dine', 'meal',
    ]
    transport_keywords = [
        'uber', 'lyft', 'taxi', 'gas', 'shell', 'chevron', 'flight',
        'careem', 'indrive', 'bykea', 'petrol', 'fuel', 'pso', 'caltex',
        'airline', 'parking', 'toll', 'metro', 'bus',
    ]
    rent_keywords = ['rent', 'apartment', 'lease', 'housing', 'property']
    shopping_keywords = [
        'daraz', 'amazon', 'ali express', 'mall', 'store', 'mart',
        'clothing', 'fashion', 'shoes', 'electronics',
    ]
    health_keywords = [
        'pharmacy', 'hospital', 'clinic', 'doctor', 'medical',
        'medicine', 'lab', 'diagnostic', 'dental',
    ]

    if any(w in raw_text for w in food_keywords):
        category = "food"
    elif any(w in raw_text for w in transport_keywords):
        category = "transport"
    elif any(w in raw_text for w in rent_keywords):
        category = "rent"
    elif any(w in raw_text for w in shopping_keywords):
        category = "shopping"
    elif any(w in raw_text for w in health_keywords):
        category = "health"

    return Response({
        'amount': max_amount,
        'category': category,
        'raw_text': raw_text
    })


class TransactionListCreateView(generics.ListCreateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description', 'category']
    ordering_fields = ['date', 'amount', 'created_at']

    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user)
        category = self.request.query_params.get('category')
        txn_type = self.request.query_params.get('type')
        if category:
            queryset = queryset.filter(category=category)
        if txn_type:
            queryset = queryset.filter(txn_type=txn_type)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transactions_analytics_view(request):
    """
    Returns daily expense totals for the heatmap (last 60 days to ensure enough data).
    """
    user = request.user
    sixty_days_ago = timezone.now() - timedelta(days=60)
    
    # Expenses
    daily_qs = Transaction.objects.filter(
        user=user, 
        txn_type='expense', 
        date__gte=sixty_days_ago
    )
    daily = daily_qs.values('date').annotate(total=Sum('amount')).order_by('date')
    daily_spending = [{"date": str(d['date']), "total": float(d['total'])} for d in daily if d['date']]

    # Income
    income_qs = Transaction.objects.filter(
        user=user, 
        txn_type='income', 
        date__gte=sixty_days_ago
    )
    income_daily = income_qs.values('date').annotate(total=Sum('amount')).order_by('date')
    daily_income = [{"date": str(d['date']), "total": float(d['total'])} for d in income_daily if d['date']]

    return Response({
        'daily_spending': daily_spending,
        'daily_income': daily_income,
    })
