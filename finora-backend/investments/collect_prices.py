import yfinance as yf
from django.utils import timezone
from .models import Asset, PriceHistory
from datetime import timedelta
from decimal import Decimal

def fetch_and_store_prices(interval='1d', period='1mo'):
    assets = Asset.objects.filter(is_active=True)
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
                
        except Exception as e:
            print(f"Error fetching data for {asset.symbol}: {e}")
