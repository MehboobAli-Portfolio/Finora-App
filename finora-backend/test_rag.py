"""Quick test script for RAG search."""
import os
os.environ["DJANGO_SETTINGS_MODULE"] = "settings"

import django
django.setup()

from ai_coach.rag_engine import search_knowledge

# Test 1: Budgeting question
print("=" * 60)
print("TEST 1: What is the 50/30/20 rule?")
print("=" * 60)
results = search_knowledge("What is the 50/30/20 rule?")
if results:
    print(f"Score: {results[0]['score']}")
    print(f"Source: {results[0]['source']}")
    print(f"Heading: {results[0]['heading']}")
    print(f"Preview: {results[0]['text'][:300]}...")
else:
    print("No results found!")

# Test 2: Investing question
print("\n" + "=" * 60)
print("TEST 2: How does compound interest work?")
print("=" * 60)
results = search_knowledge("How does compound interest work?")
if results:
    print(f"Score: {results[0]['score']}")
    print(f"Source: {results[0]['source']}")
    print(f"Heading: {results[0]['heading']}")
else:
    print("No results found!")

# Test 3: Finora app question
print("\n" + "=" * 60)
print("TEST 3: How do I add an expense?")
print("=" * 60)
results = search_knowledge("How do I add an expense?")
if results:
    print(f"Score: {results[0]['score']}")
    print(f"Source: {results[0]['source']}")
    print(f"Heading: {results[0]['heading']}")
else:
    print("No results found!")

# Test 4: Gibberish (should have low score)
print("\n" + "=" * 60)
print("TEST 4: asdfghjkl (gibberish)")
print("=" * 60)
results = search_knowledge("asdfghjkl")
if results:
    print(f"Score: {results[0]['score']} (should be low)")
else:
    print("No results found!")

print("\nAll tests completed!")
