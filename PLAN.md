# PyQuest – Projektplan

Interaktive Python-Lernplattform mit Gamification für den Schulunterricht.
Vorbild: Duolingo / Mimo / Sololearn – aber datenschutzkonform, kostenlos und selbst gehostet.

---

## 1. Leitidee

Schülerinnen und Schüler (SuS) lernen Python **Schritt für Schritt direkt im Browser** –
mit Levels, XP, Badges und sofortigem Feedback. Lehrer sehen den Fortschritt
ihrer Klassen in einem Dashboard. Alles läuft mit kostenlosen Open-Source-Technologien
und ohne externe Dienste.

---

## 2. Datenschutz-Konzept (zentrale Design-Entscheidung)

**Grundsatz: Es werden keinerlei personenbezogene Schülerdaten gespeichert.**

| Maßnahme | Umsetzung |
|---|---|
| **Pseudonym-Accounts** | Das System generiert automatisch anonyme Spielernamen (z. B. `MutigerFuchs17`, `Kluge­Eule42`) + Startpasswort. Keine Klarnamen, keine E-Mail-Adressen, keine Geburtsdaten – nirgendwo im System. |
| **Zuordnungsliste nur beim Lehrer** | Beim Anlegen einer Klasse erzeugt das System eine druckbare Liste (Pseudonym + Startpasswort). Der Lehrer trägt die Zuordnung zu realen SuS **offline** ein (Papier / lokale Datei). Diese Liste wird nie auf dem Server gespeichert. |
| **Hosting im Schulnetz** | Der Server läuft auf Schulserver, Raspberry Pi oder Lehrer-Laptop im lokalen Netz. Daten verlassen die Schule nicht. Kein Cloud-Anbieter, keine Auftragsverarbeitung, keine Cookies von Dritten. |
| **Code-Ausführung im Browser** | Python läuft via Pyodide (WebAssembly) **lokal im Browser der SuS**. Kein Schülercode wird an einen Server oder externen Dienst geschickt. |
| **Datensparsamkeit** | Gespeichert wird nur: Pseudonym, Passwort-Hash, Klassen-Zugehörigkeit, XP/Level/Badges, gelöste Aufgaben, Zeitstempel der letzten Aktivität. |
| **Löschkonzept** | Klasse löschen = alle zugehörigen Accounts + Fortschritte werden vollständig entfernt (z. B. am Schuljahresende). |

> Ergebnis: Die Daten auf dem Server sind für sich genommen nicht personenbeziehbar.
> Die Personenbeziehbarkeit existiert nur über die Offline-Liste des Lehrers.

---

## 3. Architektur

**Hybrid-Modell: „Fette" Browser-App + schlanker Server**

```
┌──────────────────────────────────────────────┐
│  Browser (SuS / Lehrer)                      │
│  ─ Lern-App (HTML/CSS/JS, SPA)               │
│  ─ Pyodide: Python-Ausführung + Bewertung    │
│  ─ CodeMirror: Code-Editor                   │
│  ─ Animationen, Sounds, Konfetti             │
└──────────────┬───────────────────────────────┘
               │  nur kleine JSON-Requests:
               │  Login, Fortschritt speichern/laden
┌──────────────▼───────────────────────────────┐
│  Mini-Server (Flask, Python)                 │
│  ─ Auth (Sessions, Passwort-Hashes)          │
│  ─ Fortschritts-API                          │
│  ─ Lehrer-/Admin-API                         │
│  ─ SQLite (eine einzige Datei)               │
└──────────────────────────────────────────────┘
```

- **Fast alles passiert im Browser** (Lektionen, Code ausführen, Bewertung, Animationen).
  Der Server macht nur Login + Speichern/Laden → minimale Last, läuft auf jedem Gerät.
- **Zwei Betriebsmodi derselben Codebasis:**
  - **Schulmodus** (mit Server): Accounts, zentrale Speicherung, Lehrer-Dashboard.
  - **Demo-Modus** (rein statisch, GitHub Pages): kein Login, Fortschritt im
    localStorage. Dient als öffentliche Vorschau und zum Ausprobieren.

