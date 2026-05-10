from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics

from .salary_logic import analyse_affordability
from .models import SalaryProfile, SalarySnapshot
from .serializers import SalaryProfileSerializer

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyse_view(request):
    """
    POST /api/salary/analyse/
    Hyperscale analysis view with zero database dependencies for economic data.
    """
    data = request.data
    try:
        # 1. Safe parsing of numeric values
        try:
            amount = float(data.get('amount', 0) or 0)
        except (ValueError, TypeError):
            amount = 0.0

        try:
            adults = int(data.get('adults', 1) or 1)
        except (ValueError, TypeError):
            adults = 1

        try:
            children = int(data.get('children', data.get('dependents', 0)) or 0)
        except (ValueError, TypeError):
            children = 0

        # 2. Execute Analysis Logic
        result = analyse_affordability(
            country=data.get('country', 'Pakistan'),
            state=data.get('state', ''),
            city=data.get('city', ''),
            area=data.get('area', ''),
            adults=adults,
            children=children,
            income=amount,
            frequency=data.get('salary_frequency', 'Monthly'),
            currency=data.get('currency', 'PKR'),
        )
        
        # 2. Record Insight for User Analytics
        SalarySnapshot.objects.create(
            user=request.user,
            salary_usd=result.get('monthly_cost', 0), # Store analyzed cost for trends
            salary_pkr=float(data.get('amount', 0)),
            global_pctile=0,
            country_pctile=0,
            industry_pctile=0,
            benchmarks=result.get('breakdown', {})
        )

        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Analysis Engine Failure: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

class SalaryProfileView(generics.RetrieveUpdateAPIView):
    """
    GET /api/salary/profile/
    PUT/PATCH /api/salary/profile/
    """
    serializer_class = SalaryProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, created = SalaryProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                'country': 'Pakistan',
                'city': '',
                'industry': 'other',
                'job_title': '',
                'experience_yrs': 0,
                'salary_amount': 0,
                'salary_currency': 'PKR'
            }
        )
        return obj

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)
