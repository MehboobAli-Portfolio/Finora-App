"""
Train TF-IDF + LogisticRegression on FINORA_INTENTS (same phrases as PyTorch path).
Run from repo root or finora-backend:

  cd finora-backend
  python -m users.ai_model.train_sklearn_intent

Writes users/ai_model/intent_sklearn.joblib
"""
import os
import sys

# finora-backend on path
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, _BACKEND_ROOT)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "finora_backend.settings")

import django

django.setup()

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
import joblib

from users.ai_model.intent_corpus import FINORA_INTENTS

X_text: list[str] = []
y_labels: list[str] = []
for tag, patterns in FINORA_INTENTS.items():
    for p in patterns:
        X_text.append(p)
        y_labels.append(tag)

le = LabelEncoder()
y = le.fit_transform(y_labels)

vectorizer = TfidfVectorizer(
    lowercase=True,
    ngram_range=(1, 2),
    min_df=1,
    max_df=0.95,
    sublinear_tf=True,
)
Xv = vectorizer.fit_transform(X_text)

clf = LogisticRegression(max_iter=2500, C=1.2, random_state=42, solver="lbfgs")
clf.fit(Xv, y)

out_path = os.path.join(os.path.dirname(__file__), "intent_sklearn.joblib")
joblib.dump(
    {
        "vectorizer": vectorizer,
        "clf": clf,
        "label_encoder": le,
    },
    out_path,
)
print(f"Saved sklearn intent pipeline to {out_path} ({len(X_text)} training lines, {len(le.classes_)} classes).")
