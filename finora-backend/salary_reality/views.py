from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics

from .salary_logic import analyse_affordability
from .models import SalaryProfile
from .serializers import SalaryProfileSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyse_view(request):
    """
    POST /api/salary/analyse/
    """
    data = request.data
    try:
        result = analyse_affordability(
            country=data.get('country', 'Pakistan'),
            state=data.get('state', ''),
            city=data.get('city', ''),
            area=data.get('area', ''),
            adults=int(data.get('adults', 1)),
            children=int(data.get('children', 0)),
            income=float(data.get('income', 0)),
            frequency=data.get('frequency', 'Monthly'),
            currency=data.get('currency', 'PKR'),
        )
        
        # Save snapshot if authenticated
        if request.user.is_authenticated:
            from .models import SalarySnapshot
            SalarySnapshot.objects.create(
                user=request.user,
                salary_usd=result.get('income_monthly_pkr', 0) * 0.0036, # Approximation
                salary_pkr=result.get('income_monthly_pkr', 0),
                global_pctile=0, # Placeholder logic
                country_pctile=0,
                industry_pctile=0,
                benchmarks=result.get('tier_totals', {})
            )

        return Response(result, status=status.HTTP_200_OK)
    except (ValueError, TypeError) as e:
        return Response(
            {'error': f'Invalid input: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except KeyError as e:
        return Response(
            {'error': f'Missing required field: {str(e)}'},
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
                'country': 'PK',
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

