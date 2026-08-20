// Das ausgefuellte Information- & Aufgabenblatt.
//
// Das PDF unter public/worksheets/ ist fuer alle gleich und leer - es wird
// beim Bauen erzeugt und kennt die Lernenden nicht. Diese Ansicht baut das
// Blatt stattdessen IM BROWSER zusammen und traegt die Loesungen ein, die
// die Lernenden selbst geschrieben haben. Jede Abgabe ist damit individuell.
//
// Abgegeben wird ueber "Drucken" -> "Als PDF speichern"; ohne Server ist das
// der einzige Weg zu einer Datei, die man einsammeln kann.

import { renderHeader, wireHeader, starRow } from "../ui.js";
import { renderMarkdown } from "../markdown.js";
import { getLesson, isDone } from "../store.js";
import { holeLoesung } from "../loesungen.js";

export function renderWorksheet(app, curriculum, chapterId) {
  const chapter = curriculum.chapters.find((c) => c.id === chapterId);
  if (!chapter) {
    app.innerHTML = `${renderHeader("path")}<main class="path"><p class="empty-hint">Kapitel nicht gefunden.</p></main>`;
    wireHeader(app);
    return;
  }

  const nummer = curriculum.chapters.findIndex((c) => c.id === chapterId) + 1;
  const heute = new Date().toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  let aufgabenNr = 0;
  let beantwortet = 0;
  let gesamt = 0;

  const abschnitte = chapter.lessons.map((lesson) => {
    const teile = [];
    lesson.steps.forEach((step, si) => {
      if (step.type === "explain" && step.text) {
        teile.push(`<div class="ab__info">${renderMarkdown(step.text)}</div>`);
      } else if (step.type === "example" && step.code) {
        teile.push(`
          ${step.text ? `<div class="ab__info">${renderMarkdown(step.text)}</div>` : ""}
          <pre class="ab__beispiel"><code>${escape(step.code)}</code></pre>`);
      } else if (step.type === "quiz") {
        aufgabenNr++;
        gesamt++;
        const richtig = step.choices?.[step.answer] ?? "";
        const erledigt = isDone(lesson.id);
        if (erledigt) beantwortet++;
        teile.push(`
          <div class="ab__aufgabe">
            <p class="ab__frage"><span class="ab__nr">Aufgabe ${aufgabenNr}</span> ${renderMarkdown(step.question)}</p>
            <ul class="ab__wahl">
              ${step.choices.map((c) => `<li>${renderMarkdown(c)}</li>`).join("")}
            </ul>
            ${erledigt
              ? `<p class="ab__antwort"><span class="ab__label">Deine Antwort</span> ${renderMarkdown(richtig)}</p>`
              : `<p class="ab__offen">Noch nicht bearbeitet</p>`}
          </div>`);
      } else if (step.type === "code") {
        aufgabenNr++;
        gesamt++;
        const eigene = holeLoesung(lesson.id, si);
        if (eigene) beantwortet++;
        teile.push(`
          <div class="ab__aufgabe">
            <p class="ab__frage"><span class="ab__nr">Aufgabe ${aufgabenNr}</span></p>
            <div class="ab__stellung">${renderMarkdown(step.task)}</div>
            ${eigene
              ? `<pre class="ab__loesung"><code>${escape(eigene)}</code></pre>
                 <p class="ab__label ab__label--unten">deine Lösung</p>`
              : `<div class="ab__leer">Noch nicht gelöst – hier bleibt Platz für deine Lösung.</div>`}
          </div>`);
      }
    });

    const stars = getLesson(lesson.id).stars ?? 0;
    return `
      <section class="ab__lektion">
        <h2>${escape(lesson.title)}
          ${isDone(lesson.id) ? `<span class="ab__sterne">${starRow(stars)}</span>` : ""}
        </h2>
        ${teile.join("")}
      </section>`;
  }).join("");

  app.innerHTML = `
    ${renderHeader("path")}
    <main class="path arbeitsblatt-seite">
      <a class="back-link no-print" href="#/chapter/${chapterId}">← Zurück zum Kapitel</a>

      <div class="ab__leiste no-print">
        <p><strong>${beantwortet} von ${gesamt} Aufgaben</strong> sind mit deiner eigenen Lösung eingetragen.</p>
        <div class="ab__knoepfe">
          <button class="btn btn--primary btn--drucken">🖨️ Drucken / als PDF speichern</button>
        </div>
        <p class="ab__hinweis">Wähle im Druckfenster „Als PDF speichern“. So gibst du dein Blatt ab.</p>
      </div>

      <article class="ab">
        <header class="ab__kopf">
          <div>
            <p class="ab__fach">Informatik · PyQuest</p>
            <h1>Information- &amp; Aufgabenblatt</h1>
            <p class="ab__kapitel">Kapitel ${nummer}: ${escape(chapter.title)}</p>
          </div>
          <div class="ab__namensfeld">
            <p>Name: <span class="ab__linie"></span></p>
            <p>Klasse: <span class="ab__linie ab__linie--kurz"></span> Datum: ${heute}</p>
          </div>
        </header>
        ${abschnitte}
      </article>
    </main>
  `;
  wireHeader(app);
  app.querySelector(".btn--drucken").onclick = () => window.print();
}

function escape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
