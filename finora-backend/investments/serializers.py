import uuid as uuid_lib
from rest_framework import serializers
from django.db import IntegrityError
from .models import Asset, Holding, PriceHistory


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = '__all__'


class HoldingSerializer(serializers.ModelSerializer):
    # ── Read-only fields the frontend expects ──────────────────────────
    asset_details = AssetSerializer(source='asset', read_only=True)
    name = serializers.SerializerMethodField(read_only=True)
    symbol = serializers.SerializerMethodField(read_only=True)
    investment_type = serializers.SerializerMethodField(read_only=True)
    amount = serializers.SerializerMethodField(read_only=True)
    current_value = serializers.SerializerMethodField(read_only=True)
    return_amount = serializers.SerializerMethodField(read_only=True)
    return_percentage = serializers.SerializerMethodField(read_only=True)

    # ── Write-only fields from the frontend form ───────────────────────
    input_name = serializers.CharField(write_only=True, required=False, source='_name')
    input_symbol = serializers.CharField(write_only=True, required=False, source='_symbol')
    input_investment_type = serializers.CharField(write_only=True, required=False, source='_investment_type')
    input_amount = serializers.DecimalField(max_digits=18, decimal_places=2, write_only=True, required=False, source='_amount')
    input_current_value = serializers.DecimalField(max_digits=18, decimal_places=2, write_only=True, required=False, source='_current_value')
    input_purchase_date = serializers.CharField(write_only=True, required=False, source='_purchase_date')
    input_description = serializers.CharField(write_only=True, required=False, source='_description')

    class Meta:
        model = Holding
        fields = [
            'id', 'user', 'asset', 'asset_details',
            'quantity', 'avg_buy_price', 'current_price', 'unrealized_pnl',
            'notes', 'purchase_date', 'last_updated',
            # Read-only computed fields for frontend
            'name', 'symbol', 'investment_type',
            'amount', 'current_value', 'return_amount', 'return_percentage',
            # Write-only input fields from frontend form
            'input_name', 'input_symbol', 'input_investment_type',
            'input_amount', 'input_current_value', 'input_purchase_date', 'input_description',
        ]
        read_only_fields = (
            'id', 'user', 'last_updated', 'asset',
            'quantity', 'avg_buy_price', 'current_price', 'unrealized_pnl',
        )

    # ── Read helpers ───────────────────────────────────────────────────

    def get_name(self, obj):
        return obj.asset.name if obj.asset else 'Unknown'

    def get_symbol(self, obj):
        return obj.asset.symbol if obj.asset else ''

    def get_investment_type(self, obj):
        """Reverse-map asset_type back to frontend investment_type."""
        reverse_map = {
            'stock': 'stocks',
            'crypto': 'crypto',
            'forex': 'stocks',
            'etf': 'etf',
            'commodity': 'gold',
        }
        asset_type = obj.asset.asset_type if obj.asset else 'stock'
        # Check if the asset exchange says "MANUAL" and symbol starts with MF- for mutual funds
        if obj.asset and obj.asset.exchange == 'MANUAL':
            sym = obj.asset.symbol or ''
            if sym.startswith('MF-'):
                return 'mutual_funds'
            if sym.startswith('RE-'):
                return 'real_estate'
            if sym.startswith('BD-'):
                return 'bonds'
            if sym.startswith('OT-'):
                return 'other'
        return reverse_map.get(asset_type, 'stocks')

    def get_amount(self, obj):
        """Total invested amount (what the user paid)."""
        return float(obj.quantity * obj.avg_buy_price)

    def get_current_value(self, obj):
        """Current market value."""
        return float(obj.quantity * obj.current_price)

    def get_return_amount(self, obj):
        """Profit/loss in absolute terms."""
        invested = float(obj.quantity * obj.avg_buy_price)
        current = float(obj.quantity * obj.current_price)
        return round(current - invested, 2)

    def get_return_percentage(self, obj):
        """Profit/loss as a percentage."""
        invested = float(obj.quantity * obj.avg_buy_price)
        if invested == 0:
            return 0.0
        current = float(obj.quantity * obj.current_price)
        return round(((current - invested) / invested) * 100, 2)

    # ── Create ─────────────────────────────────────────────────────────

    def to_internal_value(self, data):
        """
        Map the flat frontend field names (name, symbol, etc.)
        to the internal source names (input_name, input_symbol, etc.)
        so the serializer recognizes them.
        """
        mapped = {}
        # Map frontend keys -> serializer write-only field keys
        field_map = {
            'name': 'input_name',
            'symbol': 'input_symbol',
            'investment_type': 'input_investment_type',
            'amount': 'input_amount',
            'current_value': 'input_current_value',
            'purchase_date': 'input_purchase_date',
            'description': 'input_description',
        }
        for key, value in data.items():
            mapped_key = field_map.get(key, key)
            mapped[mapped_key] = value
        return super().to_internal_value(mapped)

    def create(self, validated_data):
        # Extract write-only fields
        name = validated_data.pop('_name', 'Manual Asset')
        symbol_input = validated_data.pop('_symbol', '').strip().upper()
        inv_type = validated_data.pop('_investment_type', 'stocks')
        amount = validated_data.pop('_amount', 0)
        current_value = validated_data.pop('_current_value', None)
        if current_value is None:
            current_value = amount
        purchase_date_str = validated_data.pop('_purchase_date', None)
        description = validated_data.pop('_description', '')

        # Map frontend investment_type to backend asset_type
        type_map = {
            'stocks': 'stock',
            'crypto': 'crypto',
            'real_estate': 'commodity',
            'bonds': 'stock',
            'mutual_funds': 'etf',
            'etf': 'etf',
            'gold': 'commodity',
            'other': 'commodity',
        }
        asset_type = type_map.get(inv_type, 'stock')

        # Generate a UNIQUE symbol for manual entries to prevent collisions
        # Prefix with type abbreviation for reverse mapping
        type_prefix_map = {
            'mutual_funds': 'MF',
            'real_estate': 'RE',
            'bonds': 'BD',
            'other': 'OT',
        }
        if not symbol_input:
            prefix = type_prefix_map.get(inv_type, 'MAN')
            symbol_input = f"{prefix}-{str(uuid_lib.uuid4())[:8].upper()}"

        # Find or create asset
        asset, _ = Asset.objects.get_or_create(
            symbol=symbol_input,
            defaults={
                'name': name,
                'asset_type': asset_type,
                'exchange': 'MANUAL' if symbol_input.startswith(('MAN-', 'MF-', 'RE-', 'BD-', 'OT-')) else 'AUTO',
            }
        )

        # Parse purchase_date if provided
        parsed_date = None
        if purchase_date_str:
            try:
                from datetime import date as dt_date
                parts = purchase_date_str.split('-')
                if len(parts) == 3:
                    parsed_date = dt_date(int(parts[0]), int(parts[1]), int(parts[2]))
            except (ValueError, IndexError):
                pass

        # Create or update the holding (prevents IntegrityError on duplicate user+asset)
        try:
            holding = Holding.objects.create(
                user=self.context['request'].user,
                asset=asset,
                quantity=1,
                avg_buy_price=amount,
                current_price=current_value,
                unrealized_pnl=float(current_value) - float(amount),
                notes=description or None,
                purchase_date=parsed_date,
            )
        except IntegrityError:
            # User already has this asset — update existing holding instead
            holding = Holding.objects.get(
                user=self.context['request'].user,
                asset=asset,
            )
            holding.quantity += 1
            # Recalculate weighted average buy price
            old_total = holding.avg_buy_price * (holding.quantity - 1)
            holding.avg_buy_price = (old_total + amount) / holding.quantity
            holding.current_price = current_value
            holding.unrealized_pnl = float(holding.quantity * holding.current_price) - float(holding.quantity * holding.avg_buy_price)
            if description:
                holding.notes = description
            if parsed_date:
                holding.purchase_date = parsed_date
            holding.save()

        return holding


class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = '__all__'
