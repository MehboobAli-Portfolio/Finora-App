from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    RISK_PROFILE_CHOICES = [
        ('conservative', 'Conservative'),
        ('moderate', 'Moderate'),
        ('aggressive', 'Aggressive'),
    ]

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=200, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    
    # Matching PDF TABLE: users_userprofile
    risk_profile = models.CharField(
        max_length=20,
        choices=RISK_PROFILE_CHOICES,
        default='moderate'
    )
    monthly_budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    investment_goals = models.JSONField(
        default=dict,
        blank=True,
        help_text='e.g. {"retirement": true, "target": 500000}'
    )
    currency = models.CharField(max_length=3, default='PKR')
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
