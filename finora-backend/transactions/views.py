from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
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

    amounts = re.findall(r'\$?\s?(\d+\.\d{2})', raw_text)
    max_amount = 0.0
    for amt in amounts:
        try:
            val = float(amt)
            if val > max_amount:
                max_amount = val
        except ValueError:
            pass

    category = "other"
    if any(w in raw_text for w in ['coffee', 'restaurant', 'cafe', 'food', 'mcdonald', 'starbucks', 'burger', 'pizza']):
        category = "food"
    elif any(w in raw_text for w in ['uber', 'lyft', 'taxi', 'gas', 'shell', 'chevron', 'flight']):
        category = "transport"
    elif any(w in raw_text for w in ['rent', 'apartment', 'lease', 'housing']):
        category = "rent"

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
