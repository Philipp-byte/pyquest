// Taegliche Lernserie (Streak). Ein Tag Pause pro Kalenderwoche wird per
// "Streak-Schutz" verziehen (siehe PLAN.md Abschnitt 8) - schulfreundlich,
// falls mal ein Tag keine Schule/kein Lernen stattfindet.

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetweenKeys(a, b) {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((db - da) / 86400000);
}

function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

export const DEFAULT_STREAK = {
  current: 0,
  best: 0,
  lastActiveDate: null,
  lastFreezeWeek: null,
};

// Aktualisiert die Streak beim Abschluss einer Lektion (einmal pro Tag wirksam).
// Gibt { streak, incremented, protected } zurueck.
export function updateStreak(streak, now = new Date()) {
  const today = localDateKey(now);
  const s = { ...DEFAULT_STREAK, ...streak };

  if (s.lastActiveDate === today) {
    return { streak: s, incremented: false, protected: false };
  }

  const week = isoWeekKey(now);
  let protectedStreak = false;

  if (!s.lastActiveDate) {
    s.current = 1;
  } else {
    const gap = daysBetweenKeys(s.lastActiveDate, today);
    if (gap === 1) {
      s.current += 1;
    } else if (gap === 2 && s.lastFreezeWeek !== week) {
      // Ein Tag wurde verpasst, aber der woechentliche Schutz greift.
      s.current += 1;
      s.lastFreezeWeek = week;
      protectedStreak = true;
    } else {
      s.current = 1;
    }
  }

  s.best = Math.max(s.best, s.current);
  s.lastActiveDate = today;
  return { streak: s, incremented: true, protected: protectedStreak };
}
