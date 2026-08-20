"""Prueft alle Code-Aufgaben der LEKTIONEN gegen ihre Musterloesung.

Die Musterloesung ist jeweils der letzte Tipp einer Aufgabe. Geprueft wird
mit derselben Semantik wie in der App (siehe src/evaluator.js und
src/pyodide-runner.js): gleiche Normalisierung der Ausgabe, gleiche
input()-Semantik, gleiche Quelltext-Regeln.

Aufruf:  python verify_lessons.py
"""

import io
import json
import re
import sys
from contextlib import redirect_stdout
from pathlib import Path

CONTENT = Path(__file__).resolve().parent.parent / "public" / "content"


def normalize(text):
    text = text.replace("\r\n", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"[ \t]+$", "", text)
    return text.strip()


def strip_comments(code):
    out = []
    quote = None
    i = 0
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


def run(code, inputs):
    buf = io.StringIO()
    it = iter(inputs)

    def fake_input(prompt=""):
        if prompt:
            buf.write(str(prompt))
        try:
            value = next(it)
        except StopIteration:
            value = ""
        buf.write(str(value) + "\n")
        return value

    env = {"input": fake_input}
    with redirect_stdout(buf):
        exec(code, env)
    return buf.getvalue(), env


def check_one(code, check):
    kind = check["type"]
    if kind in ("source_matches", "source_not_matches"):
        hit = re.search(check["pattern"], strip_comments(code)) is not None
        return (not hit) if kind == "source_not_matches" else hit

    out, env = run(code, check.get("inputs", []))
    if kind in ("output", "input_output"):
        return normalize(out) == normalize(check["expected"])
    if kind == "output_contains":
        return normalize(check["expected"]) in normalize(out)
    if kind == "var":
        return env.get(check["name"]) == check["expected"]
    if kind == "func":
        return eval(check["call"], env) == check["expected"]
    raise ValueError("Unbekannter Pruef-Typ: " + kind)


def task_passes(step, code):
    for check in step["tests"]:
        try:
            if not check_one(code, check):
                return False
        except Exception:  # noqa: BLE001
            return False
    return True


# Aufgaben, bei denen das woertliche Hinschreiben die RICHTIGE Loesung ist -
# etwa "Schreibe ein Programm, das 'Python ist so cool!' ausgibt" oder die
# Uebung zu Escape-Sequenzen. Dort waere ein Literal-Verbot unsinnig.
AUSNAHMEN = {
    ("01-erste-schritte", "02-hallo-welt", 3),
    # Hinweis: In 03-print-uebung wurde vorne ein Erklaerschritt zu
    # Kommentaren ergaenzt - die Aufgaben liegen seitdem bei #3 und #4.
    ("01-erste-schritte", "03-print-uebung", 3),
    ("01-erste-schritte", "03-print-uebung", 4),
    ("06-eingaben", "04-escape-sequenzen", 4),
}


def py_literal(wert):
    """JSON-Wert als Python-Literal (True/False/None statt true/false/null)."""
    if isinstance(wert, bool):
        return "True" if wert else "False"
    if wert is None:
        return "None"
    return json.dumps(wert, ensure_ascii=False)


def schummel_loesungen(step, solution):
    """Baut Abgaben, welche die Aufgabe NICHT loesen, aber die richtige
    Ausgabe erzeugen - z. B. print(False) statt eines echten Vergleichs
    oder zahl = 4.23 statt einer Umwandlung mit float().

    Besteht eine Aufgabe damit, prueft sie nur das Ergebnis und nicht den Weg.
    """
    varianten = []
    for check in step["tests"]:
        # Nur ohne Eingaben - mit input() ist das Nachbauen nicht sinnvoll.
        if check["type"] != "output" or check.get("inputs"):
            continue
        erwartet = check["expected"]
        # Ergebnis woertlich ausgeben
        varianten.append(("Ergebnis hingeschrieben", f"print({json.dumps(erwartet)})"))
        # Mehrzeilig: je Zeile ein print
        if "\n" in erwartet:
            zeilen = "\n".join(f"print({json.dumps(z)})" for z in erwartet.split("\n"))
            varianten.append(("Zeile für Zeile hingeschrieben", zeilen))

    # Erwartete Variablenwerte direkt als Literal zuweisen (zahl = 4.23),
    # dazu die erwartete Ausgabe hinschreiben. AUSGENOMMEN sind Aufgaben,
    # deren Musterloesung genau das tut - "Lege anzahl = 0 an" IST dort die
    # richtige Loesung.
    var_checks = [t for t in step["tests"] if t["type"] == "var"]
    if var_checks:
        zeilen = []
        alle_legitim = True
        for t in var_checks:
            lit = py_literal(t["expected"])
            zeilen.append(f"{t['name']} = {lit}")
            muster = re.escape(t["name"]) + r"\s*=\s*" + re.escape(lit)
            if not re.search(muster, solution):
                alle_legitim = False
        for check in step["tests"]:
            if check["type"] == "output" and not check.get("inputs"):
                zeilen += [f"print({json.dumps(z)})" for z in check["expected"].split("\n")]
        if not alle_legitim:
            varianten.append(("Wert als Literal zugewiesen", "\n".join(zeilen)))
    return varianten


