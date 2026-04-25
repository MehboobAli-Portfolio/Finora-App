from django.contrib import admin
from .models import SalaryProfile, SalarySnapshot, GlobalBenchmark, ExchangeRate


@admin.register(SalaryProfile)
class SalaryProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'country', 'city', 'industry', 'job_title', 'salary_amount', 'salary_currency')
    list_filter = ('country', 'industry')
    search_fields = ('user__email', 'job_title')


@admin.register(SalarySnapshot)
class SalarySnapshotAdmin(admin.ModelAdmin):
    list_display = ('user', 'salary_usd', 'global_pctile', 'country_pctile', 'recorded_at')
    list_filter = ('recorded_at',)


@admin.register(GlobalBenchmark)
class GlobalBenchmarkAdmin(admin.ModelAdmin):
    list_display = ('country_name', 'industry', 'avg_salary_usd', 'median_salary_usd', 'data_year')
    list_filter = ('country', 'industry', 'data_year')


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ('base_currency', 'target_currency', 'rate', 'fetched_at')
