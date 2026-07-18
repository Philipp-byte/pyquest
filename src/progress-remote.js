// Fortschritts-Speicher fuer den SCHULMODUS: dieselbe Schnittstelle wie
// progress-local.js, aber Server-gestuetzt (Flask + SQLite). Nach dem Login
// wird der komplette Zustand einmal geladen (loadState) und danach synchron
// aus dem Cache gelesen - die Views merken den Unterschied nicht.
//
// Datenschutz: der Server kennt nur Pseudonym + Fortschritt, siehe
// PLAN.md Abschnitt 2. Es wird kein Schuelercode an den Server geschickt.

import { flattenLessons } from "./content.js";

let state = {
  xp: 0,
  lessons: {},
  badges: {},
  streak: { current: 0, best: 0, lastActiveDate: null, lastFreezeWeek: null },
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Serverfehler (${res.status})`);
  }
  return res.json();
}

export async function whoAmI() {
  try {
    return await api("/api/me");
  } catch {
    return null;
  }
}

export async function login(pseudonym, password) {
  const me = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ pseudonym, password }),
  });
  await loadState();
  return me;
}

export async function logout() {
  await api("/api/auth/logout", { method: "POST" });
  state = { xp: 0, lessons: {}, badges: {}, streak: { current: 0, best: 0, lastActiveDate: null, lastFreezeWeek: null } };
}

export async function changePassword(oldPassword, newPassword) {
  return api("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

export async function loadState() {
  state = await api("/api/progress/state");
}

export function getXp() {
  return state.xp;
}

export function getLesson(lessonId) {
  return state.lessons[lessonId] ?? { status: "locked", stars: 0 };
}

export function isDone(lessonId) {
  return state.lessons[lessonId]?.status === "done";
}

export function isUnlocked(curriculum, chapterId, lessonId) {
  const flat = flattenLessons(curriculum);
  const idx = flat.findIndex(
    (f) => f.chapterId === chapterId && f.lessonId === lessonId
  );
  if (idx <= 0) return true;
  return isDone(flat[idx - 1].lessonId);
}

// Schickt das Ergebnis an den Server (der ist die einzige Quelle der
// Wahrheit fuer XP/Streak/Badges) und aktualisiert danach den lokalen Cache
// mit der autoritativen Antwort.
export async function completeLesson(lessonId, { xp = 10, stars = 3 } = {}) {
  const result = await api("/api/progress/complete-lesson", {
    method: "POST",
    body: JSON.stringify({ lessonId, xp, stars }),
  });

  if (result.firstTime) state.xp += result.gainedXp;
  state.lessons[lessonId] = {
    status: "done",
    stars: result.stars,
    completedAt: Date.now(),
  };
  state.streak = result.streak;
  for (const b of result.newBadges) state.badges[b.id] = Date.now();

  return result;
}

export function getBadges() {
  return state.badges;
}

export function getStreak() {
  return state.streak;
}

// Im Schulmodus setzt sich niemand selbst zurueck - das macht die Lehrkraft
// (Klassenverwaltung, Phase M4). Diese Funktion existiert nur, damit die
// Schnittstelle zu progress-local.js identisch bleibt.
export async function resetProgress() {
  throw new Error("Im Schulmodus kann der Fortschritt nicht selbst zurückgesetzt werden.");
}
