// Speichert die Loesungen, die die Lernenden selbst geschrieben haben.
//
// Damit kann jede und jeder ein eigenes, ausgefuelltes Arbeitsblatt
// abgeben: die Aufgabenstellung aus dem Kurs, darunter der eigene Code.
//
// Gespeichert wird NUR Code, der die Pruefung bestanden hat - ein
// Arbeitsblatt soll ja keine halbfertigen Versuche enthalten. Bei einem
// zweiten Anlauf ueberschreibt die neue Loesung die alte.
//
// Alles bleibt im Browser (localStorage) und wandert in die
// Sicherungsdatei, damit es einen Geraetewechsel uebersteht.

const KEY = "pyquest.loesungen.v1";

function laden() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

let daten = laden();

function speichern() {
  try {
    localStorage.setItem(KEY, JSON.stringify(daten));
  } catch {
    // Speicher voll oder privater Modus: Dann gibt es eben kein
    // ausgefuelltes Arbeitsblatt - der Kurs laeuft trotzdem weiter.
  }
}

export function merkeLoesung(lessonId, schrittIndex, code) {
  if (!code || !code.trim()) return;
  if (!daten[lessonId]) daten[lessonId] = {};
  daten[lessonId][schrittIndex] = { code, zeit: Date.now() };
  speichern();
}

export function holeLoesung(lessonId, schrittIndex) {
  return daten[lessonId]?.[schrittIndex]?.code ?? null;
}

// Wie viele Aufgaben eines Kapitels sind schon beantwortet?
export function anzahlLoesungen(lessonIds) {
  return lessonIds.reduce(
    (summe, id) => summe + Object.keys(daten[id] ?? {}).length,
    0
  );
}

// ---- Sicherungsdatei ----

export function exportLoesungen() {
  return daten;
}

export function importLoesungen(eingelesen) {
  if (!eingelesen || typeof eingelesen !== "object") return;
  daten = { ...daten, ...eingelesen };
  speichern();
}

export function resetLoesungen() {
  daten = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nichts zu tun */
  }
}
