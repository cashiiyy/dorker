import json
import sqlite3
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..config import settings
from ..models.schemas import ResearchSessionCreate, ResearchSessionItem

class ResearchSessionService:
    def __init__(self, db_path: Optional[str] = None):
        # Default SQLite path from DATABASE_URL
        if db_path is None:
            db_path = settings.DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS research_sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    objective TEXT NOT NULL,
                    category TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    queries_json TEXT NOT NULL,
                    results_json TEXT NOT NULL,
                    notes TEXT
                )
            """)
            conn.commit()

    def create_session(self, data: ResearchSessionCreate) -> ResearchSessionItem:
        session_id = f"sess-{uuid.uuid4().hex[:8]}"
        created_at = datetime.utcnow().isoformat() + "Z"
        queries_str = json.dumps(data.queries)
        results_str = json.dumps(data.results)

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO research_sessions (id, title, objective, category, created_at, queries_json, results_json, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (session_id, data.title, data.objective, data.category, created_at, queries_str, results_str, data.notes)
            )
            conn.commit()

        return ResearchSessionItem(
            id=session_id,
            title=data.title,
            objective=data.objective,
            category=data.category,
            created_at=created_at,
            queries=data.queries,
            results=data.results,
            notes=data.notes
        )

    def list_sessions(self) -> List[ResearchSessionItem]:
        with self._get_connection() as conn:
            cur = conn.execute("SELECT * FROM research_sessions ORDER BY created_at DESC")
            rows = cur.fetchall()

        items = []
        for r in rows:
            items.append(ResearchSessionItem(
                id=r["id"],
                title=r["title"],
                objective=r["objective"],
                category=r["category"],
                created_at=r["created_at"],
                queries=json.loads(r["queries_json"]),
                results=json.loads(r["results_json"]),
                notes=r["notes"]
            ))
        return items

    def get_session(self, session_id: str) -> Optional[ResearchSessionItem]:
        with self._get_connection() as conn:
            cur = conn.execute("SELECT * FROM research_sessions WHERE id = ?", (session_id,))
            r = cur.fetchone()
            if not r:
                return None
            return ResearchSessionItem(
                id=r["id"],
                title=r["title"],
                objective=r["objective"],
                category=r["category"],
                created_at=r["created_at"],
                queries=json.loads(r["queries_json"]),
                results=json.loads(r["results_json"]),
                notes=r["notes"]
            )

    def delete_session(self, session_id: str) -> bool:
        with self._get_connection() as conn:
            cur = conn.execute("DELETE FROM research_sessions WHERE id = ?", (session_id,))
            conn.commit()
            return cur.rowcount > 0

    def export_markdown(self, session_id: str) -> Optional[str]:
        sess = self.get_session(session_id)
        if not sess:
            return None

        md = [
            f"# Dorker Research Report: {sess.title}",
            f"**Session ID:** `{sess.id}`  ",
            f"**Date:** {sess.created_at}  ",
            f"**Category:** {sess.category}  ",
            f"**Objective:** {sess.objective}\n",
            "## Generated Google Operator Queries\n"
        ]

        for idx, q in enumerate(sess.queries, 1):
            md.append(f"### {idx}. {q.get('label', 'Query')}")
            md.append(f"```text\n{q.get('query', '')}\n```")
            md.append(f"- **Purpose:** {q.get('purpose', '')}")
            md.append(f"- **Operators:** {', '.join(q.get('operators', []))}")
            md.append(f"- **Risk Level:** `{q.get('risk_level', 'low')}`\n")

        if sess.results:
            md.append("## Search Results & Source Metadata\n")
            for idx, r in enumerate(sess.results, 1):
                md.append(f"### [{idx}] {r.get('title', 'Untitled')}")
                md.append(f"- **URL:** {r.get('link', '')}")
                md.append(f"- **Domain:** `{r.get('domain', '')}`")
                if r.get('date'):
                    md.append(f"- **Indexed Date:** {r.get('date')}")
                md.append(f"> {r.get('snippet', '')}\n")

        if sess.notes:
            md.append("## Analyst Notes\n")
            md.append(sess.notes)

        return "\n".join(md)
