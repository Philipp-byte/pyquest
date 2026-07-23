// Badge-Katalog. Bewusst generisch gehalten (keine festen Lektions-/Kapitel-IDs),
// damit neue Kapitel/Lektionen (siehe content/) automatisch mitzaehlen.
//
// Bewusst KEINE Badges, die taegliches/aufeinanderfolgendes Lernen belohnen
// (kein Streak-System): SuS koennen Python nur im Unterricht lernen, nicht
// jeden Tag - ein "X Tage in Folge"-Abzeichen waere fuer sie nie erreichbar.
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
    id: "kapitel-champion",
    icon: "🏆",
    title: "Kapitel-Champion",
    desc: "Schließe 3 ganze Kapitel ab.",
    check: (ctx) => ctx.chaptersDoneCount >= 3,
  },
  {
    id: "level-5",
    icon: "⭐",
    title: "Level 5",
    desc: "Erreiche Level 5.",
    check: (ctx) => ctx.level >= 5,
  },
  {
    id: "highscore",
    icon: "👑",
    title: "Highscore",
    desc: "Erreiche Level 10.",
    check: (ctx) => ctx.level >= 10,
  },
  {
    id: "sternensammler",
    icon: "✨",
    title: "Sternensammler",
    desc: "Sammle insgesamt 20 Sterne.",
    check: (ctx) => ctx.starsTotal >= 20,
  },
];
