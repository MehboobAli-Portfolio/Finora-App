"""
Response Formatter for Finora AI Coach.
Takes raw RAG document chunks and formats them into clean, chat-friendly responses.
"""

import re


def format_rag_response(chunks, user_query=""):
    """
    Take RAG search results and format into a clean chat response.

    Args:
        chunks: List of dicts from rag_engine.search_knowledge()
        user_query: The original user question (for context)

    Returns:
        A formatted string ready to display in the chat UI.
    """
    if not chunks:
        return None

    best = chunks[0]
    text = best["text"]

    # Clean up the raw markdown for chat display
    text = _clean_for_chat(text)

    # Add a topic emoji prefix
    source = best.get("source", "")
    emoji = _get_topic_emoji(source)

    # Build the response
    response = f"{emoji} {text}"

    # Add related topic suggestions if we have multiple good matches
    related = _get_related_topics(chunks[1:], source)
    if related:
        response += f"\n\n💡 Related topics you can ask about: {related}"

    return response


def _clean_for_chat(text):
    """
    Clean markdown formatting for chat display.
    Keeps the content readable without raw markdown syntax.
    """
    # Remove ## headings but keep the text as a bold-style intro
    text = re.sub(r"^##\s+(.+)$", r"\1", text, flags=re.MULTILINE)
    text = re.sub(r"^#\s+(.+)$", r"\1", text, flags=re.MULTILINE)

    # Trim excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    # Truncate very long responses (keep under ~1500 chars for readability)
    if len(text) > 1500:
        # Find a sentence boundary near the limit
        truncated = text[:1500]
        last_period = truncated.rfind(".")
        if last_period > 1000:
            text = truncated[: last_period + 1]
        else:
            text = truncated + "..."

    return text


def _get_topic_emoji(source_filename):
    """Return an emoji based on the knowledge document source."""
    emoji_map = {
        "finora_faq": "📱",
        "budgeting": "📊",
        "investing": "📈",
        "debt": "💳",
        "savings": "💰",
        "tax": "🧾",
        "retirement": "🏖️",
        "real_estate": "🏠",
    }
    for key, emoji in emoji_map.items():
        if key in source_filename.lower():
            return emoji
    return "💡"


def _get_related_topics(remaining_chunks, current_source):
    """
    Generate related topic suggestions from other matching chunks.
    Only suggests topics from DIFFERENT source documents.
    """
    seen_sources = {current_source}
    suggestions = []

    for chunk in remaining_chunks:
        source = chunk.get("source", "")
        if source in seen_sources or chunk.get("score", 0) < 0.3:
            continue
        seen_sources.add(source)

        heading = chunk.get("heading", "")
        if heading:
            suggestions.append(heading)

        if len(suggestions) >= 2:
            break

    return ", ".join(suggestions) if suggestions else ""
