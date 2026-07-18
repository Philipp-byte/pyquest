// Profil: XP, Level, Gesamtfortschritt und gesammelte Sterne.
// Badges/Streak folgen in Phase M2.

import { renderHeader, starRow } from "../ui.js";
import { getXp, levelProgress, getLesson, isDone } from "../progress.js";
import { flattenLessons } from "../content.js";
import { resetProgress } from "../progress.js";

export function renderProfile(app, curriculum) {
  const xp = getXp();
  const { level, ratio, cur, next } = levelProgress(xp);
  const flat = flattenLessons(curriculum);
  const total = flat.length;
  const done = flat.filter((f) => isDone(f.lessonId)).length;
  const stars = flat.reduce((sum, f) => sum + (getLesson(f.lessonId).stars || 0), 0);
  const maxStars = total * 3;
  const pct = total ? Math.round((done / total) * 100) : 0;

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

      <div class="danger">
        <button class="btn btn--ghost btn--reset">Fortschritt zurücksetzen</button>
      </div>
    </main>
  `;

  app.querySelector(".btn--reset").onclick = () => {
    if (confirm("Wirklich den gesamten Fortschritt löschen?")) {
      resetProgress();
      location.hash = "#/";
      location.reload();
    }
  };
}
