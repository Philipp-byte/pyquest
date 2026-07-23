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

Die CLI-Befehle oben sind nur zum **Bootstrapping** gedacht (der allererste
Admin-/Test-Account, bevor sich überhaupt jemand einloggen kann). Danach
läuft die Verwaltung über die Weboberfläche:

- **Lehrkräfte** (nach Login) verwalten unter `/` ihr eigenes Dashboard:
  Klassen anlegen, Accounts per Klick generieren (druckbare
  Pseudonym-Passwort-Liste), Fortschritt der Klasse einsehen, Kapitel
  freischalten/sperren, Rangliste ein-/ausschalten.
- **Admins** verwalten unter `/` Lehrer-/Admin-Accounts und globale
  Einstellungen (Schulname, Sound-Standard).

Bei Bedarf lassen sich weitere Accounts trotzdem jederzeit per CLI anlegen:

```bash
flask --app app create-user <Pseudonym> <Passwort> --role student --class-name "<Klasse>"
```

Rollen: `student`, `teacher`, `admin`.

## Backup

Die komplette Datenbank ist eine einzige Datei:
`server/instance/pyquest.db`. Backup = Datei kopieren.
