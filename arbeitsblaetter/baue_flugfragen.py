"""Erzeugt public/content/flugfragen.json - den Fragenvorrat fuer den Flug.

Warum eine eigene Datei? Im Flug sollen NICHT nur die Quizfragen aus dem
Kapitel drankommen (die kennt man dann schon auswendig), sondern weitere
Fragen zum selben Thema und Wissensstand.

Hier steht je Frage die RICHTIGE Antwort zuerst, danach die falschen. Das
Skript verteilt die richtige Antwort dann auf wechselnde Positionen - sonst
waere die Loesung immer A und man muesste gar nicht mehr lesen.

Aufruf:  python baue_flugfragen.py
"""

import json
from pathlib import Path

ZIEL = Path(__file__).resolve().parent.parent / "public" / "content" / "flugfragen.json"

# Aufbau je Eintrag: (Frage, Code oder "", richtige Antwort, [falsche Antworten])
KAPITEL = {
    "01-erste-schritte": [
        ("Womit gibt Python etwas auf dem Bildschirm aus?", "",
         "print()", ["show()", "write()"]),
        ("Was gehört bei print immer dazu?", "",
         "runde Klammern", ["eckige Klammern", "geschweifte Klammern"]),
        ("Was gibt dieses Programm aus?", 'print("Hallo")',
         "Hallo", ['"Hallo" mit Anführungszeichen', "gar nichts"]),
        ("Warum stehen Texte in print in Anführungszeichen?", "",
         "Damit Python weiß, dass es Text ist", ["Damit es schöner aussieht",
                                                 "Damit der Text größer wird"]),
        ("Was passiert, wenn du dich vertippst und prnt statt print schreibst?", "",
         "Python meldet einen Fehler", ["Python verbessert es selbst",
                                        "Das Programm läuft trotzdem"]),
        ("Was bewirkt ein leeres print()?", "",
         "Es gibt eine leere Zeile aus", ["Es gibt nichts aus", "Es beendet das Programm"]),
    ],
    "02-variablen": [
        ("Was macht das Gleichheitszeichen in alter = 12?", "",
         "Es speichert 12 in alter", ["Es prüft, ob alter 12 ist", "Es rechnet 12 aus"]),
        ("Was gibt dieses Programm aus?", "x = 5\nx = 8\nprint(x)",
         "8", ["5", "13"]),
        ("Welcher Variablenname ist erlaubt?", "",
         "punkte_gesamt", ["2punkte", "punkte gesamt"]),
        ("Was gilt für Punkte und punkte?", "",
         "Das sind zwei verschiedene Variablen", ["Das ist dieselbe Variable",
                                                  "Große Buchstaben sind verboten"]),
        ("Was gibt dieses Programm aus?", "a = 3\nb = 4\nprint(a * b)",
         "12", ["7", "34"]),
        ("Warum gibt man Variablen sprechende Namen?", "",
         "Damit man das Programm später noch versteht", ["Weil Python es verlangt",
                                                         "Damit es schneller läuft"]),
    ],
    "03-datentypen": [
        ("Welchen Datentyp hat der Wert 7?", "", "int", ["float", "str"]),
        ("Welchen Datentyp hat der Wert 7.0?", "", "float", ["int", "bool"]),
        ('Welchen Datentyp hat der Wert "7"?', "", "str", ["int", "float"]),
        ('Was ergibt int("5") + 2?', "", "7", ['"52"', "eine Fehlermeldung"]),
        ('Was ergibt "5" + "2"?', "", '"52"', ["7", "eine Fehlermeldung"]),
        ("Welche Werte kann ein bool haben?", "",
         "True und False", ["0 bis 9", "Ja und Nein"]),
        ("Was macht float(3)?", "",
         "Es macht 3.0 daraus", ["Es rundet auf 3", "Es meldet einen Fehler"]),
        ("Womit findest du heraus, welchen Datentyp ein Wert hat?", "",
         "type()", ["datentyp()", "kind()"]),
    ],
    "04-string-funktionen": [
        ('Was gibt len("Hallo") zurück?', "", "5", ["4", "6"]),
        ("Was macht .upper()?", "",
         "Es schreibt alles groß", ["Es schreibt alles klein", "Es dreht den Text um"]),
        ('Was liefert "Python"[0]?', "", '"P"', ['"y"', '"n"']),
        ('Was liefert "Python"[1:4]?', "", '"yth"', ['"ytho"', '"Pyt"']),
        ('Was macht .replace("a", "b")?', "",
         "Es ersetzt jedes a durch ein b", ["Es löscht alle a", "Es hängt b hinten an"]),
        ("Womit teilst du einen Text in eine Liste auf?", "",
         ".split()", [".join()", ".cut()"]),
        ("Was macht .join()?", "",
         "Es verbindet Listenteile zu einem Text", ["Es teilt einen Text auf",
                                                    "Es zählt die Zeichen"]),
        ("Was macht .lower()?", "",
         "Es schreibt alles klein", ["Es schreibt alles groß", "Es entfernt Leerzeichen"]),
    ],
    "05-operatoren": [
        ("Was ergibt 7 // 2?", "", "3", ["3.5", "1"]),
        ("Was ergibt 7 % 2?", "", "1", ["3", "3.5"]),
        ("Was ergibt 2 ** 3?", "", "8", ["6", "9"]),
        ("Was macht punkte += 5?", "",
         "Es zählt 5 dazu", ["Es setzt punkte auf 5", "Es zieht 5 ab"]),
        ("Was prüft ==?", "",
         "Ob zwei Werte gleich sind", ["Es weist einen Wert zu", "Ob zwei Werte ungleich sind"]),
        ("Wann ist a and b wahr?", "",
         "Nur wenn beide wahr sind", ["Wenn mindestens eins wahr ist", "Immer"]),
        ("Wann ist a or b wahr?", "",
         "Wenn mindestens eins wahr ist", ["Nur wenn beide wahr sind", "Nie"]),
        ("Was bedeutet !=?", "", "ungleich", ["gleich", "nicht kleiner"]),
    ],
    "06-eingaben": [
        ("Welchen Datentyp liefert input() immer?", "", "str", ["int", "float"]),
        ("Wie liest du eine ganze Zahl ein?", "",
         "int(input())", ["input(int())", "number(input())"]),
        ("Wofür steht EVA?", "",
         "Eingabe, Verarbeitung, Ausgabe", ["Erst Variable, dann Ausgabe",
                                            "Eingabe, Variable, Anzeige"]),
        ('Was macht f"Hallo {name}"?', "",
         "Es setzt den Wert von name ein", ["Es gibt {name} wörtlich aus",
                                            "Es meldet einen Fehler"]),
        ("Was bewirkt \\n in einem Text?", "",
         "einen Zeilenumbruch", ["einen Tabulator", "ein Anführungszeichen"]),
        ("Warum muss man eine Eingabe oft umwandeln?", "",
         "Weil input() immer Text liefert, mit dem man nicht rechnen kann",
         ["Weil Python sonst langsamer wird", "Weil Zahlen sonst zu groß werden"]),
    ],
    "07-bedingungen": [
        ("Was gehört ans Ende einer if-Zeile?", "",
         "ein Doppelpunkt", ["ein Semikolon", "gar nichts"]),
        ("Woran erkennt Python, was zum if gehört?", "",
         "an der Einrückung", ["an geschweiften Klammern", "am Semikolon"]),
        ("Wann läuft der else-Zweig?", "",
         "Wenn die Bedingung falsch ist", ["Immer", "Wenn die Bedingung wahr ist"]),
        ("Wofür ist elif da?", "",
         "Für eine weitere Bedingung, falls die erste nicht zutraf",
         ["Zum Beenden des Programms", "Für Schleifen"]),
        ("Was gibt dieses Programm aus?", 'x = 5\nif x > 3:\n    print("groß")\nelse:\n    print("klein")',
         "groß", ["klein", "gar nichts"]),
        ("Wie viele elif darf ein if haben?", "",
         "beliebig viele", ["höchstens eins", "gar keins"]),
    ],
    "08-while-schleifen": [
        ("Wie lange läuft eine while-Schleife?", "",
         "Solange die Bedingung wahr ist", ["Genau einmal", "Immer zehnmal"]),
        ("Was ist eine Endlosschleife?", "",
         "Eine Schleife, deren Bedingung nie falsch wird",
         ["Eine besonders lange Schleife", "Eine Schleife mit break"]),
        ("Was muss man in einer while-Schleife meistens verändern?", "",
         "den Zähler in der Bedingung", ["die Ausgabe", "den Namen der Schleife"]),
        ("Was bedeutet inkrementieren?", "",
         "um eins erhöhen", ["halbieren", "auf null zurücksetzen"]),
        ("Was gibt dieses Programm aus?", "i = 1\nwhile i <= 3:\n    print(i)\n    i += 1",
         "1, 2 und 3 untereinander", ["1, 2, 3 und 4", "nur die 1"]),
    ],
    "09-listen": [
        ("Mit welchen Klammern schreibt man eine Liste?", "",
         "eckige Klammern [ ]", ["runde Klammern ( )", "geschweifte Klammern { }"]),
        ("Welchen Index hat das erste Element einer Liste?", "", "0", ["1", "-1"]),
        ("Was macht .append(5)?", "",
         "Es hängt die 5 hinten an", ["Es fügt die 5 vorne ein", "Es löscht die 5"]),
        ("Was gibt len([3, 7, 9]) zurück?", "", "3", ["9", "19"]),
        ('Was macht .remove("Apfel")?', "",
         "Es entfernt Apfel aus der Liste", ["Es löscht die ganze Liste",
                                            "Es sucht nach Apfel"]),
        ("Was liefert [10, 20, 30][-1]?", "", "30", ["10", "eine Fehlermeldung"]),
        ("Was liefert [10, 20, 30][1]?", "", "20", ["10", "30"]),
    ],
    "10-for-schleifen": [
        ("Wie oft läuft for i in range(5)?", "", "5-mal", ["4-mal", "6-mal"]),
        ("Mit welcher Zahl beginnt range(5)?", "", "0", ["1", "5"]),
        ("Was macht break?", "",
         "Es bricht die Schleife sofort ab", ["Es überspringt einen Durchlauf",
                                             "Es startet die Schleife neu"]),
        ("Was macht continue?", "",
         "Es springt zum nächsten Durchlauf", ["Es bricht die Schleife ab",
                                              "Es wiederholt den Durchlauf"]),
        ("Was durchläuft for wort in liste?", "",
         "jedes Element der Liste", ["nur die Indizes", "nur das erste Element"]),
        ("Was liefert range(2, 5)?", "", "2, 3 und 4", ["2, 3, 4 und 5", "3 und 4"]),
    ],
    "11-funktionen": [
        ("Mit welchem Wort definiert man eine Funktion?", "", "def", ["func", "function"]),
        ("Was passiert, wenn man eine Funktion nur definiert, aber nie aufruft?", "",
         "Sie tut gar nichts", ["Sie läuft einmal automatisch", "Es gibt eine Fehlermeldung"]),
        ("Was macht return?", "",
         "Es gibt einen Wert an die Aufrufstelle zurück", ["Es gibt etwas auf dem Bildschirm aus",
                                                          "Es beendet das ganze Programm"]),
        ("Was ist ein Parameter?", "",
         "Ein Wert, den die Funktion beim Aufruf bekommt", ["Der Name der Funktion",
                                                           "Das Ergebnis der Funktion"]),
        ("Was ist ein Standardwert?", "",
         "Ein Wert, der gilt, wenn beim Aufruf nichts übergeben wird",
         ["Immer die Zahl 0", "Der Rückgabewert"]),
        ("Warum schreibt man überhaupt Funktionen?", "",
         "Damit man denselben Code nicht mehrfach schreiben muss",
         ["Weil Python sonst Fehler meldet", "Damit das Programm länger wird"]),
    ],
    "12-verschachtelte-listen": [
        ("Was ist eine verschachtelte Liste?", "",
         "Eine Liste, die selbst wieder Listen enthält", ["Eine besonders lange Liste",
                                                          "Eine sortierte Liste"]),
        ("Wie kommst du an die zweite Zeile, dritte Spalte?", "",
         "matrix[1][2]", ["matrix[2][3]", "matrix[3][2]"]),
        ("Wie viele Zeilen hat [[1, 2], [3, 4], [5, 6]]?", "", "3", ["2", "6"]),
        ("Wie durchläuft man alle Felder einer Matrix?", "",
         "mit zwei ineinander liegenden Schleifen", ["mit einer einzigen Schleife",
                                                     "mit einer Bedingung"]),
        ("Was liefert [[1, 2], [3, 4]][0][1]?", "", "2", ["1", "3"]),
    ],
    "13-dictionaries": [
        ("Mit welchen Klammern schreibt man ein Dictionary?", "",
         "geschweifte Klammern { }", ["eckige Klammern [ ]", "runde Klammern ( )"]),
        ("Woraus besteht ein Eintrag in einem Dictionary?", "",
         "aus Schlüssel und Wert", ["nur aus einem Wert", "aus Index und Wert"]),
        ('Wie liest du den Wert zum Schlüssel "name"?', "",
         'd["name"]', ["d(0)", "d.name()"]),
        ('Was passiert bei d["neu"] = 5, wenn "neu" noch nicht existiert?', "",
         "Der Eintrag wird neu angelegt", ["Es gibt eine Fehlermeldung", "Es passiert nichts"]),
        ("Wodurch unterscheidet sich ein Dictionary von einer Liste?", "",
         "Man greift über Schlüssel zu statt über Zahlen-Indizes",
         ["Es kann nur Zahlen speichern", "Es ist immer sortiert"]),
    ],
    "14-klassen": [
        ("Mit welchem Wort definiert man eine Klasse?", "", "class", ["def", "new"]),
        ("Was ist ein Objekt?", "",
         "Ein konkretes Exemplar einer Klasse", ["Eine Funktion", "Eine Liste"]),
        ("Wann läuft __init__?", "",
         "Beim Erzeugen eines neuen Objekts", ["Bei jedem Methodenaufruf", "Gar nicht"]),
        ("Wofür steht self?", "",
         "Für das Objekt selbst", ["Für die Klasse", "Für den Rückgabewert"]),
        ("Was ist ein Attribut?", "",
         "Ein Wert, der zu einem Objekt gehört", ["Eine Funktion außerhalb der Klasse",
                                                  "Ein anderes Wort für Modul"]),
        ("Was ist eine Methode?", "",
         "Eine Funktion, die zu einer Klasse gehört", ["Eine Variable in der Klasse",
                                                       "Ein Name für ein Objekt"]),
    ],
    "15-dateien": [
        ('Wofür steht das "w" bei open("t.txt", "w")?', "",
         "write – die Datei wird zum Schreiben geöffnet", ["wait – das Programm wartet",
                                                           "word – es wird Wort für Wort gelesen"]),
        ('Wofür steht das "r" bei open("t.txt", "r")?', "",
         "read – die Datei wird zum Lesen geöffnet", ["run – die Datei wird ausgeführt",
                                                      "rückwärts – von hinten gelesen"]),
        ("Warum benutzt man with open(...)?", "",
         "Weil die Datei danach automatisch geschlossen wird", ["Weil es weniger Speicher braucht",
                                                                "Weil die Datei sonst leer bleibt"]),
        ("Was macht .read()?", "",
         "Es liest den ganzen Inhalt der Datei", ["Es schreibt in die Datei",
                                                  "Es löscht die Datei"]),
        ('Was passiert mit einer vorhandenen Datei bei open(..., "w")?', "",
         "Ihr alter Inhalt wird überschrieben", ["Der neue Text wird angehängt",
                                                 "Es gibt eine Fehlermeldung"]),
    ],
    "16-projekte": [
        ("Wozu dienen Kommentare mit #?", "",
         "Sie erklären den Code für Menschen und werden nicht ausgeführt",
         ["Sie werden wie normaler Code ausgeführt", "Sie machen das Programm schneller"]),
        ("Warum testet man ein Programm mit verschiedenen Eingaben?", "",
         "Um Fehler zu finden, die bei einer Eingabe nicht auffallen",
         ["Weil Python das verlangt", "Damit das Programm länger wird"]),
        ("Was zeichnet gute Variablennamen aus?", "",
         "Sie sagen, was drinsteht", ["Sie sind möglichst kurz", "Sie sind durchnummeriert"]),
        ("Womit vergleicht man beim Zahlenraten die geratene Zahl?", "",
         "mit if und elif", ["mit print", "mit def"]),
        ("Was hilft, wenn ein Programm nicht das Erwartete tut?", "",
         "Zwischenergebnisse mit print ausgeben", ["Das Programm neu schreiben",
                                                   "Alle Kommentare entfernen"]),
    ],
}


def main():
    raus = {}
    gesamt = 0
    for kapitel, fragen in KAPITEL.items():
        liste = []
        for nr, (frage, code, richtig, falsch) in enumerate(fragen):
            antworten = list(falsch)
            # Die richtige Antwort wandert reihum durch die Positionen -
            # sonst waere die Loesung immer A.
            pos = nr % (len(falsch) + 1)
            antworten.insert(pos, richtig)
            eintrag = {"frage": frage, "antworten": antworten, "richtig": pos}
            if code:
                eintrag["code"] = code
            liste.append(eintrag)
        raus[kapitel] = liste
        gesamt += len(liste)

    ZIEL.write_text(json.dumps(raus, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    verteilung = {}
    for liste in raus.values():
        for f in liste:
            verteilung[f["richtig"]] = verteilung.get(f["richtig"], 0) + 1
    print(f"--- {gesamt} Flugfragen in {len(raus)} Kapiteln geschrieben ---")
    print(f"    Loesung auf Position: {dict(sorted(verteilung.items()))}")


if __name__ == "__main__":
    main()
