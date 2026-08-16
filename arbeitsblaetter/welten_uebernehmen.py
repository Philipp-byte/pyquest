"""Erzeugt die Weltbilder fuer den Weltenbaum (public/welten/).

Quelle ist je Welt das INSEL-Bild aus der Grafik-Bibliothek
(grafik-bibliothek/welten/<welt>/insel.webp) - 16 klar unterscheidbare
schwebende Inseln mit eigener Farbwelt. Daraus entstehen zwei Zustaende:

  restored.webp   das Original (Kapitel abgeschlossen, Welt gerettet)
  corrupted.webp  dieselbe Insel unter Professor Nulls Korruption:
                  entsaettigt, verdunkelt, violetter Schleier und
                  Glitch-Streifen (deterministisch je Welt)

Die frueheren Stadtansichten (corrupted/restored/intact/destroyed) bleiben
als Archiv in der Grafik-Bibliothek liegen, werden aber nicht mehr genutzt -
sie sahen sich von Welt zu Welt zu aehnlich.

Aufruf:  python welten_uebernehmen.py
"""

import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
QUELLE = ROOT / "grafik-bibliothek" / "welten"
ZIEL = ROOT / "public" / "welten"


def korrumpiere(im, seed):
    rnd = random.Random(seed)
    g = ImageEnhance.Color(im).enhance(0.18)
    g = ImageEnhance.Brightness(g).enhance(0.62)
    g = ImageEnhance.Contrast(g).enhance(1.08)
    g = Image.blend(g, Image.new("RGB", g.size, (74, 28, 110)), 0.30)
    w, h = g.size
    for _ in range(14):
        y = rnd.randint(0, h - 8)
        bh = rnd.randint(2, 7)
        band = g.crop((0, y, w, y + bh))
        g.paste(band, (rnd.randint(-22, 22), y))
    d = ImageDraw.Draw(g, "RGBA")
    for _ in range(6):
        y = rnd.randint(0, h - 3)
        d.rectangle([0, y, w, y + rnd.randint(1, 2)], fill=(168, 85, 247, 70))
    return g


def main():
    ordner = sorted(p for p in QUELLE.iterdir() if p.is_dir())
    n = 0
    for welt in ordner:
        insel = welt / "insel.webp"
        if not insel.exists():
            raise SystemExit(f"FEHLT: {insel}")
        ziel = ZIEL / welt.name
        ziel.mkdir(parents=True, exist_ok=True)
        im = Image.open(insel).convert("RGB")
        im.save(ziel / "restored.webp", quality=85, method=6)
        korrumpiere(im, seed=welt.name).save(ziel / "corrupted.webp", quality=85, method=6)
        n += 2
    gesamt = sum(f.stat().st_size for f in ZIEL.rglob("*.webp") if f.parent.name != "orte")
    print(f"{n} Weltbilder erzeugt, {gesamt // 1024} KB in public/welten/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
