# PyQuest – Schulmodus-Server

Ein kleiner Flask-Server für den Einsatz in der Schule: Accounts, zentrale
Fortschritts-Speicherung, alles in einer SQLite-Datei. Läuft komplett im
Schulnetz – keine Daten verlassen die Schule (siehe [`../PLAN.md`](../PLAN.md),
Abschnitt 2).

## Einrichtung (einmalig)

```bash
# 1. Frontend bauen (Schulmodus braucht base "/" statt "/pyquest/")
cd ..
PYQUEST_BASE=/ npm run build

# 2. Server-Abhängigkeiten installieren
cd server
pip install -r requirements.txt

# 3. Ersten Admin-Account anlegen
flask --app app create-admin admin admin-startpasswort

# 4. Ein paar Test-/Schüler-Accounts anlegen (optional)
flask --app app create-user MutigerFuchs17 start1234 --role student --class-name "BK1 IT"
flask --app app create-user HerrMustermann start1234 --role teacher
```

Unter Windows PowerShell statt `PYQUEST_BASE=/ npm run build`:

```powershell
$env:PYQUEST_BASE = "/"; npm run build
```

## Starten

```bash
python app.py
```

Danach im Browser öffnen: **http://localhost:5000**

Zum Beenden: `Strg+C`.

## Accounts verwalten

Weitere Accounts jederzeit per CLI anlegen:

```bash
flask --app app create-user <Pseudonym> <Passwort> --role student --class-name "<Klasse>"
```

Rollen: `student`, `teacher`, `admin`. Ein vollständiges Lehrer-Dashboard mit
automatischer Pseudonym-Generierung und Klassenverwaltung folgt in einer
späteren Ausbaustufe (siehe `PLAN.md`, Phase M4) – bis dahin reicht diese CLI.

## Backup

Die komplette Datenbank ist eine einzige Datei:
`server/instance/pyquest.db`. Backup = Datei kopieren.
