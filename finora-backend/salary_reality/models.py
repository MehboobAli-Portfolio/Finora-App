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
    country = models.CharField(max_length=100, default='Pakistan')
    state = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    area = models.CharField(max_length=200, null=True, blank=True)
    industry = models.CharField(max_length=20, choices=INDUSTRY_CHOICES, default='other')
    job_title = models.CharField(max_length=200, null=True, blank=True)
    experience_yrs = models.IntegerField(default=0)
    dependents = models.IntegerField(default=0)
    salary_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    salary_currency = models.CharField(max_length=3, default='PKR')
    salary_frequency = models.CharField(max_length=20, default='Monthly')
    salary_usd = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.job_title or 'Profile'}"

class SalarySnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    salary_usd = models.DecimalField(max_digits=14, decimal_places=2)
    salary_pkr = models.DecimalField(max_digits=14, decimal_places=2)
    global_pctile = models.FloatField(default=0)
    country_pctile = models.FloatField(default=0)
    industry_pctile = models.FloatField(default=0)
    benchmarks = models.JSONField(default=dict)
    recorded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Snapshot {self.recorded_at.date()} - {self.user.email}"
