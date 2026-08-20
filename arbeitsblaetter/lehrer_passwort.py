"""Setzt das Passwort fuer den Lehrer-Modus.

Das Passwort wird NICHT gespeichert, nur seine Pruefsumme (SHA-256) in
public/content/lehrer.json. Damit steht das Passwort nirgends im Projekt -
auch nicht auf GitHub.

Zur Einordnung: Das ist ein Sichtschutz, keine echte Sicherheit. PyQuest
laeuft ohne Server komplett im Browser der Lernenden. Wer sich auskennt,
kann den Lehrer-Modus auch ohne Passwort einschalten. Es haelt neugierige
Klicks ab - und mehr braucht es hier auch nicht, weil im Lehrer-Modus
nichts Schuetzenswertes sichtbar wird, sondern nur alle Lektionen offen sind.

Aufruf:  python lehrer_passwort.py "mein neues Passwort"
"""

import hashlib
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ZIEL = Path(__file__).resolve().parent.parent / "public" / "content" / "lehrer.json"


def main():
    if len(sys.argv) != 2 or not sys.argv[1].strip():
        raise SystemExit(__doc__)
    passwort = sys.argv[1]
    if len(passwort) < 6:
        raise SystemExit("Bitte mindestens 6 Zeichen verwenden.")

    hash_wert = hashlib.sha256(passwort.encode("utf-8")).hexdigest()
    ZIEL.write_text(
        json.dumps(
            {
                "_hinweis": "Pruefsumme des Lehrer-Passworts. Aendern mit "
                            "python arbeitsblaetter/lehrer_passwort.py \"neues Passwort\"",
                "hash": hash_wert,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Passwort gesetzt. Pruefsumme in {ZIEL.name} hinterlegt.")
    print("Nicht vergessen: neu bauen und hochladen (npm run build, git push).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
