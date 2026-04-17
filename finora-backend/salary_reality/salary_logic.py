"""
Salary Reality Engine
=====================
Rule-based affordability analysis using curated cost-of-living data
for Pakistan regions. No external AI/LLM required — fully offline.
"""

# ---------------------------------------------------------------------------
# Base monthly cost tables (PKR) per lifestyle tier, per city tier
# ---------------------------------------------------------------------------

# City tier mapping
CITY_TIER = {
    # Tier 1 – Metro
    "karachi": 1, "lahore": 1, "islamabad": 1,
    # Tier 2 – Major cities
    "rawalpindi": 2, "faisalabad": 2, "multan": 2, "peshawar": 2,
    "quetta": 2, "sialkot": 2, "gujranwala": 2,
    # Tier 3 – Secondary / smaller cities & areas
    "hyderabad": 3, "bahawalpur": 3, "sargodha": 3, "sukkur": 3,
    "larkana": 3, "sheikhupura": 3, "rahim yar khan": 3,
    "chaklala": 2,     # Suburb of Rawalpindi → treat as tier 2
    "gulberg": 1,      # Lahore upscale area → tier 1
    "dha": 1,
    "bahria town": 2,
    "johar town": 1,
}

# Lifestyle tier definitions
TIERS = ["Minimal", "Moderate", "Comfortable", "Premium"]

# ------------------------------------------------------------------ #
# Base costs: {tier_label: {city_tier: {category: monthly_pkr}}}
# ------------------------------------------------------------------ #
BASE_COSTS = {
    "Minimal": {
        1: {
            "food": 8000, "housing": 18000, "transportation": 3500,
            "medical": 1500, "childcare_per_child": 0,
            "civic": 800, "internet_mobile": 1200, "others": 1500,
        },
        2: {
            "food": 6000, "housing": 15000, "transportation": 3000,
            "medical": 1000, "childcare_per_child": 0,
            "civic": 500, "internet_mobile": 1000, "others": 1000,
        },
        3: {
            "food": 4500, "housing": 10000, "transportation": 2000,
            "medical": 800, "childcare_per_child": 0,
            "civic": 400, "internet_mobile": 800, "others": 800,
        },
    },
    "Moderate": {
        1: {
            "food": 15000, "housing": 35000, "transportation": 8000,
            "medical": 3000, "childcare_per_child": 8000,
            "civic": 2000, "internet_mobile": 2500, "others": 4000,
        },
        2: {
            "food": 12000, "housing": 25000, "transportation": 6000,
            "medical": 2500, "childcare_per_child": 6000,
            "civic": 1500, "internet_mobile": 2000, "others": 3000,
        },
        3: {
            "food": 9000, "housing": 18000, "transportation": 4500,
            "medical": 2000, "childcare_per_child": 4500,
            "civic": 1000, "internet_mobile": 1500, "others": 2500,
        },
    },
    "Comfortable": {
        1: {
            "food": 25000, "housing": 65000, "transportation": 20000,
            "medical": 6000, "childcare_per_child": 18000,
            "civic": 5000, "internet_mobile": 5000, "others": 10000,
        },
        2: {
            "food": 20000, "housing": 50000, "transportation": 15000,
            "medical": 5000, "childcare_per_child": 15000,
            "civic": 4000, "internet_mobile": 4000, "others": 8000,
        },
        3: {
            "food": 16000, "housing": 38000, "transportation": 12000,
            "medical": 4000, "childcare_per_child": 12000,
            "civic": 3000, "internet_mobile": 3000, "others": 6000,
        },
    },
    "Premium": {
        1: {
            "food": 50000, "housing": 150000, "transportation": 50000,
            "medical": 15000, "childcare_per_child": 40000,
            "civic": 12000, "internet_mobile": 10000, "others": 25000,
        },
        2: {
            "food": 40000, "housing": 120000, "transportation": 40000,
            "medical": 12000, "childcare_per_child": 35000,
            "civic": 10000, "internet_mobile": 8000, "others": 20000,
        },
        3: {
            "food": 30000, "housing": 90000, "transportation": 30000,
            "medical": 10000, "childcare_per_child": 28000,
            "civic": 8000, "internet_mobile": 6000, "others": 15000,
        },
    },
}

