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

    print(f"--- {total} Pruefungen + {tips_checked} Hinweis-Gegenproben, {fails} Fehler ---")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
