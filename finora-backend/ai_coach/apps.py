from django.apps import AppConfig


class AiCoachConfig(AppConfig):
    name = 'ai_coach'
    verbose_name = 'Finora AI Coach'

    def ready(self):
        # Pre-warm the ML model at server startup so the first chat request
        # doesn't pay the cold-start penalty.
        try:
            from .ai_logic import FinoraAI
            FinoraAI.load_model()
        except Exception:
            pass  # Non-fatal: model loads lazily on first request if this fails
