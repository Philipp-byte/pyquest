// Fortschritts-Speicher fuer den DEMO-Modus (localStorage).
// Im spaeteren Schulmodus (Phase M3) wird dieselbe Schnittstelle gegen eine
// Server-API ausgetauscht – die Views bleiben unveraendert.

import { flattenLessons } from "./content.js";

const KEY = "pyquest.progress.v1";

const DEFAULT = {
  xp: 0,
  lessons: {}, // lessonId -> { status: "done", stars: 0..3, completedAt }
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

export function getState() {
  return state;
}

export function getXp() {
  return state.xp;
}

// Level-Kurve: Level n benoetigt insgesamt 100 * n^1.5 XP.
export function levelForXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.5));
}

// Fortschritt innerhalb des aktuellen Levels (0..1) fuer den Balken.
export function levelProgress(xp) {
  const level = levelForXp(xp);
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, cur, next, ratio: (xp - cur) / (next - cur) };
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

// Schliesst eine Lektion ab, vergibt XP (nur beim ersten Mal) und Sterne.
// Gibt Info zurueck, ob es das erste Mal war und wie viel XP dazukamen.
export function completeLesson(lessonId, { xp = 10, stars = 3 } = {}) {
  const prev = state.lessons[lessonId];
  const firstTime = !prev || prev.status !== "done";
  const bestStars = Math.max(stars, prev?.stars ?? 0);

  state.lessons[lessonId] = {
    status: "done",
    stars: bestStars,
    completedAt: Date.now(),
  };

  let gainedXp = 0;
  if (firstTime) {
    gainedXp = xp;
    state.xp += xp;
  }
  save(state);
  return { firstTime, gainedXp, stars: bestStars };
}

export function resetProgress() {
  state = { ...DEFAULT, lessons: {} };
  save(state);
}
