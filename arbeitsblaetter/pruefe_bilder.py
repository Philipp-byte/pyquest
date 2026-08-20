"""Prueft alle ausgelieferten Bilder auf Vollstaendigkeit.

Anlass: Einmal wurde eine 0 Byte grosse WebP-Datei eingecheckt, weil
"git add" lief, waehrend die Bild-Pipeline noch schrieb. Auf der Webseite
fehlte die Figur dann einfach - ohne dass es jemandem aufgefallen waere.

Dieses Skript oeffnet jede Bilddatei unter public/ wirklich (nicht nur die
Dateigroesse) und meldet alles, was sich nicht laden laesst.

Aufruf:  python pruefe_bilder.py
"""

import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

PUBLIC = Path(__file__).resolve().parent.parent / "public"
ENDUNGEN = {".webp", ".png", ".jpg", ".jpeg", ".gif"}


def main():
    kaputt = []
    geprueft = 0
    for pfad in sorted(PUBLIC.rglob("*")):
        if pfad.suffix.lower() not in ENDUNGEN:
            continue
        geprueft += 1
        try:
            if pfad.stat().st_size == 0:
                raise ValueError("Datei ist leer (0 Bytes)")
            bild = Image.open(pfad)
            bild.load()
        except Exception as exc:  # noqa: BLE001
            kaputt.append((pfad.relative_to(PUBLIC), f"{type(exc).__name__}: {exc}"))

    for pfad, grund in kaputt:
        print(f"KAPUTT  {pfad}  ->  {grund}")
    print(f"--- {geprueft} Bilder geprueft, {len(kaputt)} kaputt ---")
    return 1 if kaputt else 0


if __name__ == "__main__":
    sys.exit(main())
