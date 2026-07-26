"""
Smart Router for Finora AI Coach.
Decides HOW to answer each user question:
  1. Intent match → Use existing FinoraAI tools (balance, budget, goals, portfolio, etc.)
  2. RAG search  → Return financial knowledge from the vector database
  3. Fallback    → Helpful "I can help with..." message

Zero API keys. Instant responses. Unlimited users.
"""

import logging

from .rag_engine import search_knowledge, is_knowledge_base_ready
from .response_formatter import format_rag_response

logger = logging.getLogger(__name__)

# Minimum cosine similarity score for a RAG result to be considered a "good match"
RAG_CONFIDENCE_THRESHOLD = 0.35

# Keywords that strongly indicate the user is asking about their OWN financial data
# (these should be routed to the existing FinoraAI intent system, not RAG)
_PERSONAL_DATA_KEYWORDS = [
    "my balance", "my budget", "my spending", "my expenses", "my goals",
    "my portfolio", "my investments", "my stocks", "my holdings", "my money",
    "my income", "my savings", "how much do i have", "how much did i spend",
    "am i over budget", "my net worth", "my transactions", "my account",
    "show me my", "what are my", "how are my", "check my",
]

# Fallback message when neither intent nor RAG can help
FALLBACK_MESSAGE = (
    "I can help you with many financial topics! Try asking me about:\n\n"
    "💰 Your finances: \"What's my balance?\", \"Show my spending\", \"Budget status\"\n"
    "🎯 Your goals: \"How are my goals?\", \"Goal progress\"\n"
    "📈 Your investments: \"My portfolio\", \"How are my stocks?\"\n"
    "📊 Financial education: \"What is the 50/30/20 rule?\", \"How does compound interest work?\"\n"
    "💳 Debt strategies: \"How to pay off credit card debt?\", \"Avalanche vs snowball\"\n"
    "🏠 Real estate: \"Should I rent or buy?\", \"How much for a down payment?\"\n"
    "🏖️ Retirement: \"What is a 401k?\", \"How much to retire?\""
)


class SmartRouter:
    """
    Routes user messages to the appropriate handler:
    - Personal finance queries → FinoraAI intent engine (existing)
    - Knowledge questions → RAG retrieval
    - Unknown → Helpful fallback
    """

    def __init__(self, finora_ai_engine):
        """
        Args:
            finora_ai_engine: An initialized FinoraAI instance
                              (from ai_logic.py, loaded with user data)
        """
        self.engine = finora_ai_engine
        self._rag_available = is_knowledge_base_ready()
        if not self._rag_available:
            logger.warning(
                "RAG knowledge base not initialized. "
                "Run: python manage.py build_knowledge_base"
            )

    def process_message(self, message, chat_history=None):
        """
        Main entry point. Routes the message and returns (response, intent, entities).

        Args:
            message: The user's chat message string.
            chat_history: List of previous messages (dicts with role/content/intent).

        Returns:
            Tuple of (response_text, intent_string, entities_dict)
        """
        lower = message.lower().strip()

        # ── Step 1: Check if this is a personal finance query ────────────
        if self._is_personal_query(lower):
            logger.info("Routing to FinoraAI intent engine: %s", message[:50])
            return self.engine.process_chat_message(message, chat_history)

        # ── Step 2: Try RAG knowledge search ─────────────────────────────
        if self._rag_available:
            rag_result = self._try_rag_search(message)
            if rag_result:
                logger.info("RAG knowledge match for: %s", message[:50])
                return rag_result, "knowledge_base", {}

        # ── Step 3: Try existing intent classifier ───────────────────────
        # In case it's a valid intent (like "how is the market") that isn't caught
        # by the personal query keywords or RAG.
        try:
            response, intent, entities = self.engine.process_chat_message(
                message, chat_history
            )
            if intent and intent != "unknown":
                logger.info("Intent classified by FinoraAI: %s", intent)
                return response, intent, entities
        except Exception as e:
            logger.warning("FinoraAI intent classification error: %s", e)

        # ── Step 4: Fallback ─────────────────────────────────────────────
        logger.info("No match found, returning fallback for: %s", message[:50])
        return FALLBACK_MESSAGE, "fallback", {}

    def _is_personal_query(self, text):
        """
        Check if the message is asking about the user's own financial data.
        These should ALWAYS go through the FinoraAI intent engine, not RAG.
        """
        return any(keyword in text for keyword in _PERSONAL_DATA_KEYWORDS)

    def _try_rag_search(self, query):
        """
        Search the RAG knowledge base and return a formatted response
        if a good match is found.

        Returns the formatted response string, or None if no good match.
        """
        try:
            chunks = search_knowledge(query, top_k=3)

            if not chunks:
                return None

            # Check confidence threshold
            best_score = chunks[0].get("score", 0)
            if best_score < RAG_CONFIDENCE_THRESHOLD:
                logger.info(
                    "RAG score %.3f below threshold %.3f for: %s",
                    best_score,
                    RAG_CONFIDENCE_THRESHOLD,
                    query[:50],
                )
                return None

            # Format the result for chat display
            formatted = format_rag_response(chunks, user_query=query)
            return formatted

        except Exception as e:
            logger.error("RAG search failed: %s", e)
            return None
