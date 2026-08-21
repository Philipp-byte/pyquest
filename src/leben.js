// Leben fuer die Flug-Zwischenspiele.
//
// Anders als Sterne oder XP gehoeren die Leben NICHT zur Bewertung - sie
// sind reines Spiel. Sie zaehlen aber ueber den ganzen Kurs hinweg: Wer
// im Flug nach Kapitel 3 Leben sammelt, hat sie nach Kapitel 4 noch.

const KEY = "pyquest.leben.v1";
export const START_LEBEN = 3;
export const MAX_LEBEN = 10;

function laden() {
  try {
    const roh = localStorage.getItem(KEY);
    if (roh === null) return START_LEBEN;
    const zahl = Number(roh);
    return Number.isFinite(zahl) ? begrenze(zahl) : START_LEBEN;
  } catch {
    return START_LEBEN;
  }
}

function begrenze(zahl) {
  return Math.max(0, Math.min(MAX_LEBEN, Math.round(zahl)));
}

let leben = laden();

function speichern() {
  try {
    localStorage.setItem(KEY, String(leben));
  } catch {
    // Privater Modus: Die Leben gelten dann nur bis zum Neuladen.
  }
}

export function getLeben() {
  return leben;
}

export function setzeLeben(wert) {
  leben = begrenze(wert);
  speichern();
  return leben;
}

// Gibt die neue Anzahl zurueck. Mehr als MAX_LEBEN geht nicht - das
// Sammeln soll ein Ziel haben, keine Endlosskala.
export function lebenDazu(anzahl = 1) {
  return setzeLeben(leben + anzahl);
}

export function lebenAbziehen(anzahl = 1) {
  return setzeLeben(leben - anzahl);
}

export function lebenZuruecksetzen() {
  return setzeLeben(START_LEBEN);
}

// Fuer die Sicherungsdatei.
export function exportLeben() {
  return leben;
}

export function importLeben(wert) {
  if (typeof wert === "number") setzeLeben(wert);
}
