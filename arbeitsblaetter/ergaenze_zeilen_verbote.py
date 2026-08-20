"""Verbietet das Hinschreiben EINZELNER Ausgabezeilen - in Lektionen und Tests.

Hintergrund: Die bisherigen Gegenproben schreiben immer die GANZE erwartete
Ausgabe hin. Besteht eine Aufgabe damit nicht, galt sie als sicher. Ein
Schummel-Weg blieb aber offen: Nur EINE von mehreren Zeilen hart hinschreiben
und den Rest richtig berechnen. Beispiel aus Test 2:

    passwort = "Sommer2026"
    print(len(passwort))        # richtig berechnet
    print(True)                 # hingeschrieben statt "2026" in passwort
    print(passwort.upper())     # richtig berechnet

Alle Pruefungen bestanden - obwohl die mittlere Zeile nichts geprueft hat.

Dieses Skript ergaenzt deshalb fuer JEDE Zeile der erwarteten Ausgabe ein
Verbot, genau diesen Wert direkt auszugeben (print(True), print(10),
print("SOMMER2026")).

Das Tor dagegen: Schreibt die MUSTERLOESUNG selbst diesen Wert hin, ist es
dort die richtige Loesung ("Gib Hallo aus") - dann wird nichts ergaenzt.

Aufruf:
    python ergaenze_zeilen_verbote.py            # nur anzeigen
    python ergaenze_zeilen_verbote.py --schreiben
"""

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "public" / "content"
LOESUNGEN = Path(__file__).resolve().parent / "test_loesungen.json"

# Zeilen, die als "Wert" gelten und deshalb berechnet werden muessen.
BOOL_NONE = {"True", "False", "None"}


def ist_zahl(text):
    return bool(re.fullmatch(r"-?\d+(?:\.\d+)?", text))


def verbotsmuster(zeile):
    """Regex, das genau die direkte Ausgabe dieses Werts trifft - oder None,
    wenn die Zeile dafuer nicht taugt (leer, sehr lang, mehrdeutig)."""
    z = zeile.strip()
    if not z or len(z) > 60:
        return None
    # Tabulatoren und andere Steuerzeichen stehen im Quelltext als \t, nicht
    # als echtes Zeichen - ein Muster darauf trifft nie. Ausserdem IST bei
    # Escape-Sequenz-Aufgaben das Hinschreiben genau die Loesung.
    if any(ord(c) < 32 for c in z):
        return None
    if z in BOOL_NONE or ist_zahl(z):
        return r"print\s*\(\s*" + re.escape(z) + r"\s*\)"
    # Text: beide Anfuehrungszeichen-Varianten abdecken.
    if any(c in z for c in "\"'\\"):
        return None  # Anfuehrungszeichen im Text - zu heikel fuers Muster
    return r"print\s*\(\s*[\"']" + re.escape(z) + r"[\"']\s*\)"


def schon_abgedeckt(muster, checks):
    """Verhindert Doppelungen, wenn schon ein aehnliches Verbot existiert."""
    kern = re.escape(muster.split("print")[-1])[:0]  # nur zur Klarheit
    for c in checks:
        if c.get("type") != "source_not_matches":
            continue
        p = c.get("pattern", "")
        if p == muster:
            return True
        # Bereits vorhandene, handgeschriebene Varianten wie "print\s*\(\s*10\b"
        wert = muster.replace(r"print\s*\(\s*", "").replace(r"\s*\)", "")
        wert = wert.strip("[\"']").replace(r"[\"']", "")
        if wert and wert in p and "print" in p:
            return True
    return False


def neue_verbote(checks, loesung, starter):
    """Liefert die zu ergaenzenden Pruefungen fuer eine Aufgabe."""
    neu = []
    for check in checks:
        if check.get("type") != "output" or check.get("inputs"):
            continue
        for zeile in str(check.get("expected", "")).split("\n"):
            muster = verbotsmuster(zeile)
            if not muster:
                continue
            # Tor: Steht es so in der Musterloesung, ist das Hinschreiben
            # dort der richtige Weg.
            if re.search(muster, loesung) or re.search(muster, starter):
                continue
            if schon_abgedeckt(muster, checks) or any(n["pattern"] == muster for n in neu):
                continue
            neu.append({
                "type": "source_not_matches",
                "pattern": muster,
                "label": f"Die Zeile „{zeile.strip()}“ wird berechnet, nicht hingeschrieben",
            })
    return neu


def bearbeite_lektionen(schreiben):
    curriculum = json.loads((CONTENT / "curriculum.json").read_text(encoding="utf-8"))
    ergaenzt = dateien = 0
    for cid in curriculum["chapters"]:
        chapter = json.loads((CONTENT / "chapters" / cid / "chapter.json").read_text(encoding="utf-8"))
        for lid in chapter["lessons"]:
            p = CONTENT / "chapters" / cid / "lessons" / f"{lid}.json"
            lesson = json.loads(p.read_text(encoding="utf-8"))
            geaendert = False
            for si, step in enumerate(lesson["steps"]):
                if step.get("type") != "code":
                    continue
                neu = neue_verbote(step["tests"], step["hints"][-1], step.get("starterCode") or "")
                for n in neu:
                    print(f'  + {cid}/{lid} #{si}: {n["label"]}')
                    step["tests"].append(n)
                    ergaenzt += 1
                    geaendert = True
            if geaendert:
                dateien += 1
                if schreiben:
                    p.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n",
                                 encoding="utf-8", newline="\n")
    return ergaenzt, dateien


def bearbeite_tests(schreiben):
    loesungen = json.loads(LOESUNGEN.read_text(encoding="utf-8"))
    ergaenzt = dateien = 0
    for p in sorted((CONTENT / "tests").glob("test-*.json")):
        test = json.loads(p.read_text(encoding="utf-8"))
        sols = loesungen.get(test["id"], {})
        geaendert = False
        for task in test["tasks"]:
            neu = neue_verbote(task["checks"], sols.get(task["id"], ""),
                               task.get("starterCode") or "")
            for n in neu:
                print(f'  + {test["id"]}/{task["id"]}: {n["label"]}')
                task["checks"].append(n)
                ergaenzt += 1
                geaendert = True
        if geaendert:
            dateien += 1
            if schreiben:
                p.write_text(json.dumps(test, ensure_ascii=False, indent=2) + "\n",
                             encoding="utf-8", newline="\n")
    return ergaenzt, dateien


def main():
    schreiben = "--schreiben" in sys.argv
    print("--- Lektionen ---")
    l_e, l_d = bearbeite_lektionen(schreiben)
    print("--- Tests ---")
    t_e, t_d = bearbeite_tests(schreiben)
    print(f"\n{l_e} Verbote in {l_d} Lektionsdateien, {t_e} Verbote in {t_d} Testdateien")
    if not schreiben:
        print("(nur angezeigt - mit --schreiben wird geaendert)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
