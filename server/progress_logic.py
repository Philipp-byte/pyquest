"""Python-Pendant zu src/level-math.js, src/streak.js und src/badges.js.
Muss inhaltlich gleich bleiben, damit Demo-Modus (Browser) und Schulmodus
(Server) sich identisch anfuehlen - siehe PLAN.md Abschnitt 3."""

from datetime import datetime


# ---------- Level-Kurve (identisch zu src/level-math.js) ----------

def xp_for_level(level):
    if level <= 1:
        return 0
    return round(100 * (level - 1) ** 1.5)


def level_for_xp(xp):
    level = 1
    while xp >= xp_for_level(level + 1):
        level += 1
    return level


# ---------- Streak (identisch zu src/streak.js) ----------

def _local_date_key(dt):
    return dt.strftime("%Y-%m-%d")


def _iso_week_key(dt):
    iso = dt.isocalendar()
    return f"{iso[0]}-W{iso[1]}"


def _days_between(a, b):
    da = datetime.strptime(a, "%Y-%m-%d")
    db = datetime.strptime(b, "%Y-%m-%d")
    return (db - da).days


def update_streak(streak_row, now=None):
    """streak_row: sqlite3.Row oder None. Gibt ein dict mit dem neuen Zustand
    plus 'incremented'/'protected' zurueck - ein Tag Pause pro Woche wird
    verziehen (Streak-Schutz, siehe PLAN.md Abschnitt 8)."""
    now = now or datetime.now()
    today = _local_date_key(now)

    current = streak_row["current"] if streak_row else 0
    best = streak_row["best"] if streak_row else 0
    last_active = streak_row["last_active_date"] if streak_row else None
    last_freeze_week = streak_row["last_freeze_week"] if streak_row else None

    if last_active == today:
        return {
            "current": current, "best": best, "last_active_date": last_active,
            "last_freeze_week": last_freeze_week, "incremented": False, "protected": False,
        }

    week = _iso_week_key(now)
    protected = False

    if not last_active:
        current = 1
    else:
        gap = _days_between(last_active, today)
        if gap == 1:
            current += 1
        elif gap == 2 and last_freeze_week != week:
            current += 1
            last_freeze_week = week
            protected = True
        else:
            current = 1

    best = max(best, current)
    return {
        "current": current, "best": best, "last_active_date": today,
        "last_freeze_week": last_freeze_week, "incremented": True, "protected": protected,
    }


# ---------- Badges (identisch zu src/badges.js) ----------

BADGES = [
    {"id": "erste-schritte", "icon": "🎯", "title": "Erste Schritte",
     "desc": "Schließe deine erste Lektion ab.",
     "check": lambda ctx: ctx["totalDone"] >= 1},
    {"id": "fleissig-5", "icon": "📚", "title": "Fleißig",
     "desc": "Schließe 5 Lektionen ab.",
     "check": lambda ctx: ctx["totalDone"] >= 5},
    {"id": "buecherwurm-10", "icon": "🎓", "title": "Bücherwurm",
     "desc": "Schließe 10 Lektionen ab.",
     "check": lambda ctx: ctx["totalDone"] >= 10},
    {"id": "kein-tipp", "icon": "🧠", "title": "Ohne Tipps",
     "desc": "Schließe eine Lektion mit 3 Sternen ab (keine Fehler, keine Tipps).",
     "check": lambda ctx: ctx["perfectCount"] >= 1},
    {"id": "perfektionist-5", "icon": "🌟", "title": "Perfektionist",
     "desc": "Hol dir 3 Sterne bei 5 Lektionen.",
     "check": lambda ctx: ctx["perfectCount"] >= 5},
    {"id": "kapitel-meister", "icon": "🚀", "title": "Kapitel-Meister",
     "desc": "Schließe ein ganzes Kapitel ab.",
     "check": lambda ctx: ctx["chaptersDoneCount"] >= 1},
    {"id": "streak-3", "icon": "🔥", "title": "Drei Tage dran",
     "desc": "Lerne 3 Tage in Folge.",
     "check": lambda ctx: ctx["streakBest"] >= 3},
    {"id": "streak-7", "icon": "🔥", "title": "Eine Woche stark",
     "desc": "Lerne 7 Tage in Folge.",
     "check": lambda ctx: ctx["streakBest"] >= 7},
    {"id": "level-5", "icon": "⭐", "title": "Level 5",
     "desc": "Erreiche Level 5.",
     "check": lambda ctx: ctx["level"] >= 5},
]
