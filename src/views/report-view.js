// Bericht für die Lehrkraft (Demo-/Lokalmodus).
//
// Datenschutz-Idee: Es gibt keinen Server und kein zentrales Dashboard. Der
// Fortschritt liegt nur lokal im Browser (localStorage). Diese Ansicht zeigt
// den eigenen Lernstand und lässt ihn ausdrucken oder als PDF speichern
// (Druckdialog des Browsers). Der Name wird nur für den Ausdruck eingetippt
// und höchstens lokal gemerkt – nichts wird zentral gespeichert.

import { renderHeader, wireHeader } from "../ui.js";
import { getXp, levelProgress, getLesson, isDone, getBadges } from "../store.js";
import { flattenLessons } from "../content.js";
import { BADGES } from "../badges.js";

const NAME_KEY = "pyquest.studentName";

export function renderReport(app, curriculum) {
  const xp = getXp();
  const { level } = levelProgress(xp);
  const flat = flattenLessons(curriculum);
  const total = flat.length;
  const done = flat.filter((f) => isDone(f.lessonId)).length;
  const starsTotal = flat.reduce((s, f) => s + (getLesson(f.lessonId).stars || 0), 0);
  const maxStars = total * 3;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const earned = getBadges();
  const badgeCount = Object.keys(earned).length;
  const savedName = localStorage.getItem(NAME_KEY) || "";
  const heute = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const chapterRows = curriculum.chapters.map((ch) => {
    const cDone = ch.lessons.filter((l) => isDone(l.id)).length;
    const cStars = ch.lessons.reduce((s, l) => s + (getLesson(l.id).stars || 0), 0);
    const cPct = ch.lessons.length ? Math.round((cDone / ch.lessons.length) * 100) : 0;
    return `<tr>
      <td>${escapeHtml(ch.title)}</td>
      <td>${cDone} / ${ch.lessons.length}</td>
      <td>${cStars} / ${ch.lessons.length * 3}</td>
      <td>${cPct}%</td>
    </tr>`;
  }).join("");

  const badgeList = BADGES.filter((b) => earned[b.id])
    .map((b) => `<li>${b.icon} ${escapeHtml(b.title)}</li>`).join("")
    || "<li class=\"report__none\">Noch keine Abzeichen erreicht.</li>";

  app.innerHTML = `
    ${renderHeader("bericht")}
    <main class="report">
      <div class="report__toolbar no-print">
        <p class="report__hint">Trage deinen Namen ein und klicke dann auf <strong>Drucken</strong> – im Druckdialog kannst du auch <strong>„Als PDF speichern“</strong> wählen. Deine Daten bleiben nur auf diesem Gerät.</p>
        <label class="report__namefield">Dein Name:
          <input type="text" class="report__name-input" value="${escapeHtml(savedName)}" placeholder="Vor- und Nachname" autocomplete="name">
        </label>
        <button class="btn btn--primary report__print">🖨 Drucken / als PDF speichern</button>
      </div>

      <article class="report__sheet">
        <div class="report__head">
          <div>
            <div class="report__brand">🐍 PyQuest</div>
            <h1>Lernbericht</h1>
          </div>
          <div class="report__meta">
            <div><span>Name:</span> <strong class="report__name-out">${escapeHtml(savedName) || "________________"}</strong></div>
            <div><span>Datum:</span> ${heute}</div>
          </div>
        </div>

        <div class="report__stats">
          <div class="report__stat"><span class="report__stat-num">${pct}%</span><span>Gesamtfortschritt</span></div>
          <div class="report__stat"><span class="report__stat-num">${done} / ${total}</span><span>Lektionen</span></div>
          <div class="report__stat"><span class="report__stat-num">⭐ ${starsTotal} / ${maxStars}</span><span>Sterne</span></div>
          <div class="report__stat"><span class="report__stat-num">Level ${level}</span><span>${xp} XP</span></div>
        </div>

        <h2>Fortschritt nach Kapiteln</h2>
        <table class="report__table">
          <thead><tr><th>Kapitel</th><th>Lektionen</th><th>Sterne</th><th>Anteil</th></tr></thead>
          <tbody>${chapterRows}</tbody>
        </table>

        <h2>Abzeichen <span class="report__badgecount">(${badgeCount} / ${BADGES.length})</span></h2>
        <ul class="report__badges">${badgeList}</ul>

        <p class="report__foot">Erstellt mit PyQuest · Der Fortschritt wird nur lokal im Browser gespeichert.</p>
      </article>
    </main>
  `;

  const input = app.querySelector(".report__name-input");
  const nameOut = app.querySelector(".report__name-out");
  input.oninput = () => {
    const v = input.value.trim();
    localStorage.setItem(NAME_KEY, v);
    nameOut.textContent = v || "________________";
  };
  app.querySelector(".report__print").onclick = () => window.print();

  wireHeader(app);
}

function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
