// Fortschritts-Speicher fuer den DEMO-Modus (localStorage, z. B. GitHub Pages).
// Bietet dieselbe Schnittstelle wie progress-remote.js (Schulmodus) - beide
// werden ueber store.js ausgetauscht, die Views kennen den Unterschied nicht.

import { flattenLessons } from "./content.js";
import { updateStreak, DEFAULT_STREAK } from "./streak.js";
import { BADGES } from "./badges.js";
import { levelForXp } from "./level-math.js";

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

export function getStreak() {
  return state.streak;
}

export function resetProgress() {
  state = { ...DEFAULT, lessons: {}, badges: {}, streak: { ...DEFAULT_STREAK } };
  save(state);
}
