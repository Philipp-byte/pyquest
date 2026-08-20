"""Prueft, ob die verbindlichen Fachbegriffe im Kurs auch wirklich vorkommen.

Die App soll nicht nur zeigen, WIE etwas geht, sondern auch, WIE es heisst.
Ohne die Fachsprache koennen die Lernenden spaeter weder eine Fehlermeldung
einordnen noch eine Pruefungsaufgabe verstehen, in der "inkrementieren" oder
"Konstruktor" steht.

Dieses Skript sucht je Kapitel nach den Begriffen, die dort eingefuehrt sein
muessen - in Titeln, Erklaerungen, Quizfragen, Aufgaben und Beispielcode.

Aufruf:  python pruefe_fachbegriffe.py
"""

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

CONTENT = Path(__file__).resolve().parent.parent / "public" / "content"

# Mehrere zulaessige Schreibweisen mit | trennen.
PFLICHT = {
    "01-erste-schritte": ["Syntax", "Kommentar"],
    "02-variablen": ["Variable", "Zuweisung", "Bezeichner"],
    "03-datentypen": ["Datentyp", "Integer", "Float", "String", "Boolean",
                      "Typumwandlung|Typkonvertierung|Casting"],
    "04-string-funktionen": ["Methode", "Index", "Slicing", "Zeichenkette"],
    "05-operatoren": ["Operator", "Operand", "Modulo", "Inkrement", "Dekrement",
                      "Vergleichsoperator", "logische[rn]? Operator"],
    "06-eingaben": ["EVA", "Eingabe", "Ausgabe", "Verarbeitung"],
    "07-bedingungen": ["Bedingung", "Verzweigung", "bedingte Anweisung"],
    "08-while-schleifen": ["Schleife", "Iteration", "Abbruchbedingung",
                           "Endlosschleife", "Schleifenrumpf|Schleifenkörper"],
    "09-listen": ["Liste", "Element", "Index", "Länge"],
    "10-for-schleifen": ["Zählschleife|for-Schleife", "Iteration", "Sequenz"],
    "11-funktionen": ["Funktion", "Parameter", "Argument", "Rückgabewert",
                      "Aufruf", "Definition"],
    "12-verschachtelte-listen": ["Matrix", "Zeile", "Spalte",
                                 "zweidimensional|mehrdimensional|2D"],
    "13-dictionaries": ["Dictionary", "Schlüssel", "Wert"],
    "14-klassen": ["Klasse", "Objekt", "Attribut", "Methode", "Instanz", "Konstruktor"],
    "15-dateien": ["Datei", "lesen", "schreiben"],
    "16-projekte": ["Algorithmus"],
}

FELDER = ("text", "question", "task", "explainCorrect", "explainWrong", "code")


def kapiteltext(cid):
    ch = json.loads((CONTENT / "chapters" / cid / "chapter.json").read_text(encoding="utf-8"))
    teile = [ch.get("title", ""), ch.get("description", "")]
    for lid in ch["lessons"]:
        lesson = json.loads((CONTENT / "chapters" / cid / "lessons" / f"{lid}.json").read_text(encoding="utf-8"))
        teile.append(lesson.get("title", ""))
        for step in lesson["steps"]:
            teile += [str(step[k]) for k in FELDER if step.get(k)]
            teile += [str(c) for c in step.get("choices", [])]
    return "\n".join(teile)


def main():
    fehlend_gesamt = 0
    for cid, begriffe in PFLICHT.items():
        text = kapiteltext(cid)
        fehlend = [b for b in begriffe if not re.search(b, text, re.IGNORECASE)]
        if fehlend:
            fehlend_gesamt += len(fehlend)
            print(f"{cid:26} FEHLT: {', '.join(b.split('|')[0] for b in fehlend)}")
    gesamt = sum(len(v) for v in PFLICHT.values())
    print(f"--- {gesamt - fehlend_gesamt} von {gesamt} Fachbegriffen vorhanden, "
          f"{fehlend_gesamt} fehlen ---")
    return 1 if fehlend_gesamt else 0


if __name__ == "__main__":
    sys.exit(main())
