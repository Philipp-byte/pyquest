// Kleine UI-Helfer, die von mehreren Views genutzt werden.

import { levelProgress, getXp, getBackendMode } from "./store.js";
import { isMuted, toggleMuted } from "./sound.js";
import { logout, isLeaderboardEnabled } from "./progress-remote.js";

// Erzeugt ein Element aus HTML-String.
export function html(str) {
  const t = document.createElement("template");
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}

// Kopfleiste mit Level, XP-Balken, Sound-Schalter und Navigation.
export function renderHeader(active = "path") {
  const xp = getXp();
  const { level, ratio, next, cur } = levelProgress(xp);
  const pct = Math.round(ratio * 100);
  const muted = isMuted();
  const remoteMode = getBackendMode() === "remote";

  return `
    <header class="topbar">
      <a class="topbar__brand" href="#/">🐍 Py<span>Quest</span></a>
      <div class="topbar__level">
        <span class="badge-level">Level ${level}</span>
        <div class="xpbar" title="${xp - cur} / ${next - cur} XP bis Level ${level + 1}">
          <div class="xpbar__fill" style="width:${pct}%"></div>
        </div>
        <span class="xp-count" data-value="${xp}">${xp} XP</span>
      </div>
      <button class="sound-toggle" title="${muted ? "Sound an" : "Sound aus"}">${muted ? "🔇" : "🔊"}</button>
      ${remoteMode ? `<button class="logout-btn" title="Abmelden">🚪</button>` : ""}
      <nav class="topbar__nav">
        <a href="#/" class="${active === "path" ? "is-active" : ""}">Lernpfad</a>
        ${remoteMode && isLeaderboardEnabled() ? `<a href="#/rangliste" class="${active === "rangliste" ? "is-active" : ""}">Rangliste</a>` : ""}
        <a href="#/profil" class="${active === "profil" ? "is-active" : ""}">Profil</a>
      </nav>
    </header>
  `;
}

// Muss nach dem Einsetzen von renderHeader() ins DOM aufgerufen werden,
// damit Sound-Schalter und Abmelde-Button funktionieren.
export function wireHeader(root) {
  const soundBtn = root.querySelector(".sound-toggle");
  if (soundBtn) {
    soundBtn.onclick = () => {
      const muted = toggleMuted();
      soundBtn.textContent = muted ? "🔇" : "🔊";
      soundBtn.title = muted ? "Sound an" : "Sound aus";
    };
  }

  const logoutBtn = root.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await logout();
      location.reload();
    };
  }
}

export function starRow(count) {
  return [0, 1, 2]
    .map((i) => `<span class="star ${i < count ? "star--on" : ""}">★</span>`)
    .join("");
}

// Animiert eine Zahl in einem Element von ihrem aktuellen data-value zu "to".
export function animateNumber(el, to, { suffix = " XP", duration = 700 } = {}) {
  if (!el) return;
  const from = Number(el.dataset.value || 0);
  if (from === to) return;
  const start = performance.now();

  function frame(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = Math.round(from + (to - from) * eased);
    el.textContent = `${val}${suffix}`;
    if (p < 1) requestAnimationFrame(frame);
    else el.dataset.value = to;
  }
  requestAnimationFrame(frame);
}
