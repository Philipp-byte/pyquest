// Der Weltenbaum: Die Kapiteluebersicht als Karte der sechzehn Welten aus
// der Intro-Geschichte. Jede Welt ist zerstoert, bis ihr Kapitel
// abgeschlossen ist - dann erscheint sie gerettet. Klick auf eine
// Welt oeffnet die Lektionen-Ansicht (siehe renderChapterDetail).

import { renderHeader, starRow, wireHeader } from "../ui.js";
import { getLesson, isDone, isUnlocked } from "../store.js";
import { testAfterChapter } from "../content.js";
import { getTestResult } from "../test-results.js";
import { weltFuerKapitel, ortFuerLektion } from "../welten.js";
import { istLehrerModus } from "../lehrer.js";
import { starteVerkehr } from "../kosmos.js";

const WORKSHEET_MIN_STARS = 2;
const WORKSHEET_BASE = `${import.meta.env.BASE_URL}worksheets/`;

// Das Arbeitsblatt eines Kapitels ist erst freigeschaltet, wenn ALLE
// Lektionen abgeschlossen sind UND jede davon mindestens WORKSHEET_MIN_STARS
// Sterne hat (nicht nur irgendwann "done" mit wenig Muehe).
function isWorksheetUnlocked(chapter) {
  if (istLehrerModus()) return true;
  return chapter.lessons.every(
    (l) => isDone(l.id) && (getLesson(l.id).stars ?? 0) >= WORKSHEET_MIN_STARS
  );
}

export function renderPath(app, curriculum) {
  // Der Baum ist ein gewundener Pfad: Welten wechseln links/rechts, nach
  // jedem zweiten Kapitel liegt ein Pruefportal (Test) auf der Mittellinie.
  let aktivGesetzt = false;
  const knoten = curriculum.chapters
    .map((chapter, i) => {
      const welt = weltFuerKapitel(chapter.id);
      let node;
      if (welt) {
        const fertig = chapter.lessons.every((l) => isDone(l.id));
        const frei = isUnlocked(curriculum, chapter.id, chapter.lessons[0].id);
        // Genau die erste freie, noch nicht fertige Welt pulsiert als
        // "hier geht es weiter".
        const aktiv = frei && !fertig && !aktivGesetzt;
        if (aktiv) aktivGesetzt = true;
        node = renderWelt(chapter, welt, i, { fertig, frei, aktiv });
      } else {
        // Sicherheitsnetz fuer Kapitel ohne Welt: schlichte Karte.
        node = renderChapterCard(curriculum, chapter);
      }
      const test = testAfterChapter(curriculum, chapter.id);
      return test ? node + renderTestCard(curriculum, test) : node;
    })
    .join("");

  const gerettet = curriculum.chapters.filter((c) => c.lessons.every((l) => isDone(l.id))).length;

  app.innerHTML = `
    ${renderHeader("path")}
    <main class="path path--weltenbaum path--kosmos">
      ${kosmosHintergrund()}
      <div class="path__intro">
        <h1>Der Datenkosmos</h1>
        <p>Professor Null hat alle sechzehn Welten zerstört. Rette sie – eine nach der anderen.</p>
        <span class="weltenbaum__zaehler">🌍 ${gerettet} von ${curriculum.chapters.length} Welten gerettet</span>
      </div>
      <div class="weltenbaum">${knoten}</div>
    </main>
  `;
  wireHeader(app);
  starteVerkehr(app.querySelector(".kosmos-bg"));
}