---

## 4. Technologie-Stack (alles kostenlos & Open Source)

| Baustein | Technologie | Begründung |
|---|---|---|
| Frontend | **HTML/CSS/JS (Vanilla, ES-Module) + Vite** | Kein Framework-Overhead, schnell, einfach wartbar; Vite für Dev-Server & Build |
| Python im Browser | **Pyodide** (WebAssembly) | Echtes CPython im Browser, kein Server nötig, nach erstem Laden offlinefähig |
| Code-Editor | **CodeMirror 6** | Leichtgewichtig, Syntax-Highlighting, gut auf Tablets/Smartphones bedienbar |
| Konfetti/Erfolge | **canvas-confetti** + CSS-Animationen | Klein, hübsch, keine Abhängigkeiten |
| Sounds | Web Audio API + freie Sounds (CC0) | Optional abschaltbar |
| Diagramme (Dashboard) | **Chart.js** | Einfach, hübsch, kostenlos |
| Backend | **Flask** (Python) | Minimal, passt thematisch (Lehrer kann es lesen!), riesige Community |
| Datenbank | **SQLite** | Eine Datei, in Python eingebaut, null Wartung, Backup = Datei kopieren |
| Passwörter | Hashing via `werkzeug.security` | Stand der Technik, in Flask enthalten |
| Deployment | `pip install -r requirements.txt` + `python app.py` | Ein Befehl, läuft überall (Windows/Linux/Pi) |

**Bewusst NICHT verwendet:** React/Angular (unnötige Komplexität), MySQL/PostgreSQL
(Installationsaufwand), externe APIs, Cloud-Dienste, Tracking, CDNs im Schulmodus
(alle Bibliotheken werden lokal mitgeliefert → funktioniert auch ohne Internet).

---

## 5. Datenmodell (SQLite)

```
users        id, pseudonym, password_hash, role (student|teacher|admin),
             class_id, created_at, last_active
classes      id, name (z. B. "BK1 IT 2026"), teacher_id, created_at
progress     user_id, lesson_id, status (locked|open|done), stars (0–3),
             attempts, hints_used, completed_at
xp_events    user_id, amount, reason, timestamp        → Summe = XP, daraus Level
badges       user_id, badge_id, earned_at
settings     key, value                                 → globale Einstellungen
unlocks      class_id, chapter_id, locked (bool)        → Lehrer schaltet Kapitel frei/zu
```

---

## 6. Lerninhalte – Format & Erweiterbarkeit

Alle Inhalte liegen als **JSON-Dateien getrennt vom Code** in `content/`:

```
content/
  curriculum.json          → Reihenfolge der Kapitel
  chapters/
    01-was-ist-python/
      chapter.json         → Titel, Icon, Farbe, Beschreibung
      lessons/
        01-hallo-welt.json → eine Lektion mit ihren Übungen
        02-print.json
    02-variablen/
      ...
```

**Neues Kapitel hinzufügen = neuen Ordner + JSON-Dateien anlegen. Kein Code anfassen.**

### Aufbau einer Lektion (JSON)

```json
{
  "id": "print-basics",
  "title": "Dein erstes print()",
  "steps": [
    { "type": "explain",  "text": "…kurze Erklärung…", "image": "…" },
    { "type": "example",  "code": "print(\"Hallo!\")", "animated": true },
    { "type": "quiz",     "question": "…", "choices": ["…"], "answer": 1 },
    { "type": "fill",     "code": "print(___)", "solution": "…" },
    { "type": "order",    "lines": ["…"], "correctOrder": [2,0,1] },
    { "type": "code",     "task": "…", "starterCode": "…",
      "tests": [ … ], "hints": ["Tipp 1", "Tipp 2"] }
  ],
  "xp": 20
}
```

### Übungstypen (für Abwechslung à la Duolingo)

