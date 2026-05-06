from decimal import Decimal
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
    Returns the live price for ANY ticker symbol via yfinance.
    Works for stocks, crypto (BTC-USD), ETFs, mutual funds, commodities, etc.
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

        # Try to get additional info
        try:
            full_info = ticker.info
            asset_name = full_info.get('shortName') or full_info.get('longName') or symbol
            market_cap = full_info.get('marketCap')
            day_high = full_info.get('dayHigh')
            day_low = full_info.get('dayLow')
            volume = full_info.get('volume')
            currency = full_info.get('currency', 'USD')
        except Exception:
            asset_name = symbol
            market_cap = None
            day_high = None
            day_low = None
            volume = None
            currency = 'USD'
        
        return Response({
            'symbol': symbol,
            'name': asset_name,
            'price': round(price, 2),
            'previous_close': round(prev_close, 2) if prev_close else None,
            'change_percent': round(change_pct, 2),
            'market_cap': market_cap,
            'day_high': round(day_high, 2) if day_high else None,
            'day_low': round(day_low, 2) if day_low else None,
            'volume': volume,
            'currency': currency,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_prices_view(request):
    """
    POST /api/investments/refresh-prices/
    Fetches latest live prices for ALL market-tracked holdings of the current user.
    Returns the updated holdings.
    """
    holdings = Holding.objects.filter(
        user=request.user,
    ).exclude(
        asset__exchange='MANUAL'
    ).select_related('asset')

    if not holdings.exists():
        return Response({'message': 'No market-tracked holdings to refresh', 'updated': 0})

    updated_count = 0
    errors = []

    try:
        import yfinance as yf
        
        # Collect all symbols to fetch at once
        symbols = [h.asset.symbol for h in holdings]
        
        # Fetch prices for all symbols
        for holding in holdings:
            try:
                ticker = yf.Ticker(holding.asset.symbol)
                info = ticker.fast_info
                live_price = getattr(info, 'last_price', None)
                
                if live_price is not None:
                    holding.current_price = Decimal(str(round(live_price, 8)))
                    holding.unrealized_pnl = (
                        holding.quantity * holding.current_price
                    ) - (
                        holding.quantity * holding.avg_buy_price
                    )
                    holding.save(update_fields=['current_price', 'unrealized_pnl', 'last_updated'])
                    updated_count += 1
                else:
                    errors.append(f'{holding.asset.symbol}: No price data')
            except Exception as e:
                errors.append(f'{holding.asset.symbol}: {str(e)[:50]}')
    except ImportError:
        return Response({'error': 'yfinance not installed'}, status=500)

    # Return updated holdings
    serializer = HoldingSerializer(
        Holding.objects.filter(user=request.user),
        many=True,
        context={'request': request}
    )

    return Response({
        'message': f'Updated {updated_count} holdings',
        'updated': updated_count,
        'errors': errors if errors else None,
        'holdings': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_symbol_view(request):
    """
    GET /api/investments/search/?q=apple
    Search for any stock/crypto/ETF symbol using yfinance.
    Returns a list of matching symbols with names and prices.
    """
    query = request.query_params.get('q', '').strip()
    if not query or len(query) < 1:
        return Response({'results': []})

    try:
        import yfinance as yf
        
        # First try the query as a direct symbol
        results = []
        
        # Try it as a direct ticker
        try:
            ticker = yf.Ticker(query.upper())
            info = ticker.fast_info
            price = getattr(info, 'last_price', None)
            if price is not None:
                try:
                    full_info = ticker.info
                    name = full_info.get('shortName') or full_info.get('longName') or query.upper()
                    quote_type = full_info.get('quoteType', 'EQUITY')
                except Exception:
                    name = query.upper()
                    quote_type = 'EQUITY'
                results.append({
                    'symbol': query.upper(),
                    'name': name,
                    'price': round(price, 2),
                    'type': quote_type,
                })
        except Exception:
            pass

        # Also try common variations for crypto
        if not results and not query.upper().endswith('-USD'):
            try:
                crypto_sym = f"{query.upper()}-USD"
                ticker = yf.Ticker(crypto_sym)
                info = ticker.fast_info
                price = getattr(info, 'last_price', None)
                if price is not None:
                    try:
                        full_info = ticker.info
                        name = full_info.get('shortName') or full_info.get('longName') or crypto_sym
                    except Exception:
                        name = crypto_sym
                    results.append({
                        'symbol': crypto_sym,
                        'name': name,
                        'price': round(price, 2),
                        'type': 'CRYPTOCURRENCY',
                    })
            except Exception:
                pass

        return Response({'results': results})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def investment_chart_view(request):
    """
    GET /api/investments/chart/?symbol=AAPL
    Returns the last 30 days of historical closing prices for charting.
    """
    symbol = request.query_params.get('symbol')
    if not symbol:
        return Response({"error": "Symbol is required"}, status=400)
    
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1mo", interval="1d")
        
        if hist.empty and not symbol.endswith('-USD'):
            # Fallback: maybe it's a crypto without the -USD suffix
            crypto_sym = f"{symbol}-USD"
            ticker = yf.Ticker(crypto_sym)
            hist = ticker.history(period="1mo", interval="1d")
            
        if hist.empty:
            return Response({"error": f"No historical data found for {symbol}"}, status=404)
            
        # Format the data for the frontend chart
        chart_data = []
        for index, row in hist.iterrows():
            chart_data.append({
                "date": index.strftime('%Y-%m-%d'),
                "price": round(float(row['Close']), 2)
            })
            
        return Response({
            "symbol": symbol,
            "data": chart_data
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)
