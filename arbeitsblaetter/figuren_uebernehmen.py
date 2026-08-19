"""Uebernimmt die Figuren-Bilder fuer die Begleiter in der App (public/figuren/).

Waehrend der Lektionen melden sich Figuren aus der Intro-Geschichte zu Wort:
Verbuendete loben eine richtige Loesung, Handlanger von Professor Null
sticheln bei einem Fehler. Gebraucht werden nur wenige Posen je Figur - die
Bilder erscheinen klein neben der Sprechblase.

Quelle sind die Original-PNGs der Grafik-Bibliothek. Ziel sind schlanke
WebP-Dateien mit 360 px Hoehe (statt 640 px) - das reicht auch auf
hochaufloesenden Displays und haelt den Download klein.

Aufruf:  python figuren_uebernehmen.py
"""

import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
QUELLE = ROOT / "grafik-bibliothek" / "figuren"
ZIEL = ROOT / "public" / "figuren"
HOEHE = 360

# Nur die Posen, die in der App wirklich vorkommen - jede weitere Datei waere
# unnoetiger Ballast im Deployment.
BENOETIGT = {
    "py": ["victory", "funny", "clever", "neutral", "worried"],
    "nia": ["clever", "victory", "neutral"],
    "byte": ["neutral", "victory", "surprised"],
    "glitch": ["funny", "worried", "neutral"],
    "ada": ["neutral", "victory", "thoughtful"],
    "memo": ["neutral", "victory", "clever"],
    # Neue Verbuendete fuer die spaeteren Kapitel (noch keinem Kapitel
    # zugeordnet, siehe "_einsatz" in figuren.json).
    "iva": ["neutral", "victory", "clever"],
    "tick": ["neutral", "victory", "clever"],
    "vero": ["neutral", "victory", "clever"],
    "kora": ["neutral", "victory", "clever"],
    "signa": ["neutral", "victory", "clever"],
    "professor-null": ["angry", "clever", "defeated"],
    # Professor Nulls Gefolge (aus dem Intro-Repo, siehe NULL-CREW.md).
    # Diese Figuren haben nur zwei Posen: ruhig und in Aktion.
    # Zwei davon hiessen dort "byte" und "glitch" wie unsere Verbuendeten -
    # sie heissen hier Nibble (halbes Byte) und Bug (Programmfehler).
    "null-nibble": ["neutral", "action"],
    "null-bug": ["neutral", "action"],
    "null-nullbit": ["neutral", "action"],
    "null-loop": ["neutral", "action"],
    "null-ciphera": ["neutral", "action"],
    # Neue Gegenspieler fuer die spaeteren Kapitel. Diese haben - anders als
    # das gelieferte Gefolge - auch eine Pose fuer den Rueckzug.
    "null-typo": ["neutral", "action", "defeated"],
    "null-indexa": ["neutral", "action", "defeated"],
    "null-krasch": ["neutral", "action", "defeated"],
    "null-rangor": ["neutral", "action", "defeated"],
    "null-void": ["neutral", "action", "defeated"],
    # Eigenentwuerfe, aktuell nicht im Einsatz - das offizielle Gefolge
    # aus dem Intro-Repo hat sie abgeloest. Bleiben als Reserve erzeugt.
    "syntaxa": ["neutral", "angry", "defeated"],
    "kontrollor": ["neutral", "angry", "defeated"],
}


def main():
    ZIEL.mkdir(parents=True, exist_ok=True)
    n = 0
    fehlend = []
    for ordner, posen in BENOETIGT.items():
        quellordner = QUELLE / ordner
        if not quellordner.is_dir():
            fehlend.append(ordner)
            continue
        (ZIEL / ordner).mkdir(parents=True, exist_ok=True)
        for pose in posen:
            f = quellordner / f"{pose}.png"
            if not f.exists():
                fehlend.append(f"{ordner}/{pose}")
                continue
            im = Image.open(f).convert("RGBA")
            # Leeren Rand abschneiden - sonst schwebt die Figur klein in der
            # Mitte eines grossen, durchsichtigen Quadrats.
            rand = im.getbbox()
            if rand:
                im = im.crop(rand)
            breite = round(im.width * HOEHE / im.height)
            im = im.resize((breite, HOEHE), Image.LANCZOS)
            im.save(ZIEL / ordner / f"{pose}.webp", quality=88, method=6)
            n += 1
    gesamt = sum(f.stat().st_size for f in ZIEL.rglob("*.webp"))
    print(f"{n} Figuren-Bilder erzeugt, {gesamt // 1024} KB in public/figuren/")
    if fehlend:
        print("FEHLT (noch nicht in der Grafik-Bibliothek): " + ", ".join(fehlend))
    return 0


if __name__ == "__main__":
    sys.exit(main())
