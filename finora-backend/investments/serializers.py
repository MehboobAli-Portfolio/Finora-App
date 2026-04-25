from rest_framework import serializers
from .models import Asset, Holding, PriceHistory


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = '__all__'


class HoldingSerializer(serializers.ModelSerializer):
    asset_details = AssetSerializer(source='asset', read_only=True)

    class Meta:
        model = Holding
        fields = '__all__'
        read_only_fields = ('id', 'user', 'last_updated')


class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = '__all__'
