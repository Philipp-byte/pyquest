"""Liest dieselben Lerninhalte-JSONs wie das Frontend (public/content/), damit
der Server die Kapitel-Zugehoerigkeit von Lektionen kennt (fuer den
"Kapitel-Meister"-Badge), ohne die Inhalte zu duplizieren."""

import json
from pathlib import Path

CONTENT_DIR = Path(__file__).parent.parent / "public" / "content"


def load_chapter_lesson_map():
    """Gibt eine Liste von Kapiteln als [{"id": ..., "lessonIds": [...]}] zurueck."""
    curriculum = json.loads((CONTENT_DIR / "curriculum.json").read_text(encoding="utf-8"))
    chapters = []
    for chapter_id in curriculum["chapters"]:
        chapter_path = CONTENT_DIR / "chapters" / chapter_id / "chapter.json"
        chapter = json.loads(chapter_path.read_text(encoding="utf-8"))
        chapters.append({"id": chapter["id"], "lessonIds": chapter["lessons"]})
    return chapters
