import uuid
from django.db import models
from django.conf import settings


class SalaryProfile(models.Model):
    INDUSTRY_CHOICES = [
        ('it', 'IT'),
        ('finance', 'Finance'),
        ('engineering', 'Engineering'),
        ('healthcare', 'Healthcare'),
        ('education', 'Education'),
        ('government', 'Government'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='salary_profile')
    country = models.CharField(max_length=2)  # ISO code: PK, US, etc.
    city = models.CharField(max_length=100)
    industry = models.CharField(max_length=20, choices=INDUSTRY_CHOICES)
    job_title = models.CharField(max_length=200)
    experience_yrs = models.IntegerField()
    salary_amount = models.DecimalField(max_digits=14, decimal_places=2)
    salary_currency = models.CharField(max_length=3)
    salary_usd = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.job_title}"


class SalarySnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    salary_usd = models.DecimalField(max_digits=14, decimal_places=2)
    salary_pkr = models.DecimalField(max_digits=14, decimal_places=2)
    global_pctile = models.FloatField()
    country_pctile = models.FloatField()
    industry_pctile = models.FloatField()
    benchmarks = models.JSONField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Snapshot {self.recorded_at.date()} - {self.user.email}"


class GlobalBenchmark(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    country = models.CharField(max_length=2)
    country_name = models.CharField(max_length=100)
    industry = models.CharField(max_length=20, choices=SalaryProfile.INDUSTRY_CHOICES)
    avg_salary_usd = models.DecimalField(max_digits=14, decimal_places=2)
    median_salary_usd = models.DecimalField(max_digits=14, decimal_places=2)
    p25_salary_usd = models.DecimalField(max_digits=14, decimal_places=2)
    p75_salary_usd = models.DecimalField(max_digits=14, decimal_places=2)
    cost_of_living_index = models.FloatField()
    data_year = models.IntegerField(default=2025)
    source = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.country_name} - {self.industry} ({self.data_year})"


class ExchangeRate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    base_currency = models.CharField(max_length=3, default='USD')
    target_currency = models.CharField(max_length=3)
    rate = models.DecimalField(max_digits=18, decimal_places=8)
    fetched_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"1 USD = {self.rate} {self.target_currency}"
