// Fortschritts-Speicher fuer den DEMO-Modus (localStorage).
// Im spaeteren Schulmodus (Phase M3) wird dieselbe Schnittstelle gegen eine
// Server-API ausgetauscht – die Views bleiben unveraendert.

import { flattenLessons } from "./content.js";
import { updateStreak, DEFAULT_STREAK } from "./streak.js";
import { BADGES } from "./badges.js";

const KEY = "pyquest.progress.v1";

const DEFAULT = {
  xp: 0,
  lessons: {}, // lessonId -> { status: "done", stars: 0..3, completedAt }
  badges: {}, // badgeId -> earnedAt (timestamp)
  streak: { ...DEFAULT_STREAK },
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

// Schliesst eine Lektion ab, vergibt XP (nur beim ersten Mal), Sterne,
// aktualisiert die Streak und wertet neue Badges aus. curriculum wird fuer
// die Badge-Auswertung (z. B. "ganzes Kapitel abgeschlossen") benoetigt.
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

  const streakResult = updateStreak(state.streak);
  state.streak = streakResult.streak;

  const newBadges = evaluateBadges(curriculum);

  save(state);
  return {
    firstTime,
    gainedXp,
    stars: bestStars,
    leveledUp: levelAfter > levelBefore,
    level: levelAfter,
    streak: state.streak,
    streakProtected: streakResult.protected,
    newBadges,
  };
}

// Prueft alle Badges gegen den aktuellen Fortschritt und schaltet neue frei.
// Gibt die Liste der NEU freigeschalteten Badges zurueck.
function evaluateBadges(curriculum) {
  const flat = curriculum ? flattenLessons(curriculum) : [];
  const totalDone = flat.filter((f) => isDone(f.lessonId)).length;
  const perfectCount = flat.filter((f) => (getLesson(f.lessonId).stars || 0) === 3).length;
  const chaptersDoneCount = curriculum
    ? curriculum.chapters.filter((c) => c.lessons.every((l) => isDone(l.id))).length
    : 0;

  const ctx = {
    totalDone,
    perfectCount,
    chaptersDoneCount,
    streak: state.streak,
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

export function hasBadge(badgeId) {
  return Boolean(state.badges[badgeId]);
}

export function getStreak() {
  return state.streak;
}

export function resetProgress() {
  state = { ...DEFAULT, lessons: {}, badges: {}, streak: { ...DEFAULT_STREAK } };
  save(state);
}
