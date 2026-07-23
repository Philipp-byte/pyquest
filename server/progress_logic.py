"""Python-Pendant zu src/level-math.js und src/badges.js.
Muss inhaltlich gleich bleiben, damit Demo-Modus (Browser) und Schulmodus
(Server) sich identisch anfuehlen - siehe PLAN.md Abschnitt 3."""


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


# ---------- Badges (identisch zu src/badges.js) ----------
# Bewusst KEINE Badges fuer taegliches/aufeinanderfolgendes Lernen - SuS
# koennen Python nur im Unterricht lernen, nicht jeden Tag.

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
    {"id": "kapitel-champion", "icon": "🏆", "title": "Kapitel-Champion",
     "desc": "Schließe 3 ganze Kapitel ab.",
     "check": lambda ctx: ctx["chaptersDoneCount"] >= 3},
    {"id": "level-5", "icon": "⭐", "title": "Level 5",
     "desc": "Erreiche Level 5.",
     "check": lambda ctx: ctx["level"] >= 5},
    {"id": "highscore", "icon": "👑", "title": "Highscore",
     "desc": "Erreiche Level 10.",
     "check": lambda ctx: ctx["level"] >= 10},
    {"id": "sternensammler", "icon": "✨", "title": "Sternensammler",
     "desc": "Sammle insgesamt 20 Sterne.",
     "check": lambda ctx: ctx["starsTotal"] >= 20},
]
