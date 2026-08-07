"""Uebernimmt das Intro-Paket in die App (public/intro/).

Kopiert wird nur, was das Intro wirklich braucht. Die Figurenbilder liegen im
Paket als PNG vor (zusammen rund 12 MB) und werden dabei nach WebP gewandelt -
das spart ueber 80 Prozent, ohne sichtbaren Qualitaetsverlust. Die Welten- und
Szenenbilder sind bereits WebP und werden nur kopiert.

Aufruf:  python intro_uebernehmen.py
"""

import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

QUELLE = Path(r"C:\Users\User\Downloads\PyQuest-Intro-Komplettpaket\pyquest-intro-complete")
ZIEL = Path(__file__).resolve().parent.parent / "public" / "intro"

# Nur diese Figuren und Welten kommen im Intro vor.
FIGUREN = ["ada", "byte", "glitch", "memo", "nia", "professor-null", "py"]
WELTEN = ["01-neustart", "12-matrixa", "16-finalia"]


def kopiere_szenen():
    ziel = ZIEL / "assets" / "scenes"
    ziel.mkdir(parents=True, exist_ok=True)
    n = 0
    for f in (QUELLE / "prototypes" / "current-intro" / "assets" / "scenes").glob("*.webp"):
        shutil.copyfile(f, ziel / f.name)
        n += 1
    return n


def wandle_figuren():
    quelle = QUELLE / "assets" / "library" / "characters"
    ziel = ZIEL / "lib" / "characters"
    vorher = nachher = n = 0
    for figur in FIGUREN:
        (ziel / figur).mkdir(parents=True, exist_ok=True)
        for png in (quelle / figur).glob("*.png"):
            vorher += png.stat().st_size
            bild = Image.open(png)
            aus = ziel / figur / (png.stem + ".webp")
            bild.save(aus, "WEBP", quality=88, method=6)
            nachher += aus.stat().st_size
            n += 1
    shutil.copyfile(quelle / "manifest.json", ziel / "manifest.json")
    return n, vorher, nachher


def kopiere_welten():
    quelle = QUELLE / "assets" / "library" / "worlds"
    ziel = ZIEL / "lib" / "worlds"
    n = 0
    for welt in WELTEN:
        (ziel / welt).mkdir(parents=True, exist_ok=True)
        for f in (quelle / welt).glob("*.webp"):
            shutil.copyfile(f, ziel / welt / f.name)
            n += 1
    shutil.copyfile(quelle / "manifest.json", ziel / "manifest.json")
    return n


def kopiere_code():
    src = QUELLE / "prototypes" / "current-intro"
    ZIEL.mkdir(parents=True, exist_ok=True)

    # styles.css unveraendert
    shutil.copyfile(src / "styles.css", ZIEL / "styles.css")

    # index.html unveraendert
    shutil.copyfile(src / "index.html", ZIEL / "index.html")

    # intro.js: Der Import zeigt im Paket auf ../../assets/library/. In der App
    # liegt die Bibliothek daneben unter ./lib/ - deshalb ein Pfad angepasst.
    js = (src / "intro.js").read_text(encoding="utf-8")
    neu = js.replace("'../../assets/library/pyquest-assets.js'", "'./lib/pyquest-assets.js'")
    if neu == js:
        raise SystemExit("FEHLER: Import-Pfad in intro.js nicht gefunden - bitte pruefen.")
    (ZIEL / "intro.js").write_text(neu, encoding="utf-8")

    # Der Helfer baut Figurenpfade mit .png - wir liefern WebP aus.
    helfer = (QUELLE / "assets" / "library" / "pyquest-assets.js").read_text(encoding="utf-8")
    helfer_neu = helfer.replace("${pose}.png", "${pose}.webp")
    if helfer_neu == helfer:
        raise SystemExit("FEHLER: Endung .png im Assethelfer nicht gefunden - bitte pruefen.")
    (ZIEL / "lib").mkdir(parents=True, exist_ok=True)
    (ZIEL / "lib" / "pyquest-assets.js").write_text(helfer_neu, encoding="utf-8")


def main():
    if ZIEL.exists():
        shutil.rmtree(ZIEL)
    kopiere_code()
    szenen = kopiere_szenen()
    figuren, vorher, nachher = wandle_figuren()
    welten = kopiere_welten()

    gesamt = sum(f.stat().st_size for f in ZIEL.rglob("*") if f.is_file())
    print(f"Szenen kopiert:   {szenen}")
    print(f"Figuren gewandelt: {figuren}  ({vorher//1024//1024} MB PNG -> {nachher//1024//1024} MB WebP)")
    print(f"Weltbilder kopiert: {welten}")
    print(f"Gesamtgroesse public/intro: {gesamt//1024//1024} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
