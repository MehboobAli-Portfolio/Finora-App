from celery import shared_task
from .collect_prices import fetch_and_store_prices
from .compute_indicators import compute_and_store_indicators
from .continuous_pipeline import ingest_to_training_queue

@shared_task
def update_prices():
    """
    Celery task to run every 15 minutes.
    1. Fetch latest prices
    2. Compute indicators
    3. Ingest to training queue
    """
    # Fetch data
    fetch_and_store_prices(interval='1d', period='1mo')
    
    # Compute indicators
    compute_and_store_indicators(interval='1d')
    
    # Ingest for Layer 1 ML pipeline
    ingest_to_training_queue()
    
    return "update_prices completed successfully"
