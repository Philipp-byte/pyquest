// Waehlt zur Laufzeit zwischen lokalem Speicher (Demo-Modus, z. B. GitHub
// Pages) und Server-gestuetztem Speicher (Schulmodus). Beide Backends bieten
// dieselbe Funktions-Schnittstelle (siehe progress-local.js / progress-remote.js),
// Views importieren nur von hier und muessen den Unterschied nie kennen.

import * as local from "./progress-local.js";
import * as remote from "./progress-remote.js";

export { levelForXp, xpForLevel, levelProgress } from "./level-math.js";

let backend = local;

export function setBackendMode(mode) {
  backend = mode === "remote" ? remote : local;
}

export function getBackendMode() {
  return backend === remote ? "remote" : "local";
}

export const getXp = (...a) => backend.getXp(...a);
export const getLesson = (...a) => backend.getLesson(...a);
export const isDone = (...a) => backend.isDone(...a);
export const isUnlocked = (...a) => backend.isUnlocked(...a);
export const completeLesson = (...a) => backend.completeLesson(...a);
export const getBadges = (...a) => backend.getBadges(...a);
export const getStreak = (...a) => backend.getStreak(...a);
export const resetProgress = (...a) => backend.resetProgress(...a);
