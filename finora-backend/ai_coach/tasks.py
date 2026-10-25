"""
Celery tasks for Finora AI Coach.

refresh_market_data — Fetches live prices from yfinance every 10 minutes
and stores them in Django's cache so chat requests never block on a live
HTTP call.  The cache key is intentionally simple so ai_logic.py can read
it without importing this module.
"""
import logging
import time

from celery import shared_task
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Must match the key read by ai_logic.get_market_data_cached()
MARKET_CACHE_KEY = 'finora_market_data'
MARKET_CACHE_TTL = 900   # 15 minutes — slightly longer than the task interval
                          # so stale data is always available even if a task run
                          # is briefly delayed

# Tickers to fetch.  Using fast_info (single HTTP round-trip per ticker).
MARKET_TICKERS = {
    'spy_price':  'SPY',
    'btc_price':  'BTC-USD',
    'qqq_price':  'QQQ',
    'gold_price': 'GC=F',
}


@shared_task(
    bind=True,
    name='ai_coach.tasks.refresh_market_data',
    max_retries=3,
    default_retry_delay=30,
    ignore_result=True,
)
def refresh_market_data(self):
    """
    Fetch live market prices and push them into the cache.
    Called automatically every 10 minutes by Celery Beat.
    Can also be triggered manually:
        python manage.py shell -c "from ai_coach.tasks import refresh_market_data; refresh_market_data.delay()"
    """
    try:
        import yfinance as yf
    except ImportError:
        logger.error('yfinance is not installed — cannot refresh market data.')
        return

    data = {}
    for key, symbol in MARKET_TICKERS.items():
        try:
            info = yf.Ticker(symbol).fast_info
            price = getattr(info, 'last_price', None)
            if price and price > 0:
                data[key] = float(price)
                logger.debug('Fetched %s = %.2f', symbol, price)
            else:
                logger.warning('Empty price for %s', symbol)
        except Exception as exc:
            logger.warning('yfinance fetch failed for %s: %s', symbol, exc)

    if not data:
        logger.error('Market data refresh returned no prices — cache not updated.')
        return

    # Stamp with fetch time so callers can show "as of X"
    data['fetched_at'] = time.time()
    cache.set(MARKET_CACHE_KEY, data, timeout=MARKET_CACHE_TTL)
    logger.info(
        'Market data cached: %s',
        ', '.join(f'{k}={v:.2f}' for k, v in data.items() if k != 'fetched_at'),
    )
