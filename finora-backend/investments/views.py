from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from .models import Asset, Holding, PriceHistory
from .serializers import AssetSerializer, HoldingSerializer, PriceHistorySerializer


class AssetListView(generics.ListAPIView):
    queryset = Asset.objects.filter(is_active=True)
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'symbol']


class AssetDetailView(generics.RetrieveAPIView):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]


class HoldingListCreateView(generics.ListCreateAPIView):
    serializer_class = HoldingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Holding.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class HoldingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = HoldingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Holding.objects.filter(user=self.request.user)


class PriceHistoryListView(generics.ListAPIView):
    serializer_class = PriceHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        asset_id = self.request.query_params.get('asset_id')
        if asset_id:
            return PriceHistory.objects.filter(asset_id=asset_id)
        return PriceHistory.objects.none()
