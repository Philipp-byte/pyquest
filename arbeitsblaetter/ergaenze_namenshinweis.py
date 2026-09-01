"""Ergaenzt den Hinweis auf sprechende Variablennamen.

Kapitel 2 lehrt sprechende Namen ("alles klein, mit Unterstrichen"),
geprueft wurde das bisher nirgends: `x = int(input("Zahl: "))` lief
kommentarlos durch.

Warum ein HINWEIS und kein Test:
Eine pauschale Regel "keine einstelligen Namen" waere fachlich falsch.
`i`, `j` und `k` als Zaehler und `n` fuer eine Anzahl sind uebliches
Python und stehen so auch in den Musterloesungen dieses Kurses. Der
Hinweis laesst diese vier deshalb aus.

Ausserdem verlangen manche Aufgaben einen kurzen Namen ausdruecklich -
Kapitel 5 sagt woertlich "Starte mit `x = 13`" und prueft die Variable
`x`. Solche Namen werden je Aufgabe aus dem Aufgabentext, den Tests und
dem Startcode gelesen und ebenfalls ausgenommen.

Bleibt eine Aufgabe uebrig, deren eigene Musterloesung den Hinweis
ausloesen wuerde, wird sie uebersprungen und gemeldet - dann stimmt etwas
mit der Loesung nicht, nicht mit dem Hinweis.

Aufruf:  python ergaenze_namenshinweis.py [--schreiben]
"""

import json
import re
import sys
from pathlib import Path

CONTENT = Path(__file__).resolve().parent.parent / "public" / "content"

# Ab Kapitel 2 - vorher sind sprechende Namen noch kein Thema.
AB_KAPITEL = 1

# Uebliche Kurznamen, die gutes Python sind und nicht angemahnt werden.
ERLAUBT = {"i", "j", "k", "n"}

MARKE = "sprechender-name"

TEXT = (
    "**Noch besser:** Ein einzelner Buchstabe sagt nicht, was in der Variablen "
    "steht. Gib ihr einen sprechenden Namen – etwa `zahl`, `ergebnis` oder "
    "`punkte`. (Zählvariablen wie `i` in einer Schleife dürfen kurz bleiben.)"
)


def geforderte_namen(step):
    """Namen, die die Aufgabe selbst vorgibt - die duerfen kurz sein."""
    namen = set()
    for treffer in re.findall(r"`([^`]+)`", step.get("task", "")):
        for wort in re.findall(r"[A-Za-z_]\w*", treffer):
            namen.add(wort)
    for test in step.get("tests", []):
        if test.get("type") == "var" and test.get("name"):
            namen.add(test["name"])
    for wort in re.findall(r"[A-Za-z_]\w*", step.get("starterCode") or ""):
        namen.add(wort)
    return namen


def muster_fuer(buchstaben):
    """Zuweisung an einen dieser Einzelbuchstaben, am Zeilenanfang."""
    klasse = "".join(sorted(buchstaben))
    # (?:^|\n) statt ^ - die App wertet mit m-Flag aus, das Pruefskript ohne.
    return rf"(?:^|\n)[ \t]*[{klasse}][ \t]*=(?!=)"


def main():
    schreiben = "--schreiben" in sys.argv
    curriculum = json.loads((CONTENT / "curriculum.json").read_text(encoding="utf-8"))

    ergaenzt = uebersprungen = schon_da = 0
    meldungen = []

    for kapitelnr, cid in enumerate(curriculum["chapters"]):
        if kapitelnr < AB_KAPITEL:
            continue
        chapter = json.loads((CONTENT / "chapters" / cid / "chapter.json").read_text(encoding="utf-8"))
        for lid in chapter["lessons"]:
            pfad = CONTENT / "chapters" / cid / "lessons" / f"{lid}.json"
            lesson = json.loads(pfad.read_text(encoding="utf-8"))
            geaendert = False

            for step in lesson["steps"]:
                if step.get("type") != "code":
                    continue
                if any(t.get("marke") == MARKE for t in step.get("tips", [])):
                    schon_da += 1
                    continue

                kurz = {n for n in geforderte_namen(step) if len(n) == 1}
                buchstaben = [c for c in "abcdefghijklmnopqrstuvwxyz"
                              if c not in ERLAUBT and c not in kurz]
                if not buchstaben:
                    continue
                muster = muster_fuer(buchstaben)

                # Loest die eigene Musterloesung den Hinweis aus? Dann Finger weg.
                loesung = step["hints"][-1] if step.get("hints") else ""
                if re.search(muster, loesung):
                    uebersprungen += 1
                    treffer = re.search(muster, loesung).group(0).strip()
                    meldungen.append(f"{cid}/{lid}: Musterloesung nutzt {treffer!r} - uebersprungen")
                    continue

                step.setdefault("tips", []).append({
                    "marke": MARKE,
                    "check": {"type": "source_not_matches", "pattern": muster},
                    "text": TEXT,
                })
                ergaenzt += 1
                geaendert = True

            if geaendert and schreiben:
                pfad.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n",
                                encoding="utf-8")

    for m in meldungen:
        print("  ", m)
    art = "geschrieben" if schreiben else "waeren zu ergaenzen (Probelauf)"
    print(f"--- {ergaenzt} Hinweise {art}, {uebersprungen} uebersprungen, "
          f"{schon_da} schon vorhanden ---")
    if not schreiben:
        print("    Mit --schreiben tatsaechlich speichern.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
