// Reine Level/XP-Formeln, unabhaengig vom Speicher-Backend (lokal oder Server).
// Level n benoetigt insgesamt 100 * n^1.5 XP. Wird von progress-local.js und
// progress-remote.js gleichermaßen genutzt; server/progress_logic.py spiegelt
// dieselbe Formel in Python.

export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.5));
}

export function levelForXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

// Fortschritt innerhalb des aktuellen Levels (0..1) fuer den Balken.
export function levelProgress(xp) {
  const level = levelForXp(xp);
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, cur, next, ratio: (xp - cur) / (next - cur) };
}
