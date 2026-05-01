from rest_framework import generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Asset, Holding, PriceHistory
from .serializers import AssetSerializer, HoldingSerializer, PriceHistorySerializer


class AssetListView(generics.ListAPIView):
    queryset = Asset.objects.filter(is_active=True)
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'symbol']


class AssetDetailView(generics.RetrieveAPIView):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]


class HoldingListCreateView(generics.ListCreateAPIView):
    serializer_class = HoldingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Holding.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # user is set inside serializer.create() from self.context['request'].user
        serializer.save()


class HoldingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = HoldingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Holding.objects.filter(user=self.request.user)


class PriceHistoryListView(generics.ListAPIView):
    serializer_class = PriceHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        asset_id = self.request.query_params.get('asset_id')
        if asset_id:
            return PriceHistory.objects.filter(asset_id=asset_id)
        return PriceHistory.objects.none()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def live_quote_view(request):
    """
    GET /api/investments/quote/?symbol=AAPL
    Returns the live price for a given ticker symbol via yfinance.
    """
    symbol = request.query_params.get('symbol', '').strip().upper()
    if not symbol:
        return Response({'error': 'symbol parameter is required'}, status=400)
    
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.fast_info
        price = getattr(info, 'last_price', None)
        prev_close = getattr(info, 'previous_close', None)
        
        if price is None:
            return Response({'error': f'Could not fetch price for {symbol}'}, status=404)
        
        change_pct = 0
        if prev_close and prev_close > 0:
            change_pct = ((price - prev_close) / prev_close) * 100
        
        return Response({
            'symbol': symbol,
            'price': round(price, 2),
            'previous_close': round(prev_close, 2) if prev_close else None,
            'change_percent': round(change_pct, 2),
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)
