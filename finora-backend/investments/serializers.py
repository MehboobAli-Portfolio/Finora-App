import uuid as uuid_lib
from decimal import Decimal
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
    is_market_tracked = serializers.SerializerMethodField(read_only=True)
    unit_price = serializers.SerializerMethodField(read_only=True)

    # ── Write-only fields from the frontend form ───────────────────────
    input_name = serializers.CharField(write_only=True, required=False, allow_blank=True, source='_name')
    input_symbol = serializers.CharField(write_only=True, required=False, allow_blank=True, source='_symbol')
    input_investment_type = serializers.CharField(write_only=True, required=False, allow_blank=True, source='_investment_type')
    input_amount = serializers.DecimalField(max_digits=18, decimal_places=2, write_only=True, required=False, allow_null=True, source='_amount')
    input_current_value = serializers.DecimalField(max_digits=18, decimal_places=2, write_only=True, required=False, allow_null=True, source='_current_value')
    input_quantity = serializers.DecimalField(max_digits=18, decimal_places=8, write_only=True, required=False, allow_null=True, source='_quantity')
    input_buy_price = serializers.DecimalField(max_digits=18, decimal_places=8, write_only=True, required=False, allow_null=True, source='_buy_price')
    input_purchase_date = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True, source='_purchase_date')
    input_description = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True, source='_description')
    input_monthly_income = serializers.DecimalField(max_digits=18, decimal_places=2, write_only=True, required=False, allow_null=True, source='_monthly_income')

    class Meta:
        model = Holding
        fields = [
            'id', 'user', 'asset', 'asset_details',
            'quantity', 'avg_buy_price', 'current_price', 'unrealized_pnl',
            'notes', 'monthly_income', 'purchase_date', 'last_updated',
            # Read-only computed fields for frontend
            'name', 'symbol', 'investment_type',
            'amount', 'current_value', 'return_amount', 'return_percentage',
            'is_market_tracked', 'unit_price',
            # Write-only input fields from frontend form
            'input_name', 'input_symbol', 'input_investment_type',
            'input_amount', 'input_current_value', 'input_quantity', 'input_buy_price',
            'input_purchase_date', 'input_description', 'input_monthly_income',
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
            if sym.startswith('NFT-'):
                return 'nft'

        reverse_map = {
            'stock': 'stocks',
            'crypto': 'crypto',
            'forex': 'stocks',
            'etf': 'etf',
            'commodity': 'gold',
            'nft': 'nft',
            'bond': 'bonds',
            'mutual_fund': 'mutual_funds',
            'real_estate': 'real_estate',
        }
        asset_type = obj.asset.asset_type if obj.asset else 'stock'
        return reverse_map.get(asset_type, 'stocks')

    def get_amount(self, obj):
        """Total invested amount (what the user paid)."""
        return float(obj.quantity * obj.avg_buy_price)

    def get_current_value(self, obj):
        """Current market value."""
        return float(obj.quantity * obj.current_price)

    def get_return_amount(self, obj):
        """Profit/loss in absolute terms."""
        invested = obj.quantity * obj.avg_buy_price
        current = obj.quantity * obj.current_price
        return float(round(current - invested, 2))

    def get_return_percentage(self, obj):
        """Profit/loss as a percentage."""
        invested = obj.quantity * obj.avg_buy_price
        if invested == 0:
            return 0.0
        current = obj.quantity * obj.current_price
        return float(round(((current - invested) / invested) * 100, 2))

    def get_is_market_tracked(self, obj):
        """Whether this holding auto-updates from market data."""
        if not obj.asset:
            return False
        return obj.asset.exchange != 'MANUAL'

    def get_unit_price(self, obj):
        """Current price per unit."""
        return float(obj.current_price)

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
            'quantity': 'input_quantity',
            'buy_price': 'input_buy_price',
            'purchase_date': 'input_purchase_date',
            'description': 'input_description',
            'monthly_income': 'input_monthly_income',
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
        amount = validated_data.pop('_amount', None)
        current_value = validated_data.pop('_current_value', None)
        quantity_input = validated_data.pop('_quantity', None)
        buy_price_input = validated_data.pop('_buy_price', None)
        purchase_date_str = validated_data.pop('_purchase_date', None)
        description = validated_data.pop('_description', '')
        monthly_income = validated_data.pop('_monthly_income', Decimal('0'))

        # Auto-append -USD for crypto if missing
        if inv_type == 'crypto' and symbol_input and not symbol_input.endswith('-USD'):
            symbol_input = f"{symbol_input}-USD"

        # ── Determine tracking mode ────────────────────────────────────
        # Market-tracked types: stocks, crypto, etf (and mutual_funds/bonds/gold WITH a ticker)
        MARKET_TYPES = {'stocks', 'crypto', 'etf', 'nft'}
        HYBRID_TYPES = {'mutual_funds', 'bonds', 'gold'}  # Can be tracked OR manual
        MANUAL_TYPES = {'real_estate', 'other'}

        is_market_tracked = False
        if inv_type in MARKET_TYPES and symbol_input:
            is_market_tracked = True
        elif inv_type in HYBRID_TYPES and symbol_input:
            # Has a valid ticker = market tracked
            is_market_tracked = True
        # Manual types or no symbol = manual

        # ── Map frontend investment_type to backend asset_type ─────────
        type_map = {
            'stocks': 'stock',
            'crypto': 'crypto',
            'real_estate': 'real_estate',
            'bonds': 'bond',
            'mutual_funds': 'mutual_fund',
            'etf': 'etf',
            'gold': 'commodity',
            'nft': 'nft',
            'other': 'commodity',
        }
        asset_type = type_map.get(inv_type, 'stock')

        # ── Compute quantity and buy price ─────────────────────────────
        if is_market_tracked and quantity_input and buy_price_input:
            # User provided quantity + per-unit buy price
            quantity = Decimal(str(quantity_input))
            avg_buy_price = Decimal(str(buy_price_input))
        elif amount is not None:
            # Manual mode: store as 1 unit at total amount
            quantity = Decimal('1')
            avg_buy_price = Decimal(str(amount))
        else:
            quantity = Decimal('1')
            avg_buy_price = Decimal('0')

        # ── Compute current price ──────────────────────────────────────
        if is_market_tracked and symbol_input:
            # Try to fetch the LIVE price for the current value
            try:
                import yfinance as yf
                ticker = yf.Ticker(symbol_input)
                info = ticker.fast_info
                live_price = getattr(info, 'last_price', None)
                if live_price:
                    current_price = Decimal(str(round(live_price, 8)))
                else:
                    current_price = avg_buy_price
            except Exception:
                current_price = avg_buy_price
        elif current_value is not None:
            current_price = Decimal(str(current_value))
        else:
            current_price = avg_buy_price

        # ── Generate unique symbol for manual entries ──────────────────
        type_prefix_map = {
            'mutual_funds': 'MF',
            'real_estate': 'RE',
            'bonds': 'BD',
            'other': 'OT',
            'nft': 'NFT',
        }
        if not symbol_input:
            prefix = type_prefix_map.get(inv_type, 'MAN')
            symbol_input = f"{prefix}-{str(uuid_lib.uuid4())[:8].upper()}"

        # ── Determine exchange ─────────────────────────────────────────
        manual_prefixes = ('MAN-', 'MF-', 'RE-', 'BD-', 'OT-', 'NFT-')
        exchange = 'MANUAL' if symbol_input.startswith(manual_prefixes) else 'AUTO'

        # ── Find or create asset ───────────────────────────────────────
        asset, created = Asset.objects.get_or_create(
            symbol=symbol_input,
            defaults={
                'name': name,
                'asset_type': asset_type,
                'exchange': exchange,
            }
        )
        # If asset already existed but was created for a different user,
        # update the name if it was just a generic name
        if not created and asset.name == 'Manual Asset' and name != 'Manual Asset':
            asset.name = name
            asset.save(update_fields=['name'])

        # ── Parse purchase_date ────────────────────────────────────────
        parsed_date = None
        if purchase_date_str:
            try:
                from datetime import date as dt_date
                parts = purchase_date_str.split('-')
                if len(parts) == 3:
                    parsed_date = dt_date(int(parts[0]), int(parts[1]), int(parts[2]))
            except (ValueError, IndexError):
                pass

        # ── Compute unrealized P&L ─────────────────────────────────────
        unrealized_pnl = (quantity * current_price) - (quantity * avg_buy_price)

        # ── Create or update the holding ───────────────────────────────
        try:
            holding = Holding.objects.create(
                user=self.context['request'].user,
                asset=asset,
                quantity=quantity,
                avg_buy_price=avg_buy_price,
                current_price=current_price,
                unrealized_pnl=unrealized_pnl,
                notes=description or None,
                monthly_income=monthly_income or 0,
                purchase_date=parsed_date,
            )
        except IntegrityError:
            # User already has this asset — update existing holding instead
            holding = Holding.objects.get(
                user=self.context['request'].user,
                asset=asset,
            )
            # Add to existing position
            old_total_cost = holding.avg_buy_price * holding.quantity
            holding.quantity += quantity
            new_total_cost = old_total_cost + (avg_buy_price * quantity)
            holding.avg_buy_price = new_total_cost / holding.quantity if holding.quantity > 0 else avg_buy_price
            holding.current_price = current_price
            holding.unrealized_pnl = (holding.quantity * holding.current_price) - (holding.quantity * holding.avg_buy_price)
            if description:
                holding.notes = description
            if monthly_income:
                holding.monthly_income = monthly_income
            if parsed_date:
                holding.purchase_date = parsed_date
            holding.save()

        return holding


    def update(self, instance, validated_data):
        """Handle updates from the edit-investment screen."""
        name = validated_data.pop('_name', None)
        symbol_input = validated_data.pop('_symbol', None)
        inv_type = validated_data.pop('_investment_type', None)
        amount = validated_data.pop('_amount', None)
        current_value = validated_data.pop('_current_value', None)
        quantity_input = validated_data.pop('_quantity', None)
        buy_price_input = validated_data.pop('_buy_price', None)
        purchase_date_str = validated_data.pop('_purchase_date', None)
        description = validated_data.pop('_description', None)
        monthly_income = validated_data.pop('_monthly_income', None)

        # Update asset name if provided
        if name and instance.asset:
            instance.asset.name = name
            instance.asset.save(update_fields=['name'])

        # Determine tracking mode
        MARKET_TYPES = {'stocks', 'crypto', 'etf', 'nft'}
        HYBRID_TYPES = {'mutual_funds', 'bonds', 'gold'}
        effective_type = inv_type or (instance.asset.asset_type if instance.asset else 'stock')
        effective_symbol = symbol_input.strip().upper() if symbol_input else (instance.asset.symbol if instance.asset else '')
        is_market = instance.asset.exchange != 'MANUAL' if instance.asset else False

        if quantity_input is not None and buy_price_input is not None:
            instance.quantity = Decimal(str(quantity_input))
            instance.avg_buy_price = Decimal(str(buy_price_input))
        elif amount is not None:
            instance.quantity = Decimal('1')
            instance.avg_buy_price = Decimal(str(amount))

        # Update current price
        if is_market and effective_symbol:
            try:
                import yfinance as yf
                ticker = yf.Ticker(effective_symbol)
                info = ticker.fast_info
                live_price = getattr(info, 'last_price', None)
                if live_price:
                    instance.current_price = Decimal(str(round(live_price, 8)))
            except Exception:
                pass
        elif current_value is not None:
            instance.current_price = Decimal(str(current_value))

        # Parse purchase date
        if purchase_date_str:
            try:
                from datetime import date as dt_date
                parts = purchase_date_str.split('-')
                if len(parts) == 3:
                    instance.purchase_date = dt_date(int(parts[0]), int(parts[1]), int(parts[2]))
            except (ValueError, IndexError):
                pass

        if description is not None:
            instance.notes = description or None
        if monthly_income is not None:
            instance.monthly_income = monthly_income or 0

        # Recalculate unrealized P&L
        instance.unrealized_pnl = (instance.quantity * instance.current_price) - (instance.quantity * instance.avg_buy_price)
        instance.save()
        return instance


class AddUnitsSerializer(serializers.Serializer):
    """
    Handles adding more units/amount to an existing holding.
    Works for ALL investment types.
    """
    # Market-tracked mode fields
    additional_quantity = serializers.DecimalField(
        max_digits=18, decimal_places=8, required=False, allow_null=True
    )
    buy_price_per_unit = serializers.DecimalField(
        max_digits=18, decimal_places=8, required=False, allow_null=True
    )
    # Manual mode fields
    additional_amount = serializers.DecimalField(
        max_digits=18, decimal_places=2, required=False, allow_null=True
    )
    new_current_value = serializers.DecimalField(
        max_digits=18, decimal_places=2, required=False, allow_null=True
    )

    def validate(self, data):
        has_qty = data.get('additional_quantity') and data.get('buy_price_per_unit')
        has_amt = data.get('additional_amount')
        if not has_qty and not has_amt:
            raise serializers.ValidationError(
                'Provide either (additional_quantity + buy_price_per_unit) or additional_amount.'
            )
        return data

    def update_holding(self, holding):
        data = self.validated_data
        additional_qty = data.get('additional_quantity')
        buy_price = data.get('buy_price_per_unit')
        additional_amt = data.get('additional_amount')
        new_current_value = data.get('new_current_value')

        is_market = holding.asset.exchange != 'MANUAL' if holding.asset else False

        if additional_qty and buy_price:
            # Weighted average cost calculation
            old_total_cost = holding.avg_buy_price * holding.quantity
            new_qty = Decimal(str(additional_qty))
            new_price = Decimal(str(buy_price))
            new_cost = new_qty * new_price

            holding.quantity += new_qty
            if holding.quantity > 0:
                holding.avg_buy_price = (old_total_cost + new_cost) / holding.quantity
            else:
                holding.avg_buy_price = new_price

            # Fetch live price for market-tracked
            if is_market and holding.asset:
                try:
                    import yfinance as yf
                    ticker = yf.Ticker(holding.asset.symbol)
                    info = ticker.fast_info
                    live_price = getattr(info, 'last_price', None)
                    if live_price:
                        holding.current_price = Decimal(str(round(live_price, 8)))
                except Exception:
                    pass
        elif additional_amt:
            # Manual mode: quantity stays 1, avg_buy_price = total invested
            additional = Decimal(str(additional_amt))
            old_invested = holding.avg_buy_price * holding.quantity
            holding.avg_buy_price = old_invested + additional
            holding.quantity = Decimal('1')

            if new_current_value is not None:
                holding.current_price = Decimal(str(new_current_value))
            else:
                # Keep current price as the new total invested
                holding.current_price = holding.avg_buy_price

        # Recalculate unrealized P&L
        holding.unrealized_pnl = (holding.quantity * holding.current_price) - (holding.quantity * holding.avg_buy_price)
        holding.save()
        return holding


class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = '__all__'
