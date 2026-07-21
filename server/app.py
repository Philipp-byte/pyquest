"""PyQuest Schulmodus-Server. Ein Prozess liefert sowohl die gebaute
Frontend-App (dist/) als auch die JSON-API unter /api/* aus - kein separater
Webserver noetig (siehe PLAN.md Abschnitt 12: "python app.py", fertig).

Start:
    cd server
    pip install -r requirements.txt
    flask --app app create-admin <pseudonym> <passwort>
    python app.py
"""

import secrets
import sqlite3
from pathlib import Path

import click
from flask import Flask, jsonify, request, send_from_directory, session

import admin_routes
import progress_logic as pl
import teacher_routes
from auth import hash_password, login_required, verify_password
from content import chapter_id_for_lesson, load_chapter_lesson_map
from db import get_db, init_db

BASE_DIR = Path(__file__).parent
DIST_DIR = BASE_DIR.parent / "dist"
SECRET_FILE = BASE_DIR / "instance" / "secret.key"


def get_secret_key():
    SECRET_FILE.parent.mkdir(exist_ok=True)
    if SECRET_FILE.exists():
        return SECRET_FILE.read_text(encoding="utf-8").strip()
    key = secrets.token_hex(32)
    SECRET_FILE.write_text(key, encoding="utf-8")
    return key


app = Flask(__name__, static_folder=None)
app.secret_key = get_secret_key()
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

with app.app_context():
    init_db()

app.register_blueprint(teacher_routes.bp)
app.register_blueprint(admin_routes.bp)


# ---------------------------------------------------------------- Hilfsfunktionen

def compute_totals(conn, user_id):
    total_done = conn.execute(
        "SELECT COUNT(*) c FROM progress WHERE user_id=? AND status='done'", (user_id,)
    ).fetchone()["c"]
    perfect_count = conn.execute(
        "SELECT COUNT(*) c FROM progress WHERE user_id=? AND status='done' AND stars=3",
        (user_id,),
    ).fetchone()["c"]
    return total_done, perfect_count


def compute_chapters_done(conn, user_id):
    chapters = load_chapter_lesson_map()
    done_ids = {
        row["lesson_id"]
        for row in conn.execute(
            "SELECT lesson_id FROM progress WHERE user_id=? AND status='done'", (user_id,)
        ).fetchall()
    }
    return sum(1 for ch in chapters if all(lid in done_ids for lid in ch["lessonIds"]))


def build_state(conn, user_id):
    user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    lessons = {
        row["lesson_id"]: {
            "status": row["status"],
            "stars": row["stars"],
            "completedAt": row["completed_at"],
        }
        for row in conn.execute(
            "SELECT * FROM progress WHERE user_id=?", (user_id,)
        ).fetchall()
    }
    badges = {
        row["badge_id"]: row["earned_at"]
        for row in conn.execute(
            "SELECT * FROM badges WHERE user_id=?", (user_id,)
        ).fetchall()
    }
    streak_row = conn.execute(
        "SELECT * FROM streaks WHERE user_id=?", (user_id,)
    ).fetchone()
    streak = {
        "current": streak_row["current"] if streak_row else 0,
        "best": streak_row["best"] if streak_row else 0,
        "lastActiveDate": streak_row["last_active_date"] if streak_row else None,
        "lastFreezeWeek": streak_row["last_freeze_week"] if streak_row else None,
    }

    locked_chapters = []
    if user["class_id"]:
        locked_chapters = [
            row["chapter_id"]
            for row in conn.execute(
                "SELECT chapter_id FROM unlocks WHERE class_id=? AND locked=1",
                (user["class_id"],),
            ).fetchall()
        ]

    return {
        "xp": user["xp"], "lessons": lessons, "badges": badges, "streak": streak,
        "lockedChapters": locked_chapters,
    }


# ---------------------------------------------------------------- API-Routen

@app.get("/api/ping")
def ping():
    return jsonify({"ok": True})


@app.post("/api/auth/login")
def login():
    data = request.get_json(force=True, silent=True) or {}
    pseudonym = (data.get("pseudonym") or "").strip()
    password = data.get("password") or ""

    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE pseudonym=?", (pseudonym,)
    ).fetchone()
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "invalid_credentials"}), 401

    session.clear()
    session["user_id"] = user["id"]
    session["role"] = user["role"]
    conn.execute(
        "UPDATE users SET last_active=datetime('now') WHERE id=?", (user["id"],)
    )
    conn.commit()
    return jsonify({"pseudonym": user["pseudonym"], "role": user["role"]})


