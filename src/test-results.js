// Ergebnisse der Kapitel-Tests.
//
// Bewusst IMMER lokal (localStorage), unabhaengig vom Backend-Modus:
//
// 1. Der Rueckmeldebogen fuer die Lehrkraft entsteht im Browser der SuS und
//    wird ausgedruckt bzw. als PDF gespeichert - dafuer braucht es keinen
//    Server (siehe PLAN.md, Datenschutz-Konzept).
// 2. Testergebnisse sind detaillierter als der normale Fortschritt (welche
//    Pruefung genau fehlgeschlagen ist). Diese Details bleiben auf dem Geraet.
//
// Der geschriebene Quelltext der SuS wird NICHT gespeichert - nur, welche
// Anforderung erfuellt wurde und welche nicht.

const KEY = "pyquest.tests.v1";

function loadAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(all) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getTestResult(testId) {
  return loadAll()[testId] ?? null;
}

export function getAllTestResults() {
  return loadAll();
}

export function isTestDone(testId) {
  return Boolean(loadAll()[testId]);
}

// tasks: [{ id, title, passed, attempts, failedChecks: [Text], totalChecks, passedChecks }]
// Ein bereits vorhandenes Ergebnis wird nur ersetzt, wenn der neue Versuch
// mindestens gleich gut ist - sonst verschlechtert eine Wiederholung die
// Rueckmeldung an die Lehrkraft.
export function saveTestResult(testId, { tasks, durationSeconds = null }) {
  const all = loadAll();
  const points = tasks.filter((t) => t.passed).length;
  const maxPoints = tasks.length;
  const entry = {
    points,
    maxPoints,
    percent: maxPoints ? Math.round((points / maxPoints) * 100) : 0,
    completedAt: Date.now(),
    durationSeconds,
    attemptsTotal: tasks.reduce((s, t) => s + (t.attempts || 0), 0),
    tasks,
  };

  const prev = all[testId];
  if (prev && prev.points > points) {
    // Schlechterer Wiederholungsversuch: bestes Ergebnis behalten, aber
    // festhalten, dass erneut geuebt wurde.
    prev.repeats = (prev.repeats || 0) + 1;
    prev.lastAttemptAt = Date.now();
    saveAll(all);
    return prev;
  }

  entry.repeats = prev ? (prev.repeats || 0) + 1 : 0;
  all[testId] = entry;
  saveAll(all);
  return entry;
}

export function resetTestResults() {
  localStorage.removeItem(KEY);
}

// Fuer die Sicherung ueber die Profil-Seite (Export/Import als Datei).
export function exportTestResults() {
  return loadAll();
}

export function importTestResults(data) {
  if (data && typeof data === "object") saveAll(data);
}
