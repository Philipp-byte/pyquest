// Fortschritts-Speicher fuer den DEMO-Modus (localStorage, z. B. GitHub Pages).
// Bietet dieselbe Schnittstelle wie progress-remote.js (Schulmodus) - beide
// werden ueber store.js ausgetauscht, die Views kennen den Unterschied nicht.

import { flattenLessons } from "./content.js";
import { BADGES } from "./badges.js";
import { levelForXp } from "./level-math.js";
import { exportTestResults, importTestResults, resetTestResults } from "./test-results.js";
import { exportIntroState, importIntroState } from "./intro-state.js";
import { exportFiguren, importFiguren, resetFiguren } from "./figuren.js";
import { exportLoesungen, importLoesungen, resetLoesungen } from "./loesungen.js";

const KEY = "pyquest.progress.v1";

const DEFAULT = {
  xp: 0,
  lessons: {}, // lessonId -> { status: "done", stars: 0..3, completedAt }
  badges: {}, // badgeId -> earnedAt (timestamp)
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

let state = load();

export function getXp() {
  return state.xp;
}

export function getLesson(lessonId) {
  return state.lessons[lessonId] ?? { status: "locked", stars: 0 };
}

export function isDone(lessonId) {
  return state.lessons[lessonId]?.status === "done";
}

// Ist eine Lektion freigeschaltet? Die erste immer; danach wenn die
// vorherige Lektion abgeschlossen ist.
export function isUnlocked(curriculum, chapterId, lessonId) {
  const flat = flattenLessons(curriculum);
  const idx = flat.findIndex(
    (f) => f.chapterId === chapterId && f.lessonId === lessonId
  );
  if (idx <= 0) return true;
  const prev = flat[idx - 1];
  return isDone(prev.lessonId);
}

// Schliesst eine Lektion ab, vergibt XP (nur beim ersten Mal), Sterne und
// wertet neue Badges aus. curriculum wird fuer die Badge-Auswertung
// (z. B. "ganzes Kapitel abgeschlossen") benoetigt.
export function completeLesson(lessonId, { xp = 10, stars = 3 } = {}, curriculum = null) {
  const prev = state.lessons[lessonId];
  const firstTime = !prev || prev.status !== "done";
  const bestStars = Math.max(stars, prev?.stars ?? 0);

  state.lessons[lessonId] = {
    status: "done",
    stars: bestStars,
    completedAt: Date.now(),
  };

  const levelBefore = levelForXp(state.xp);
  let gainedXp = 0;
  if (firstTime) {
    gainedXp = xp;
    state.xp += xp;
  }
  const levelAfter = levelForXp(state.xp);

  const newBadges = evaluateBadges(curriculum);

  save(state);
  return {
    firstTime,
    gainedXp,
    stars: bestStars,
    leveledUp: levelAfter > levelBefore,
    level: levelAfter,
    newBadges,
  };
}

// Prueft alle Badges gegen den aktuellen Fortschritt und schaltet neue frei.
// Gibt die Liste der NEU freigeschalteten Badges zurueck.
function evaluateBadges(curriculum) {
  const flat = curriculum ? flattenLessons(curriculum) : [];
  const totalDone = flat.filter((f) => isDone(f.lessonId)).length;
  const perfectCount = flat.filter((f) => (getLesson(f.lessonId).stars || 0) === 3).length;
  const starsTotal = flat.reduce((sum, f) => sum + (getLesson(f.lessonId).stars || 0), 0);
  const chaptersDoneCount = curriculum
    ? curriculum.chapters.filter((c) => c.lessons.every((l) => isDone(l.id))).length
    : 0;

  const ctx = {
    totalDone,
    perfectCount,
    starsTotal,
    chaptersDoneCount,
    level: levelForXp(state.xp),
  };

  const earned = [];
  for (const badge of BADGES) {
    if (state.badges[badge.id]) continue;
    if (badge.check(ctx)) {
      state.badges[badge.id] = Date.now();
      earned.push(badge);
    }
  }
  return earned;
}

export function getBadges() {
  return state.badges;
}

export function resetProgress() {
  state = { ...DEFAULT, lessons: {}, badges: {} };
  save(state);
  resetTestResults();
  // Auch die Figuren stellen sich danach wieder neu vor - sonst faengt man
  // von vorne an, kennt aber schon alle.
  resetFiguren();
  // Auch die eigenen Loesungen - sonst stuenden im Arbeitsblatt noch
  // Antworten zu Aufgaben, die wieder als offen gelten.
  resetLoesungen();
}

// ---------------------------------------------------------------- Export/Import
// Fuer die cache-unabhaengige Sicherung: Der Fortschritt wird als Datei
// exportiert (Download) und spaeter wieder eingelesen (Datei-Auswahl). So bleibt
// er erhalten, auch wenn der Browser geleert wird oder an einem anderen PC
// gearbeitet wird. Es ist kein Server und keine Cloud beteiligt.

export function exportState() {
  return JSON.stringify(
    {
      app: "PyQuest",
      version: 1,
      exportedAt: new Date().toISOString(),
      state,
      // Die Testergebnisse liegen in einem eigenen Speicher (test-results.js),
      // gehoeren aber in dieselbe Sicherungsdatei - sonst waere die
      // Rueckmeldung fuer die Lehrkraft nach einem Geraetewechsel weg.
      tests: exportTestResults(),
      // Damit nach einem Geraetewechsel nicht wieder der Vorspann startet.
      introGesehen: exportIntroState(),
      // Welche Begleitfiguren sich schon vorgestellt haben.
      figuren: exportFiguren(),
      // Die selbst geschriebenen Loesungen fuer das Arbeitsblatt.
      loesungen: exportLoesungen(),
    },
    null,
    2
  );
}

// Liest eine zuvor exportierte Datei ein. Akzeptiert die Wrapper-Form
// ({app, version, state}) genauso wie einen rohen Zustand. Wirft bei
// ungueltigem Inhalt einen Fehler mit verstaendlicher Meldung.
export function importState(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Die Datei ist keine gültige PyQuest-Datei (kein JSON).");
  }
  const incoming = parsed && parsed.state ? parsed.state : parsed;
  if (!incoming || typeof incoming !== "object" || typeof incoming.lessons !== "object") {
    throw new Error("Die Datei enthält keinen gültigen PyQuest-Fortschritt.");
  }
  state = {
    ...DEFAULT,
    xp: Number(incoming.xp) || 0,
    lessons: incoming.lessons || {},
    badges: incoming.badges || {},
  };
  save(state);
  // Testergebnisse mitnehmen, falls die Datei welche enthaelt (aeltere
  // Sicherungen ohne Tests bleiben gueltig).
  if (parsed && parsed.tests) importTestResults(parsed.tests);
  if (parsed && "introGesehen" in parsed) importIntroState(parsed.introGesehen);
  if (parsed && parsed.figuren) importFiguren(parsed.figuren);
  if (parsed && parsed.loesungen) importLoesungen(parsed.loesungen);
  return true;
}
