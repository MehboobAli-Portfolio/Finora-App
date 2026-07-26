"""
Django management command to build/rebuild the RAG knowledge base.

Usage:
    python manage.py build_knowledge_base

This reads all .md files from ai_coach/knowledge_base/,
chunks them, embeds them locally using sentence-transformers,
and stores the vectors in ChromaDB.

Safe to re-run — it uses upsert, so existing documents are updated.
"""

from django.core.management.base import BaseCommand

from ai_coach.rag_engine import build_knowledge_base, get_knowledge_base_stats


class Command(BaseCommand):
    help = "Build or rebuild the Finora AI knowledge base for RAG search."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Building Finora knowledge base..."))
        self.stdout.write("")

        try:
            num_chunks = build_knowledge_base()

            if num_chunks == 0:
                self.stdout.write(
                    self.style.WARNING(
                        "No chunks were indexed. "
                        "Make sure ai_coach/knowledge_base/ contains .md files."
                    )
                )
                return

            stats = get_knowledge_base_stats()
            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS(
                    f"Knowledge base built successfully!"
                )
            )
            self.stdout.write(
                f"  Total chunks indexed: {stats['total_chunks']}"
            )
            self.stdout.write(
                f"  Status: {stats['status']}"
            )
            self.stdout.write("")
            self.stdout.write(
                "The AI Coach can now answer financial education questions."
            )

        except ImportError as e:
            self.stdout.write(
                self.style.ERROR(
                    f"Missing dependency: {e}\n"
                    "Run: pip install sentence-transformers chromadb"
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to build knowledge base: {e}")
            )
