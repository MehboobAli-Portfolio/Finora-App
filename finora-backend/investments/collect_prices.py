import yfinance as yf
from django.utils import timezone
from .models import Asset, PriceHistory, Holding
from datetime import timedelta
from decimal import Decimal


def fetch_and_store_prices(interval='1d', period='1mo'):
    """Batch-fetch prices for all active market-tracked assets in a single network call."""
    assets = Asset.objects.filter(is_active=True).exclude(exchange='MANUAL')
    if not assets.exists():
        return

    asset_map = {a.symbol: a for a in assets}
    symbols = list(asset_map.keys())

    try:
        # Single batch download — one HTTP request for all tickers
        df = yf.download(symbols, period=period, interval=interval, progress=False, threads=True)
    except Exception as e:
        print(f"Batch download failed: {e}")
        return

    if df.empty:
        return

    is_single = len(symbols) == 1

    for symbol, asset in asset_map.items():
        try:
            if is_single:
                asset_df = df
            else:
                # Multi-symbol download has multi-level columns
                asset_df = df.xs(symbol, axis=1, level=1) if symbol in df.columns.get_level_values(1) else None
                if asset_df is None or asset_df.empty:
                    continue

            price_histories = []
            for index, row in asset_df.iterrows():
                price_histories.append(PriceHistory(
                    asset=asset,
                    open=Decimal(str(row['Open'])),
                    high=Decimal(str(row['High'])),
                    low=Decimal(str(row['Low'])),
                    close=Decimal(str(row['Close'])),
                    volume=int(row['Volume']),
                    interval=interval,
                    recorded_at=index,
                ))

            # Bulk create with ignore_conflicts handles duplicates at the DB level
            if price_histories:
                PriceHistory.objects.bulk_create(price_histories, ignore_conflicts=True)

            # ── Sync latest price to all Holdings for this asset ──────
            latest_close = Decimal(str(asset_df['Close'].iloc[-1]))
            holdings_to_update = list(Holding.objects.filter(asset=asset))
            for holding in holdings_to_update:
                holding.current_price = latest_close
                holding.unrealized_pnl = (holding.quantity * latest_close) - (holding.quantity * holding.avg_buy_price)
            if holdings_to_update:
                Holding.objects.bulk_update(holdings_to_update, ['current_price', 'unrealized_pnl'])

        except Exception as e:
            print(f"Error processing {symbol}: {e}")

