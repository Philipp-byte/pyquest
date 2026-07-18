// Lernpfad: Kapitel als Abschnitte, Lektionen als Knoten auf einem Pfad
// (Duolingo-artige Landkarte). Zeigt Fortschritt, Sterne und Sperren.

import { renderHeader, starRow, wireHeader } from "../ui.js";
import { getLesson, isDone, isUnlocked } from "../store.js";

export function renderPath(app, curriculum) {
  const chaptersHtml = curriculum.chapters
    .map((chapter) => renderChapter(curriculum, chapter))
    .join("");

  app.innerHTML = `
    ${renderHeader("path")}
    <main class="path">
      <div class="path__intro">
        <h1>${curriculum.title}</h1>
        <p>Arbeite dich Lektion für Lektion nach oben. Schließe eine Lektion ab, um die nächste freizuschalten.</p>
      </div>
      ${chaptersHtml}
    </main>
  `;
  wireHeader(app);
}

function renderChapter(curriculum, chapter) {
  const total = chapter.lessons.length;
  const doneCount = chapter.lessons.filter((l) => isDone(l.id)).length;
  const pct = Math.round((doneCount / total) * 100);

  const nodes = chapter.lessons
    .map((lesson, i) => {
      const done = isDone(lesson.id);
      const unlocked = isUnlocked(curriculum, chapter.id, lesson.id);
      const stars = getLesson(lesson.id).stars ?? 0;
      const state = done ? "done" : unlocked ? "open" : "locked";
      const side = i % 2 === 0 ? "left" : "right";

      const inner = done ? "✓" : unlocked ? (lesson.icon ?? "●") : "🔒";
      const href = unlocked ? `#/lesson/${chapter.id}/${lesson.id}` : null;

      const node = `
        <div class="node node--${state} node--${side}">
          <div class="node__dot">${inner}</div>
          <div class="node__label">
            <span class="node__title">${lesson.title}</span>
            ${done ? `<span class="node__stars">${starRow(stars)}</span>` : ""}
          </div>
        </div>`;

      return href
        ? `<a class="node-link" href="${href}">${node}</a>`
        : `<div class="node-link node-link--disabled">${node}</div>`;
    })
    .join("");

  return `
    <section class="chapter" style="--chapter-color:${chapter.color || "#22c55e"}">
      <div class="chapter__header">
        <div class="chapter__icon">${chapter.icon || "📘"}</div>
        <div class="chapter__meta">
          <h2>${chapter.title}</h2>
          <p>${chapter.description || ""}</p>
          <div class="chapter__bar"><div style="width:${pct}%"></div></div>
          <span class="chapter__count">${doneCount} / ${total} Lektionen</span>
        </div>
      </div>
      <div class="chapter__nodes">${nodes}</div>
    </section>
  `;
}
