"""Lehrer-Dashboard: Klassen, Account-Generator, Fortschrittsuebersicht,
Kapitel-Freischaltung, Rangliste ein/aus. Siehe PLAN.md Abschnitt 10."""

from flask import Blueprint, jsonify, request, session

import progress_logic as pl
from auth import hash_password, roles_required
from content import load_chapter_lesson_map
from db import get_db
from pseudonyms import generate_pseudonym, generate_start_password

bp = Blueprint("teacher", __name__, url_prefix="/api/teacher")


def _own_class_or_404(conn, class_id):
    row = conn.execute(
        "SELECT * FROM classes WHERE id=? AND teacher_id=?",
        (class_id, session["user_id"]),
    ).fetchone()
    return row


@bp.get("/classes")
@roles_required("teacher")
def list_classes():
    conn = get_db()
    rows = conn.execute(
        """SELECT c.*, (SELECT COUNT(*) FROM users u WHERE u.class_id=c.id AND u.role='student') AS student_count
           FROM classes c WHERE c.teacher_id=? ORDER BY c.created_at""",
        (session["user_id"],),
    ).fetchall()
    return jsonify([
        {
            "id": r["id"], "name": r["name"], "studentCount": r["student_count"],
            "leaderboardEnabled": bool(r["leaderboard_enabled"]),
            "createdAt": r["created_at"],
        }
        for r in rows
    ])


@bp.post("/classes")
@roles_required("teacher")
def create_class():
    data = request.get_json(force=True, silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name_required"}), 400
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO classes (name, teacher_id) VALUES (?, ?)", (name, session["user_id"])
    )
    conn.commit()
    return jsonify({"id": cur.lastrowid, "name": name})


@bp.delete("/classes/<int:class_id>")
@roles_required("teacher")
def delete_class(class_id):
    conn = get_db()
    if not _own_class_or_404(conn, class_id):
        return jsonify({"error": "not_found"}), 404
    # Schueler-Accounts bleiben erhalten (nur die Klassen-Zuordnung entfaellt) -
    # siehe ON DELETE SET NULL bei users.class_id.
    conn.execute("DELETE FROM classes WHERE id=?", (class_id,))
    conn.commit()
    return jsonify({"ok": True})


@bp.get("/classes/<int:class_id>/students")
@roles_required("teacher")
def list_students(class_id):
    conn = get_db()
    if not _own_class_or_404(conn, class_id):
        return jsonify({"error": "not_found"}), 404

    total_lessons = sum(
        len(ch["lessonIds"]) for ch in load_chapter_lesson_map()
    )
    rows = conn.execute(
        """SELECT u.id, u.pseudonym, u.xp, u.last_active,
             (SELECT COUNT(*) FROM progress p WHERE p.user_id=u.id AND p.status='done') AS lessons_done,
             (SELECT COALESCE(SUM(stars),0) FROM progress p WHERE p.user_id=u.id AND p.status='done') AS stars_sum
           FROM users u WHERE u.class_id=? AND u.role='student'
           ORDER BY u.pseudonym""",
        (class_id,),
    ).fetchall()

    students = [
        {
            "id": r["id"],
            "pseudonym": r["pseudonym"],
            "xp": r["xp"],
            "level": pl.level_for_xp(r["xp"]),
            "lessonsDone": r["lessons_done"],
            "totalLessons": total_lessons,
            "stars": r["stars_sum"],
            "lastActive": r["last_active"],
        }
        for r in rows
    ]
    avg_xp = round(sum(s["xp"] for s in students) / len(students)) if students else 0
    return jsonify({"students": students, "totalLessons": total_lessons, "avgXp": avg_xp})


