// Badge-Katalog. Bewusst generisch gehalten (keine festen Lektions-/Kapitel-IDs),
// damit neue Kapitel/Lektionen (siehe content/) automatisch mitzaehlen.
// Erweiterbar auf den vollen Katalog aus PLAN.md Abschnitt 13.

export const BADGES = [
  {
    id: "erste-schritte",
    icon: "🎯",
    title: "Erste Schritte",
    desc: "Schließe deine erste Lektion ab.",
    check: (ctx) => ctx.totalDone >= 1,
  },
  {
    id: "fleissig-5",
    icon: "📚",
    title: "Fleißig",
    desc: "Schließe 5 Lektionen ab.",
    check: (ctx) => ctx.totalDone >= 5,
  },
  {
    id: "buecherwurm-10",
    icon: "🎓",
    title: "Bücherwurm",
    desc: "Schließe 10 Lektionen ab.",
    check: (ctx) => ctx.totalDone >= 10,
  },
  {
    id: "kein-tipp",
    icon: "🧠",
    title: "Ohne Tipps",
    desc: "Schließe eine Lektion mit 3 Sternen ab (keine Fehler, keine Tipps).",
    check: (ctx) => ctx.perfectCount >= 1,
  },
  {
    id: "perfektionist-5",
    icon: "🌟",
    title: "Perfektionist",
    desc: "Hol dir 3 Sterne bei 5 Lektionen.",
    check: (ctx) => ctx.perfectCount >= 5,
  },
  {
    id: "kapitel-meister",
    icon: "🚀",
    title: "Kapitel-Meister",
    desc: "Schließe ein ganzes Kapitel ab.",
    check: (ctx) => ctx.chaptersDoneCount >= 1,
  },
  {
    id: "streak-3",
    icon: "🔥",
    title: "Drei Tage dran",
    desc: "Lerne 3 Tage in Folge.",
    check: (ctx) => ctx.streak.best >= 3,
  },
  {
    id: "streak-7",
    icon: "🔥",
    title: "Eine Woche stark",
    desc: "Lerne 7 Tage in Folge.",
    check: (ctx) => ctx.streak.best >= 7,
  },
  {
    id: "level-5",
    icon: "⭐",
    title: "Level 5",
    desc: "Erreiche Level 5.",
    check: (ctx) => ctx.level >= 5,
  },
];
