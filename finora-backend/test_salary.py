import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'
import django
django.setup()

from salary_reality.salary_logic import analyse_affordability

# Check all tier costs
r = analyse_affordability('Pakistan', 'Punjab', 'Rawalpindi', '', 1, 0, 80000, 'Monthly', 'PKR')
print('Tier costs:', r.get('tier_costs'))
print('Affordable tier:', r['living_tier'])
print('Income: 80000, Cost:', r['monthly_cost'], 'Leftover:', r['leftover_income'])

print()
r2 = analyse_affordability('United States', 'New York', 'New York', '', 1, 0, 5000, 'Monthly', 'USD')
print('US Test:')
print('Tier costs:', r2.get('tier_costs'))
print('Affordable tier:', r2['living_tier'])
print('Income: $5000, Cost:', r2['monthly_cost'], 'Leftover:', r2['leftover_income'])

print()
r3 = analyse_affordability('United Arab Emirates', 'Dubai', 'Dubai', '', 1, 0, 10000, 'Monthly', 'AED')
print('UAE Test:')
print('Tier costs:', r3.get('tier_costs'))
print('Affordable tier:', r3['living_tier'])
print('Income: AED 10000, Cost:', r3['monthly_cost'], 'Leftover:', r3['leftover_income'])
