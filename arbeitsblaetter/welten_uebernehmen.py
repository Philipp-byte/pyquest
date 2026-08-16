"""Uebernimmt die Weltbilder fuer den Weltenbaum in die App (public/welten/).

Der Lernpfad zeigt jedes Kapitel als Welt aus der Intro-Geschichte:
korrumpiert, solange das Kapitel offen ist - wiederhergestellt, sobald es
abgeschlossen wurde. Gebraucht werden deshalb je Welt zwei Zustaende
(corrupted, restored). Quelle ist die Grafik-Bibliothek im Repo.

Aufruf:  python welten_uebernehmen.py
"""

import shutil
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
QUELLE = ROOT / "grafik-bibliothek" / "welten"
ZIEL = ROOT / "public" / "welten"
ZUSTAENDE = ["corrupted", "restored"]


def main():
    if ZIEL.exists():
        shutil.rmtree(ZIEL)
    n = 0
    for ordner in sorted(p for p in QUELLE.iterdir() if p.is_dir()):
        (ZIEL / ordner.name).mkdir(parents=True, exist_ok=True)
        for zustand in ZUSTAENDE:
            f = ordner / f"{zustand}.webp"
            if not f.exists():
                raise SystemExit(f"FEHLT: {f}")
            shutil.copyfile(f, ZIEL / ordner.name / f.name)
            n += 1
    gesamt = sum(f.stat().st_size for f in ZIEL.rglob("*") if f.is_file())
    print(f"{n} Weltbilder kopiert, {gesamt // 1024} KB in public/welten/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
