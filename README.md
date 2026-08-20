# PyQuest 🐍🎮

Eine spielerische Lernplattform, die Schülerinnen und Schülern (SuS)
Python-Programmierung Schritt für Schritt beibringt – mit Gamification
(XP, Level, Sterne, Badges, Streak) und einem vollständigen 12-Kapitel-Lehrgang
von `print()` bis zu eigenen Klassen und kleinen Projekten.

Live-Demo (ohne Login, Fortschritt bleibt nur im eigenen Browser):
**https://philipp-byte.github.io/pyquest/**

## Zwei Betriebsmodi, eine Codebasis

| | Demo-Modus | Schulmodus |
|---|---|---|
| Hosting | GitHub Pages (kostenlos, statisch) | selbst gehostet (Schulserver, Raspberry Pi, Laptop) |
| Login | keiner | Pseudonym + Passwort |
| Fortschritt | nur im Browser (localStorage) | zentral in SQLite, geräteübergreifend |
| Lehrer-/Admin-Dashboard | – | Klassen, Accounts, Statistiken, Kapitel-Freischaltung |
| Datenschutz | keine Daten verlassen den Browser | keine personenbezogenen Daten, siehe unten |

Die App erkennt den Modus automatisch zur Laufzeit (über `/api/ping`) – es
gibt keinen separaten Build. Python-Code wird in **beiden** Modi komplett im
Browser ausgeführt (Pyodide/WebAssembly), nie auf einem Server.

## Datenschutz-Konzept (Schulmodus)

Es werden **keine personenbezogenen Daten** gespeichert – nur anonyme
Pseudonyme (z. B. „FroehlicherFalke62") mit zufälligem Startpasswort. Die
Zuordnung zu echten Namen bleibt Offline-Sache der Lehrkraft (ausgedruckte
Liste). Der Server läuft im Schulnetz, keine Cloud-Anbieter. Details:
[`PLAN.md`](PLAN.md), Abschnitt 2.

## Schnellstart: lokal entwickeln (Demo-Modus)

```bash
npm install
npm run dev
```

Danach im Browser öffnen: die im Terminal angezeigte Adresse
(üblicherweise `http://localhost:5173/pyquest/`).

```bash
npm run build     # Production-Build nach dist/ (fuer GitHub Pages, base "/pyquest/")
```

## Schnellstart: Schulmodus (Flask-Server)

Siehe [`server/README.md`](server/README.md) für die vollständige Anleitung.
Kurzfassung:

```bash
# Frontend fuer den Schulmodus bauen (base "/" statt "/pyquest/")
PYQUEST_BASE=/ npm run build      # PowerShell: $env:PYQUEST_BASE = "/"; npm run build

cd server
pip install -r requirements.txt
flask --app app create-admin admin start1234   # ersten Admin-Account anlegen
python app.py
```

Danach im Browser öffnen: **http://localhost:5000**. Als Admin einloggen,
Lehrkräfte anlegen – Lehrkräfte generieren danach ihre Klassen und
Schüler-Accounts selbst über das Dashboard.

## Lehrer-Modus

Oben in der Kopfzeile gibt es den Knopf **„Lehrer"**. Nach Eingabe des
Passworts sind **alle Lektionen, Tests und Arbeitsblätter freigeschaltet** –
praktisch, um im Unterricht direkt an eine beliebige Stelle zu springen.

**Standard-Passwort: `PyQuest-Lehrer-2026`**

> ⚠️ **Dieses Repository ist öffentlich.** Das Passwort steht damit hier für
> alle lesbar – auch für Schülerinnen und Schüler, die das Repo finden. Wer
> das nicht will, setzt ein eigenes Passwort und schreibt es **nicht** in die
> Dokumentation:
>
> ```bash
> python arbeitsblaetter/lehrer_passwort.py "eigenes Passwort"
> npm run build && git add -A && git commit -m "Neues Lehrer-Passwort" && git push
> ```

Gespeichert wird nur die SHA-256-Prüfsumme in `public/content/lehrer.json`,
das Passwort selbst steht nirgends im Code.

Wichtig zur Einordnung: Das ist ein **Sichtschutz, keine echte Sicherheit**.
PyQuest läuft im Demo-Modus ohne Server komplett im Browser der Lernenden –
wer sich auskennt, kann den Modus auch über die Entwicklerwerkzeuge
einschalten. Das ist vertretbar, weil dabei nichts Schützenswertes sichtbar
wird, sondern nur Lektionen, die ohnehin für alle gedacht sind. Für echte
Zugangskontrolle gibt es den Schulmodus mit Server.

Der Lernstand bleibt unangetastet: keine XP, keine Sterne, nichts wird als
erledigt markiert. Solange der Modus läuft, zeigt der Knopf gelb
**„🔓 Lehrer"** – ein weiterer Klick beendet ihn.

## Wie Sterne vergeben werden

Sterne gibt es pro Lektion, gezählt über alle Schritte:

| Sterne | Bedingung |
|:---:|---|
| ★★★ | kein Fehler und kein Tipp |
| ★★ | 1 Fehler **oder** Tipp benutzt |
| ★ | mehr als das – weniger als 1 Stern gibt es nie |

Formel: `3 − Fehler − (Tipps benutzt ? 1 : 0)`, mindestens 1.

- **Als Fehler zählt** jede falsche Quiz-Antwort, jede falsche
  Lückentext-Eingabe und jedes „Prüfen", das nicht besteht.
- **Schreibfehler zählen nicht.** Weicht die Ausgabe nur bei Satzzeichen,
  Leerzeichen oder Groß-/Kleinschreibung ab, gilt die Aufgabe weiterhin als
  nicht gelöst – sie kostet aber keinen Stern (siehe `SCHREIBFEHLER_ARTEN`
  in `src/views/lesson-view.js`).
- **Tipps** kosten zusammen nur einen Stern, egal wie viele benutzt wurden.
- **Wiederholen** behält das bessere Ergebnis; XP gibt es nur beim ersten
  Abschluss.

Die Lernenden sehen die Regeln in der App: direkt nach jeder Lektion
(aufklappbar unter den Sternen) und dauerhaft im Profil.

## Projektstruktur

```
src/               Frontend (Vite, Vanilla JS, keine Frameworks)
  views/           Lernpfad, Lektions-Player, Profil, Login, Dashboards, ...
  progress-local.js / progress-remote.js   Demo- bzw. Schulmodus-Speicher
  store.js         waehlt zur Laufzeit zwischen beiden
public/content/    Lerninhalte als JSON (Kapitel/Lektionen) – neue Inhalte
                   ergaenzen, ohne Code anzufassen
server/            Flask-Server fuer den Schulmodus (siehe server/README.md)
PLAN.md            vollstaendiger Projektplan (Architektur, Datenmodell,
                   Gamification-Konzept, Umsetzungsphasen)
```

## Tech-Stack

Vite, Vanilla JavaScript (ES-Module), CodeMirror 6, Pyodide, Chart.js,
canvas-confetti – Frontend. Flask + SQLite – Backend (Schulmodus). Alles
Open Source, keine kostenpflichtigen Dienste. Details und Begründung:
[`PLAN.md`](PLAN.md), Abschnitt 4.

## Status

✅ Version 1.0 – vollständiger Lehrgang (12 Kapitel), Gamification, Schulmodus
mit Lehrer-/Admin-Dashboard. Siehe [`PLAN.md`](PLAN.md) für die Roadmap.

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).
