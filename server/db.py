"""SQLite-Zugriff. Bewusst ohne ORM (Plan: "moeglichst einfach, wartungsarm").
Backup = Datei server/instance/pyquest.db kopieren."""

import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).parent
INSTANCE_DIR = BASE_DIR / "instance"
DB_PATH = INSTANCE_DIR / "pyquest.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"


def get_db():
    INSTANCE_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.commit()
    conn.close()