1. **Multiple Choice** – Verständnisfragen
2. **Lückentext** – Code-Lücken ausfüllen
3. **Code ordnen** (Parsons-Puzzle) – Zeilen in richtige Reihenfolge ziehen
4. **Fehler finden** – kaputten Code reparieren
5. **Frei programmieren** – eigene Lösung im Editor schreiben

---

## 7. Automatische Bewertung (mehrere Lösungswege zulassen)

Bewertet wird **Verhalten, nicht Wortlaut** – so sind alle korrekten Lösungswege gültig:

| Testart | Beispiel |
|---|---|
| **Output-Test** | Programm muss `Hallo Welt` ausgeben – egal wie |
| **Input-Simulation** | `input()` wird mit Testwerten gefüttert, Ausgabe geprüft |
| **Funktions-Test** | `addiere(2,3)` muss `5` liefern – Implementierung egal |
| **Variablen-Test** | Nach Ausführung muss `name` den Wert `"Ada"` haben |
| **Struktur-Check (sanft)** | „Verwendet dein Code eine `for`-Schleife?" – als Hinweis, nicht als harte Sperre |

Ablauf im Browser (alles via Pyodide, ohne Server):
1. Code ausführen → Ausgabe anzeigen
2. Tests laufen lassen → ✅/❌ pro Test
3. Bei Fehler: **verständliche deutsche Fehlererklärung** („`NameError` heißt:
   Python kennt diesen Namen nicht. Hast du dich vertippt?") + gestufte Tipps
4. Bei Erfolg: Konfetti, XP, Sterne (3 ⭐ = ohne Tipps/Fehlversuche)

---

## 8. Gamification-System

| Element | Design |
|---|---|
| **XP** | Pro Übung 5–20 XP, Bonus für fehlerfreie Lösung ohne Tipps |
| **Level** | Steigende Kurve: Level n benötigt `100 × n^1.5` XP; Level-Up-Animation |
| **Sterne** | 1–3 pro Lektion (Versuche + genutzte Tipps); Wiederholen erlaubt, um 3⭐ zu holen |
| **Badges** | z. B. „Erste Schritte", „Fleißig", „Kapitel-Champion", „Highscore", „Sternensammler" – als Sammelalbum im Profil. Bewusst **kein** Streak-/Tagesserien-System: SuS lernen nur im Unterricht, nicht täglich – ein „X Tage in Folge"-Abzeichen wäre für sie nie erreichbar |
| **Lernpfad** | Zweistufig: Kapitel-Übersicht (Kacheln mit Titel, Icon, Fortschrittsbalken) → Klick öffnet die Lektionen-Ansicht des Kapitels (Knotenpfad: erledigt / aktiv / gesperrt) |
| **Fortschritt** | Ringe/Balken pro Kapitel + Gesamt-Prozentanzeige im Profil |
| **Rangliste (optional)** | Pro Klasse, vom Lehrer ein-/ausschaltbar; zeigt nur Pseudonyme; optional „anonymer Modus" (nur eigene Platzierung sichtbar) |
| **Feedback-Momente** | Abwechselnde Erfolgs-Animationen bei richtigen Antworten/Lektionsabschluss (mehrere Konfetti-/Emoji-Varianten, zufällig ausgewählt, nicht immer dieselbe), Sound-Effekte (abschaltbar), animierte XP-Zähler, Maskottchen 🐍 mit motivierenden Sprüchen |

---

## 9. UI/UX-Konzept

**Design-Sprache:** freundlich, bunt, große Flächen – inspiriert von Duolingo/Mimo.

- **Farben:** kräftiges Grün als Hauptfarbe (Python + Erfolg), Dunkelblau als Basis,
  pro Kapitel eine eigene Akzentfarbe; heller + dunkler Modus
- **Typografie:** runde, gut lesbare Sans-Serif (z. B. Nunito, lokal eingebunden)
- **Bedienung:** große Touch-Buttons (Tablet-Klassensätze!), klare Icons,
  wenig Text pro Bildschirm, immer genau EIN nächster Schritt
- **Responsiv:** Mobile-first; Editor + Ausgabe auf dem Smartphone untereinander,
  auf Desktop nebeneinander
- **Maskottchen:** kleine Python-Schlange, die lobt, tröstet und Tipps gibt

### Seitenstruktur

```
/login            Login (Pseudonym + Passwort)
/                 Kapitel-Übersicht (Kacheln)
/chapter/…        Lektionen-Pfad eines Kapitels
/lesson/…         Lektions-Player (Erklärung → Übungen → Belohnung)
/profil           XP, Level, Badges, Statistik
/rangliste        optional, pro Klasse
/lehrer           Lehrer-Dashboard
/admin            Admin-Bereich
```

---

## 10. Lehrer-Dashboard & Admin

**Lehrer:**
- Klassen anlegen/verwalten; Accounts generieren (druckbare Pseudonym-Passwort-Liste)
- Passwörter zurücksetzen, Accounts löschen
- Übersicht: Fortschritt pro SuS (Kapitel/Lektionen/Sterne), zuletzt aktiv,
  Durchschnitts-XP, Klassen-Fortschrittsbalken, Diagramme (Chart.js)
- Kapitel für die Klasse freischalten/sperren (Unterrichtstempo steuern)
- Rangliste ein-/ausschalten

**Admin:**
- Lehrer-Accounts verwalten, weitere Admins anlegen
- Globale Einstellungen (z. B. Sounds an/aus als Standard, Schullogo)
- Backup-Hinweis: SQLite-Datei kopieren = vollständiges Backup

---

## 11. Umsetzungsphasen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **M1 – Kern-Prototyp** | Statische App: Lernpfad-UI, Lektions-Player, Pyodide-Ausführung, CodeMirror, 1 Beispielkapitel, Bewertungs-Engine | Spielbare Demo im Browser |
| **M2 – Gamification** | XP, Level, Sterne, Badges, Konfetti, Sounds, Profil – zunächst im localStorage | Demo-Modus komplett → auf GitHub Pages veröffentlichen |
| **M3 – Server & Accounts** | Flask + SQLite, Login/Logout/Passwort ändern, Fortschritts-Sync, Rollen | Schulmodus funktionsfähig |
| **M4 – Lehrer & Admin** | Klassenverwaltung, Account-Generator mit Druckliste, Dashboard mit Statistiken, Kapitel-Freischaltung | Einsatzbereit für eine Klasse |
| **M5 – Inhalte** | Kapitel 1–13 (Was ist Python? → print → Variablen → Datentypen → input → if → Schleifen → Funktionen → Listen → Dictionaries → Klassen → Dateien → Projekte) | Vollständiger Lehrgang |
| **M6 – Feinschliff** | Responsive-Tests auf Tablet/Handy, Barrierefreiheit, Performance, Installations-Anleitung für Schulen | Version 1.0 |

Jede Phase wird einzeln getestet und committed – das Repo bleibt immer lauffähig.

---

## 12. Hosting & Betrieb

| Variante | Kosten | Eignung |
|---|---|---|
| **GitHub Pages** (Demo-Modus) | 0 € | Öffentliche Vorschau, Ausprobieren, Unterricht ohne Accounts |
| **Schulserver / Raspberry Pi** | 0 € (vorhandene Hardware) | Empfohlen für den Schulmodus – Daten bleiben im Haus |
| **Lehrer-Laptop im Klassennetz** | 0 € | `python app.py` starten, SuS verbinden sich über lokale IP – für einzelne Stunden völlig ausreichend |

Installation Schulmodus (Ziel): **3 Schritte** – Repo herunterladen,
`pip install -r requirements.txt`, `python app.py`. Fertig.

---

## 13. Offene Punkte (später zu entscheiden)

- Name/Design des Maskottchens
- Genauer Badge-Katalog (ca. 20–30 Stück)
- Ob Ranglisten standardmäßig an oder aus sind
- Umfang der Projekte in Kapitel 13 (z. B. Zahlenraten, Quiz, Textadventure)
