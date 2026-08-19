# Figuren in PyQuest

Alle Figuren, die in der App vorkommen können – wer auf welcher Seite steht,
welche Posen es gibt und wo sie eingesetzt werden. Die Texte stehen in
`public/content/figuren.json`, die App-Bilder unter `public/figuren/`.

Aus den Original-PNGs hier werden die App-Bilder mit
`arbeitsblaetter/figuren_uebernehmen.py` erzeugt (360 px hoch, WebP).

## Verbündete

| Figur | Ordner | Posen | Kommt vor in | Rolle |
|---|---|---|---|---|
| Py | `py` | 8 | Kapitel 1–4 | Maskottchen, die Python-Schlange |
| Ada | `ada` | 8 | Kapitel 1 | Wächterin der Akademie, Mentorin |
| Nia | `nia` | 8 | Kapitel 1–4 | Code-Scout, kennt alle Welten |
| Byte | `byte` | 8 | Kapitel 1–3 | freundliche Debug-Drohne |
| Glitch | `glitch` | 8 | Kapitel 3–4 | Fehlerwesen, das zu uns gehört |
| Memo | `memo` | 8 | Kapitel 2, 4 | Archivarin der Speicherstadt |
| **Iva** | `iva` | 3 | noch frei | Baumeisterin – **Funktionen, Klassen** |
| **Tick** | `tick` | 3 | noch frei | Zähl-Drohne – **Schleifen, Listen** |
| **Vero** | `vero` | 3 | noch frei | Wahrheits-Wesen – **Bedingungen, Vergleiche** |

Alle sechs oberen Figuren stammen aus dem Intro und stellen sich in den
Lektionen deshalb **nicht** noch einmal vor. Iva, Tick und Vero sind neu und
haben einen Vorstellungstext.

## Professor Null und sein Gefolge

| Figur | Ordner | Posen | Kommt vor in | Stört bei |
|---|---|---|---|---|
| Professor Null | `professor-null` | 9 | noch frei | der Hauptgegner |
| Nullbit | `null-nullbit` | 2 | Kapitel 1–4 | Späherdrohne, überall |
| Nibble | `null-nibble` | 2 | Kapitel 1–4 | stiehlt Werte – Variablen, Datentypen |
| Bug | `null-bug` | 2 | ab Kapitel 5 geplant | baut Fehler ein – Operatoren, Bedingungen |
| Loop | `null-loop` | 2 | ab Kapitel 8 geplant | Endlosschleifen – while, for |
| Ciphera | `null-ciphera` | 2 | ab Kapitel 13 geplant | Schlüssel und Baupläne – Dictionaries, Klassen |
| **Typo** | `null-typo` | 3 | noch frei | Tippfehler – **Strings, Datentypen** |
| **Indexa** | `null-indexa` | 3 | noch frei | verschiebt Positionen – **Listen, Slicing, Matrix** |
| **Krasch** | `null-krasch` | 3 | noch frei | Abstürze – **Dateien, Projekte, Fehlermeldungen** |

### Namensdopplung beachten

Im gelieferten Gefolge (`NULL-CREW.md`) heißen zwei Figuren **Byte** und
**Glitch** – genau wie zwei Verbündete. In der App heißen die Gegner deshalb
**Nibble** (halbes Byte) und **Bug** (Programmfehler). Nibble spricht die
Verwechslung in seiner Vorstellung selbst an.

## Posen-Bedeutung

- Verbündete: `neutral`, `victory` (Lob), `clever` (Erklärung); die
  Intro-Figuren haben zusätzlich `funny`, `angry`, `thoughtful`, `worried`,
  `surprised`.
- Gegner: `neutral` (Vorstellung), `action` (Spott), `defeated` (Rückzug).
  Das gelieferte Gefolge hat nur `neutral` und `action` – dort wird für den
  Rückzug `neutral` verwendet.

## Nicht im Einsatz

`syntaxa` und `kontrollor` waren Eigenentwürfe, bevor das offizielle Gefolge
vorlag. Sie bleiben als Reserve liegen.

## Eine neue Figur ergänzen

1. Bogen mit drei Posen erzeugen lassen (heller Hintergrund, drei Posen
   nebeneinander).
2. `python arbeitsblaetter/figuren_freistellen.py <bogen.png>
   grafik-bibliothek/figuren/<ordner> neutral action defeated`
3. Ordner und Posen in `figuren_uebernehmen.py` unter `BENOETIGT` eintragen
   und das Skript laufen lassen.
4. In `public/content/figuren.json` die Figur mit Texten anlegen und in die
   `kapitel`-Liste eintragen, in der sie auftreten soll.
