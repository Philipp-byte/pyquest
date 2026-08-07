// Einstiegspunkt: laedt Inhalte, erkennt Demo- vs. Schulmodus, richtet
// Routen ein, startet die App.
//
// Modus-Erkennung: laeuft die Seite unter einem Flask-Server (Schulmodus),
// existiert /api/ping. Auf GitHub Pages (reines Static Hosting, Demo-Modus)
// gibt es diese Route nicht -> automatischer Fallback auf localStorage,
// ohne Build-Unterscheidung. Siehe PLAN.md Abschnitt 3.
//
// Login-/Lehrer-/Admin-/Rangliste-Views werden nur bei Bedarf per
// dynamischem import() geladen (nicht im Haupt-Bundle) - die meisten
// Aufrufe sind Demo-Modus oder Schueler:innen, die diese Views nie sehen.

import "./styles.css";
import { loadCurriculum } from "./content.js";
import { route, startRouter } from "./router.js";
import { renderPath, renderChapterDetail } from "./views/path-view.js";
import { renderProfile } from "./views/profile-view.js";
import { setBackendMode } from "./store.js";
import { whoAmI, loadState } from "./progress-remote.js";
import { api } from "./api.js";
import { applyDefaultIfUnset } from "./sound.js";
import { hasSeenIntro } from "./intro-state.js";

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
  // Beides gleichzeitig starten statt nacheinander: die Modus-Erkennung ist
  // im Demo-Modus eine 404-Rundreise, die sonst die Ladezeit verlaengert.
  // detectSchoolMode() faengt eigene Fehler ab und wirft nie.
  const curriculumPromise = loadCurriculum();
  const schoolModePromise = detectSchoolMode();

  try {
    curriculum = await curriculumPromise;
  } catch (e) {
    app.innerHTML = `<div class="boot boot--error">
      <div class="boot__logo">😕</div>
      <p>Die Lerninhalte konnten nicht geladen werden.</p>
      <pre>${String(e.message || e)}</pre>
    </div>`;
    return;
  }

  const schoolMode = await schoolModePromise;

  if (schoolMode) {
    setBackendMode("remote");
    const me = await whoAmI();
    if (!me) {
      const { renderLogin } = await import("./views/login-view.js");
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
    const { renderTeacherDashboard } = await import("./views/teacher-view.js");
    await renderTeacherDashboard(app, me);
    return;
  }
  if (me.role === "admin") {
    const { renderAdminDashboard } = await import("./views/admin-view.js");
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
  route("/chapter/:chapterId", ({ chapterId }) =>
    renderChapterDetail(app, curriculum, chapterId)
  );
  // Die Lektionsansicht bringt den CodeMirror-Editor mit (der groesste
  // Brocken im Bundle). Sie wird erst geladen, wenn wirklich eine Lektion
  // geoeffnet wird - die Startseite bleibt dadurch deutlich schneller.
  route("/lesson/:chapter/:lesson", async ({ chapter, lesson }) => {
    const { renderLesson } = await import("./views/lesson-view.js");
    renderLesson(app, curriculum, chapter, lesson);
  });
  // Vorspann - wird nachgeladen, weil er nur selten gebraucht wird.
  route("/intro", async () => {
    const { renderIntro } = await import("./views/intro-view.js");
    renderIntro(app);
  });
  // Kapitel-Test (nach je zwei Kapiteln) - eigene Ansicht, ebenfalls
  // nachgeladen, weil sie den Editor mitbringt.
  route("/test/:testId", async ({ testId }) => {
    const { renderTest } = await import("./views/test-view.js");
    renderTest(app, curriculum, testId);
  });
  route("/profil", () => renderProfile(app, curriculum));
  route("/bericht", async () => {
    const { renderReport } = await import("./views/report-view.js");
    renderReport(app, curriculum);
  });
  route("/rangliste", async () => {
    const { renderLeaderboard } = await import("./views/leaderboard-view.js");
    renderLeaderboard(app);
  });

  const resolve = startRouter(() => renderPath(app, curriculum));

  // Beim allerersten Besuch laeuft zuerst der Vorspann - danach nie wieder
  // von allein. Nur, wenn gerade keine bestimmte Seite aufgerufen wurde
  // (ein geteilter Link auf eine Lektion soll nicht im Intro landen).
  const ohneZiel = !location.hash || location.hash === "#/" || location.hash === "#";
  if (ohneZiel && !hasSeenIntro()) {
    location.hash = "#/intro";
  }

  resolve();
}

boot();
