// Profil: XP, Level, Gesamtfortschritt und Badge-Sammlung.
// Im Schulmodus zusaetzlich: Passwort aendern statt Fortschritt zuruecksetzen
// (das Zuruecksetzen macht dort die Lehrkraft, siehe PLAN.md Abschnitt 10).

import { renderHeader, wireHeader } from "../ui.js";
import {
  getXp,
  levelProgress,
  getLesson,
  isDone,
  getBadges,
  resetProgress,
  getBackendMode,
} from "../store.js";
import { changePassword } from "../progress-remote.js";
import { exportState, importState } from "../progress-local.js";
import { flattenLessons } from "../content.js";
import { BADGES } from "../badges.js";

export function renderProfile(app, curriculum) {
  const xp = getXp();
  const { level, ratio, cur, next } = levelProgress(xp);
  const flat = flattenLessons(curriculum);
  const total = flat.length;
  const done = flat.filter((f) => isDone(f.lessonId)).length;
  const stars = flat.reduce((sum, f) => sum + (getLesson(f.lessonId).stars || 0), 0);
  const maxStars = total * 3;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const earnedBadges = getBadges();
  const badgesEarnedCount = Object.keys(earnedBadges).length;
  const remoteMode = getBackendMode() === "remote";

  app.innerHTML = `
    ${renderHeader("profil")}
    <main class="profile">
      <div class="profile__hero">
        <div class="profile__avatar">🐍</div>
        <div>
          <h1>Mein Profil</h1>
          <p class="profile__level">Level ${level} · ${xp} XP</p>
          <div class="xpbar xpbar--wide"><div class="xpbar__fill" style="width:${Math.round(ratio*100)}%"></div></div>
          <p class="profile__hint">Noch ${next - xp} XP bis Level ${level + 1}</p>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><span class="stat__num">${pct}%</span><span class="stat__label">Fortschritt</span></div>
        <div class="stat"><span class="stat__num">${done}/${total}</span><span class="stat__label">Lektionen</span></div>
        <div class="stat"><span class="stat__num">⭐ ${stars}/${maxStars}</span><span class="stat__label">Sterne</span></div>
      </div>

      <section class="badges-section">
        <h2>Abzeichen <span class="badges-section__count">${badgesEarnedCount}/${BADGES.length}</span></h2>
        <div class="badges-grid">
          ${BADGES.map((b) => renderBadge(b, Boolean(earnedBadges[b.id]))).join("")}
        </div>
      </section>

      ${remoteMode ? renderPasswordForm() : `
        <section class="save-section">
          <h2>Fortschritt sichern</h2>
          <p class="save-hint">Speichere deinen Fortschritt als Datei (z. B. auf deinem Netzlaufwerk, in OneDrive oder auf einem USB-Stick) und lade ihn beim nächsten Mal wieder. So bleibt er erhalten – auch wenn der Browser geleert wird oder du an einem anderen PC arbeitest.</p>
          <div class="save-buttons">
            <button class="btn btn--primary btn--export">💾 Fortschritt exportieren</button>
            <button class="btn btn--ghost btn--import">📂 Fortschritt laden</button>
            <input type="file" accept=".json,application/json" class="import-file" hidden aria-hidden="true">
          </div>
          <p class="save-msg" hidden></p>
        </section>

        <div class="report-cta">
          <a class="btn btn--primary" href="#/bericht">📄 Bericht für die Lehrkraft erstellen</a>
        </div>

        <div class="danger">
          <button class="btn btn--ghost btn--reset">Fortschritt zurücksetzen</button>
        </div>
      `}
    </main>
  `;

  if (remoteMode) {
    wirePasswordForm(app);
  } else {
    app.querySelector(".btn--reset").onclick = () => {
      if (confirm("Wirklich den gesamten Fortschritt löschen?")) {
        resetProgress();
        location.hash = "#/";
        location.reload();
      }
    };
    wireSaveSection(app);
  }

  wireHeader(app);
}

function wireSaveSection(app) {
  const msg = app.querySelector(".save-msg");
  const fileInput = app.querySelector(".import-file");

  app.querySelector(".btn--export").onclick = () => {
    const blob = new Blob([exportState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const namePart = (localStorage.getItem("pyquest.studentName") || "")
      .trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    const datum = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pyquest_fortschritt_${namePart ? namePart + "_" : ""}${datum}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showMsg(msg, "Fortschritt heruntergeladen. Bewahre die Datei gut auf!", true);
  };

  app.querySelector(".btn--import").onclick = () => fileInput.click();

  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      importState(text);
      showMsg(msg, "Fortschritt geladen! Die Seite wird neu aufgebaut …", true);
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      showMsg(msg, String(e.message || e), false);
    } finally {
      fileInput.value = "";
    }
  };
}

function showMsg(el, text, ok) {
  el.hidden = false;
  el.className = "save-msg " + (ok ? "save-msg--ok" : "save-msg--error");
  el.textContent = text;
}

function renderBadge(badge, earned) {
  return `
    <div class="badge-chip ${earned ? "badge-chip--earned" : "badge-chip--locked"}" title="${badge.desc}">
      <span class="badge-chip__icon">${earned ? badge.icon : "🔒"}</span>
      <span class="badge-chip__title">${badge.title}</span>
    </div>
  `;
}

function renderPasswordForm() {
  return `
    <section class="password-card">
      <h2>Passwort ändern</h2>
      <form class="password-form">
        <input type="password" name="old" placeholder="Aktuelles Passwort" aria-label="Aktuelles Passwort" autocomplete="current-password" required>
        <input type="password" name="new" placeholder="Neues Passwort (min. 4 Zeichen)" aria-label="Neues Passwort, mindestens 4 Zeichen" autocomplete="new-password" minlength="4" required>
        <button type="submit" class="btn btn--primary">Ändern</button>
        <p class="password-form__msg" hidden></p>
      </form>
    </section>
  `;
}

function wirePasswordForm(app) {
  const form = app.querySelector(".password-form");
  const msg = form.querySelector(".password-form__msg");
  form.onsubmit = async (e) => {
    e.preventDefault();
    msg.hidden = true;
    const fd = new FormData(form);
    try {
      await changePassword(fd.get("old"), fd.get("new"));
      msg.hidden = false;
      msg.className = "password-form__msg password-form__msg--ok";
      msg.textContent = "Passwort geändert.";
      form.reset();
    } catch (err) {
      msg.hidden = false;
      msg.className = "password-form__msg password-form__msg--error";
      msg.textContent = "Das hat nicht geklappt. Ist das aktuelle Passwort richtig?";
    }
  };
}
