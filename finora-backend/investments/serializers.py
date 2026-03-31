from rest_framework import serializers
from .models import Investment


class InvestmentSerializer(serializers.ModelSerializer):
    return_amount = serializers.ReadOnlyField()
    return_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Investment
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at', 'return_amount', 'return_percentage')
