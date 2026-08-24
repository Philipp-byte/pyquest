// Merkt sich, welche Erklaerungen auf der Start-Tafel des Flugs schon
// gezeigt wurden.
//
// Jede Regel wird EINMAL erklaert - in dem Kapitel, in dem sie neu dazu
// kommt. Danach verschwindet der Kasten. Sonst stuende vor jedem Flug
// dieselbe halbe Seite Text, die nach dem zweiten Mal niemand mehr liest.
//
// Gleiches Muster wie bei den Begleitfiguren (figuren.js): geraeteweit
// gemerkt, wandert in die Sicherungsdatei mit und wird beim Zuruecksetzen
// des Fortschritts geleert - wer von vorne anfaengt, bekommt auch die
// Erklaerungen wieder.

const KEY = "pyquest.flughinweise.v1";

function laden() {
  try {
    const roh = localStorage.getItem(KEY);
    return new Set(roh ? JSON.parse(roh) : []);
  } catch {
    return new Set();
  }
}

let gezeigt = laden();

function speichern() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...gezeigt]));
  } catch {
    // Privater Modus: Dann wird eben jedes Mal erklaert.
  }
}

export function istNeu(id) {
  return !gezeigt.has(id);
}

export function merkeGezeigt(ids) {
  for (const id of ids) gezeigt.add(id);
  speichern();
}

export function resetHinweise() {
  gezeigt = new Set();
  speichern();
}

// Fuer die Sicherungsdatei (siehe progress-local.js).
export function exportHinweise() {
  return [...gezeigt];
}

export function importHinweise(liste) {
  if (!Array.isArray(liste)) return;
  gezeigt = new Set(liste);
  speichern();
}
