"""Ergaenzt Technik-Pruefungen bei den letzten Aufgaben, die sonst durch
blosses Hinschreiben des Ergebnisses bestehen wuerden.

Diese Aufgaben lassen sich nicht ueber ein Literal-Verbot absichern, weil die
erwartete Ausgabe auch in der richtigen Loesung vorkommt (z. B. "Katze" steht
in der Liste). Hier wird stattdessen geprueft, dass die verlangte TECHNIK
benutzt wird.

Aufruf:  python ergaenze_techniken.py [--schreiben]
"""

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
CONTENT = Path(__file__).resolve().parent.parent / "public" / "content"
SCHREIBEN = "--schreiben" in sys.argv

# (Kapitel, Lektion, Schritt) -> (Muster, Label)
ZIELE = {
    ("02-variablen", "03-variablennamen", 5):
        (r"\w+\s*=", "Der Wert wird in einer Variable gespeichert"),
    ("04-string-funktionen", "03-teilstrings-mit-slicing", 4):
        (r"\[\s*-?\d*\s*:", "Der Teilstring entsteht durch Slicing"),
    ("05-operatoren", "01-arithmetische-operatoren", 5):
        (r"[\w)]\s*[*/%+-]\s*[\w(]", "Das Ergebnis wird gerechnet"),
    ("05-operatoren", "04-logische-operatoren", 5):
        (r"\b(?:and|or|not)\b", "Es wird ein logischer Operator verwendet"),
    ("07-bedingungen", "01-die-if-anweisung", 4):
        (r"\bif\b", "Es wird eine if-Anweisung verwendet"),
    ("09-listen", "01-listen-erstellen", 4):
        (r"\w\s*\[", "Auf das Element wird über seinen Index zugegriffen"),
    ("10-for-schleifen", "03-for-anwenden", 4):
        (r"\bfor\s+\w+\s+in\b", "Es wird eine for-Schleife verwendet"),
    ("13-dictionaries", "01-dictionaries-erstellen", 4):
        (r"\w\s*\[", "Auf den Wert wird über seinen Schlüssel zugegriffen"),
    ("14-klassen", "01-objekte-und-klassen", 4):
        (r"\bclass\s+\w+", "Es wird eine Klasse definiert"),
    ("14-klassen", "02-attribute-methoden-init", 4):
        (r"\bclass\s+\w+", "Es wird eine Klasse definiert"),
    ("15-dateien", "01-dateien-schreiben", 4):
        (r"open\s*\(", "Die Datei wird mit open() geschrieben"),
    ("15-dateien", "02-dateien-lesen", 4):
        (r"open\s*\(", "Die Datei wird mit open() gelesen"),
}


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
    ergaenzt = 0
    for (cid, lid, si), (muster, label) in sorted(ZIELE.items()):
        p = CONTENT / "chapters" / cid / "lessons" / f"{lid}.json"
        lesson = json.loads(p.read_text(encoding="utf-8"))
        step = lesson["steps"][si]
        assert step["type"] == "code", f"{cid}/{lid} #{si} ist kein Code-Schritt"

        if any(t.get("pattern") == muster for t in step["tests"]):
            print(f"schon vorhanden: {cid}/{lid} #{si}")
            continue

        loesung = strip_comments(step["hints"][-1])
        if not re.search(muster, loesung):
            print(f"VERWORFEN {cid}/{lid} #{si}: Musterloesung erfuellt das Muster nicht")
            continue

        step["tests"].append({"type": "source_matches", "pattern": muster, "label": label})
        if SCHREIBEN:
            p.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        ergaenzt += 1
        print(f"{cid}/{lid} #{si}: {label}")

    modus = "geschrieben" if SCHREIBEN else "PROBELAUF"
    print(f"\n--- {ergaenzt} Technik-Pruefungen - {modus} ---")
    return 0


if __name__ == "__main__":
    sys.exit(main())
