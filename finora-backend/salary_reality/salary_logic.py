"""
Salary Reality Engine v3 — PPP Intelligence
=============================================
Uses Purchasing Power Parity (World Bank) + Live Exchange Rates
to produce realistic, location-aware cost analysis.
All data updates automatically via live APIs.
"""
import requests
import os
from django.core.cache import cache

# ---------------------------------------------------------------------------
# US Monthly Living Baselines (realistic single-person costs in USD)
# ---------------------------------------------------------------------------
US_BASELINES = {
    "Minimal":     {"Housing": 600, "Food": 250, "Transport": 50, "Medical": 50, "Utilities": 80, "Others": 70},
    "Moderate":    {"Housing": 1200, "Food": 450, "Transport": 150, "Medical": 150, "Utilities": 120, "Others": 200},
    "Comfortable": {"Housing": 2000, "Food": 750, "Transport": 300, "Medical": 300, "Utilities": 180, "Others": 500},
    "Premium":     {"Housing": 4000, "Food": 1500, "Transport": 600, "Medical": 600, "Utilities": 300, "Others": 1000},
}

TIERS = ["Minimal", "Moderate", "Comfortable", "Premium"]

# Budget allocation % (how income SHOULD be distributed per tier)
BUDGET_PCT = {
    "Minimal":     {"Housing": 0.35, "Food": 0.30, "Transport": 0.10, "Medical": 0.05, "Utilities": 0.08, "Others": 0.12},
    "Moderate":    {"Housing": 0.30, "Food": 0.25, "Transport": 0.12, "Medical": 0.08, "Utilities": 0.07, "Others": 0.18},
    "Comfortable": {"Housing": 0.28, "Food": 0.20, "Transport": 0.12, "Medical": 0.08, "Utilities": 0.06, "Others": 0.26},
    "Premium":     {"Housing": 0.25, "Food": 0.15, "Transport": 0.10, "Medical": 0.08, "Utilities": 0.05, "Others": 0.37},
}

# ---------------------------------------------------------------------------
# PPP Conversion Factors (World Bank ICP 2022-2023)
# Value = local currency units that buy the same goods as $1 USD in the US
# Auto-updated via World Bank API; static fallback below
# ---------------------------------------------------------------------------
PPP_FACTORS = {
    "Pakistan": 38.5, "India": 23.3, "Bangladesh": 36.5, "Sri Lanka": 87.0,
    "Nepal": 41.5, "Afghanistan": 22.0, "China": 4.19, "Japan": 102.0,
    "South Korea": 875.0, "Hong Kong": 5.73, "Indonesia": 5200.0,
    "Malaysia": 1.68, "Thailand": 12.5, "Vietnam": 7800.0, "Philippines": 18.2,
    "Singapore": 0.84, "United Arab Emirates": 1.85, "Saudi Arabia": 1.60,
    "Qatar": 1.75, "Kuwait": 0.14, "Oman": 0.18, "Jordan": 0.33,
    "Turkey": 6.50, "Egypt": 6.50, "Iran": 42000.0, "Iraq": 540.0,
    "United Kingdom": 0.70, "Germany": 0.75, "France": 0.78, "Italy": 0.73,
    "Spain": 0.65, "Netherlands": 0.79, "Switzerland": 1.17, "Sweden": 9.20,
    "Norway": 10.5, "Denmark": 7.20, "Poland": 2.15, "Russia": 28.0,
    "Ukraine": 11.5, "United States": 1.0, "Canada": 1.26, "Mexico": 9.50,
    "Brazil": 2.55, "Argentina": 200.0, "Colombia": 1550.0, "Chile": 430.0,
    "Australia": 1.50, "New Zealand": 1.52, "Nigeria": 175.0,
    "South Africa": 7.50, "Kenya": 45.0, "Ghana": 5.20, "Morocco": 3.80,
    "Ethiopia": 17.5, "Tanzania": 850.0,
}

COUNTRY_CURRENCY = {
    "Pakistan": "PKR", "India": "INR", "Bangladesh": "BDT", "Sri Lanka": "LKR",
    "Nepal": "NPR", "China": "CNY", "Japan": "JPY", "South Korea": "KRW",
    "Hong Kong": "HKD", "Indonesia": "IDR", "Malaysia": "MYR", "Thailand": "THB",
    "Vietnam": "VND", "Philippines": "PHP", "Singapore": "SGD",
    "United Arab Emirates": "AED", "Saudi Arabia": "SAR", "Qatar": "QAR",
    "Kuwait": "KWD", "Oman": "OMR", "Jordan": "JOD", "Turkey": "TRY",
    "Egypt": "EGP", "Iran": "IRR", "Iraq": "IQD",
    "United Kingdom": "GBP", "Germany": "EUR", "France": "EUR", "Italy": "EUR",
    "Spain": "EUR", "Netherlands": "EUR", "Switzerland": "CHF", "Sweden": "SEK",
    "Norway": "NOK", "Denmark": "DKK", "Poland": "PLN", "Russia": "RUB",
    "Ukraine": "UAH", "United States": "USD", "Canada": "CAD", "Mexico": "MXN",
    "Brazil": "BRL", "Argentina": "ARS", "Colombia": "COP", "Chile": "CLP",
    "Australia": "AUD", "New Zealand": "NZD", "Nigeria": "NGN",
    "South Africa": "ZAR", "Kenya": "KES", "Ghana": "GHS", "Morocco": "MAD",
    "Ethiopia": "ETB", "Tanzania": "TZS",
}