# Extra adult multiplier (beyond the first adult)
EXTRA_ADULT_MULTIPLIER = {
    "Minimal": 0.65,
    "Moderate": 0.60,
    "Comfortable": 0.55,
    "Premium": 0.50,
}

# Descriptions per category per tier
DESCRIPTIONS = {
    "Minimal": {
        "food": "Basic groceries from local {area} markets, focusing on staples.",
        "housing": "Minimal housing, shared accommodation in {area}.",
        "transportation": "Basic transportation using public transport in {area}.",
        "medical": "Minimal medical expenses, basic healthcare in {area}.",
        "childcare": "Basic schooling and childcare for {n} child(ren).",
        "civic": "Minimal civic expenses, basic utilities in {area}.",
        "internet_mobile": "Basic internet and mobile plan in {area}.",
        "others": "Minimal other expenses, personal care in {area}.",
    },
    "Moderate": {
        "food": "Mixed home-cooked meals and occasional dining out in {area}.",
        "housing": "Decent independent apartment in a mid-range area of {area}.",
        "transportation": "Own motorbike or regular ride-hailing + public transport in {area}.",
        "medical": "Regular checkups and private GP visits in {area}.",
        "childcare": "Private school fees for {n} child(ren) plus tuition.",
        "civic": "Full utilities, gas and electricity in {area}.",
        "internet_mobile": "Mid-tier broadband and mobile data plan in {area}.",
        "others": "Clothing, personal care, subscriptions and social activities.",
    },
    "Comfortable": {
        "food": "Quality groceries, weekly restaurant meals and premium items in {area}.",
        "housing": "Spacious apartment or small house in a good locality of {area}.",
        "transportation": "Own car with fuel and maintenance in {area}.",
        "medical": "Health insurance and private specialist visits in {area}.",
        "childcare": "Reputable private school + extracurricular for {n} child(ren).",
        "civic": "All utilities plus home internet fiber in {area}.",
        "internet_mobile": "High-speed broadband and premium mobile plan in {area}.",
        "others": "Leisure, dining out, clothing, gym, hobbies.",
    },
    "Premium": {
        "food": "Gourmet groceries, frequent fine dining and imported products.",
        "housing": "Luxury apartment or house in an upscale area of {area}.",
        "transportation": "Luxury vehicle ownership with fuel, driver, and maintenance.",
        "medical": "Comprehensive private health insurance and concierge care.",
        "childcare": "Elite private schooling and enrichment for {n} child(ren).",
        "civic": "Premium smart-home utilities and home automation.",
        "internet_mobile": "Enterprise broadband and premium mobile for entire family.",
        "others": "Travel, premium fashion, entertainment, personal staff.",
    },
}

# Currency exchange reference (approximate 2025 figures)
CURRENCY_REF = {
    "PKR": 1.0,
    "USD": 0.0036,
    "EUR": 0.0033,
    "GBP": 0.0028,
    "AED": 0.0132,
    "SAR": 0.0135,
    "CAD": 0.0049,
    "AUD": 0.0055,
    "GBP": 0.0028,
}


def _normalise(name: str) -> str:
    return (name or "").strip().lower()


def _get_city_tier(city: str, area: str) -> int:
    """Return city tier (1=metro, 2=major, 3=secondary). Default 2."""
    area_norm = _normalise(area)
    city_norm = _normalise(city)
    if area_norm in CITY_TIER:
        return CITY_TIER[area_norm]
    if city_norm in CITY_TIER:
        return CITY_TIER[city_norm]
    return 2  # sensible default


def _convert_to_monthly_pkr(income: float, frequency: str) -> float:
    freq_map = {
        "daily": 30,
        "weekly": 4.33,
        "bi-weekly": 2.165,
        "monthly": 1,
        "yearly": 1 / 12,
    }
    return income * freq_map.get(frequency.lower(), 1)


def _to_local_currency(pkr_amount: float, currency: str) -> float:
    rate = CURRENCY_REF.get(currency.upper(), 1.0)
    return round(pkr_amount * rate, 2)


