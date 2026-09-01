"""Prueft, ob spaetere Kapitel frueheres Wissen wieder mitverlangen.

Der Kurs baut inhaltlich aufeinander auf - die AUFGABEN taten es lange
nicht. Wer if/else in Kapitel 7 gelernt hatte, brauchte es bei den
Funktionen in Kapitel 11 nie wieder. Jedes Thema wurde einmal angewendet
und dann fallengelassen.

Dieses Skript liest jede Musterloesung und stellt fest, welche Konzepte
sie tatsaechlich braucht. Daraus entsteht eine Tabelle Kapitel x Konzept.
Gemeldet wird, welches Konzept nach seiner Einfuehrung zu selten wieder
vorkommt.

Aufruf:  python pruefe_spirale.py [--tabelle]
"""

import json
import re
import sys
from pathlib import Path

CONTENT = Path(__file__).resolve().parent.parent / "public" / "content"

# Konzept -> (Kapitelnummer der Einfuehrung, Erkennungsmuster im Quelltext)
# Die Kapitelnummer ist 1-basiert, wie sie die Lernenden sehen.
KONZEPTE = {
    "print":      (1,  re.compile(r"\bprint\s*\(")),
    "Variable":   (2,  re.compile(r"(?:^|\n)\s*[a-zA-Z_]\w*\s*=(?!=)")),
    "Datentypen": (3,  re.compile(r"\b(?:int|float|str|bool)\s*\(")),
    "Strings":    (4,  re.compile(r"\.(?:upper|lower|replace|split|join|find|strip)\s*\(|\[\s*\d*\s*:")),
    "Operatoren": (5,  re.compile(r"[^=!<>+\-*/%]=[^=]|\+=|-=|\*=|//|%|\*\*")),
    "input":      (6,  re.compile(r"\binput\s*\(")),
    "f-String":   (6,  re.compile(r"f\"|f'")),
    "if/else":    (7,  re.compile(r"(?:^|\n)\s*if\s|(?:^|\n)\s*elif\s|(?:^|\n)\s*else\s*:")),
    "while":      (8,  re.compile(r"(?:^|\n)\s*while\s")),
    "Liste":      (9,  re.compile(r"=\s*\[|\.append\s*\(|\.remove\s*\(|\blen\s*\(")),
    "for":        (10, re.compile(r"(?:^|\n)\s*for\s")),
    "Funktion":   (11, re.compile(r"(?:^|\n)\s*def\s")),
    "Dictionary": (13, re.compile(r"=\s*\{|\.keys\s*\(|\.values\s*\(|\.items\s*\(")),
    "Klasse":     (14, re.compile(r"(?:^|\n)\s*class\s")),
    "Datei":      (15, re.compile(r"\bopen\s*\(")),
}

# So oft soll ein Konzept nach seiner Einfuehrung noch vorkommen, damit es
# nicht als "einmal abgehakt" gilt. Bei spaet eingefuehrten Konzepten kann
# es das gar nicht so oft geben - dort zaehlt, was moeglich ist: hoechstens
# eine Aufgabe je verbleibendem Kapitel.
MINDESTENS_SPAETER = 3


def loesungen_je_kapitel():
    """{kapitelnummer: [(kapitel-id, lektion-id, loesung), ...]}"""
    curriculum = json.loads((CONTENT / "curriculum.json").read_text(encoding="utf-8"))
    raus = {}
    for nr, cid in enumerate(curriculum["chapters"], start=1):
        chapter = json.loads((CONTENT / "chapters" / cid / "chapter.json").read_text(encoding="utf-8"))
        eintraege = []
        for lid in chapter["lessons"]:
            lesson = json.loads((CONTENT / "chapters" / cid / "lessons" / f"{lid}.json").read_text(encoding="utf-8"))
            for step in lesson["steps"]:
                if step.get("type") == "code" and step.get("hints"):
                    eintraege.append((cid, lid, step["hints"][-1]))
        raus[nr] = eintraege
    return raus


def main():
    tabelle_zeigen = "--tabelle" in sys.argv
    je_kapitel = loesungen_je_kapitel()
    kapitel_nummern = sorted(je_kapitel)

    # zaehlung[konzept][kapitelnummer] = Anzahl Aufgaben, die es brauchen
    zaehlung = {k: {n: 0 for n in kapitel_nummern} for k in KONZEPTE}
    for nr, eintraege in je_kapitel.items():
        for _, _, loesung in eintraege:
            for konzept, (_, muster) in KONZEPTE.items():
                if muster.search(loesung):
                    zaehlung[konzept][nr] += 1

    if tabelle_zeigen:
        kopf = "Konzept".ljust(12) + "".join(f"{n:>4}" for n in kapitel_nummern)
        print(kopf)
        print("-" * len(kopf))
        for konzept, (ein, _) in KONZEPTE.items():
            zeile = konzept.ljust(12)
            for n in kapitel_nummern:
                anzahl = zaehlung[konzept][n]
                if n < ein:
                    zeile += "   ."          # vor der Einfuehrung
                elif n == ein:
                    zeile += f"{anzahl:>4}"  # Einfuehrung
                else:
                    zeile += f"{anzahl:>4}" if anzahl else "   -"
            print(zeile)
        print()
        print("  .  vor der Einfuehrung     -  danach nicht mehr gebraucht")
        print()

    luecken = []
    for konzept, (ein, _) in KONZEPTE.items():
        if ein >= max(kapitel_nummern):
            continue                        # zuletzt eingefuehrt, kein "danach"
        spaeter = sum(zaehlung[konzept][n] for n in kapitel_nummern if n > ein)
        kapitel_danach = [n for n in kapitel_nummern if n > ein and zaehlung[konzept][n]]
        noch_moeglich = len([n for n in kapitel_nummern if n > ein])
        if spaeter < min(MINDESTENS_SPAETER, noch_moeglich):
            luecken.append((konzept, ein, spaeter, kapitel_danach))

    for konzept, ein, spaeter, kap in luecken:
        wo = f"nur noch in Kapitel {kap}" if kap else "danach nie wieder"
        print(f"LUECKE: {konzept} (eingefuehrt in Kapitel {ein}) - {wo}, "
              f"{spaeter} Aufgabe(n)")

    gesamt = sum(len(v) for v in je_kapitel.values())
    print(f"--- {gesamt} Code-Aufgaben, {len(KONZEPTE)} Konzepte, "
          f"{len(luecken)} Luecken ---")
    return 1 if luecken else 0


if __name__ == "__main__":
    sys.exit(main())
