from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import GoalDeposit


def _recalculate_goal(goal):
    """Recalculate a Goal's current_amount from the Sum of all its deposits."""
    total = (
        goal.deposits.aggregate(total=Sum('amount'))['total'] or 0
    )
    goal.current_amount = total
    if goal.current_amount >= goal.target_amount:
        goal.status = 'completed'
    elif goal.status == 'completed':
        # Revert to active if deposits were removed and we're below target
        goal.status = 'active'
    goal.save(update_fields=['current_amount', 'status'])


@receiver(post_save, sender=GoalDeposit)
def deposit_saved(sender, instance, **kwargs):
    """Recalculate parent goal whenever a deposit is created or updated."""
    _recalculate_goal(instance.goal)


@receiver(post_delete, sender=GoalDeposit)
def deposit_deleted(sender, instance, **kwargs):
    """Recalculate parent goal whenever a deposit is deleted."""
    try:
        # Reload the goal — it may have been cascade-deleted too
        from .models import Goal
        goal = Goal.objects.get(pk=instance.goal_id)
        _recalculate_goal(goal)
    except Exception:
        pass
