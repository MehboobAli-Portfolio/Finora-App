"""
RAG Engine for Finora AI Coach.
Handles document loading, chunking, embedding (local), and semantic search.
Uses sentence-transformers for embeddings and ChromaDB for vector storage.
Zero API keys required — everything runs locally.
"""

import os
import re
import hashlib
import logging

logger = logging.getLogger(__name__)

# Lazy-loaded globals to avoid heavy imports at module level
_embedder = None
_collection = None
_chroma_client = None

KNOWLEDGE_BASE_DIR = os.path.join(os.path.dirname(__file__), "knowledge_base")
CHROMA_DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
COLLECTION_NAME = "finora_knowledge"


def _get_embedder():
    """Lazy-load the sentence-transformers embedding model (~80MB, CPU-only)."""
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer(EMBEDDING_MODEL_NAME)
            logger.info("Loaded embedding model: %s", EMBEDDING_MODEL_NAME)
        except ImportError:
            logger.error(
                "sentence-transformers not installed. "
                "Run: pip install sentence-transformers"
            )
            raise
    return _embedder


def _get_collection():
    """Lazy-load (or create) the ChromaDB collection."""
    global _collection, _chroma_client
    if _collection is None:
        try:
            import chromadb

            # Disable telemetry via environment variable (works across all versions)
            os.environ["ANONYMIZED_TELEMETRY"] = "False"

            _chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
            _collection = _chroma_client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(
                "ChromaDB collection ready (%d documents).",
                _collection.count(),
            )
        except ImportError:
            logger.error("chromadb not installed. Run: pip install chromadb")
            raise
    return _collection


# ── Document Loading & Chunking ──────────────────────────────────────────


def _load_markdown_files():
    """Read all .md files from the knowledge_base directory."""
    documents = []
    if not os.path.isdir(KNOWLEDGE_BASE_DIR):
        logger.warning("Knowledge base directory not found: %s", KNOWLEDGE_BASE_DIR)
        return documents

    for filename in sorted(os.listdir(KNOWLEDGE_BASE_DIR)):
        if not filename.endswith(".md"):
            continue
        filepath = os.path.join(KNOWLEDGE_BASE_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        documents.append({"filename": filename, "content": content})
        logger.info("Loaded knowledge document: %s", filename)

    return documents


def _chunk_document(doc):
    """
    Split a markdown document into chunks at ## heading boundaries.
    Each chunk = the heading + its body text.
    This gives clean, self-contained answer blocks.
    """
    filename = doc["filename"]
    content = doc["content"]
    chunks = []

    # Split on ## headings (keep the heading with its body)
    sections = re.split(r"\n(?=## )", content)

    for section in sections:
        section = section.strip()
        if not section:
            continue

        # Skip top-level # headings that are just titles with no answer content
        if section.startswith("# ") and "\n## " not in section and len(section) < 200:
            continue

        # Extract the heading for metadata
        heading_match = re.match(r"^##?\s+(.+)", section)
        heading = heading_match.group(1) if heading_match else filename

        # Generate a deterministic ID for upsert idempotency
        doc_id = hashlib.md5(
            f"{filename}:{heading}".encode("utf-8")
        ).hexdigest()

        chunks.append({
            "id": doc_id,
            "text": section,
            "metadata": {
                "source": filename,
                "heading": heading,
            },
        })

    return chunks


# ── Public API ───────────────────────────────────────────────────────────


def build_knowledge_base():
    """
    Index all knowledge base markdown files into ChromaDB.
    Call this once (or whenever documents change).
    Idempotent — safe to re-run.
    """
    documents = _load_markdown_files()
    if not documents:
        logger.warning("No markdown files found in knowledge_base/")
        return 0

    all_chunks = []
    for doc in documents:
        all_chunks.extend(_chunk_document(doc))

    if not all_chunks:
        logger.warning("No chunks extracted from documents.")
        return 0

    embedder = _get_embedder()
    collection = _get_collection()

    # Embed all chunk texts
    texts = [c["text"] for c in all_chunks]
    logger.info("Embedding %d chunks...", len(texts))
    embeddings = embedder.encode(texts, show_progress_bar=True).tolist()

    # Upsert into ChromaDB (idempotent)
    collection.upsert(
        ids=[c["id"] for c in all_chunks],
        documents=texts,
        embeddings=embeddings,
        metadatas=[c["metadata"] for c in all_chunks],
    )

    logger.info(
        "Knowledge base built: %d chunks from %d documents.",
        len(all_chunks),
        len(documents),
    )
    return len(all_chunks)


def search_knowledge(query, top_k=3):
    """
    Search the knowledge base for the most relevant chunks.

    Returns a list of dicts:
        [{"text": "...", "source": "filename.md", "heading": "...", "score": 0.85}, ...]

    Higher score = more relevant (cosine similarity).
    Returns empty list if knowledge base is not initialized or no good match.
    """
    try:
        collection = _get_collection()
    except Exception:
        logger.warning("ChromaDB not available for search.")
        return []

    if collection.count() == 0:
        logger.warning("Knowledge base is empty. Run: python manage.py build_knowledge_base")
        return []

    try:
        embedder = _get_embedder()
        query_embedding = embedder.encode([query]).tolist()

        results = collection.query(
            query_embeddings=query_embedding,
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        # Safety check: ensure results have content
        if (
            not results
            or not results.get("documents")
            or not results["documents"][0]
        ):
            return []

        hits = []
        for i in range(len(results["documents"][0])):
            # ChromaDB cosine distance is in [0, 2]; convert to similarity [0, 1]
            distance = results["distances"][0][i]
            similarity = max(0.0, min(1.0, 1.0 - distance))

            hits.append({
                "text": results["documents"][0][i],
                "source": results["metadatas"][0][i].get("source", ""),
                "heading": results["metadatas"][0][i].get("heading", ""),
                "score": round(similarity, 4),
            })

        return hits

    except Exception as e:
        logger.error("RAG search error: %s", e)
        return []


def is_knowledge_base_ready():
    """Check whether the knowledge base has been indexed."""
    try:
        collection = _get_collection()
        return collection.count() > 0
    except Exception:
        return False


def get_knowledge_base_stats():
    """Return basic stats about the knowledge base."""
    try:
        collection = _get_collection()
        return {
            "total_chunks": collection.count(),
            "status": "ready" if collection.count() > 0 else "empty",
        }
    except Exception:
        return {"total_chunks": 0, "status": "not_initialized"}
