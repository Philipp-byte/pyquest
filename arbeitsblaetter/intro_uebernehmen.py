"""Uebernimmt das Intro-Paket in die App (public/intro/).

Kopiert wird nur, was das Intro wirklich braucht. Die Figurenbilder liegen im
Paket als PNG vor (zusammen rund 12 MB) und werden dabei nach WebP gewandelt -
das spart ueber 80 Prozent, ohne sichtbaren Qualitaetsverlust. Die Welten- und
Szenenbilder sind bereits WebP und werden nur kopiert.

Aufruf:  python intro_uebernehmen.py
"""

import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

QUELLE = Path(r"C:\Users\User\Downloads\PyQuest-Intro-Komplettpaket\pyquest-intro-complete")
ZIEL = Path(__file__).resolve().parent.parent / "public" / "intro"

# Nur diese Figuren und Welten kommen im Intro vor.
FIGUREN = ["ada", "byte", "glitch", "memo", "nia", "professor-null", "py"]
WELTEN = ["01-neustart", "12-matrixa", "16-finalia"]


def kopiere_szenen():
    ziel = ZIEL / "assets" / "scenes"
    ziel.mkdir(parents=True, exist_ok=True)
    n = 0
    for f in (QUELLE / "prototypes" / "current-intro" / "assets" / "scenes").glob("*.webp"):
        shutil.copyfile(f, ziel / f.name)
        n += 1
    return n


def wandle_figuren():
    quelle = QUELLE / "assets" / "library" / "characters"
    ziel = ZIEL / "lib" / "characters"
    vorher = nachher = n = 0
    for figur in FIGUREN:
        (ziel / figur).mkdir(parents=True, exist_ok=True)
        for png in (quelle / figur).glob("*.png"):
            vorher += png.stat().st_size
            bild = Image.open(png)
            aus = ziel / figur / (png.stem + ".webp")
            bild.save(aus, "WEBP", quality=88, method=6)
            nachher += aus.stat().st_size
            n += 1
    shutil.copyfile(quelle / "manifest.json", ziel / "manifest.json")
    return n, vorher, nachher


def kopiere_welten():
    quelle = QUELLE / "assets" / "library" / "worlds"
    ziel = ZIEL / "lib" / "worlds"
    n = 0
    for welt in WELTEN:
        (ziel / welt).mkdir(parents=True, exist_ok=True)
        for f in (quelle / welt).glob("*.webp"):
            shutil.copyfile(f, ziel / welt / f.name)
            n += 1
    shutil.copyfile(quelle / "manifest.json", ziel / "manifest.json")
    return n


def patche(text, ersetzungen, datei):
    """Wendet alle Ersetzungen an und bricht ab, wenn eine nicht greift -
    so faellt sofort auf, wenn sich die Quelle geaendert hat."""
    for alt, neu in ersetzungen:
        if alt not in text:
            raise SystemExit(f"FEHLER: Muster nicht gefunden in {datei}:\n{alt[:120]}")
        text = text.replace(alt, neu)
    return text


# In der App vorgenommene Korrekturen am gelieferten Intro. Sie werden beim
# Uebernehmen automatisch wieder angewendet - ein erneuter Lauf dieses
# Skripts darf sie nicht stillschweigend zurueckdrehen.
PATCHES_INDEX_HTML = [
    # Der Hinweistext unter dem Start-Knopf entfaellt; stattdessen ein gut
    # sichtbarer zweiter Weg direkt zum Lernpfad.
    (
        """          <p>Ohne Stimmen · mit Musik und Soundeffekten</p>""",
        """          <button class="start-exit" id="startExitButton" type="button">
            Ohne Intro weiter zum Lernpfad <span aria-hidden="true">›</span>
          </button>""",
    ),
]

