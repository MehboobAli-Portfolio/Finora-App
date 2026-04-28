from .models import Asset, PriceHistory, TrainingQueueItem
from django.utils import timezone
from datetime import timedelta
import json

def ingest_to_training_queue():
    """
    Layer 1 of the continuous learning pipeline.
    Automatically scrape price updates and convert them into training examples 
    (stored in the training_queue with a quality score).
    """
    # Fetch recent prices (e.g., last 24 hours)
    recent_time = timezone.now() - timedelta(hours=24)
    recent_prices = PriceHistory.objects.filter(recorded_at__gte=recent_time)
    
    for price in recent_prices:
        # Check if we already have this in the training queue
        # We can construct a unique signature or just simple check
        content = {
            'asset_symbol': price.asset.symbol,
            'recorded_at': price.recorded_at.isoformat(),
            'open': float(price.open),
            'high': float(price.high),
            'low': float(price.low),
            'close': float(price.close),
            'volume': price.volume,
            'rsi': price.rsi,
            'macd': price.macd,
            'ema_20': price.ema_20,
            'ema_50': price.ema_50
        }
        
        # Simple quality check: Only queue if we have full indicators
        if price.rsi is not None and price.macd is not None:
            quality_score = 1.0
            
            # Simple deduplication based on content matching (approximate)
            # In production, a unique hash should be used.
            if not TrainingQueueItem.objects.filter(
                data_type='price_update', 
                content__asset_symbol=price.asset.symbol,
                content__recorded_at=content['recorded_at']
            ).exists():
                TrainingQueueItem.objects.create(
                    data_type='price_update',
                    content=content,
                    quality_score=quality_score
                )
