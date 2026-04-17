"""
TF-IDF + LogisticRegression intent classifier (trained by train_sklearn_intent.py).
If intent_sklearn.joblib is missing, FinoraAI falls back to PyTorch FinoraNet only.
"""
from __future__ import annotations

import os
from typing import NamedTuple

import numpy as np

_SKLEARN_BUNDLE: dict | None | bool = None  # None=unloaded, False=missing/corrupt, dict=loaded

_JOBLIB_PATH = os.path.join(os.path.dirname(__file__), "intent_sklearn.joblib")


class IntentPrediction(NamedTuple):
    intent: str
    confidence: float
    margin: float


def _load_bundle():
    global _SKLEARN_BUNDLE
    if _SKLEARN_BUNDLE is False:
        return None
    if isinstance(_SKLEARN_BUNDLE, dict):
        return _SKLEARN_BUNDLE
    if not os.path.isfile(_JOBLIB_PATH):
        _SKLEARN_BUNDLE = False
        return None
    try:
        import joblib
        bundle = joblib.load(_JOBLIB_PATH)
    except Exception:
        _SKLEARN_BUNDLE = False
        return None
    if not isinstance(bundle, dict) or not all(k in bundle for k in ("vectorizer", "clf", "label_encoder")):
        _SKLEARN_BUNDLE = False
        return None
    _SKLEARN_BUNDLE = bundle
    return _SKLEARN_BUNDLE


def sklearn_intent_available() -> bool:
    return isinstance(_load_bundle(), dict)


def predict_intent_sklearn(message: str) -> IntentPrediction | None:
    bundle = _load_bundle()
    if bundle is None:
        return None
    vec = bundle["vectorizer"]
    clf = bundle["clf"]
    le: object = bundle["label_encoder"]
    text = (message or "").strip()
    if not text:
        return None
    x = vec.transform([text])
    proba = clf.predict_proba(x)[0]
    order = np.argsort(proba)[::-1]
    i1 = int(order[0])
    p1 = float(proba[i1])
    p2 = float(proba[int(order[1])]) if len(order) > 1 else 0.0
    margin = p1 - p2
    code = clf.classes_[i1]
    intent = le.inverse_transform(np.array([code]))[0]
    return IntentPrediction(intent=str(intent), confidence=p1, margin=margin)
