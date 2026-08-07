// Merkt sich, ob der Vorspann schon gesehen wurde.
//
// Bewusst immer lokal (localStorage) und unabhaengig vom Backend-Modus - das
// Intro ist eine Sache des Geraets, nicht des Lernstands. Der Wert wandert
// trotzdem in die Sicherungsdatei (siehe progress-local.js), damit nach einem
// Geraetewechsel nicht ploetzlich wieder das Intro startet.

const KEY = "pyquest.intro.v1";

export function hasSeenIntro() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Privater Modus ohne Speicher: Dann laeuft das Intro eben erneut.
  }
}

export function resetIntro() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nichts zu tun
  }
}

// Fuer Export/Import der Sicherungsdatei.
export function exportIntroState() {
  return hasSeenIntro();
}

export function importIntroState(gesehen) {
  if (gesehen) markIntroSeen();
  else resetIntro();
}
