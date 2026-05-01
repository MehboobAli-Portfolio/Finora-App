from rest_framework import serializers
from .models import Goal, GoalDeposit


class GoalDepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalDeposit
        fields = '__all__'
        read_only_fields = ('id', 'user', 'date')


class GoalSerializer(serializers.ModelSerializer):
    progress_pct = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()
    deposits = GoalDepositSerializer(many=True, read_only=True)

    class Meta:
        model = Goal
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'progress_pct')