@bp.post("/classes/<int:class_id>/students/generate")
@roles_required("teacher")
def generate_students(class_id):
    conn = get_db()
    if not _own_class_or_404(conn, class_id):
        return jsonify({"error": "not_found"}), 404

    data = request.get_json(force=True, silent=True) or {}
    count = int(data.get("count") or 1)
    count = max(1, min(count, 40))  # sinnvolle Obergrenze pro Klassensatz

    existing = {
        r["pseudonym"] for r in conn.execute("SELECT pseudonym FROM users").fetchall()
    }
    created = []
    for _ in range(count):
        pseudonym = generate_pseudonym(existing)
        existing.add(pseudonym)
        password = generate_start_password()
        conn.execute(
            "INSERT INTO users (pseudonym, password_hash, role, class_id) VALUES (?, ?, 'student', ?)",
            (pseudonym, hash_password(password), class_id),
        )
        created.append({"pseudonym": pseudonym, "password": password})
    conn.commit()
    return jsonify({"created": created})


@bp.post("/students/<int:student_id>/reset-password")
@roles_required("teacher")
def reset_student_password(student_id):
    conn = get_db()
    student = conn.execute(
        "SELECT u.*, c.teacher_id FROM users u JOIN classes c ON c.id=u.class_id WHERE u.id=?",
        (student_id,),
    ).fetchone()
    if not student or student["teacher_id"] != session["user_id"]:
        return jsonify({"error": "not_found"}), 404

    new_password = generate_start_password()
    conn.execute(
        "UPDATE users SET password_hash=? WHERE id=?",
        (hash_password(new_password), student_id),
    )
    conn.commit()
    return jsonify({"pseudonym": student["pseudonym"], "password": new_password})


@bp.delete("/students/<int:student_id>")
@roles_required("teacher")
def delete_student(student_id):
    conn = get_db()
    student = conn.execute(
        "SELECT u.*, c.teacher_id FROM users u JOIN classes c ON c.id=u.class_id WHERE u.id=?",
        (student_id,),
    ).fetchone()
    if not student or student["teacher_id"] != session["user_id"]:
        return jsonify({"error": "not_found"}), 404
    conn.execute("DELETE FROM users WHERE id=?", (student_id,))
    conn.commit()
    return jsonify({"ok": True})


@bp.get("/classes/<int:class_id>/chapters")
@roles_required("teacher")
def list_chapters(class_id):
    conn = get_db()
    if not _own_class_or_404(conn, class_id):
        return jsonify({"error": "not_found"}), 404
    locked_ids = {
        r["chapter_id"]
        for r in conn.execute(
            "SELECT chapter_id FROM unlocks WHERE class_id=? AND locked=1", (class_id,)
        ).fetchall()
    }
    chapters = load_chapter_lesson_map()
    return jsonify([
        {"id": ch["id"], "locked": ch["id"] in locked_ids} for ch in chapters
    ])


@bp.post("/classes/<int:class_id>/chapters/<chapter_id>/lock")
@roles_required("teacher")
def set_chapter_lock(class_id, chapter_id):
    conn = get_db()
    if not _own_class_or_404(conn, class_id):
        return jsonify({"error": "not_found"}), 404
    data = request.get_json(force=True, silent=True) or {}
    locked = bool(data.get("locked"))
    conn.execute(
        """INSERT INTO unlocks (class_id, chapter_id, locked) VALUES (?, ?, ?)
           ON CONFLICT(class_id, chapter_id) DO UPDATE SET locked=excluded.locked""",
        (class_id, chapter_id, int(locked)),
    )
    conn.commit()
    return jsonify({"ok": True})


@bp.post("/classes/<int:class_id>/leaderboard")
@roles_required("teacher")
def set_leaderboard(class_id):
    conn = get_db()
    if not _own_class_or_404(conn, class_id):
        return jsonify({"error": "not_found"}), 404
    data = request.get_json(force=True, silent=True) or {}
    enabled = bool(data.get("enabled"))
    conn.execute(
        "UPDATE classes SET leaderboard_enabled=? WHERE id=?", (int(enabled), class_id)
    )
    conn.commit()
    return jsonify({"ok": True})