def negative_pass(curriculum):
    """Gegenprobe: Eine Aufgabe darf nicht bestehen, wenn nichts abgegeben
    wird - und auch nicht, wenn nur das erwartete Ergebnis hingeschrieben
    wird. Sonst prueft sie das Ergebnis statt der Aufgabe."""
    geprueft = luecken = 0
    for cid in curriculum["chapters"]:
        chapter = json.loads((CONTENT / "chapters" / cid / "chapter.json").read_text(encoding="utf-8"))
        for lid in chapter["lessons"]:
            lesson = json.loads((CONTENT / "chapters" / cid / "lessons" / f"{lid}.json").read_text(encoding="utf-8"))
            for si, step in enumerate(lesson["steps"]):
                if step.get("type") != "code":
                    continue
                starter = step.get("starterCode") or ""
                abgaben = [("leer", starter), ("nur pass", starter + "\npass\n")]
                if (cid, lid, si) not in AUSNAHMEN:
                    abgaben += [(name, starter + code) for name, code in schummel_loesungen(step, step["hints"][-1])]
                for name, code in abgaben:
                    geprueft += 1
                    if task_passes(step, code):
                        luecken += 1
                        print(f'LUECKE {cid}/{lid} #{si}: besteht schon mit "{name}"')
                        print(f'    Aufgabe: {step["task"][:95]}')
    return geprueft, luecken


def main():
    curriculum = json.loads((CONTENT / "curriculum.json").read_text(encoding="utf-8"))
    total = fails = tips_checked = 0

    for cid in curriculum["chapters"]:
        chapter = json.loads((CONTENT / "chapters" / cid / "chapter.json").read_text(encoding="utf-8"))
        for lid in chapter["lessons"]:
            lesson = json.loads((CONTENT / "chapters" / cid / "lessons" / f"{lid}.json").read_text(encoding="utf-8"))
            for si, step in enumerate(lesson["steps"]):
                if step.get("type") != "code":
                    continue
                solution = step["hints"][-1]

                for ti, check in enumerate(step["tests"]):
                    total += 1
                    try:
                        ok = check_one(solution, check)
                    except Exception as exc:  # noqa: BLE001
                        ok = False
                        print(f"FEHLER {cid}/{lid} #{si} Pruefung {ti}: {type(exc).__name__}: {exc}")
                    if not ok:
                        fails += 1
                        print(f'FEHLER {cid}/{lid} #{si} Pruefung {ti} ({check["type"]})')

                # Die Musterloesung soll vorbildlich sein: Sie darf keinen
                # "So geht es besser"-Hinweis mehr ausloesen.
                for tip in step.get("tips", []):
                    tips_checked += 1
                    try:
                        ok = check_one(solution, tip["check"])
                    except Exception:  # noqa: BLE001
                        ok = False
                    if not ok:
                        fails += 1
                        print(f'HINWEIS-FEHLER {cid}/{lid} #{si}: Musterloesung loest noch einen Hinweis aus')
                        print(f'   {tip["text"][:90]}')

    print(f"--- Musterloesungen: {total} Pruefungen + {tips_checked} Hinweis-Gegenproben, {fails} Fehler ---")

    geprueft, luecken = negative_pass(curriculum)
    print(f"--- Gegenprobe: {geprueft} Leer-Abgaben geprueft, {luecken} Aufgaben ohne Wirkung ---")

    return 1 if (fails or luecken) else 0


if __name__ == "__main__":
    sys.exit(main())
