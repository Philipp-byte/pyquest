// Kleine UI-Helfer, die von mehreren Views genutzt werden.

import { levelProgress, getXp } from "./progress.js";

// Erzeugt ein Element aus HTML-String.
export function html(str) {
  const t = document.createElement("template");
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}

// Kopfleiste mit Level, XP-Balken und Navigation.
export function renderHeader(active = "path") {
  const xp = getXp();
  const { level, ratio, next, cur } = levelProgress(xp);
  const pct = Math.round(ratio * 100);

  return `
    <header class="topbar">
      <a class="topbar__brand" href="#/">🐍 Py<span>Quest</span></a>
      <div class="topbar__level">
        <span class="badge-level">Level ${level}</span>
        <div class="xpbar" title="${xp - cur} / ${next - cur} XP bis Level ${level + 1}">
          <div class="xpbar__fill" style="width:${pct}%"></div>
        </div>
        <span class="xp-count">${xp} XP</span>
      </div>
      <nav class="topbar__nav">
        <a href="#/" class="${active === "path" ? "is-active" : ""}">Lernpfad</a>
        <a href="#/profil" class="${active === "profil" ? "is-active" : ""}">Profil</a>
      </nav>
    </header>
  `;
}

export function starRow(count) {
  return [0, 1, 2]
    .map((i) => `<span class="star ${i < count ? "star--on" : ""}">★</span>`)
    .join("");
}
