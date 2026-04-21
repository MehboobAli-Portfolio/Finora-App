import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'finora_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

users = User.objects.all()
for u in users:
    print(f"User: {u.email}, Active: {u.is_active}, password_hash: {u.password[:20]}")
