"""Prueft die Kapitel-Tests automatisch gegen die Musterloesungen.

Fuer jede Test-Aufgabe wird die Musterloesung ausgefuehrt und gegen ALLE
hinterlegten Pruefungen gehalten - genau so, wie es der Evaluator der App tut
(gleiche Normalisierung, gleiche input()-Semantik, gleiche Quelltext-Regeln).

So faellt sofort auf, wenn eine Aufgabe unloesbar ist oder eine Pruefung eine
korrekte Loesung faelschlich ablehnt.

Aufruf:  python verify_tests.py
"""

import io
import json
import os
import re
import sys
import tempfile
from contextlib import redirect_stdout
from pathlib import Path

from verify_lessons import schummel_loesungen

ROOT = Path(__file__).resolve().parent.parent
TESTS = ROOT / "public" / "content" / "tests"
LOESUNGEN = Path(__file__).resolve().parent / "test_loesungen.json"

# Aufgaben, bei denen das woertliche Hinschreiben die RICHTIGE Loesung ist.
AUSNAHMEN = {
    # "Tabelle mit Escape-Sequenzen": Hier IST der Text die Aufgabe - er soll
    # mit \t und \" geschrieben werden. Ob das in drei prints steht oder in
    # einem mit \n, ist egal; beides ist richtig. Dass die Escape-Sequenzen
    # wirklich benutzt werden, sichert die vorhandene source_matches-Pruefung.
    ("test-3", "a4"),
}


def normalize(text):
    """Entspricht normalize() in src/evaluator.js."""
    text = text.replace("\r\n", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"[ \t]+$", "", text)
    return text.strip()


def strip_comments(code):
    """Entspricht stripComments() in src/evaluator.js."""
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
    """Fuehrt Code aus und bildet die input()-Semantik der App nach:
    Eingabeaufforderung und eingegebener Wert erscheinen in der Ausgabe."""
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
    # Wie in verify_lessons.py: Datei-Aufgaben in einen Wegwerf-Ordner
    # umlenken, damit nichts im Arbeitsverzeichnis liegen bleibt.
    vorher = os.getcwd()
    with tempfile.TemporaryDirectory() as ordner:
        os.chdir(ordner)
        try:
            with redirect_stdout(buf):
                exec(code, env)
        finally:
            os.chdir(vorher)
    return buf.getvalue(), env


def check_source(code, check):
    hit = re.search(check["pattern"], strip_comments(code)) is not None
    return (not hit) if check["type"] == "source_not_matches" else hit


def check_one(code, check):
    kind = check["type"]
    if kind in ("source_matches", "source_not_matches"):
        return check_source(code, check), None

    out, env = run(code, check.get("inputs", []))

    if kind in ("output", "input_output"):
        return normalize(out) == normalize(check["expected"]), normalize(out)
    if kind == "output_contains":
        return normalize(check["expected"]) in normalize(out), normalize(out)
    if kind == "var":
        got = env.get(check["name"])
        return got == check["expected"], got
    if kind == "func":
        got = eval(check["call"], env)
        return got == check["expected"], got
    raise ValueError("Unbekannter Pruef-Typ: " + kind)


def task_passes(task, code):
    """True, wenn dieser Code ALLE Pruefungen der Aufgabe besteht."""
    for check in task["checks"]:
        try:
            ok, _ = check_one(code, check)
        except Exception:  # noqa: BLE001
            return False
        if not ok:
            return False
    return True


def negative_pass(solutions):
    """Gegenprobe: Eine Aufgabe darf NICHT bestanden werden, wenn gar nichts
    abgegeben wird - und auch nicht, wenn das Ergebnis bloss hingeschrieben
    statt berechnet wird. Sonst prueft sie das Ergebnis statt der Aufgabe.

    Dieselben Schummel-Abgaben wie bei den Lektionen (siehe
    verify_lessons.schummel_loesungen), damit beide gleich streng sind -
    genau hier klaffte vorher eine Luecke."""
    leaks = 0
    checked = 0
    for path in sorted(TESTS.glob("test-*.json")):
        test = json.loads(path.read_text(encoding="utf-8"))
        sols = solutions.get(test["id"], {})
        for task in test["tasks"]:
            starter = task.get("starterCode") or ""
            loesung = sols.get(task["id"], "")
            abgaben = [("leer", starter), ("nur pass", starter + "\npass\n")]
            if (test["id"], task["id"]) not in AUSNAHMEN:
                # schummel_loesungen erwartet die Lektions-Form ("tests").
                schummel = schummel_loesungen({"tests": task["checks"]}, loesung)
                abgaben += [(name, starter + code) for name, code in schummel]
            for name, code in abgaben:
                checked += 1
                if task_passes(task, code):
                    leaks += 1
                    print(f'LUECKE {test["id"]}/{task["id"]}: besteht schon mit "{name}"')
                    print(f'    Aufgabe: {task["prompt"][:95]}')
    return checked, leaks


def main():
    solutions = json.loads(LOESUNGEN.read_text(encoding="utf-8"))
    total = fails = 0
    missing = []

    for path in sorted(TESTS.glob("test-*.json")):
        test = json.loads(path.read_text(encoding="utf-8"))
        sols = solutions.get(test["id"], {})
        for task in test["tasks"]:
            code = sols.get(task["id"])
            if code is None:
                missing.append(f'{test["id"]}/{task["id"]}')
                continue
            full = (task.get("starterCode") or "") + code
            for idx, check in enumerate(task["checks"]):
                total += 1
                try:
                    ok, got = check_one(full, check)
                except Exception as exc:  # noqa: BLE001
                    ok, got = False, f"<<{type(exc).__name__}: {exc}>>"
                if not ok:
                    fails += 1
                    print(f'FEHLER {test["id"]}/{task["id"]} Pruefung {idx} ({check["type"]})')
                    print(f'   Label:    {check.get("label")}')
                    if "expected" in check:
                        print(f'   erwartet: {check["expected"]!r}')
                    if "pattern" in check:
                        print(f'   Muster:   {check["pattern"]!r}')
                    if got is not None:
                        print(f'   bekommen: {got!r}')

    if missing:
        print("Ohne Musterloesung:", ", ".join(missing))
    print(f"--- Musterloesungen: {total} Pruefungen, {fails} Fehler, {len(missing)} ohne Loesung ---")

    checked, leaks = negative_pass(solutions)
    print(f"--- Gegenprobe: {checked} Leer-Abgaben geprueft, {leaks} Aufgaben ohne Wirkung ---")

    return 1 if (fails or missing or leaks) else 0


if __name__ == "__main__":
    sys.exit(main())
