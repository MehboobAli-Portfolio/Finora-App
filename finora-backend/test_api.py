"""Quick test script to verify the SmartRouter logic."""
import os
import sys
import django

sys.stdout.reconfigure(encoding='utf-8')
os.environ["DJANGO_SETTINGS_MODULE"] = "settings"
django.setup()

from django.contrib.auth import get_user_model
from ai_coach.views import _build_ai_engine
from ai_coach.smart_router import SmartRouter

User = get_user_model()
user, _ = User.objects.get_or_create(email="test_rag@finora.com", defaults={"first_name": "Test", "last_name": "User"})

# Initialize the engine and router
engine = _build_ai_engine(user, include_investments=True, include_categories=True, include_recent=True)
router = SmartRouter(engine)

print("=" * 60)
print("TEST 1: Existing Intent (Personal Data)")
print("Message: what is my balance")
print("=" * 60)
reply, intent, entities = router.process_message("what is my balance")
print(f"Intent: {intent}")
print(f"Reply:\n{reply}")

print("\n" + "=" * 60)
print("TEST 2: RAG Knowledge Query")
print("Message: What is the 50/30/20 rule?")
print("=" * 60)
reply, intent, entities = router.process_message("What is the 50/30/20 rule?")
print(f"Intent: {intent}")
print(f"Reply:\n{reply}")

print("\n" + "=" * 60)
print("TEST 3: Fallback Query")
print("Message: asdfghjkl")
print("=" * 60)
reply, intent, entities = router.process_message("asdfghjkl")
print(f"Intent: {intent}")
print(f"Reply:\n{reply}")
