// Kapitel-Uebersicht: Kacheln mit den Hauptueberschriften (Variablen,
// Datentypen, ...). Klick auf eine Kachel oeffnet die Lektionen-Ansicht
// dieses Kapitels (siehe renderChapterDetail).

import { renderHeader, starRow, wireHeader } from "../ui.js";
import { getLesson, isDone, isUnlocked } from "../store.js";
import { testAfterChapter } from "../content.js";
import { getTestResult } from "../test-results.js";

const WORKSHEET_MIN_STARS = 2;
const WORKSHEET_BASE = `${import.meta.env.BASE_URL}worksheets/`;

// Das Arbeitsblatt eines Kapitels ist erst freigeschaltet, wenn ALLE
// Lektionen abgeschlossen sind UND jede davon mindestens WORKSHEET_MIN_STARS
// Sterne hat (nicht nur irgendwann "done" mit wenig Muehe).
function isWorksheetUnlocked(chapter) {
  return chapter.lessons.every(
    (l) => isDone(l.id) && (getLesson(l.id).stars ?? 0) >= WORKSHEET_MIN_STARS
  );
}

export function renderPath(app, curriculum) {
  // Nach jedem Kapitel, auf das ein Test folgt, wird zusaetzlich eine
  // Test-Kachel eingeschoben.
  const cards = curriculum.chapters
    .map((chapter) => {
      const card = renderChapterCard(curriculum, chapter);
      const test = testAfterChapter(curriculum, chapter.id);
      return test ? card + renderTestCard(curriculum, test) : card;
    })
    .join("");

  app.innerHTML = `
    ${renderHeader("path")}
    <main class="path path--overview">
      <div class="path__intro">
        <h1>${curriculum.title}</h1>
        <p>Wähle ein Kapitel aus, um seine Lektionen zu sehen.</p>
      </div>
      <div class="chapter-overview">${cards}</div>
    </main>
  `;
  wireHeader(app);
}

function renderChapterCard(curriculum, chapter) {
  const total = chapter.lessons.length;
  const doneCount = chapter.lessons.filter((l) => isDone(l.id)).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const unlocked = isUnlocked(curriculum, chapter.id, chapter.lessons[0].id);

  const inner = `
    <div class="chapter-card__icon">${unlocked ? (chapter.icon || "📘") : "🔒"}</div>
    <div class="chapter-card__body">
      <h2>${chapter.title}</h2>
      <p>${chapter.description || ""}</p>
      <div class="chapter__bar"><div style="width:${pct}%"></div></div>
      <span class="chapter__count">${doneCount} / ${total} Lektionen</span>
    </div>
  `;

  return unlocked
    ? `<a class="chapter-card" style="--chapter-color:${chapter.color || "#22c55e"}" href="#/chapter/${chapter.id}">${inner}</a>`
    : `<div class="chapter-card chapter-card--locked" style="--chapter-color:${chapter.color || "#22c55e"}">${inner}</div>`;
}

// Kachel fuer einen Kapitel-Test. Freigeschaltet, sobald das Kapitel davor
// vollstaendig abgeschlossen ist - Sterne spielen hier keine Rolle, der Test
// soll ja gerade zeigen, was wirklich sitzt.
function renderTestCard(curriculum, test) {
  const chapter = curriculum.chapters.find((c) => c.id === test.afterChapter);
  const unlocked = chapter ? chapter.lessons.every((l) => isDone(l.id)) : false;
  const result = getTestResult(test.id);

  const status = result
    ? `<span class="test-card__score">${result.points} / ${result.maxPoints} Aufgaben gelöst</span>`
    : unlocked
      ? `<span class="test-card__open">Bereit – jetzt schreiben</span>`
      : `<span class="test-card__locked">Schließe „${escapeHtml(chapter ? chapter.title : "")}“ ab, um den Test freizuschalten</span>`;

  const inner = `
    <div class="test-card__icon">${unlocked ? "📝" : "🔒"}</div>
    <div class="test-card__body">
      <h2>${escapeHtml(test.title)}</h2>
      <p>Aufgaben aus ${escapeHtml(test.covers)} – kombiniert und selbst geschrieben.</p>
      ${status}
    </div>`;

  return unlocked
    ? `<a class="test-card${result ? " test-card--done" : ""}" href="#/test/${test.id}">${inner}</a>`
    : `<div class="test-card test-card--locked">${inner}</div>`;
}

function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Lektionen-Pfad eines einzelnen Kapitels (Knoten, wie zuvor auf der
// Gesamtuebersicht, jetzt aber pro Kapitel).
export function renderChapterDetail(app, curriculum, chapterId) {
  const chapter = curriculum.chapters.find((c) => c.id === chapterId);
  if (!chapter) {
    app.innerHTML = `${renderHeader("path")}<main class="path"><p class="empty-hint">Kapitel nicht gefunden.</p><a class="btn" href="#/">Zurück zur Übersicht</a></main>`;
    wireHeader(app);
    return;
  }

  const total = chapter.lessons.length;
  const doneCount = chapter.lessons.filter((l) => isDone(l.id)).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const worksheetUnlocked = isWorksheetUnlocked(chapter);

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

  app.innerHTML = `
    ${renderHeader("path")}
    <main class="path">
      <a class="back-link" href="#/">← Zurück zur Übersicht</a>
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
        ${renderWorksheetSection(chapter, worksheetUnlocked)}
      </section>
    </main>
  `;
  wireHeader(app);
}

function renderWorksheetSection(chapter, unlocked) {
  if (unlocked) {
    return `
      <a class="worksheet-cta" href="${WORKSHEET_BASE}${chapter.id}.pdf" target="_blank" rel="noopener">
        📄 Informations- &amp; Aufgabenblatt herunterladen
      </a>
    `;
  }
  return `
    <div class="worksheet-cta worksheet-cta--locked">
      🔒 Arbeitsblatt: Schließe alle Lektionen dieses Kapitels mit mindestens ${WORKSHEET_MIN_STARS} ${WORKSHEET_MIN_STARS === 1 ? "Stern" : "Sternen"} ab, um es freizuschalten.
    </div>
  `;
}
