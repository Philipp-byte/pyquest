"""Ergaenzt fehlende Pruefungen in Lektionsaufgaben.

Problem: Viele Aufgaben wurden nur an der Ausgabe gemessen. Dadurch galt auch
eine Loesung als richtig, welche die Aufgabe gar nicht erfuellt - etwa
print("Ich wohne in Weingarten") bei "Lege stadt = 'Weingarten' an und nutze
Verkettung mit +".

Ergaenzt werden deshalb:
  * var-Pruefungen fuer Variablen, welche die Aufgabe ausdruecklich nennt
  * Quelltext-Pruefungen fuer Techniken, welche die Aufgabe vorschreibt

Sicherheitsnetz: Eine Pruefung wird NUR eingetragen, wenn die hinterlegte
Musterloesung sie auch besteht. Dadurch kann keine Aufgabe unloesbar werden.
Mehrere Loesungswege bleiben moeglich - geprueft wird, was die Aufgabe
verlangt, nicht ein bestimmter Wortlaut.

Aufruf:  python ergaenze_pruefungen.py [--schreiben]
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


def run(code, inputs):
    buf = io.StringIO()
    it = iter(inputs)

    def fake_input(prompt=""):
        if prompt:
            buf.write(str(prompt))
        try:
            v = next(it)
        except StopIteration:
            v = ""
        buf.write(str(v) + "\n")
        return v

    env = {"input": fake_input}
    with redirect_stdout(buf):
        exec(code, env)
    return env


def json_tauglich(wert):
    if isinstance(wert, bool) or wert is None:
        return isinstance(wert, bool)
    if isinstance(wert, (int, float, str)):
        return True
    if isinstance(wert, list):
        return all(json_tauglich(v) for v in wert)
    if isinstance(wert, dict):
        return all(isinstance(k, str) and json_tauglich(v) for k, v in wert.items())
    return False


def geforderte_funktion(task):
    """Name einer Funktion, welche die Aufgabe ausdruecklich zu definieren
    verlangt - z. B. "Definiere eine Funktion **`zeige_stern`**"."""
    m = re.search(r"(?:Definiere|Schreibe|Vervollständige)\s+(?:die|eine)\s+Funktion\s+\*{0,2}`([a-zA-Z_]\w*)", task)
    return m.group(1) if m else None


def geforderte_variablen(task):
    """Liefert {name: literal_oder_None}.

    literal = der Wert, den die Aufgabe woertlich vorgibt (z. B. bei
    `stadt = "Weingarten"`). None bedeutet: Die Aufgabe nennt nur den
    Variablennamen als Ort fuer das Ergebnis.
    """
    namen = {}
    for m in re.finditer(r"`([a-zA-Z_]\w*)\s*=\s*([^`]*)`", task):
        namen[m.group(1)] = m.group(2).strip()
    for m in re.finditer(r"[Vv]ariablen?\s+\*{0,2}`([a-zA-Z_]\w*)`", task):
        namen.setdefault(m.group(1), None)
    # "Lege ein leeres Dictionary **`vokabeln`** an" - Name vor "an(legen)"
    for m in re.finditer(r"\*{0,2}`([a-zA-Z_]\w*)`\*{0,2}\s+an(?:legen)?\b", task):
        namen.setdefault(m.group(1), None)
    return namen


def literal_wert(text):
    """Wandelt einen in der Aufgabe genannten Literalwert in ein Python-Objekt
    um - oder gibt einen Marker zurueck, wenn es kein einfaches Literal ist."""
    if text is None:
        return ("kein_literal", None)
    try:
        return ("literal", json.loads(text.replace("'", '"')))
    except Exception:
        pass
    try:
        return ("literal", eval(text, {"__builtins__": {}}, {}))  # noqa: S307
    except Exception:
        return ("kein_literal", None)


# (Anzeigename, Muster in der Aufgabenstellung, Muster im Code, Label)
TECHNIKEN = [
    ("Verkettung", r"Verkettung", r"\+", "Die Ausgabe entsteht durch Verkettung mit +"),
    ("for", r"`?for`?-Schleife", r"\bfor\s+\w+\s+in\b", "Es wird eine for-Schleife verwendet"),
    ("while", r"`?while`?-Schleife", r"\bwhile\b", "Es wird eine while-Schleife verwendet"),
    ("append", r"\.append\(\)", r"\.append\s*\(", "Die Liste wird mit .append() gefüllt"),
    ("fstring", r"f-String", r"f[\"']", "Die Ausgabe entsteht mit einem f-String"),
]

# print-Pflicht bringt nichts (wird fast immer benutzt) und range ist bei
# for-Aufgaben schon ueber die Schleifen-Pruefung abgedeckt.
FUNKTIONEN_OHNE_AUSSAGE = {"print", "range"}


def geforderte_funktionsaufrufe(task):
    """Alle Funktionen, welche die Aufgabenstellung ausdruecklich nennt -
    als `name(...)`, `.name(...)` oder "mit `name`".

    So wird aus "Wandle ihn mit `float()` um" die Pflicht, dass float( im
    Quelltext vorkommt - sonst gilt auch zahl = 4.23 als Loesung, obwohl
    gar nichts umgewandelt wurde.
    """
    funktionen = {}
    # `float()` / `.upper()` / `.split("|")` in Backticks
    for m in re.finditer(r"`(\.?)([a-zA-Z_]\w*)\s*\([^`]*\)`", task):
        punkt, name = m.group(1), m.group(2)
        if name in FUNKTIONEN_OHNE_AUSSAGE:
            continue
        funktionen[(punkt, name)] = True
    # "mit `float`" (ohne Klammern geschrieben)
    for m in re.finditer(r"mit\s+\*{0,2}`(float|int|str|bool)`", task):
        funktionen[("", m.group(1))] = True
    return list(funktionen)


def main():
    curriculum = json.loads((CONTENT / "curriculum.json").read_text(encoding="utf-8"))
    ergaenzt = uebersprungen = 0
    betroffene_dateien = 0

    for cid in curriculum["chapters"]:
        chapter = json.loads((CONTENT / "chapters" / cid / "chapter.json").read_text(encoding="utf-8"))
        for lid in chapter["lessons"]:
            p = CONTENT / "chapters" / cid / "lessons" / f"{lid}.json"
            lesson = json.loads(p.read_text(encoding="utf-8"))
            geaendert = False

            for si, step in enumerate(lesson["steps"]):
                if step.get("type") != "code":
                    continue
                task = step["task"]
                starter = step.get("starterCode") or ""
                loesung = step["hints"][-1]
                tests = step["tests"]

                schon_var = {t["name"] for t in tests if t["type"] == "var"}
                hat_func = any(t["type"] == "func" for t in tests)
                quellmuster = " ".join(t.get("pattern", "") for t in tests if "pattern" in t)
                neue = []

                # --- Variablen, welche die Aufgabe ausdruecklich nennt ---
                if not hat_func:
                    inputs = []
                    for t in tests:
                        if t.get("inputs"):
                            inputs = t["inputs"]
                            break
                    try:
                        env = run(loesung, inputs)
                    except Exception:
                        env = {}
                    for name, literal_text in sorted(geforderte_variablen(task).items()):
                        if name in starter or name in schon_var:
                            continue
                        if name not in env:
                            continue
                        wert = env[name]
                        if not json_tauglich(wert):
                            continue
                        # Bei Eingabe-Aufgaben haengt der Wert von der Eingabe
                        # ab - dann keine feste Pruefung eintragen.
                        if inputs:
                            continue
                        # Nennt die Aufgabe einen Startwert (z. B. `gesehen = []`),
                        # der am Ende ein anderer ist, dann ist das eine
                        # Sammel-Variable. Ihr Endwert haengt vom Loesungsweg ab -
                        # eine feste Pruefung wuerde gueltige Varianten abweisen.
                        art, lit = literal_wert(literal_text)
                        if art == "literal" and lit != wert:
                            uebersprungen += 1
                            continue
                        neue.append({
                            "type": "var", "name": name, "expected": wert,
                            "label": f"Die Variable {name} enthält den richtigen Wert",
                        })

                code_ohne_kommentar = strip_comments(loesung)

                # --- Verlangt die Aufgabe eine eigene Funktion? ---
                # Ohne diese Pruefung koennte man die Ausgabe auch ohne
                # Funktion erzeugen - die Aufgabe waere dann nicht erfuellt.
                fname = geforderte_funktion(task)
                if fname and not hat_func:
                    def_pat = r"\bdef\s+" + fname + r"\s*\("
                    if def_pat not in quellmuster and re.search(def_pat, code_ohne_kommentar):
                        neue.append({
                            "type": "source_matches", "pattern": def_pat,
                            "label": f"Es gibt eine Funktion namens {fname}",
                        })
                    if re.search(r"\bmit\s+\*{0,2}`?return`?", task) and r"\breturn\b" not in quellmuster:
                        if re.search(r"\breturn\b", code_ohne_kommentar):
                            neue.append({
                                "type": "source_matches", "pattern": r"\breturn\b",
                                "label": "Das Ergebnis wird mit return zurückgegeben",
                            })

                # --- Techniken, welche die Aufgabe vorschreibt ---
                for _, task_pat, code_pat, label in TECHNIKEN:
                    if not re.search(task_pat, task, re.IGNORECASE):
                        continue
                    if code_pat in quellmuster:
                        continue
                    # Nur eintragen, wenn die Musterloesung die Technik nutzt
                    if not re.search(code_pat, code_ohne_kommentar):
                        uebersprungen += 1
                        continue
                    neue.append({"type": "source_matches", "pattern": code_pat, "label": label})

                # --- Funktionen, welche die Aufgabenstellung nennt ---
                # "mit float() umwandeln", ".upper() benutzen", ... - die
                # Funktion muss dann auch wirklich im Quelltext stehen.
                # Das Musterloesungs-Tor unten sortiert Negativ-Nennungen
                # ("ohne sum()", "nicht mit print!") automatisch aus, denn
                # dort benutzt die Musterloesung die Funktion ja nicht.
                for punkt, name in geforderte_funktionsaufrufe(task):
                    code_pat = (r"\." if punkt else r"\b") + name + r"\s*\("
                    if code_pat in quellmuster:
                        continue
                    if not re.search(code_pat, code_ohne_kommentar):
                        uebersprungen += 1
                        continue
                    anzeige = (punkt + name) if punkt else name
                    neue.append({
                        "type": "source_matches", "pattern": code_pat,
                        "label": f"Es wird {anzeige}() verwendet",
                    })

                if neue:
                    step["tests"] = tests + neue
                    ergaenzt += len(neue)
                    geaendert = True
                    print(f"{cid}/{lid} #{si}: +{len(neue)} Pruefung(en)")
                    for n in neue:
                        print(f"    {n['label']}")

            if geaendert:
                betroffene_dateien += 1
                if SCHREIBEN:
                    p.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    modus = "geschrieben" if SCHREIBEN else "PROBELAUF (nichts geaendert)"
    print(f"\n--- {ergaenzt} Pruefungen in {betroffene_dateien} Dateien, {uebersprungen} verworfen - {modus} ---")
    return 0


if __name__ == "__main__":
    sys.exit(main())
