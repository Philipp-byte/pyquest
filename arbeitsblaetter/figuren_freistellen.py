"""Schneidet einen Figuren-Bogen in einzelne Posen und stellt sie frei.

Die Bildgenerierung liefert je Figur EINEN Bogen mit drei Posen nebeneinander
auf hellem Hintergrund. Dieses Skript macht daraus drei einzelne PNG-Dateien
mit echtem Alphakanal, wie sie die Grafik-Bibliothek erwartet.

Der Hintergrund wird per Flood-Fill VOM RAND entfernt, nicht ueber einen
Farbwert. Sonst verschwinden helle Stellen INNERHALB der Figur - weisse Haare,
Lichter, Glanzpunkte.

Aufruf:
    python figuren_freistellen.py <bogen.png> <zielordner> pose1 pose2 pose3
"""

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")


def freistellen(pfad):
    arr = np.asarray(Image.open(pfad).convert("RGB")).astype(np.int16)
    h, w, _ = arr.shape
    # Heller, farbloser Hintergrund (weiss oder helles Schachbrettmuster).
    kandidat = (arr.min(axis=2) > 225) & ((arr.max(axis=2) - arr.min(axis=2)) < 12)

    bg = np.zeros((h, w), bool)
    q = deque()

    def start(y, x):
        if kandidat[y, x] and not bg[y, x]:
            bg[y, x] = True
            q.append((y, x))

    for x in range(w):
        start(0, x)
        start(h - 1, x)
    for y in range(h):
        start(y, 0)
        start(y, w - 1)
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w:
                start(ny, nx)

    alpha = np.where(bg, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([arr.astype(np.uint8), alpha]), "RGBA")


def bloecke_finden(im, anzahl, mindestbreite=40):
    """Zerlegt den Bogen in genau <anzahl> senkrechte Streifen."""
    a = np.asarray(im)[:, :, 3]
    belegt = a.max(axis=0) > 10
    dichte = (a > 10).sum(axis=0)

    bloecke, start = [], None
    for x, v in enumerate(belegt):
        if v and start is None:
            start = x
        if not v and start is not None:
            if x - start > mindestbreite:
                bloecke.append((start, x))
            start = None
    if start is not None:
        bloecke.append((start, len(belegt)))

    # Beruehren sich zwei Posen (Partikel, Hologramme), haengen sie in einem
    # Block. Dann an der duennsten Stelle im mittleren Drittel trennen.
    while len(bloecke) < anzahl:
        i = max(range(len(bloecke)), key=lambda k: bloecke[k][1] - bloecke[k][0])
        x0, x1 = bloecke[i]
        drittel = (x1 - x0) // 3
        fenster = range(x0 + drittel, x1 - drittel)
        if not len(fenster):
            raise SystemExit("Konnte die Posen nicht trennen.")
        schnitt = min(fenster, key=lambda x: dichte[x])
        bloecke[i : i + 1] = [(x0, schnitt), (schnitt, x1)]

    if len(bloecke) > anzahl:
        # Zu viele: die schmalsten (Streupartikel) an den Nachbarn anhaengen.
        while len(bloecke) > anzahl:
            i = min(range(len(bloecke)), key=lambda k: bloecke[k][1] - bloecke[k][0])
            nachbar = i - 1 if i > 0 else i + 1
            lo = min(bloecke[i][0], bloecke[nachbar][0])
            hi = max(bloecke[i][1], bloecke[nachbar][1])
            for k in sorted((i, nachbar), reverse=True):
                bloecke.pop(k)
            bloecke.insert(min(i, nachbar), (lo, hi))
    return bloecke


def main():
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    bogen, ziel, posen = sys.argv[1], Path(sys.argv[2]), sys.argv[3:]

    im = freistellen(bogen)
    bloecke = bloecke_finden(im, len(posen))
    ziel.mkdir(parents=True, exist_ok=True)
    for pose, (x0, x1) in zip(posen, bloecke):
        teil = im.crop((x0, 0, x1, im.height))
        rand = teil.getbbox()
        if rand:
            teil = teil.crop(rand)
        teil.save(ziel / f"{pose}.png")
        print(f"  {pose}.png  {teil.width}x{teil.height}")
    # Der Bogen bleibt als Quelle liegen - so laesst sich spaeter neu schneiden.
    Image.open(bogen).save(ziel / "quelle-sheet.png")
    print(f"{len(posen)} Posen in {ziel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