PATCHES_INTRO_JS = [
    # Bibliothek liegt in der App unter ./lib/
    ("'../../assets/library/pyquest-assets.js'", "'./lib/pyquest-assets.js'"),
    # Textfehler: Einen Fehler LOEST man gemeinsam, man liest ihn nicht.
    (
        "text: 'Dann lesen wir ihn gemeinsam.",
        "text: 'Dann lösen wir ihn gemeinsam.",
    ),
    # Bildverlauf Szene 5: Bei der Warnung ist die Akademie noch nicht
    # zerstoert - die Korruption beginnt gerade erst.
    (
        """    background: sceneAsset('academy-destroyed.webp'),
    position: '50% 45%',
    speaker: 'Akademie-System',""",
        """    // Bildverlauf: Bei der Warnung ist die Akademie noch nicht zerstoert -
    // die Korruption beginnt gerade erst (zerstoert wird sie erst ab dem
    // zweiten Schlag auf den Kern).
    background: worldAsset('neustart', 'corrupted'),
    position: '50% 45%',
    speaker: 'Akademie-System',""",
    ),
    # Bildverlauf Szene 8: Der Kern ist hier noch heil ("Er WILL ihn
    # zerbrechen") - laufende Attacke statt zerstoerter Halle.
    (
        """    background: sceneAsset('academy-destroyed.webp'),
    position: '50% 50%',
    speaker: 'Wächterin Ada',""",
        """    // Bildverlauf: Der Kern ist hier noch heil ("Er WILL ihn zerbrechen") -
    // deshalb die laufende Attacke zeigen, nicht die schon zerstoerte Halle.
    background: sceneAsset('null-attacks.webp'),
    position: '50% 50%',
    speaker: 'Wächterin Ada',""",
    ),
    # Bildverlauf Szene 28: Folgeszene zeigt dieselbe Stadt als corrupted,
    # und Nulls Plan ist Korrumpierung - kein Rueckwaerts-Erholen der Stadt.
    (
        """    background: worldAsset('neustart', 'destroyed'),
    position: '50% 48%',
    speaker: 'Code-Scout Nia',""",
        """    // Bildverlauf: Die Folgeszene zeigt dieselbe Stadt als "corrupted" -
    // und Nulls Plan ist Korrumpierung, nicht Totalzerstoerung. Deshalb
    // hier derselbe Zustand, sonst "erholt" sich die Stadt rueckwaerts.
    background: worldAsset('neustart', 'corrupted'),
    position: '50% 48%',
    speaker: 'Code-Scout Nia',""",
    ),
    # Szene 22: KEINE Figuren-Sprites ergaenzen - das Hintergrundbild zeigt
    # den Kampf bereits selbst, Sprites wuerden die gemalten Figuren doppeln.
    (
        """    text: 'Nicht perfekt, Null. Frei. Und Freiheit findet immer einen neuen Weg.',
    characters: [],""",
        """    text: 'Nicht perfekt, Null. Frei. Und Freiheit findet immer einen neuen Weg.',
    // Keine Figuren-Sprites: Das Hintergrundbild zeigt den Kampf bereits
    // selbst - zusaetzliche Sprites wuerden die gemalten Figuren ueberlagern.
    characters: [],""",
    ),
    # Szene 20: Formulierung passend zum Bild (Tunnel ist tuerkis, kein
    # violetter Sturm zu sehen).
    (
        "    text: 'Die Kapsel schießt in den Datentunnel. Hinter Py versinkt die Akademie im violetten Sturm.',",
        """    // Formulierung passend zum Bild: Der Tunnel ist tuerkis, ein violetter
    // Sturm ist nicht zu sehen - stattdessen bleibt die Akademie (und Ada)
    // hinter Py zurueck.
    text: 'Die Kapsel schießt durch den Datentunnel. Die Akademie bleibt zurück – und mit ihr Ada.',""",
    ),
    # Szene 21: Akt III spielt NACH dem Kernbruch - Null hoehnt in der
    # zerstoerten Halle, nicht in der noch intakten aus der Angriffsphase.
    (
        """    background: sceneAsset('null-attacks.webp'),
    position: '48% 43%',
    speaker: 'Professor Null · Feind',
    tone: 'null',
    text: 'Du glaubst, eine kleine Schlange könne meinen perfekten Code besiegen?',
    characters: [],""",
        """    // Bildverlauf: Akt III spielt NACH dem Kernbruch - Null hoehnt in der
    // zerstoerten Halle, nicht in der noch intakten aus der Angriffsphase.
    background: sceneAsset('academy-destroyed.webp'),
    position: '48% 43%',
    speaker: 'Professor Null · Feind',
    tone: 'null',
    text: 'Du glaubst, eine kleine Schlange könne meinen perfekten Code besiegen?',
    characters: [
      { id: 'null', pose: 'victory', position: 'right' },
    ],""",
    ),
    # Szenen 23/24 vertauscht: erst die Systemwarnung (Portal kollabiert),
    # dann Pys Kampf um die letzten Meter, dann der Aufprall.
    (
        """  {
    act: 3,
    background: sceneAsset('portal-flight.webp'),
    position: '57% 48%',
    speaker: 'Py',
    tone: 'hero',
    side: 'right',
    text: 'Komm schon … nur noch ein kleines Stück!',
    characters: [],
    effect: 'portal',
    sfx: 'portal',
  },
  {
    act: 3,
    background: sceneAsset('portal-flight.webp'),
    position: '44% 50%',
    speaker: 'Kapsel-System',
    tone: 'danger',
    text: 'Portal kollabiert. Steuerung ausgefallen. Aufprall in fünf Sekunden.',
    badge: { eyebrow: 'KRITISCHER FEHLER', title: 'MANUELLE STEUERUNG AUSGEFALLEN' },
    characters: [],
    effect: 'glitch',
    sfx: 'alarm',
  },""",
        """  {
    act: 3,
    background: sceneAsset('portal-flight.webp'),
    position: '44% 50%',
    speaker: 'Kapsel-System',
    tone: 'danger',
    text: 'Portal kollabiert. Steuerung ausgefallen. Aufprall in fünf Sekunden.',
    badge: { eyebrow: 'KRITISCHER FEHLER', title: 'MANUELLE STEUERUNG AUSGEFALLEN' },
    characters: [],
    effect: 'glitch',
    sfx: 'alarm',
  },
  {
    act: 3,
    background: sceneAsset('portal-flight.webp'),
    position: '57% 48%',
    speaker: 'Py',
    tone: 'hero',
    side: 'right',
    text: 'Komm schon … nur noch ein kleines Stück!',
    characters: [],
    effect: 'portal',
    sfx: 'portal',
  },""",
    ),
    # Szene 28: Nia kuendigt die Neuankoemmlinge an, damit Byte und Glitch
    # in der Folgeszene nicht unvermittelt auftauchen.
    (
        "    text: 'Dann stehst du nicht allein auf. Ich bin Nia – und Null hat auch meine Stadt angegriffen.',",
        """    // Kuendigt die Neuankoemmlinge der naechsten Szene an, damit Byte und
    // Glitch nicht unvermittelt auftauchen.
    text: 'Dann stehst du nicht allein auf. Ich bin Nia – Null hat auch meine Stadt angegriffen. Und ich habe Verstärkung mitgebracht.',""",
    ),
    # Szene 29: Byte stellt sich und Glitch vor.
    (
        "    text: 'Analyse abgeschlossen: sechzehn Fragmente, sechzehn Städte – und eine sehr gute Chance, Nulls Plan zu debuggen.',",
        """    // Byte stellt sich und Glitch vor - beide sind hier zum ersten Mal zu sehen.
    text: 'Ich bin Byte, das ist Glitch. Analyse abgeschlossen: sechzehn Fragmente, sechzehn Städte – und eine sehr gute Chance, Nulls Plan zu debuggen.',""",
    ),
    # Startbildschirm-Knopf "Ohne Intro weiter" ausloesen wie den
    # Abschluss-Knopf am Ende.
    (
        "elements.startButton.addEventListener('click', startIntro);",
        """elements.startButton.addEventListener('click', startIntro);
// "Ohne Intro weiter zum Lernpfad" auf dem Startbildschirm: nutzt dasselbe
// Abschluss-Ereignis wie "Abenteuer beginnen" - die Lern-App hoert darauf
// und merkt sich den Vorspann als gesehen.
document.getElementById('startExitButton')?.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('pyquest:intro-complete'));
});""",
    ),
]