// Eine Welt im Baum. Zustaende:
//   gesperrt  - zerstoert, abgedunkelt, kein Link
//   offen     - zerstoert, klickbar (die erste davon pulsiert als "aktiv")
//   fertig    - gerettet
function renderWelt(chapter, welt, index, { fertig, frei, aktiv }) {
  const total = chapter.lessons.length;
  const doneCount = chapter.lessons.filter((l) => isDone(l.id)).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const seite = index % 2 === 0 ? "links" : "rechts";
  const zustand = fertig ? "fertig" : frei ? "offen" : "gesperrt";

  const badge = fertig
    ? `<span class="welt__zustand welt__zustand--fertig">✓ Gerettet</span>`
    : frei
      ? `<span class="welt__zustand welt__zustand--offen">⚡ Zerstört</span>`
      : `<span class="welt__zustand welt__zustand--gesperrt">🔒 Gesperrt</span>`;

  // Die ersten beiden Welten sind beim Seitenaufbau sichtbar und laden
  // sofort - der Rest laedt beim Scrollen nach.
  const laden = index < 2 ? "eager" : "lazy";
  const inner = `
    <div class="welt__bild">
      <img src="${fertig ? welt.restored : welt.corrupted}" alt="Welt ${escapeHtml(welt.name)} – ${fertig ? "gerettet" : "zerstört"}" loading="${laden}">
      ${badge}
    </div>
    <div class="welt__info">
      <span class="welt__nummer">Welt ${index + 1}</span>
      <h2>${escapeHtml(welt.name)}</h2>
      <p class="welt__kapitel">${escapeHtml(chapter.title)}</p>
      <div class="chapter__bar"><div style="width:${pct}%"></div></div>
      <span class="chapter__count">${doneCount} / ${total} Lektionen</span>
    </div>`;

  const klassen = `welt welt--${seite} welt--${zustand}${aktiv ? " welt--aktiv" : ""}`;
  return frei
    ? `<a class="${klassen}" style="--chapter-color:${chapter.color || "#22c55e"}" href="#/chapter/${chapter.id}">${inner}</a>`
    : `<div class="${klassen}">${inner}</div>`;
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
  const unlocked = istLehrerModus() || (chapter ? chapter.lessons.every((l) => isDone(l.id)) : false);
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

// Weltraum-Hintergrund fuer die Kosmos-Ansichten.
//
// Hier steht nur die FESTE Kulisse: Stern, Planeten, Asteroidenfeld,
// Station und Meteore - alles SVG und CSS, keine zusaetzlichen
// Bilddateien, bewegt ueber transform und opacity.
//
// Der Raumverkehr kommt aus src/kosmos.js. Die Schiffe entstehen zur
// Laufzeit mit zufaelligem Typ, Route, Groesse und Aktion, damit sich
// nichts wiederholt.
function kosmosHintergrund() {
  return `<div class="kosmos-bg" aria-hidden="true">
    <div class="kosmos-nebel kosmos-nebel--a"></div>
    <div class="kosmos-nebel kosmos-nebel--b"></div>

    <div class="kosmos-stern"></div>

    ${gasriese()}
    ${eisplanet()}

    <div class="kosmos-asteroiden">
      ${brocken("kosmos-fels--1", 34)}
      ${brocken("kosmos-fels--2", 19)}
      ${brocken("kosmos-fels--3", 25)}
      ${brocken("kosmos-fels--4", 13)}
      ${brocken("kosmos-fels--5", 9)}
    </div>

    <!-- Die Schiffe kommen aus src/kosmos.js: zufaelliger Typ, Route,
         Groesse und Aktion, damit sich nichts wiederholt. -->

    <div class="kosmos-station">${station()}</div>

    <div class="kosmos-meteor kosmos-meteor--1"></div>
    <div class="kosmos-meteor kosmos-meteor--2"></div>
    <div class="kosmos-meteor kosmos-meteor--3"></div>
  </div>`;
}

// Gasriese mit Baendern, Schattengrenze und geneigtem Ring. Die Baender
// sind halbtransparente Ellipsen, der Ring liegt einmal hinter und einmal
// vor dem Planeten - das erzeugt die Tiefe.
function gasriese() {
  return `<svg class="kosmos-planet kosmos-planet--gasriese" viewBox="0 0 200 200">
    <defs>
      <radialGradient id="kg-kugel" cx="34%" cy="30%" r="78%">
        <stop offset="0%" stop-color="#b9a4d6"/>
        <stop offset="45%" stop-color="#7c6aa8"/>
        <stop offset="100%" stop-color="#241a3d"/>
      </radialGradient>
      <linearGradient id="kg-ring" x1="0" x2="1">
        <stop offset="0%" stop-color="#cfc3e8" stop-opacity=".05"/>
        <stop offset="45%" stop-color="#cfc3e8" stop-opacity=".55"/>
        <stop offset="100%" stop-color="#cfc3e8" stop-opacity=".05"/>
      </linearGradient>
      <clipPath id="kg-clip"><circle cx="100" cy="100" r="58"/></clipPath>
    </defs>
    <g transform="rotate(-18 100 100)">
      <ellipse cx="100" cy="100" rx="96" ry="26" fill="none" stroke="url(#kg-ring)" stroke-width="7"/>
      <circle cx="100" cy="100" r="58" fill="url(#kg-kugel)"/>
      <g clip-path="url(#kg-clip)" opacity=".5">
        <ellipse cx="100" cy="74" rx="60" ry="7" fill="#d7c9ee" opacity=".35"/>
        <ellipse cx="100" cy="92" rx="60" ry="4" fill="#2a1f45" opacity=".5"/>
        <ellipse cx="100" cy="108" rx="60" ry="9" fill="#e2d6f5" opacity=".22"/>
        <ellipse cx="100" cy="126" rx="60" ry="5" fill="#2a1f45" opacity=".45"/>
      </g>
      <circle cx="100" cy="100" r="58" fill="url(#kg-schatten)"/>
      <path d="M100 42a58 58 0 0 1 0 116 46 58 0 0 0 0-116z" fill="#0b0718" opacity=".55"/>
      <path d="M4 100a96 26 0 0 0 192 0" fill="none" stroke="url(#kg-ring)" stroke-width="7"/>
    </g>
  </svg>`;
}

// Kleiner, kalter Gesteinsplanet - dient der Sonde als Ziel.
function eisplanet() {
  return `<svg class="kosmos-planet kosmos-planet--eis" viewBox="0 0 120 120">
    <defs>
      <radialGradient id="ke-kugel" cx="32%" cy="28%" r="76%">
        <stop offset="0%" stop-color="#cfe6f2"/>
        <stop offset="50%" stop-color="#6b8ea6"/>
        <stop offset="100%" stop-color="#16232e"/>
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="40" fill="url(#ke-kugel)"/>
    <ellipse cx="48" cy="46" rx="12" ry="8" fill="#e8f4fa" opacity=".18"/>
    <ellipse cx="72" cy="76" rx="16" ry="10" fill="#0d1720" opacity=".25"/>
    <path d="M60 20a40 40 0 0 1 0 80 30 40 0 0 0 0-80z" fill="#050a10" opacity=".5"/>
  </svg>`;
}

// Unregelmaessiger, dunkler Brocken - kein Comic-Krater, nur Kanten
// und ein schmaler Lichtsaum auf der Sonnenseite.
function brocken(klasse, groesse) {
  return `<svg class="kosmos-fels ${klasse}" width="${groesse}" height="${groesse}" viewBox="0 0 48 48">
    <path d="M6 20 12 9l11-5 13 4 6 12-3 13-12 9-13-3-6-11z" fill="#3b4250"/>
    <path d="M12 9l11-5 13 4 6 12-8 2-10-8z" fill="#6b7484" opacity=".55"/>
    <path d="M15 30l9 4 10-5-3 9-10 7-8-5z" fill="#232833" opacity=".8"/>
  </svg>`;
}

// Ferne Raumstation: Ringmodul, das sich langsam dreht.
function station() {
  return `<svg viewBox="0 0 120 120">
    <g class="kosmos-station__ring">
      <circle cx="60" cy="60" r="40" fill="none" stroke="#54637d" stroke-width="7"/>
      <circle cx="60" cy="60" r="40" fill="none" stroke="#93a4bf" stroke-width="2" opacity=".6"/>
      <g fill="#7dd3fc" opacity=".75">
        <circle cx="60" cy="20" r="2"/><circle cx="100" cy="60" r="2"/>
        <circle cx="60" cy="100" r="2"/><circle cx="20" cy="60" r="2"/>
      </g>
      <path d="M60 24v72M24 60h72" stroke="#54637d" stroke-width="4"/>
    </g>
    <circle cx="60" cy="60" r="10" fill="#3b4a61"/>
    <circle cx="60" cy="60" r="5" fill="#93c5fd" opacity=".55"/>
  </svg>`;
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

  // Kapitel-Landkarte: Jede Lektion ist eine Station an einem der drei
  // Schauplaetze der Welt - im selben Stil wie der Weltenbaum. Fehlen die
  // Ortsbilder (kuenftiges Kapitel ohne Welt), gibt es den schlichten Pfad.
  const nodes = chapter.lessons
    .map((lesson, i) => {
      const done = isDone(lesson.id);
      const unlocked = isUnlocked(curriculum, chapter.id, lesson.id);
      const stars = getLesson(lesson.id).stars ?? 0;
      const href = unlocked ? `#/lesson/${chapter.id}/${lesson.id}` : null;
      const ort = ortFuerLektion(chapter.id, i, total);

      if (!ort) {
        const state = done ? "done" : unlocked ? "open" : "locked";
        const side = i % 2 === 0 ? "left" : "right";
        const inner = done ? "✓" : unlocked ? (lesson.icon ?? "●") : "🔒";
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
      }

      const zustand = done ? "fertig" : unlocked ? "offen" : "gesperrt";
      const seite = i % 2 === 0 ? "links" : "rechts";
      const badge = done
        ? `<span class="welt__zustand welt__zustand--fertig">✓ Geschafft</span>`
        : unlocked
          ? `<span class="welt__zustand welt__zustand--offen">${lesson.icon ?? "▶"} Bereit</span>`
          : `<span class="welt__zustand welt__zustand--gesperrt">🔒 Versperrt</span>`;

      const inner = `
        <div class="welt__bild">
          <img src="${ort.bild}" alt="Schauplatz ${escapeHtml(ort.name)}" loading="${i < 2 ? "eager" : "lazy"}">
          ${badge}
        </div>
        <div class="welt__info">
          <span class="welt__nummer">Station ${i + 1} · 📍 ${escapeHtml(ort.name)}</span>
          <h2>${escapeHtml(lesson.title)}</h2>
          ${done ? `<span class="node__stars">${starRow(stars)}</span>` : ""}
        </div>`;

      const klassen = `welt welt--station welt--${seite} welt--${zustand}${!done && unlocked ? " welt--aktiv" : ""}`;
      return href
        ? `<a class="${klassen}" href="${href}">${inner}</a>`
        : `<div class="${klassen}">${inner}</div>`;
    })
    .join("");
  const hatKarte = Boolean(ortFuerLektion(chapter.id, 0, total));

  // Weltbanner: Das Kapitel spielt in einer Welt der Intro-Geschichte -
  // zerstoert, solange es offen ist, gerettet danach.
  const welt = weltFuerKapitel(chapter.id);
  const kapitelFertig = chapter.lessons.every((l) => isDone(l.id));
  const banner = welt
    ? `<div class="chapter__welt">
         <img src="${kapitelFertig ? welt.restored : welt.corrupted}" alt="Welt ${escapeHtml(welt.name)}" loading="lazy">
         <div class="chapter__welt-text">
           <strong>${escapeHtml(welt.name)}</strong>
           <span>${kapitelFertig ? "✓ Diese Welt ist gerettet!" : "⚡ Diese Welt wartet auf dich."}</span>
         </div>
       </div>`
    : "";

  app.innerHTML = `
    ${renderHeader("path")}
    <main class="path path--kosmos">
      ${kosmosHintergrund()}
      <a class="back-link" href="#/">← Zurück zum Datenkosmos</a>
      <section class="chapter" style="--chapter-color:${chapter.color || "#22c55e"}">
        ${banner}
        <div class="chapter__header">
          <div class="chapter__icon">${chapter.icon || "📘"}</div>
          <div class="chapter__meta">
            <h2>${chapter.title}</h2>
            <p>${chapter.description || ""}</p>
            <div class="chapter__bar"><div style="width:${pct}%"></div></div>
            <span class="chapter__count">${doneCount} / ${total} Lektionen</span>
          </div>
        </div>
        <div class="${hatKarte ? "weltenbaum kapitelkarte" : "chapter__nodes"}">${nodes}</div>
        ${renderWorksheetSection(chapter, worksheetUnlocked)}
      </section>
    </main>
  `;
  wireHeader(app);
  starteVerkehr(app.querySelector(".kosmos-bg"));
}

function renderWorksheetSection(chapter, unlocked) {
  if (unlocked) {
    // Zwei Wege: das eigene, mit den selbst geschriebenen Loesungen
    // ausgefuellte Blatt (zum Abgeben) und das leere zum Ausdrucken.
    return `
      <a class="worksheet-cta" href="#/arbeitsblatt/${chapter.id}">
        📝 Ausgefülltes Aufgabenblatt (mit deinen Lösungen)
      </a>
      <a class="worksheet-cta worksheet-cta--zweit" href="${WORKSHEET_BASE}${chapter.id}.pdf" target="_blank" rel="noopener">
        📄 Nicht ausgefülltes Aufgabenblatt
      </a>
    `;
  }
  return `
    <div class="worksheet-cta worksheet-cta--locked">
      🔒 Arbeitsblatt: Schließe alle Lektionen dieses Kapitels mit mindestens ${WORKSHEET_MIN_STARS} ${WORKSHEET_MIN_STARS === 1 ? "Stern" : "Sternen"} ab, um es freizuschalten.
    </div>
  `;
}