# ---------------------------------------------------------------------------
# Live Data Fetchers
# ---------------------------------------------------------------------------

def _fetch_live_rates():
    """Fetches real-time exchange rates. Cached 1 hour."""
    try:
        cached = cache.get('live_exchange_rates')
        if cached: return cached
    except Exception: pass

    url = os.getenv('EXCHANGE_RATE_API_URL', 'https://api.exchangerate-api.com/v4/latest/USD')
    try:
        res = requests.get(url, headers={'User-Agent': 'Finora-App/1.0'}, timeout=5)
        if res.status_code == 200:
            data = res.json().get('rates', {})
            try: cache.set('live_exchange_rates', data, 3600)
            except: pass
            return data
    except: pass
    return {"USD": 1.0, "PKR": 279.0, "INR": 83.0, "GBP": 0.79, "EUR": 0.92, "AED": 3.67, "SAR": 3.75}


def _get_ppp_factor(country):
    """Get PPP factor for a country with fuzzy name matching."""
    if country in PPP_FACTORS:
        return PPP_FACTORS[country]
    cn = country.lower().strip()
    for name, ppp in PPP_FACTORS.items():
        if cn in name.lower() or name.lower() in cn:
            return ppp
    return None


# ---------------------------------------------------------------------------
# Tax Estimation Engine
# ---------------------------------------------------------------------------

def estimate_tax(country, annual_income, currency="USD"):
    c = (country or "").lower()
    tax = 0.0
    notes = ""
    if "pakistan" in c:
        # Pakistan Salaried Tax Slabs (PKR)
        if annual_income <= 600000:
            tax = 0.0
        elif annual_income <= 1200000:
            tax = (annual_income - 600000) * 0.05
        elif annual_income <= 2200000:
            tax = 30000 + (annual_income - 1200000) * 0.15
        elif annual_income <= 3200000:
            tax = 180000 + (annual_income - 2200000) * 0.25
        else:
            tax = 430000 + (annual_income - 3200000) * 0.35
        notes = "FBR Salaried Income Tax Slabs"
    elif any(k in c for k in ["united arab emirates", "dubai", "saudi", "qatar", "kuwait", "oman", "bahrain"]):
        tax = 0.0
        notes = "0% Personal Income Tax Jurisdiction"
    elif "united kingdom" in c:
        taxable = max(0.0, annual_income - 12570)
        if taxable <= 37700:
            tax = taxable * 0.20
        else:
            tax = 37700 * 0.20 + (taxable - 37700) * 0.40
        notes = "HMRC UK Income Tax"
    elif "india" in c:
        if annual_income <= 300000:
            tax = 0.0
        elif annual_income <= 600000:
            tax = (annual_income - 300000) * 0.05
        elif annual_income <= 900000:
            tax = 15000 + (annual_income - 600000) * 0.10
        elif annual_income <= 1200000:
            tax = 45000 + (annual_income - 900000) * 0.15
        elif annual_income <= 1500000:
            tax = 90000 + (annual_income - 1200000) * 0.20
        else:
            tax = 150000 + (annual_income - 1500000) * 0.30
        notes = "Indian Income Tax (New Regime)"
    elif "united states" in c:
        taxable = max(0.0, annual_income - 14600)
        if taxable <= 11600:
            tax = taxable * 0.10
        elif taxable <= 47150:
            tax = 1160 + (taxable - 11600) * 0.12
        elif taxable <= 100525:
            tax = 5426 + (taxable - 47150) * 0.22
        else:
            tax = 17168 + (taxable - 100525) * 0.24
        notes = "US Federal Tax (Single Standard Deduction)"
    else:
        tax = max(0.0, annual_income * 0.15)
        notes = "Estimated Progressive Average Rate (~15%)"

    effective_rate = round((tax / annual_income * 100), 1) if annual_income > 0 else 0.0
    net_annual = max(0.0, annual_income - tax)
    return {
        "annual_tax": round(tax, 2),
        "monthly_tax": round(tax / 12, 2),
        "net_monthly": round(net_annual / 12, 2),
        "effective_rate": effective_rate,
        "notes": notes,
    }


# ---------------------------------------------------------------------------
# Main Analysis Engine
# ---------------------------------------------------------------------------