def analyse_affordability(
    country: str,
    state: str,
    city: str,
    area: str,
    adults: int,
    children: int,
    income: float,
    frequency: str,
    currency: str = "PKR",
) -> dict:
    """
    Main entry point. Returns a full affordability analysis dict.
    """
    adults = max(1, int(adults))
    children = max(0, int(children))
    income_pkr_monthly = _convert_to_monthly_pkr(float(income), frequency)

    city_tier = _get_city_tier(city, area)
    area_label = area.strip() if area.strip() else city.strip()

    # Determine which lifestyle tiers are affordable
    tier_totals = {}
    for tier in TIERS:
        base = BASE_COSTS[tier][city_tier]
        total = (
            base["food"]
            + base["housing"]
            + base["transportation"]
            + base["medical"]
            + (base["childcare_per_child"] * children)
            + base["civic"]
            + base["internet_mobile"]
            + base["others"]
        )
        # Extra adults
        if adults > 1:
            extra = adults - 1
            per_adult_extra = (
                base["food"]
                + base["transportation"]
                + base["medical"]
            ) * EXTRA_ADULT_MULTIPLIER[tier] * extra
            total += per_adult_extra

        tier_totals[tier] = round(total)

    # Highest affordable tier
    affordable_tier = None
    for tier in reversed(TIERS):
        if income_pkr_monthly >= tier_totals[tier]:
            affordable_tier = tier
            break

    if affordable_tier is None:
        affordable_tier = TIERS[0]  # show Minimal even if can't afford

    total_expenses_pkr = tier_totals[affordable_tier]
    savings_pkr = income_pkr_monthly - total_expenses_pkr
    savings_pct = (savings_pkr / income_pkr_monthly * 100) if income_pkr_monthly > 0 else 0

    base = BASE_COSTS[affordable_tier][city_tier]

    # Build breakdown
    childcare_total = base["childcare_per_child"] * children

    def fmt_desc(key):
        tmpl = DESCRIPTIONS[affordable_tier].get(key, "")
        return tmpl.format(area=area_label, n=children)

    breakdown = [
        {
            "category": "Food",
            "amount_pkr": base["food"],
            "description": fmt_desc("food"),
        },
        {
            "category": "Housing",
            "amount_pkr": base["housing"],
            "description": fmt_desc("housing"),
        },
        {
            "category": "Transportation",
            "amount_pkr": base["transportation"],
            "description": fmt_desc("transportation"),
        },
        {
            "category": "Medical",
            "amount_pkr": base["medical"],
            "description": fmt_desc("medical"),
        },
        {
            "category": "Childcare",
            "amount_pkr": childcare_total,
            "description": fmt_desc("childcare") if children > 0 else "No children in household",
        },
        {
            "category": "Civic",
            "amount_pkr": base["civic"],
            "description": fmt_desc("civic"),
        },
        {
            "category": "Internet and Mobile",
            "amount_pkr": base["internet_mobile"],
            "description": fmt_desc("internet_mobile"),
        },
        {
            "category": "Others",
            "amount_pkr": base["others"],
            "description": fmt_desc("others"),
        },
    ]

    # Currency conversion
    rate = CURRENCY_REF.get(currency.upper(), 1.0)
    display_symbol = currency.upper()

    def pkr_to_display(v):
        return round(v * rate, 2)

    return {
        "affordable_tier": affordable_tier,
        "city_tier": city_tier,
        "income_monthly_pkr": round(income_pkr_monthly),
        "total_expenses_pkr": total_expenses_pkr,
        "savings_pkr": round(savings_pkr),
        "savings_pct": round(savings_pct, 1),
        "tier_totals": {
            t: {"pkr": tier_totals[t], "display": pkr_to_display(tier_totals[t])}
            for t in TIERS
        },
        # Display currency values
        "income_monthly_display": pkr_to_display(income_pkr_monthly),
        "total_expenses_display": pkr_to_display(total_expenses_pkr),
        "savings_display": pkr_to_display(round(savings_pkr)),
        "display_currency": display_symbol,
        "breakdown": [
            {
                **item,
                "amount_display": pkr_to_display(item["amount_pkr"]),
            }
            for item in breakdown
        ],
        "all_tiers": TIERS,
    }
