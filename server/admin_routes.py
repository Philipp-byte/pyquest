"""Admin-Bereich: Lehrer-/Admin-Accounts verwalten, globale Einstellungen.
Siehe PLAN.md Abschnitt 10."""

import sqlite3

from flask import Blueprint, jsonify, request, session

from auth import hash_password, roles_required
from db import get_db

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.get("/teachers")
@roles_required("admin")
def list_teachers():
    conn = get_db()
    rows = conn.execute(
        """SELECT id, pseudonym, role, created_at, last_active FROM users
           WHERE role IN ('teacher', 'admin') ORDER BY role, pseudonym"""
    ).fetchall()
    return jsonify([
        {
            "id": r["id"], "pseudonym": r["pseudonym"], "role": r["role"],
            "createdAt": r["created_at"], "lastActive": r["last_active"],
        }
        for r in rows
    ])


@bp.post("/teachers")
@roles_required("admin")
def create_teacher():
    data = request.get_json(force=True, silent=True) or {}
    pseudonym = (data.get("pseudonym") or "").strip()
    password = data.get("password") or ""
    role = data.get("role") or "teacher"
    if role not in ("teacher", "admin"):
        return jsonify({"error": "invalid_role"}), 400
    if not pseudonym or len(password) < 4:
        return jsonify({"error": "invalid_input"}), 400

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (pseudonym, password_hash, role) VALUES (?, ?, ?)",
            (pseudonym, hash_password(password), role),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "pseudonym_taken"}), 409
    return jsonify({"ok": True})


@bp.post("/teachers/<int:user_id>/reset-password")
@roles_required("admin")
def reset_teacher_password(user_id):
    data = request.get_json(force=True, silent=True) or {}
    new_password = data.get("new_password") or ""
    if len(new_password) < 4:
        return jsonify({"error": "password_too_short"}), 400

    conn = get_db()
    row = conn.execute(
        "SELECT id FROM users WHERE id=? AND role IN ('teacher','admin')", (user_id,)
    ).fetchone()
    if not row:
        return jsonify({"error": "not_found"}), 404
    conn.execute(
        "UPDATE users SET password_hash=? WHERE id=?", (hash_password(new_password), user_id)
    )
    conn.commit()
    return jsonify({"ok": True})


@bp.delete("/teachers/<int:user_id>")
@roles_required("admin")
def delete_teacher(user_id):
    if user_id == session["user_id"]:
        return jsonify({"error": "cannot_delete_self"}), 400
    conn = get_db()
    row = conn.execute(
        "SELECT id FROM users WHERE id=? AND role IN ('teacher','admin')", (user_id,)
    ).fetchone()
    if not row:
        return jsonify({"error": "not_found"}), 404
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    return jsonify({"ok": True})


DEFAULT_SETTINGS = {"school_name": "", "default_sound_enabled": "1"}


@bp.get("/settings")
@roles_required("admin")
def get_settings():
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    values = {**DEFAULT_SETTINGS, **{r["key"]: r["value"] for r in rows}}
    return jsonify({
        "schoolName": values["school_name"],
        "defaultSoundEnabled": values["default_sound_enabled"] == "1",
    })


@bp.post("/settings")
@roles_required("admin")
def update_settings():
    data = request.get_json(force=True, silent=True) or {}
    conn = get_db()
    if "schoolName" in data:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('school_name', ?)"
            " ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (str(data["schoolName"]).strip(),),
        )
    if "defaultSoundEnabled" in data:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('default_sound_enabled', ?)"
            " ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            ("1" if data["defaultSoundEnabled"] else "0",),
        )
    conn.commit()
    return jsonify({"ok": True})
