"""Uebernimmt die Orts-Bilder (Schauplaetze) fuer die Kapitel-Landkarte.

Jede Welt hat drei Orte (grafik-bibliothek/welten/<welt>/orte/). Auf der
Kapitel-Landkarte ist jede Lektion eine Station an einem dieser Orte.

Die Originale sind 1672 Pixel breit (zusammen 11 MB) - angezeigt werden sie
aber nur rund 400 Pixel breit. Deshalb werden sie hier auf 640 Pixel
verkleinert (scharf genug fuer hochaufloesende Bildschirme) und landen unter
public/welten/<welt>/orte/. Zusaetzlich entsteht src/orte-daten.js mit den
Anzeigenamen, damit die App keine Manifest-Datei nachladen muss.

Aufruf:  python orte_uebernehmen.py
"""

import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
QUELLE = ROOT / "grafik-bibliothek" / "welten"
ZIEL = ROOT / "public" / "welten"
DATEN = ROOT / "src" / "orte-daten.js"
BREITE = 640

# Anzeigenamen, die sich nicht sauber aus dem Dateinamen ableiten lassen
# (Umlaute gehen in Dateinamen verloren, Bindestriche sind teils Wortteile).
NAMEN = {
    "anfaengergarten": "Anfängergarten",
    "woertergarten": "Wörtergarten",
    "vergleichsbruecke": "Vergleichsbrücke",
    "rueckgabekaskade": "Rückgabekaskade",
    "wuerfelkammer": "Würfelkammer",
    "range-pfad": "Range-Pfad",
    "break-lichtung": "Break-Lichtung",
    "paar-arkaden": "Paar-Arkaden",
}

KLEIN = {"der", "die", "das", "und"}


def anzeigename(slug):
    """'01-zentrum-der-typen' -> 'Zentrum der Typen'"""
    ohne_nummer = slug.split("-", 1)[1] if slug[:2].isdigit() else slug
    if ohne_nummer in NAMEN:
        return NAMEN[ohne_nummer]
    teile = ohne_nummer.split("-")
    return " ".join(t if t in KLEIN else t.capitalize() for t in teile)


def main():
    eintraege = {}
    n = vorher = nachher = 0

    for weltordner in sorted(p for p in QUELLE.iterdir() if (p / "orte").is_dir()):
        ziel = ZIEL / weltordner.name / "orte"
        ziel.mkdir(parents=True, exist_ok=True)
        orte = []
        for f in sorted((weltordner / "orte").glob("*.webp")):
            vorher += f.stat().st_size
            bild = Image.open(f)
            faktor = BREITE / bild.width
            klein = bild.resize((BREITE, round(bild.height * faktor)), Image.LANCZOS)
            aus = ziel / f.name
            klein.save(aus, "WEBP", quality=82, method=6)
            nachher += aus.stat().st_size
            n += 1
            orte.append({"datei": f.name, "name": anzeigename(f.stem)})
        eintraege[weltordner.name] = orte

    zeilen = ["// AUTOMATISCH ERZEUGT von arbeitsblaetter/orte_uebernehmen.py -",
              "// nicht von Hand bearbeiten, Aenderungen dort vornehmen.",
              "// Drei Schauplaetze je Welt fuer die Kapitel-Landkarte.",
              "", "export const ORTE = {"]
    for welt, orte in eintraege.items():
        innen = ", ".join(f'{{ datei: "{o["datei"]}", name: "{o["name"]}" }}' for o in orte)
        zeilen.append(f'  "{welt}": [{innen}],')
    zeilen += ["};", ""]
    DATEN.write_text("\n".join(zeilen), encoding="utf-8", newline="\n")

    print(f"{n} Orts-Bilder verkleinert: {vorher // 1024 // 1024} MB -> {nachher // 1024} KB")
    print(f"Namensliste: {DATEN.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
