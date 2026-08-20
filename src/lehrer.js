// Lehrer-Modus: schaltet alle Lektionen, Tests und Arbeitsblaetter frei.
//
// Gedacht fuer den Unterricht - damit die Lehrkraft eine beliebige Lektion
// vorfuehren kann, ohne vorher alles durchspielen zu muessen.
//
// WICHTIG, bitte lesen: Das ist ein SICHTSCHUTZ, keine echte Sicherheit.
// PyQuest ist eine reine Browser-App ohne Server. Alles, was hier passiert,
// laeuft auf dem Geraet der Lernenden. Wer sich auskennt, kann den Modus
// ueber die Entwicklerwerkzeuge des Browsers auch ohne Passwort einschalten.
// Es haelt neugierige Klicks ab, mehr nicht - und mehr muss es auch nicht,
// weil hier nichts Schuetzenswertes liegt (keine Noten, keine Daten anderer).
//
// Das Passwort steht NICHT im Code, sondern nur als Pruefsumme (SHA-256) in
// public/content/lehrer.json. Aendern mit:
//     python arbeitsblaetter/lehrer_passwort.py "neues Passwort"

const KEY = "pyquest.lehrer.v1";
const BASE = import.meta.env.BASE_URL;

export function istLehrerModus() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function lehrerModusAus() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nichts zu tun */
  }
}

function lehrerModusAn() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* Privater Modus: gilt dann nur bis zum Neuladen. */
  }
}

async function pruefsumme(text) {
  const daten = new TextEncoder().encode(text);
  const puffer = await crypto.subtle.digest("SHA-256", daten);
  return [...new Uint8Array(puffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

let konfig = null;

async function ladeKonfig() {
  if (konfig) return konfig;
  const res = await fetch(`${BASE}content/lehrer.json`);
  if (!res.ok) throw new Error("Keine Lehrer-Konfiguration gefunden.");
  konfig = await res.json();
  return konfig;
}

// Prueft das eingegebene Passwort und schaltet bei Erfolg frei.
export async function anmelden(passwort) {
  const { hash } = await ladeKonfig();
  if (!hash) throw new Error("In lehrer.json fehlt der Eintrag \"hash\".");
  // crypto.subtle gibt es nur in sicheren Kontexten (https oder localhost).
  if (!crypto?.subtle) {
    throw new Error("Anmeldung braucht eine https-Verbindung.");
  }
  if ((await pruefsumme(passwort)) !== hash.toLowerCase()) return false;
  lehrerModusAn();
  return true;
}
