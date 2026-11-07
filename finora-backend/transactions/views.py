from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from .models import Transaction
from .serializers import TransactionSerializer
import re
import os

READER = None
_OCR_UNAVAILABLE = False

# Allowed file types for receipt uploads
ALLOWED_RECEIPT_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}
MAX_RECEIPT_SIZE_MB = 5
MAX_RECEIPT_SIZE_BYTES = MAX_RECEIPT_SIZE_MB * 1024 * 1024


def _validate_receipt_file(file_obj):
    """Validate uploaded receipt file type and size."""
    if not file_obj:
        return 'No receipt file provided'
    
    # Check file extension
    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in ALLOWED_RECEIPT_EXTENSIONS:
        return f'Invalid file type. Allowed: {", ".join(sorted(ALLOWED_RECEIPT_EXTENSIONS))}'
    
    # Check file size
    if file_obj.size > MAX_RECEIPT_SIZE_BYTES:
        return f'File too large. Maximum size: {MAX_RECEIPT_SIZE_MB}MB'
    
    # Check MIME type
    content_type = getattr(file_obj, 'content_type', '') or ''
    allowed_mimes = {'image/jpeg', 'image/png', 'application/pdf'}
    if content_type and content_type not in allowed_mimes:
        return f'Invalid MIME type: {content_type}'
    
    return None


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
            READER = easyocr.Reader(['en'], verbose=False)
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
    validation_error = _validate_receipt_file(file_obj)
    if validation_error:
        return Response({'error': validation_error}, status=400)

    image_bytes = file_obj.read()
    results = reader.readtext(image_bytes, detail=0)
    raw_text = " ".join(results).lower()

    # ── Prioritized amount extraction ─────────────────────────────────
    # Prioritizes explicit totals first so item codes or subtotals aren't mistaken for total
    total_patterns = [
        r'(?:grand\s*total|net\s*total|total\s*due|balance\s*due)\s*[:\-]?\s*(?:rs\.?|pkr|₹|\$|inr|aed|sar)?\s*([\d,]+(?:\.\d{1,2})?)',
        r'total\s*[:\-]?\s*(?:rs\.?|pkr|₹|\$|inr|aed|sar)?\s*([\d,]+(?:\.\d{1,2})?)',
        r'amount\s*(?:due)?\s*[:\-]?\s*(?:rs\.?|pkr|₹|\$|inr|aed|sar)?\s*([\d,]+(?:\.\d{1,2})?)',
    ]
    currency_patterns = [
        r'(?:rs\.?|pkr|₹|\$|inr|aed|sar)\s*([\d,]+(?:\.\d{1,2})?)',
    ]
    fallback_patterns = [
        r'([\d,]+\.\d{2})',
    ]

    detected_amount = 0.0
    for pattern_group in (total_patterns, currency_patterns, fallback_patterns):
        valid_vals = []
        for pattern in pattern_group:
            for amt_str in re.findall(pattern, raw_text):
                try:
                    val = float(amt_str.replace(',', ''))
                    if 0 < val < 100000000:
                        valid_vals.append(val)
                except ValueError:
                    pass
        if valid_vals:
            detected_amount = max(valid_vals)
            break

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
        'amount': detected_amount,
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
