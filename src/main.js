// Einstiegspunkt: laedt Inhalte, erkennt Demo- vs. Schulmodus, richtet
// Routen ein, startet die App.
//
// Modus-Erkennung: laeuft die Seite unter einem Flask-Server (Schulmodus),
// existiert /api/ping. Auf GitHub Pages (reines Static Hosting, Demo-Modus)
// gibt es diese Route nicht -> automatischer Fallback auf localStorage,
// ohne Build-Unterscheidung. Siehe PLAN.md Abschnitt 3.

import "./styles.css";
import { loadCurriculum } from "./content.js";
import { route, startRouter } from "./router.js";
import { renderPath } from "./views/path-view.js";
import { renderLesson } from "./views/lesson-view.js";
import { renderProfile } from "./views/profile-view.js";
import { renderLogin } from "./views/login-view.js";
import { renderLeaderboard } from "./views/leaderboard-view.js";
import { renderTeacherDashboard } from "./views/teacher-view.js";
import { renderAdminDashboard } from "./views/admin-view.js";
import { setBackendMode } from "./store.js";
import { whoAmI, loadState } from "./progress-remote.js";
import { api } from "./api.js";
import { applyDefaultIfUnset } from "./sound.js";

const app = document.getElementById("app");
let curriculum = null;

async function detectSchoolMode() {
  try {
    const res = await fetch("/api/ping", { credentials: "same-origin" });
    return res.ok;
  } catch {
    return false;
  }
}

async function boot() {
  try {
    curriculum = await loadCurriculum();
  } catch (e) {
    app.innerHTML = `<div class="boot boot--error">
      <div class="boot__logo">😕</div>
      <p>Die Lerninhalte konnten nicht geladen werden.</p>
      <pre>${String(e.message || e)}</pre>
    </div>`;
    return;
  }

  const schoolMode = await detectSchoolMode();

  if (schoolMode) {
    setBackendMode("remote");
    const me = await whoAmI();
    if (!me) {
      renderLogin(app, { onLoggedIn: enterApp });
      return;
    }
    await enterApp(me);
    return;
  }

  startApp();
}

// Wird sowohl beim direkten Seitenaufruf mit bestehender Sitzung als auch
// direkt nach dem Login-Formular durchlaufen, damit die Rollen-Weiche in
// beiden Faellen greift (nicht nur beim Boot mit vorhandenem Cookie).
async function enterApp(me) {
  if (!me) me = await whoAmI();

  if (me.role === "teacher") {
    await renderTeacherDashboard(app, me);
    return;
  }
  if (me.role === "admin") {
    await renderAdminDashboard(app, me);
    return;
  }

  try {
    const { defaultSoundEnabled } = await api("/api/settings/public");
    applyDefaultIfUnset(defaultSoundEnabled);
  } catch {
    // Keine harte Abhaengigkeit - ohne erreichbare Einstellung bleibt der
    // eingebaute Standard (Sound an) bestehen.
  }

  await loadState();
  startApp();
}

function startApp() {
  route("/", () => renderPath(app, curriculum));
  route("/lesson/:chapter/:lesson", ({ chapter, lesson }) =>
    renderLesson(app, curriculum, chapter, lesson)
  );
  route("/profil", () => renderProfile(app, curriculum));
  route("/rangliste", () => renderLeaderboard(app));

  const resolve = startRouter(() => renderPath(app, curriculum));
  resolve();
}

boot();