@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.post("/api/auth/change-password")
@login_required
def change_password():
    data = request.get_json(force=True, silent=True) or {}
    old_password = data.get("old_password") or ""
    new_password = data.get("new_password") or ""
    if len(new_password) < 4:
        return jsonify({"error": "password_too_short"}), 400

    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE id=?", (session["user_id"],)
    ).fetchone()
    if not verify_password(old_password, user["password_hash"]):
        return jsonify({"error": "wrong_password"}), 401

    conn.execute(
        "UPDATE users SET password_hash=? WHERE id=?",
        (hash_password(new_password), user["id"]),
    )
    conn.commit()
    return jsonify({"ok": True})


@app.get("/api/me")
@login_required
def me():
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE id=?", (session["user_id"],)
    ).fetchone()
    result = {"id": user["id"], "pseudonym": user["pseudonym"], "role": user["role"]}
    if user["role"] == "student" and user["class_id"]:
        cls = conn.execute(
            "SELECT leaderboard_enabled FROM classes WHERE id=?", (user["class_id"],)
        ).fetchone()
        result["leaderboardEnabled"] = bool(cls["leaderboard_enabled"]) if cls else False
    return jsonify(result)


@app.get("/api/progress/leaderboard")
@login_required
def leaderboard():
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE id=?", (session["user_id"],)
    ).fetchone()
    if not user["class_id"]:
        return jsonify({"enabled": False, "entries": []})
    cls = conn.execute(
        "SELECT leaderboard_enabled FROM classes WHERE id=?", (user["class_id"],)
    ).fetchone()
    if not cls or not cls["leaderboard_enabled"]:
        return jsonify({"enabled": False, "entries": []})

    rows = conn.execute(
        """SELECT pseudonym, xp FROM users
           WHERE class_id=? AND role='student' ORDER BY xp DESC, pseudonym""",
        (user["class_id"],),
    ).fetchall()
    entries = [
        {
            "pseudonym": r["pseudonym"],
            "xp": r["xp"],
            "level": pl.level_for_xp(r["xp"]),
            "isMe": r["pseudonym"] == user["pseudonym"],
        }
        for r in rows
    ]
    return jsonify({"enabled": True, "entries": entries})


@app.get("/api/settings/public")
def public_settings():
    conn = get_db()
    rows = conn.execute(
        "SELECT key, value FROM settings WHERE key IN ('school_name', 'default_sound_enabled')"
    ).fetchall()
    values = {r["key"]: r["value"] for r in rows}
    return jsonify({
        "schoolName": values.get("school_name", ""),
        "defaultSoundEnabled": values.get("default_sound_enabled", "1") == "1",
    })


@app.get("/api/progress/state")
@login_required
def progress_state():
    conn = get_db()
    return jsonify(build_state(conn, session["user_id"]))


