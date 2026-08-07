"""Legt die gelieferten Grafikpakete als sauber benanntes Archiv im Repo ab.

Hintergrund: Es gibt zwei Downloads - das Intro-Komplettpaket und die
Asset-Bibliothek. Die Figurenbilder sind in beiden byte-identisch enthalten
(geprueft). Sie werden deshalb nur EINMAL abgelegt.

Bewusste Entscheidung: Hier landen die ORIGINALE (Figuren als PNG). Die
verkleinerten WebP-Fassungen fuer die laufende App liegen getrennt unter
public/intro/lib/. So bleibt die Ausgangsqualitaet fuer spaetere Verwendung
erhalten, ohne die Website zu verlangsamen.

Aufruf:  python grafiken_archivieren.py
"""

import hashlib
import shutil
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DOWNLOADS = Path(r"C:\Users\User\Downloads")
INTRO = DOWNLOADS / "PyQuest-Intro-Komplettpaket" / "pyquest-intro-complete"
BIBLIOTHEK = DOWNLOADS / "PyQuest-Asset-Bibliothek" / "PyQuest-Asset-Bibliothek"
ZIEL = Path(__file__).resolve().parent.parent / "grafik-bibliothek"


def kopiere_baum(quelle, ziel, endungen=None):
    ziel.mkdir(parents=True, exist_ok=True)
    n = 0
    for f in sorted(quelle.rglob("*")):
        if not f.is_file():
            continue
        if endungen and f.suffix.lower() not in endungen:
            continue
        aus = ziel / f.relative_to(quelle)
        aus.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(f, aus)
        n += 1
    return n


def pruefe_identisch(a, b, muster):
    """Sicherheitsnetz: Nur wenn wirklich identisch, darf einfach abgelegt werden."""
    def h(p):
        return hashlib.md5(p.read_bytes()).hexdigest()
    unterschiede = []
    for f in sorted(a.rglob(muster)):
        anderer = b / f.relative_to(a)
        if not anderer.exists() or h(f) != h(anderer):
            unterschiede.append(str(f.relative_to(a)))
    return unterschiede


def main():
    if ZIEL.exists():
        shutil.rmtree(ZIEL)

    quelle_figuren = INTRO / "assets" / "library" / "characters"
    quelle_welten = INTRO / "assets" / "library" / "worlds"

    abw_figuren = pruefe_identisch(quelle_figuren, BIBLIOTHEK / "public" / "assets" / "characters", "*.png")
    abw_welten = pruefe_identisch(quelle_welten, BIBLIOTHEK / "public" / "assets" / "worlds", "*.webp")
    if abw_figuren or abw_welten:
        print("ACHTUNG - die beiden Pakete unterscheiden sich:")
        for x in (abw_figuren + abw_welten)[:10]:
            print("  ", x)
        print("Es wird trotzdem die Fassung aus dem Intro-Paket abgelegt.")
    else:
        print("Beide Pakete sind bei Figuren und Welten identisch - wird einmal abgelegt.")

    figuren = kopiere_baum(quelle_figuren, ZIEL / "figuren")
    welten = kopiere_baum(quelle_welten, ZIEL / "welten")
    szenen = kopiere_baum(INTRO / "prototypes" / "current-intro" / "assets" / "scenes", ZIEL / "intro-szenen")
    vorschau = kopiere_baum(INTRO / "previews", ZIEL / "vorschaubilder")
    doku = kopiere_baum(INTRO / "docs", ZIEL / "dokumentation")

    # Originalfassung des Intros (die App nutzt die angepasste Kopie unter public/intro/)
    quelle_code = INTRO / "prototypes" / "current-intro"
    ziel_code = ZIEL / "intro-originalfassung"
    ziel_code.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "intro.js", "styles.css"):
        shutil.copyfile(quelle_code / name, ziel_code / name)
    shutil.copyfile(INTRO / "assets" / "library" / "pyquest-assets.js", ZIEL / "pyquest-assets.js")

    # Die durchsuchbare Uebersicht aus der Bibliothek mitnehmen, falls vorhanden
    uebersicht = BIBLIOTHEK / "public" / "index.html"
    if uebersicht.exists():
        shutil.copyfile(uebersicht, ZIEL / "uebersicht.html")

    gesamt = sum(f.stat().st_size for f in ZIEL.rglob("*") if f.is_file())
    print(f"Figuren:        {figuren}")
    print(f"Weltbilder:     {welten}")
    print(f"Intro-Szenen:   {szenen}")
    print(f"Vorschaubilder: {vorschau}")
    print(f"Dokumentation:  {doku}")
    print(f"Gesamt: {gesamt // 1024 // 1024} MB in {ZIEL.name}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
