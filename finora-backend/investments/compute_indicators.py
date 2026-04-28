import pandas as pd
import pandas_ta as ta
from .models import Asset, PriceHistory

def compute_and_store_indicators(interval='1d'):
    assets = Asset.objects.filter(is_active=True)
    
    for asset in assets:
        # Fetch ordered historical prices
        prices = PriceHistory.objects.filter(asset=asset, interval=interval).order_by('recorded_at')
        if not prices.exists() or prices.count() < 50:
            # Not enough data for EMA_50
            continue
            
        # Convert to DataFrame
        data = list(prices.values('id', 'open', 'high', 'low', 'close', 'volume', 'recorded_at'))
        df = pd.DataFrame(data)
        df.set_index('recorded_at', inplace=True)
        
        # Ensure 'close' is numeric
        df['close'] = pd.to_numeric(df['close'], errors='coerce')
        
        # Compute Indicators using pandas-ta
        try:
            df.ta.rsi(length=14, append=True)
            df.ta.macd(fast=12, slow=26, signal=9, append=True)
            df.ta.ema(length=20, append=True)
            df.ta.ema(length=50, append=True)
        except Exception as e:
            print(f"Error computing indicators for {asset.symbol}: {e}")
            continue
        
        # We need to map back computed indicators to database records
        # pandas-ta appends columns with specific names: 'RSI_14', 'MACD_12_26_9', 'MACDh_12_26_9', 'MACDs_12_26_9', 'EMA_20', 'EMA_50'
        
        # We will iterate through df and update records that have missing indicators
        # to avoid updating the entire table every time, we can filter for records where rsi is null
        updates = []
        for idx, row in df.iterrows():
            if pd.isna(row.get('RSI_14')):
                continue
                
            record = next((p for p in prices if p.id == row['id']), None)
            if record:
                updated = False
                if record.rsi is None or record.rsi != float(row['RSI_14']):
                    record.rsi = float(row['RSI_14'])
                    updated = True
                if record.macd is None and not pd.isna(row.get('MACD_12_26_9')):
                    record.macd = float(row['MACD_12_26_9'])
                    record.macd_hist = float(row.get('MACDh_12_26_9', 0))
                    record.macd_signal = float(row.get('MACDs_12_26_9', 0))
                    updated = True
                if record.ema_20 is None and not pd.isna(row.get('EMA_20')):
                    record.ema_20 = float(row['EMA_20'])
                    updated = True
                if record.ema_50 is None and not pd.isna(row.get('EMA_50')):
                    record.ema_50 = float(row['EMA_50'])
                    updated = True
                
                if updated:
                    updates.append(record)
                    
        if updates:
            PriceHistory.objects.bulk_update(
                updates, 
                ['rsi', 'macd', 'macd_hist', 'macd_signal', 'ema_20', 'ema_50']
            )
