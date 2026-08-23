"""Prueft den Fragenvorrat des Flug-Spiels.

Zwei Fehlerquellen sollen nicht wieder auftreten:

1. Eine Quizfrage verweist auf ein Programm ("Wie viele Zeilen gibt dieses
   Programm aus?"), der Codeblock wird beim Aufbereiten aber weggeworfen -
   dann ist die Frage im Flug nicht zu beantworten.
2. flugfragen.json enthaelt einen kaputten Eintrag (Antwortindex daneben,
   doppelte Antworten, unbekanntes Kapitel).

Aufruf:  python pruefe_flugfragen.py
"""

import json
import re
import sys
from pathlib import Path

CONTENT = Path(__file__).resolve().parent.parent / "public" / "content"

# Dieselben Ausdruecke wie in src/views/flug-view.js
CODE_MUSTER = re.compile(r"```[a-z]*\n([\s\S]*?)```")
# Formulierungen, die ohne Programm ins Leere laufen
VERWEIST_AUF_CODE = re.compile(
    r"\b(dieses?\s+programm|folgende[srn]?\s+(programm|code)|dieser\s+code|"
    r"diese\s+zeilen|am\s+ende\s+in)\b",
    re.IGNORECASE,
)


def code_aus(md):
    treffer = CODE_MUSTER.search(md or "")
    return treffer.group(1).rstrip() if treffer else ""


def nur_text(md):
    text = re.sub(r"```[\s\S]*?```", "", md or "")
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    return re.sub(r"\n+", " ", text).strip()


def main():
    fehler = []
    kapitel_ids = sorted(p.name for p in (CONTENT / "chapters").iterdir() if p.is_dir())

    # ---- 1. Quizfragen der Kapitel -------------------------------------
    mit_code = 0
    geprueft = 0
    for kid in kapitel_ids:
        for datei in sorted((CONTENT / "chapters" / kid / "lessons").glob("*.json")):
            daten = json.loads(datei.read_text(encoding="utf-8"))
            for step in daten.get("steps", []):
                if step.get("type") != "quiz" or not step.get("choices"):
                    continue
                geprueft += 1
                frage = step.get("question", "")
                code = code_aus(frage)
                if code:
                    mit_code += 1
                elif VERWEIST_AUF_CODE.search(nur_text(frage)):
                    fehler.append(
                        f"{kid}/{datei.name}: Frage verweist auf ein Programm, "
                        f"hat aber keinen Codeblock: {nur_text(frage)!r}"
                    )

    # ---- 2. Zusaetzlicher Vorrat ---------------------------------------
    pfad = CONTENT / "flugfragen.json"
    if not pfad.exists():
        fehler.append("flugfragen.json fehlt (mit baue_flugfragen.py erzeugen)")
        vorrat = {}
    else:
        vorrat = json.loads(pfad.read_text(encoding="utf-8"))

    anzahl = 0
    positionen = {}
    for kid, fragen in vorrat.items():
        if kid not in kapitel_ids:
            fehler.append(f"flugfragen.json: unbekanntes Kapitel {kid!r}")
        for i, f in enumerate(fragen):
            anzahl += 1
            wo = f"flugfragen.json[{kid}][{i}]"
            antworten = f.get("antworten") or []
            richtig = f.get("richtig")
            if not f.get("frage", "").strip():
                fehler.append(f"{wo}: leere Frage")
            if len(antworten) < 2:
                fehler.append(f"{wo}: weniger als zwei Antworten")
            if not isinstance(richtig, int) or not (0 <= richtig < len(antworten)):
                fehler.append(f"{wo}: richtig={richtig!r} liegt nicht in den Antworten")
            else:
                positionen[richtig] = positionen.get(richtig, 0) + 1
            if len(set(antworten)) != len(antworten):
                fehler.append(f"{wo}: doppelte Antworten")
            if any(not str(a).strip() for a in antworten):
                fehler.append(f"{wo}: leere Antwort")

    for kid in kapitel_ids:
        if kid not in vorrat:
            fehler.append(f"flugfragen.json: Kapitel {kid} hat keine Zusatzfragen")

    # Immer dieselbe Loesungsposition waere ein Lerneffekt der falschen Art.
    if positionen and max(positionen.values()) > anzahl * 0.55:
        fehler.append(f"Loesungen zu einseitig verteilt: {positionen}")

    for f in fehler:
        print("FEHLER:", f)
    print(f"--- {geprueft} Kapitel-Quizfragen ({mit_code} mit Programm), "
          f"{anzahl} Zusatzfragen, {len(fehler)} Fehler ---")
    if positionen:
        print(f"    Loesung auf Position: {dict(sorted(positionen.items()))}")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
