"""
create_admin.py — Create a superuser non-interactively.

Usage (run from finora-backend/):
    python create_admin.py

Environment variables (required — set in .env or shell):
    ADMIN_EMAIL     e.g. admin@finora.app
    ADMIN_USERNAME  e.g. admin
    ADMIN_PASSWORD  strong password (min 12 chars, not common)

Never hardcode credentials here; always use environment variables.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.contrib.auth import get_user_model  # noqa: E402  (after django.setup)

User = get_user_model()

email    = os.environ.get('ADMIN_EMAIL', '').strip()
username = os.environ.get('ADMIN_USERNAME', '').strip()
password = os.environ.get('ADMIN_PASSWORD', '').strip()

if not email or not username or not password:
    print(
        'ERROR: ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD must all be '
        'set as environment variables. Refusing to create a superuser with '
        'empty or default credentials.',
        file=sys.stderr,
    )
    sys.exit(1)

if User.objects.filter(email=email).exists():
    print(f'Superuser with email "{email}" already exists — skipping.')
    sys.exit(0)

User.objects.create_superuser(
    username=username,
    email=email,
    password=password,
)
print(f'Superuser created: {username} <{email}>')
