"""Prueft, ob jede Lektionsaufgabe wirklich das prueft, was sie verlangt.

Hintergrund: Eine Aufgabe wie "Lege stadt = 'Weingarten' an und gib ... aus
(nutze Verkettung mit +)" wurde bisher nur an der AUSGABE gemessen. Damit galt
auch print("Ich wohne in Weingarten") als richtig - obwohl weder die Variable
noch die Verkettung vorkommt. Die Aufgabe war also nicht erfuellt.

Dieses Skript liest die Aufgabenstellung, leitet daraus die Anforderungen ab
und meldet, welche davon nicht geprueft werden.

Aufruf:  python audit_aufgaben.py
"""

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
CONTENT = Path(__file__).resolve().parent.parent / "public" / "content"


def geforderte_variablen(task):
    """Variablennamen, die die Aufgabe ausdruecklich verlangt."""
    namen = set()
    # `name = wert`  (Zuweisung direkt in der Aufgabenstellung)
    for m in re.finditer(r"`([a-zA-Z_]\w*)\s*=", task):
        namen.add(m.group(1))
    # "in einer Variable `name`" / "in der Variable **`name`**"
    for m in re.finditer(r"[Vv]ariablen?\s+\*{0,2}`([a-zA-Z_]\w*)`", task):
        namen.add(m.group(1))
    # "Variable **`name`**" (Reihenfolge umgekehrt)
    for m in re.finditer(r"\*{0,2}`([a-zA-Z_]\w*)`\*{0,2}\s+an(?:legen)?\b", task):
        namen.add(m.group(1))
    return namen


TECHNIKEN = [
    ("Verkettung mit +", r"Verkettung", r"\+"),
    ("for-Schleife", r"`?for`?-Schleife", r"\bfor\s+\w+\s+in\b"),
    ("while-Schleife", r"`?while`?-Schleife", r"\bwhile\b"),
    ("append()", r"\.append\(\)", r"\.append\s*\("),
    ("f-String", r"f-String", r"f[\"']"),
    ("input()", r"input\(|frage.*ab|Frage .* ab", r"\binput\s*\("),
    ("Funktion mit def", r"[Ss]chreibe eine Funktion|Definiere eine Funktion", r"\bdef\s+\w+\s*\("),
    ("return", r"\breturn\b|zurueckgibt|zurückgibt", r"\breturn\b"),
]


def geforderte_techniken(task):
    treffer = []
    for name, task_pat, code_pat in TECHNIKEN:
        if re.search(task_pat, task, re.IGNORECASE):
            treffer.append((name, code_pat))
    return treffer


def main():
    curriculum = json.loads((CONTENT / "curriculum.json").read_text(encoding="utf-8"))
    luecken = 0
    gesamt = 0

    for cid in curriculum["chapters"]:
        chapter = json.loads((CONTENT / "chapters" / cid / "chapter.json").read_text(encoding="utf-8"))
        for lid in chapter["lessons"]:
            p = CONTENT / "chapters" / cid / "lessons" / f"{lid}.json"
            lesson = json.loads(p.read_text(encoding="utf-8"))
            for si, step in enumerate(lesson["steps"]):
                if step.get("type") != "code":
                    continue
                gesamt += 1
                task = step["task"]
                starter = step.get("starterCode") or ""
                tests = step["tests"]

                geprueft_vars = {t["name"] for t in tests if t["type"] == "var"}
                quellmuster = " ".join(t.get("pattern", "") for t in tests if "pattern" in t)
                hat_func = any(t["type"] == "func" for t in tests)
                hat_eingaben = any(t.get("inputs") for t in tests)

                # Manche Anforderungen sind durch andere Pruefungen schon belegt:
                # Wer eine Funktion erfolgreich aufruft, hat sie auch definiert;
                # wer Eingaben verarbeitet, hat input() benutzt.
                bereits_belegt = set()
                if hat_func:
                    bereits_belegt |= {"Funktion mit def", "return"}
                if hat_eingaben:
                    bereits_belegt.add("input()")

                fehlend = []

                # Variablen: nur verlangen, was nicht schon im Startcode steht
                for name in geforderte_variablen(task):
                    if name in starter:
                        continue
                    if name in geprueft_vars or hat_func:
                        continue
                    fehlend.append(f"Variable `{name}` wird nicht geprueft")

                for name, code_pat in geforderte_techniken(task):
                    if code_pat in quellmuster or name in bereits_belegt:
                        continue
                    # def-Pruefungen tragen den konkreten Funktionsnamen im
                    # Muster - deshalb lockerer vergleichen.
                    if name == "Funktion mit def" and "def" in quellmuster:
                        continue
                    if name == "return" and "return" in quellmuster:
                        continue
                    fehlend.append(f"Technik '{name}' wird nicht geprueft")

                if fehlend:
                    luecken += 1
                    print(f"{cid}/{lid} #{si}")
                    print(f"   Aufgabe: {task[:100]}")
                    for f in fehlend:
                        print(f"   -> {f}")

    print(f"\n--- {gesamt} Code-Aufgaben, {luecken} mit Luecken ---")
    return 0


if __name__ == "__main__":
    sys.exit(main())
