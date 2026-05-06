import uuid
from django.db import models
from django.conf import settings


class Goal(models.Model):
    CATEGORY_CHOICES = [
        ('savings', 'Savings'),
        ('investment', 'Investment'),
        ('emergency', 'Emergency Fund'),
        ('travel', 'Travel'),
        ('vacation', 'Vacation'),
        ('education', 'Education'),
        ('home', 'Home'),
        ('car', 'Car'),
        ('retirement', 'Retirement'),
        ('debt', 'Debt Payoff'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='goals')
    name = models.CharField(max_length=200)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deadline = models.DateField(null=True, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

    class Meta:
        ordering = ['-deadline']

    def __str__(self):
        return f"{self.user.email} - {self.name}"

    @property
    def progress_pct(self):
        if self.target_amount <= 0:
            return 0
        pct = (float(self.current_amount) / float(self.target_amount)) * 100
        return min(100, round(pct, 1))

    @property
    def progress_percentage(self):
        return self.progress_pct


class GoalDeposit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='deposits')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.TextField(null=True, blank=True)
    deposited_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            # Update goal current_amount
            self.goal.current_amount = float(self.goal.current_amount) + float(self.amount)
            if self.goal.current_amount >= self.goal.target_amount:
                self.goal.status = 'completed'
            self.goal.save()

    def __str__(self):
        return f"Deposit {self.amount} for {self.goal.name}"
