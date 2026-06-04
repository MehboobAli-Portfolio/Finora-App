import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from investments.serializers import HoldingSerializer

data = {
  "name": "Polkadot",
  "symbol": "DOT",
  "investment_type": "stocks",
  "purchase_date": "2026-05-06",
  "description": "",
  "quantity": 10,
  "buy_price": 5
}

serializer = HoldingSerializer(data=data)
if serializer.is_valid():
    print("VALID", serializer.validated_data)
else:
    print("INVALID", serializer.errors)