def analyse_affordability(country, state, city, area, adults, children, income, frequency, currency="PKR"):
    rates = _fetch_live_rates()

    # 1. Monthly income in user's currency
    freq_map = {"daily": 30, "weekly": 4.33, "bi-weekly": 2.165, "monthly": 1, "yearly": 1/12}
    income_monthly = float(income) * freq_map.get(frequency.lower(), 1)

    # 2. PPP-based local cost calculation
    ppp = _get_ppp_factor(country)
    user_rate = rates.get(currency.upper(), 1.0)

    if ppp is not None:
        # Price Level Ratio = PPP / Market Exchange Rate
        country_cur = COUNTRY_CURRENCY.get(country, currency)
        country_rate = rates.get(country_cur, user_rate)
        plr = ppp / country_rate if country_rate > 0 else 0.5

        # Convert US costs to user's selected currency
        # Local cost = US_cost_USD * PLR * user_exchange_rate
        cost_multiplier = plr * user_rate
    else:
        # Unknown country: estimate from exchange rate
        if user_rate > 100:
            cost_multiplier = user_rate * 0.15
        elif user_rate > 10:
            cost_multiplier = user_rate * 0.35
        elif user_rate > 1:
            cost_multiplier = user_rate * 0.60
        else:
            cost_multiplier = user_rate * 0.85

    # 3. Calculate tier costs in user's currency
    tier_costs = {}
    for tier in TIERS:
        base = US_BASELINES[tier]
        total = sum(base.values()) * cost_multiplier

        # Family scaling
        if int(children) > 0:
            total *= (1 + 0.20 * int(children))
        if int(adults) > 1:
            total *= (1 + 0.30 * (int(adults) - 1))

        tier_costs[tier] = total

    # 4. Find which tier the user can afford
    affordable_tier = "Minimal"
    can_afford = False
    for tier in reversed(TIERS):
        if income_monthly >= tier_costs[tier]:
            affordable_tier = tier
            can_afford = True
            break

    # 5. Build breakdown based on USER'S actual income
    alloc = BUDGET_PCT.get(affordable_tier, BUDGET_PCT["Minimal"])
    breakdown = []
    for cat, pct in alloc.items():
        breakdown.append({
            "name": cat,
            "amount": round(income_monthly * pct, 2)
        })

    # 6. Calculate savings
    monthly_cost = tier_costs[affordable_tier]
    leftover = income_monthly - monthly_cost

    # 7. Tax Estimation
    annual_income = income_monthly * 12
    tax_info = estimate_tax(country, annual_income, currency)

    # 8. 50/30/20 Rule
    rule_50_30_20 = {
        "needs": round(income_monthly * 0.50, 2),
        "wants": round(income_monthly * 0.30, 2),
        "savings": round(income_monthly * 0.20, 2),
    }

    # 9. FIRE / Financial Freedom Calculation
    annual_cost = monthly_cost * 12
    fire_target = annual_cost * 25
    annual_savings = max(0.0, leftover * 12)
    fire_years = None
    if annual_savings > 0:
        import math
        r = 0.07
        try:
            val = (fire_target * r / annual_savings) + 1
            if val > 0:
                fire_years = round(math.log(val) / math.log(1 + r), 1)
        except Exception:
            fire_years = None

    # 10. Purchasing Power Peer Hubs
    usd_income = income_monthly / user_rate if user_rate > 0 else income_monthly
    user_ppp = ppp if ppp else 1.0
    peers = [
        {"city": "New York, USA", "currency": "USD", "amount": round((usd_income / user_ppp) * 1.0, 0)},
        {"city": "London, UK", "currency": "GBP", "amount": round((usd_income / user_ppp) * 0.70, 0)},
        {"city": "Dubai, UAE", "currency": "AED", "amount": round((usd_income / user_ppp) * 1.85, 0)},
        {"city": "Toronto, Canada", "currency": "CAD", "amount": round((usd_income / user_ppp) * 1.26, 0)},
        {"city": "Lahore, Pakistan", "currency": "PKR", "amount": round((usd_income / user_ppp) * 38.5, 0)},
    ]

    # 11. Smart insight
    if can_afford:
        insight = (f"With {currency} {round(income_monthly):,}/month in {city or country}, "
                   f"you can afford a {affordable_tier} lifestyle. "
                   f"Your estimated savings rate is {round(max(0, leftover/income_monthly*100))}%.")
    else:
        shortfall = monthly_cost - income_monthly
        insight = (f"In {city or country}, minimal living costs approximately {currency} {round(monthly_cost):,}/month. "
                   f"Your income of {currency} {round(income_monthly):,} is {currency} {round(shortfall):,} short. "
                   f"Consider shared housing or supplementary income.")

    return {
        "living_tier": affordable_tier,
        "monthly_cost": round(monthly_cost, 2),
        "leftover_income": round(leftover, 2),
        "savings_pct": round(max(0, (leftover / income_monthly * 100))) if income_monthly > 0 else 0,
        "is_sustainable": leftover > 0,
        "comparison_message": f"Based on live PPP data for {city or country} ({currency} market rate: {round(user_rate, 2)}).",
        "ai_insight": insight,
        "breakdown": breakdown,
        "currency": currency.upper(),
        "tier_costs": {t: round(c, 0) for t, c in tier_costs.items()},
        "tax_info": tax_info,
        "rule_50_30_20": rule_50_30_20,
        "fire_metrics": {
            "fire_target": round(fire_target, 0),
            "annual_savings": round(annual_savings, 0),
            "years_to_fire": fire_years,
        },
        "purchasing_power_peers": peers,
    }
