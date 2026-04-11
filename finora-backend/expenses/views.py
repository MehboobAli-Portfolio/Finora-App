from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import Expense
from .serializers import ExpenseSerializer
import easyocr
import re

READER = None

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def scan_receipt_view(request):
    global READER
    if READER is None:
        READER = easyocr.Reader(['en'])
        
    file_obj = request.FILES.get('receipt')
    if not file_obj:
        return Response({'error': 'No receipt image provided'}, status=400)
    
    image_bytes = file_obj.read()
    results = READER.readtext(image_bytes, detail=0)
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
    elif any(w in raw_text for w in ['walmart', 'target', 'amazon', 'shop', 'store', 'grocery']):
        category = "shopping"
        
    return Response({
        'amount': max_amount,
        'category': category,
        'raw_text': raw_text
    })


class ExpenseListCreateView(generics.ListCreateAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'category']
    ordering_fields = ['date', 'amount', 'created_at']

    def get_queryset(self):
        queryset = Expense.objects.filter(user=self.request.user)
        category = self.request.query_params.get('category')
        transaction_type = self.request.query_params.get('type')
        if category:
            queryset = queryset.filter(category=category)
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(user=self.request.user)
