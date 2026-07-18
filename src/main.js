// Einstiegspunkt: laedt Inhalte, richtet Routen ein, startet die App.

import "./styles.css";
import { loadCurriculum } from "./content.js";
import { route, startRouter } from "./router.js";
import { renderPath } from "./views/path-view.js";
import { renderLesson } from "./views/lesson-view.js";
import { renderProfile } from "./views/profile-view.js";

const app = document.getElementById("app");
let curriculum = null;

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

  route("/", () => renderPath(app, curriculum));
  route("/lesson/:chapter/:lesson", ({ chapter, lesson }) =>
    renderLesson(app, curriculum, chapter, lesson)
  );
  route("/profil", () => renderProfile(app, curriculum));

  const resolve = startRouter(() => renderPath(app, curriculum));
  resolve();
}

boot();
