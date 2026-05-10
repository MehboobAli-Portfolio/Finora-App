from django.contrib import admin
from .models import SalaryProfile, SalarySnapshot

@admin.register(SalaryProfile)
class SalaryProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'country', 'city', 'industry', 'job_title', 'salary_amount', 'salary_currency')
    list_filter = ('country', 'industry')
    search_fields = ('user__email', 'job_title')

@admin.register(SalarySnapshot)
class SalarySnapshotAdmin(admin.ModelAdmin):
    list_display = ('user', 'salary_usd', 'global_pctile', 'country_pctile', 'recorded_at')
    list_filter = ('recorded_at',)
