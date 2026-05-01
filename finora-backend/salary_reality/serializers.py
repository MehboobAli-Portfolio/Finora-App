from rest_framework import serializers
from .models import SalaryProfile, SalarySnapshot

class SalaryProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryProfile
        fields = '__all__'
        read_only_fields = ('id', 'user')

class SalarySnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalarySnapshot
        fields = '__all__'
        read_only_fields = ('id', 'user', 'recorded_at')
