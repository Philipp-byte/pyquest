// Waehlt zur Laufzeit zwischen lokalem Speicher (Demo-Modus, z. B. GitHub
// Pages) und Server-gestuetztem Speicher (Schulmodus). Beide Backends bieten
// dieselbe Funktions-Schnittstelle (siehe progress-local.js / progress-remote.js),
// Views importieren nur von hier und muessen den Unterschied nie kennen.

import * as local from "./progress-local.js";
import * as remote from "./progress-remote.js";
import { istLehrerModus } from "./lehrer.js";

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
// Im Lehrer-Modus ist alles offen - egal welches Backend. Der Fortschritt
// selbst bleibt unangetastet: Es wird nichts als "erledigt" markiert, nur
// die Sperre uebersprungen.
export const isUnlocked = (...a) => istLehrerModus() || backend.isUnlocked(...a);
export const completeLesson = (...a) => backend.completeLesson(...a);
export const getBadges = (...a) => backend.getBadges(...a);
export const resetProgress = (...a) => backend.resetProgress(...a);
