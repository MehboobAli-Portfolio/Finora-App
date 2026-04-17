from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .salary_logic import analyse_affordability


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyse_view(request):
    """
    POST /api/salary/analyse/

    Accepts:
        country    : str  (default "Pakistan")
        state      : str
        city       : str
        area       : str  (optional)
        adults     : int  (default 1)
        children   : int  (default 0)
        income     : float
        frequency  : str  ("Daily" | "Weekly" | "Bi-Weekly" | "Monthly" | "Yearly")
        currency   : str  (default "PKR", supports USD/EUR/GBP/AED/SAR/CAD/AUD)

    Returns:
        Full affordability breakdown with:
          - affordable_tier
          - total_expenses_display / income_monthly_display / savings_display
          - savings_pct
          - tier_totals  (all 4 tiers for comparison)
          - breakdown    (per-category amounts + descriptions)
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
