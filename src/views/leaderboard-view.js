// Rangliste (optional, pro Klasse von der Lehrkraft ein-/ausschaltbar).
// Nur im Schulmodus relevant - zeigt Pseudonyme + XP innerhalb der eigenen
// Klasse. Siehe PLAN.md Abschnitt 8.

import { renderHeader, wireHeader } from "../ui.js";
import { api } from "../api.js";

export async function renderLeaderboard(app) {
  app.innerHTML = `${renderHeader("rangliste")}<main class="leaderboard"><p class="empty-hint">Lädt…</p></main>`;
  wireHeader(app);

  const data = await api("/api/progress/leaderboard");
  const main = app.querySelector("main");

  if (!data.enabled) {
    main.innerHTML = `<p class="empty-hint">Für deine Klasse ist keine Rangliste aktiviert.</p>`;
    return;
  }

  main.innerHTML = `
    <h1>🏆 Rangliste</h1>
    <ol class="leaderboard__list">
      ${data.entries
        .map(
          (e, i) => `
        <li class="leaderboard__row ${e.isMe ? "leaderboard__row--me" : ""}">
          <span class="leaderboard__rank">${i + 1}</span>
          <span class="leaderboard__name">${escapeHtml(e.pseudonym)}${e.isMe ? " (du)" : ""}</span>
          <span class="leaderboard__level">Level ${e.level}</span>
          <span class="leaderboard__xp">${e.xp} XP</span>
        </li>`
        )
        .join("")}
    </ol>
  `;
}

function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
