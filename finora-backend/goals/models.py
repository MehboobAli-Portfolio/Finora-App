from django.db import models
from django.conf import settings


class Goal(models.Model):
    GOAL_TYPES = [
        ('savings', 'Savings'),
        ('emergency', 'Emergency Fund'),
        ('vacation', 'Vacation'),
        ('education', 'Education'),
        ('home', 'Home Purchase'),
        ('car', 'Car Purchase'),
        ('retirement', 'Retirement'),
        ('debt', 'Debt Payoff'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=200)
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPES, default='savings')
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def progress_percentage(self):
        if self.target_amount == 0:
            return 0
        return min(100, round((float(self.current_amount) / float(self.target_amount)) * 100, 1))

    def __str__(self):
        return f"{self.user.email} - {self.title}"