@app.post("/api/progress/complete-lesson")
@login_required
def complete_lesson():
    data = request.get_json(force=True, silent=True) or {}
    lesson_id = data.get("lessonId")
    xp = int(data.get("xp") or 0)
    stars = int(data.get("stars") or 0)
    if not lesson_id:
        return jsonify({"error": "lesson_id_required"}), 400

    conn = get_db()
    user_id = session["user_id"]
    user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()

    if user["class_id"]:
        chapter_id = chapter_id_for_lesson(lesson_id)
        locked = conn.execute(
            "SELECT 1 FROM unlocks WHERE class_id=? AND chapter_id=? AND locked=1",
            (user["class_id"], chapter_id),
        ).fetchone()
        if locked:
            return jsonify({"error": "chapter_locked"}), 403

    existing = conn.execute(
        "SELECT * FROM progress WHERE user_id=? AND lesson_id=?", (user_id, lesson_id)
    ).fetchone()
    first_time = existing is None or existing["status"] != "done"
    best_stars = max(stars, existing["stars"] if existing else 0)

    if existing:
        conn.execute(
            """UPDATE progress SET status='done', stars=?, attempts=attempts+1,
               completed_at=datetime('now') WHERE user_id=? AND lesson_id=?""",
            (best_stars, user_id, lesson_id),
        )
    else:
        conn.execute(
            "INSERT INTO progress (user_id, lesson_id, status, stars) VALUES (?, ?, 'done', ?)",
            (user_id, lesson_id, best_stars),
        )

    level_before = pl.level_for_xp(user["xp"])
    gained_xp = 0
    new_xp = user["xp"]
    if first_time:
        gained_xp = xp
        new_xp = user["xp"] + xp
        conn.execute("UPDATE users SET xp=? WHERE id=?", (new_xp, user_id))
        conn.execute(
            "INSERT INTO xp_events (user_id, amount, reason) VALUES (?, ?, ?)",
            (user_id, xp, lesson_id),
        )
    level_after = pl.level_for_xp(new_xp)

    streak_row = conn.execute(
        "SELECT * FROM streaks WHERE user_id=?", (user_id,)
    ).fetchone()
    streak_result = pl.update_streak(streak_row)
    conn.execute(
        """INSERT INTO streaks (user_id, current, best, last_active_date, last_freeze_week)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             current=excluded.current, best=excluded.best,
             last_active_date=excluded.last_active_date,
             last_freeze_week=excluded.last_freeze_week""",
        (
            user_id, streak_result["current"], streak_result["best"],
            streak_result["last_active_date"], streak_result["last_freeze_week"],
        ),
    )

    total_done, perfect_count = compute_totals(conn, user_id)
    chapters_done = compute_chapters_done(conn, user_id)
    ctx = {
        "totalDone": total_done,
        "perfectCount": perfect_count,
        "chaptersDoneCount": chapters_done,
        "streakBest": streak_result["best"],
        "level": level_after,
    }

    earned_ids = {
        row["badge_id"]
        for row in conn.execute(
            "SELECT badge_id FROM badges WHERE user_id=?", (user_id,)
        ).fetchall()
    }
    new_badges = []
    for badge in pl.BADGES:
        if badge["id"] in earned_ids:
            continue
        if badge["check"](ctx):
            conn.execute(
                "INSERT INTO badges (user_id, badge_id) VALUES (?, ?)",
                (user_id, badge["id"]),
            )
            new_badges.append({k: v for k, v in badge.items() if k != "check"})

    conn.commit()

    return jsonify({
        "firstTime": first_time,
        "gainedXp": gained_xp,
        "stars": best_stars,
        "leveledUp": level_after > level_before,
        "level": level_after,
        "streak": {
            "current": streak_result["current"],
            "best": streak_result["best"],
            "lastActiveDate": streak_result["last_active_date"],
            "lastFreezeWeek": streak_result["last_freeze_week"],
        },
        "streakProtected": streak_result["protected"],
        "newBadges": new_badges,
    })


# ---------------------------------------------------------------- Statisches Frontend

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"error": "not_found"}), 404
    if not DIST_DIR.exists():
        return (
            "Frontend ist noch nicht gebaut. Bitte im Projektordner "
            "`npm run build` ausfuehren (siehe README).",
            501,
        )
    candidate = DIST_DIR / path
    if path and candidate.is_file():
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


# ---------------------------------------------------------------- CLI (Account-Bootstrap)
# Volle Klassen-/Account-Verwaltung mit automatischer Pseudonym-Generierung
# gibt es jetzt im Lehrer-Dashboard (teacher_routes.py). Diese CLI-Befehle
# bleiben fuer das allererste Anlegen von Admin-/Lehrer-Accounts nuetzlich,
# bevor jemand sich ueberhaupt einloggen kann.

@app.cli.command("create-user")
@click.argument("pseudonym")
@click.argument("password")
@click.option("--role", default="student", type=click.Choice(["student", "teacher", "admin"]))
@click.option("--class-name", default=None, help="Legt die Klasse an, falls sie noch nicht existiert.")
def create_user(pseudonym, password, role, class_name):
    """Legt einen Account an, z. B.: flask --app app create-user MutigerFuchs17 geheim123"""
    conn = get_db()
    class_id = None
    if class_name:
        row = conn.execute("SELECT id FROM classes WHERE name=?", (class_name,)).fetchone()
        if row:
            class_id = row["id"]
        else:
            cur = conn.execute("INSERT INTO classes (name) VALUES (?)", (class_name,))
            class_id = cur.lastrowid

    try:
        conn.execute(
            "INSERT INTO users (pseudonym, password_hash, role, class_id) VALUES (?, ?, ?, ?)",
            (pseudonym, hash_password(password), role, class_id),
        )
        conn.commit()
        click.echo(f"Account '{pseudonym}' ({role}) wurde angelegt.")
    except sqlite3.IntegrityError:
        click.echo(f"Fehler: Pseudonym '{pseudonym}' existiert bereits.", err=True)


@app.cli.command("create-admin")
@click.argument("pseudonym")
@click.argument("password")
def create_admin(pseudonym, password):
    """Bootstrapt den ersten Admin-Account."""
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (pseudonym, password_hash, role) VALUES (?, ?, 'admin')",
            (pseudonym, hash_password(password)),
        )
        conn.commit()
        click.echo(f"Admin-Account '{pseudonym}' wurde angelegt.")
    except sqlite3.IntegrityError:
        click.echo(f"Fehler: Pseudonym '{pseudonym}' existiert bereits.", err=True)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
