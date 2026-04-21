import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'finora_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

users = User.objects.all()
for u in users:
    print(f"User: {u.email}, Hash: {u.password[:20]}..., Is hashed: {u.password.startswith('pbkdf2_')}")
