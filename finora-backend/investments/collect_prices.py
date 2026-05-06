import yfinance as yf
from django.utils import timezone
from .models import Asset, PriceHistory, Holding
from datetime import timedelta
from decimal import Decimal

def fetch_and_store_prices(interval='1d', period='1mo'):
    # Only fetch prices for market-tracked assets (skip MANUAL ones)
    assets = Asset.objects.filter(is_active=True).exclude(exchange='MANUAL')
    if not assets.exists():
        return

    # To optimize yfinance calls, we can pull data in batches or loop through
    for asset in assets:
        try:
            ticker = yf.Ticker(asset.symbol)
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                continue
                
            price_histories = []
            for index, row in df.iterrows():
                # Avoid duplicates
                if not PriceHistory.objects.filter(asset=asset, interval=interval, recorded_at=index).exists():
                    price_histories.append(PriceHistory(
                        asset=asset,
                        open=Decimal(str(row['Open'])),
                        high=Decimal(str(row['High'])),
                        low=Decimal(str(row['Low'])),
                        close=Decimal(str(row['Close'])),
                        volume=int(row['Volume']),
                        interval=interval,
                        recorded_at=index
                    ))
            
            # Bulk create for efficiency
            if price_histories:
                PriceHistory.objects.bulk_create(price_histories, ignore_conflicts=True)

            # ── Sync latest price to all Holdings for this asset ──────
            latest_close = Decimal(str(df['Close'].iloc[-1]))
            holdings_to_update = Holding.objects.filter(asset=asset)
            for holding in holdings_to_update:
                holding.current_price = latest_close
                holding.unrealized_pnl = (holding.quantity * latest_close) - (holding.quantity * holding.avg_buy_price)
            if holdings_to_update:
                Holding.objects.bulk_update(
                    list(holdings_to_update),
                    ['current_price', 'unrealized_pnl']
                )
                
        except Exception as e:
            print(f"Error fetching data for {asset.symbol}: {e}")

