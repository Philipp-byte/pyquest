// Kleine UI-Helfer, die von mehreren Views genutzt werden.

import { levelProgress, getXp, getBackendMode } from "./store.js";
import { isMuted, toggleMuted } from "./sound.js";
import { logout, isLeaderboardEnabled } from "./progress-remote.js";
import { istLehrerModus, lehrerModusAus, anmelden } from "./lehrer.js";

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
      <button class="lehrer-btn${istLehrerModus() ? " lehrer-btn--an" : ""}" title="${istLehrerModus() ? "Lehrer-Modus ist an – klicken zum Beenden" : "Lehrer-Anmeldung"}">
        ${istLehrerModus() ? "🔓 Lehrer" : "Lehrer"}
      </button>
      <button class="intro-replay" title="Vorspann nochmal ansehen" aria-label="Vorspann nochmal ansehen">🎬</button>
      <button class="sound-toggle" title="${muted ? "Sound an" : "Sound aus"}" aria-label="${muted ? "Sound an" : "Sound aus"}">${muted ? "🔇" : "🔊"}</button>
      ${remoteMode ? `<button class="logout-btn" title="Abmelden" aria-label="Abmelden">🚪</button>` : ""}
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
      soundBtn.setAttribute("aria-label", muted ? "Sound an" : "Sound aus");
    };
  }

  const introBtn = root.querySelector(".intro-replay");
  if (introBtn) {
    introBtn.onclick = () => {
      location.hash = "#/intro";
    };
  }

  const logoutBtn = root.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await logout();
      location.reload();
    };
  }

  const lehrerBtn = root.querySelector(".lehrer-btn");
  if (lehrerBtn) {
    lehrerBtn.onclick = () => {
      if (istLehrerModus()) {
        lehrerModusAus();
        location.reload();
      } else {
        zeigeLehrerAnmeldung();
      }
    };
  }
}

// Anmeldemaske fuer den Lehrer-Modus. Bewusst schlicht: ein Feld, ein Knopf.
function zeigeLehrerAnmeldung() {
  document.querySelector(".lehrer-dialog")?.remove();

  const dialog = html(`
    <div class="lehrer-dialog" role="dialog" aria-modal="true" aria-label="Lehrer-Anmeldung">
      <div class="lehrer-dialog__box">
        <h2>Lehrer-Anmeldung</h2>
        <p>Mit dem Passwort werden <strong>alle Lektionen, Tests und Arbeitsblätter</strong> freigeschaltet – zum Vorführen im Unterricht. Der Lernstand der Klasse bleibt unverändert.</p>
        <label class="lehrer-dialog__label">
          Passwort
          <input type="password" class="lehrer-dialog__input" autocomplete="current-password" placeholder="Passwort eingeben">
        </label>
        <p class="lehrer-dialog__fehler" hidden></p>
        <div class="lehrer-dialog__knoepfe">
          <button class="btn btn--ghost lehrer-dialog__abbrechen">Abbrechen</button>
          <button class="btn btn--primary lehrer-dialog__ok">Freischalten</button>
        </div>
      </div>
    </div>
  `);
  document.body.append(dialog);

  const feld = dialog.querySelector(".lehrer-dialog__input");
  const fehler = dialog.querySelector(".lehrer-dialog__fehler");
  const okBtn = dialog.querySelector(".lehrer-dialog__ok");
  feld.focus();

  const schliessen = () => dialog.remove();
  dialog.querySelector(".lehrer-dialog__abbrechen").onclick = schliessen;
  // Klick auf den dunklen Hintergrund schliesst ebenfalls.
  dialog.onclick = (e) => { if (e.target === dialog) schliessen(); };
  dialog.addEventListener("keydown", (e) => { if (e.key === "Escape") schliessen(); });
  feld.addEventListener("keydown", (e) => { if (e.key === "Enter") okBtn.click(); });

  okBtn.onclick = async () => {
    okBtn.disabled = true;
    fehler.hidden = true;
    try {
      if (await anmelden(feld.value)) {
        location.reload();
        return;
      }
      fehler.textContent = "Das Passwort stimmt nicht.";
    } catch (err) {
      fehler.textContent = err.message;
    }
    fehler.hidden = false;
    feld.select();
    okBtn.disabled = false;
  };
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