PATCHES_STYLES_CSS = [
    # Stil des entfernten Hinweistexts durch den neuen Knopf ersetzen.
    (
        """.start-action p {
  margin: 0;
  color: #d1e0e5;
  font-size: clamp(.8rem, 1.6vw, 1rem);
  text-align: center;
  text-shadow: 0 2px 14px #000;
}""",
        """/* Zweiter Weg unter dem Start-Knopf: direkt zum Lernpfad, ohne Intro.
   Bewusst deutlich sichtbar, aber dem gruenen Hauptknopf untergeordnet. */
.start-exit {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  padding: .8rem 1.6rem;
  border: 1px solid #7ce8c455;
  border-radius: 999px;
  color: #d8fff0;
  background: #07111dcc;
  cursor: pointer;
  font-family: inherit;
  font-size: clamp(.95rem, 2vw, 1.1rem);
  font-weight: 800;
  text-shadow: 0 2px 14px #000;
  backdrop-filter: blur(4px);
  transition: transform .2s ease, background .2s ease, border-color .2s ease;
}

.start-exit:hover {
  transform: translateY(-2px);
  border-color: #7ce8c4aa;
  background: #0b1b2ce6;
}

.start-exit:active {
  transform: translateY(1px);
}""",
    ),
]


def kopiere_code():
    src = QUELLE / "prototypes" / "current-intro"
    ZIEL.mkdir(parents=True, exist_ok=True)

    # newline="\n": feste LF-Zeilenenden, sonst schreibt Windows CRLF und
    # jede Neuerzeugung saehe wie eine Komplettaenderung aus.
    css = (src / "styles.css").read_text(encoding="utf-8")
    (ZIEL / "styles.css").write_text(patche(css, PATCHES_STYLES_CSS, "styles.css"), encoding="utf-8", newline="\n")

    html = (src / "index.html").read_text(encoding="utf-8")
    (ZIEL / "index.html").write_text(patche(html, PATCHES_INDEX_HTML, "index.html"), encoding="utf-8", newline="\n")

    js = (src / "intro.js").read_text(encoding="utf-8")
    (ZIEL / "intro.js").write_text(patche(js, PATCHES_INTRO_JS, "intro.js"), encoding="utf-8", newline="\n")

    # Der Helfer baut Figurenpfade mit .png - wir liefern WebP aus.
    helfer = (QUELLE / "assets" / "library" / "pyquest-assets.js").read_text(encoding="utf-8")
    helfer_neu = patche(helfer, [("${pose}.png", "${pose}.webp")], "pyquest-assets.js")
    (ZIEL / "lib").mkdir(parents=True, exist_ok=True)
    (ZIEL / "lib" / "pyquest-assets.js").write_text(helfer_neu, encoding="utf-8", newline="\n")


def main():
    if ZIEL.exists():
        shutil.rmtree(ZIEL)
    kopiere_code()
    szenen = kopiere_szenen()
    figuren, vorher, nachher = wandle_figuren()
    welten = kopiere_welten()

    gesamt = sum(f.stat().st_size for f in ZIEL.rglob("*") if f.is_file())
    print(f"Szenen kopiert:   {szenen}")
    print(f"Figuren gewandelt: {figuren}  ({vorher//1024//1024} MB PNG -> {nachher//1024//1024} MB WebP)")
    print(f"Weltbilder kopiert: {welten}")
    print(f"Gesamtgroesse public/intro: {gesamt//1024//1024} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
