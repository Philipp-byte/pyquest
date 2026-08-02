"""Schliesst die Luecke "Ergebnis einfach hinschreiben".

Problem: Bei vielen Aufgaben genuegte es, die erwartete Ausgabe woertlich
auszugeben - z. B. print(False) statt eines echten Vergleichs 7 < 3. Die
Aufgabe war damit nicht geloest, galt aber als richtig.

Gegenmittel: Die erwarteten Ausgabezeilen duerfen im Quelltext nicht als
Text vorkommen.

Sicherheitsnetz: Verboten wird eine Zeile NUR, wenn die Musterloesung sie
selbst nicht enthaelt. Bei Aufgaben wie print("Hallo") ist der Text ja die
richtige Loesung - dort wird nichts verboten. Dadurch bleibt jede Aufgabe
loesbar und mehrere Loesungswege bleiben erlaubt.

Aufruf:  python ergaenze_antischummel.py [--schreiben]
"""

import io
import json
import re
import sys
from contextlib import redirect_stdout
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
CONTENT = Path(__file__).resolve().parent.parent / "public" / "content"
SCHREIBEN = "--schreiben" in sys.argv

LABEL = "Das Ergebnis wird berechnet, nicht als Text hingeschrieben"


def strip_comments(code):
    out, quote, i = [], None, 0
    while i < len(code):
        c = code[i]
        if quote:
            out.append(c)
            if c == "\\":
                i += 1
                if i < len(code):
                    out.append(code[i])
                i += 1
                continue
            if c == quote:
                quote = None
            i += 1
            continue
        if c in ('"', "'"):
            quote = c
            out.append(c)
            i += 1
            continue
        if c == "#":
            while i < len(code) and code[i] != "\n":
                i += 1
            out.append("\n")
            continue
        out.append(c)
        i += 1
    return "".join(out)


def main():
    curriculum = json.loads((CONTENT / "curriculum.json").read_text(encoding="utf-8"))
    ergaenzt = uebersprungen = dateien = 0

    for cid in curriculum["chapters"]:
        chapter = json.loads((CONTENT / "chapters" / cid / "chapter.json").read_text(encoding="utf-8"))
        for lid in chapter["lessons"]:
            p = CONTENT / "chapters" / cid / "lessons" / f"{lid}.json"
            lesson = json.loads(p.read_text(encoding="utf-8"))
            geaendert = False

            for si, step in enumerate(lesson["steps"]):
                if step.get("type") != "code":
                    continue
                tests = step["tests"]
                # Schon ein solches Verbot vorhanden?
                if any(t.get("label") == LABEL for t in tests):
                    continue

                loesung = strip_comments(step["hints"][-1])
                verbotene = []

                for check in tests:
                    if check["type"] != "output" or check.get("inputs"):
                        continue
                    for zeile in check["expected"].split("\n"):
                        zeile = zeile.strip()
                        if not zeile:
                            continue
                        # Steht die Zeile in der Musterloesung, ist sie Teil
                        # des richtigen Wegs - dann NICHT verbieten.
                        if zeile in loesung:
                            uebersprungen += 1
                            continue
                        if zeile not in verbotene:
                            verbotene.append(zeile)

                if not verbotene:
                    continue

                # Reine Zahlen mit Wortgrenze, damit 3 nicht auf 13 passt.
                teile = []
                for z in verbotene:
                    esc = re.escape(z)
                    teile.append(rf"\b{esc}\b" if re.fullmatch(r"[\w.]+", z) else esc)
                muster = "(?:" + "|".join(teile) + ")"

                step["tests"] = tests + [{
                    "type": "source_not_matches",
                    "pattern": muster,
                    "label": LABEL,
                }]
                ergaenzt += 1
                geaendert = True
                print(f"{cid}/{lid} #{si}: verbietet {len(verbotene)} Ergebniszeile(n)")

            if geaendert:
                dateien += 1
                if SCHREIBEN:
                    p.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    modus = "geschrieben" if SCHREIBEN else "PROBELAUF"
    print(f"\n--- {ergaenzt} Aufgaben abgesichert in {dateien} Dateien, "
          f"{uebersprungen} Zeilen bewusst erlaubt - {modus} ---")
    return 0


if __name__ == "__main__":
    sys.exit(main())
