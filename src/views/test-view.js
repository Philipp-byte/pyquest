// Kapitel-Test: eine Prüfung nach je zwei Kapiteln.
//
// Unterschied zur Lektion (lesson-view.js) - hier wird bewusst geprüft, nicht
// gelehrt:
//   * keine Tipps und keine Musterlösung
//   * jede Aufgabe wird komplett selbst geschrieben
//   * beim Prüfen wird JEDE einzelne Anforderung einzeln zurückgemeldet
//     ("was fehlt noch?"), nicht nur richtig/falsch
//   * die Aufgabe kann übersprungen werden - ein Test darf nicht blockieren
//   * am Ende werden die Ergebnisse für den Lehrer-Rückmeldebogen gespeichert
//     (siehe test-results.js)

import { renderHeader, wireHeader, html } from "../ui.js";
import { renderMarkdown } from "../markdown.js";
import { createEditor } from "../editor.js";
import { runPython } from "../pyodide-runner.js";
import { evaluateCode, evaluateTips } from "../evaluator.js";
import { findTest } from "../content.js";
import { saveTestResult, getTestResult } from "../test-results.js";
import { burstBig } from "../celebrate.js";
import { renderDiff } from "./diff-view.js";
import { playCorrect, playWrong, playFinish } from "../sound.js";

export function renderTest(app, curriculum, testId) {
  const test = findTest(curriculum, testId);
  if (!test) {
    app.innerHTML = `${renderHeader()}<main class="lesson"><p>Test nicht gefunden.</p><a class="btn" href="#/">Zur Übersicht</a></main>`;
    wireHeader(app);
    return;
  }
  new TestPlayer(app, curriculum, test).start();
}

class TestPlayer {
  constructor(app, curriculum, test) {
    this.app = app;
    this.curriculum = curriculum;
    this.test = test;
    this.index = 0;
    this.startedAt = Date.now();
    this.editor = null;
    // Ergebnis je Aufgabe - wandert am Ende in den Rückmeldebogen.
    this.results = test.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      passed: false,
      attempts: 0,
      failedChecks: [],
      openTips: [],
      totalChecks: t.checks.length,
      passedChecks: 0,
    }));
  }

  start() {
    this.app.innerHTML = `
      ${renderHeader()}
      <main class="lesson test-run">
        <div class="lesson__top">
          <a class="lesson__quit" href="#/" title="Test verlassen">✕</a>
          <div class="lesson__progress"><div class="lesson__progress-fill"></div></div>
        </div>
        <div class="lesson__stage"></div>
        <div class="lesson__footer"></div>
      </main>
    `;
    this.stage = this.app.querySelector(".lesson__stage");
    this.footer = this.app.querySelector(".lesson__footer");
    this.progressFill = this.app.querySelector(".lesson__progress-fill");
    wireHeader(this.app);
    this.renderIntro();
  }

  setProgress(done) {
    this.progressFill.style.width = `${(done / this.test.tasks.length) * 100}%`;
  }

  renderIntro() {
    const prev = getTestResult(this.test.id);
    this.stage.innerHTML = `
      <div class="card test-intro">
        <div class="test-intro__badge">📝 Test</div>
        <h2>${escapeHtml(this.test.title)}</h2>
        <p class="test-intro__covers">Inhalte aus ${escapeHtml(this.test.covers)}</p>
        <div class="prose">${renderMarkdown(this.test.intro || "")}</div>
        <ul class="test-intro__rules">
          <li>📄 <strong>${this.test.tasks.length} Aufgaben</strong> – du schreibst jede Lösung selbst</li>
          <li>💡 <strong>Keine Tipps</strong> – dafür siehst du nach dem Prüfen genau, was noch fehlt</li>
          <li>⏭️ Du kannst eine Aufgabe <strong>überspringen</strong> und später zurückkommen</li>
        </ul>
        ${prev ? `<p class="test-intro__prev">Bisher bestes Ergebnis: <strong>${prev.points} / ${prev.maxPoints} Punkten</strong></p>` : ""}
      </div>
    `;
    this.footer.innerHTML = "";
    const btn = html(`<button class="btn btn--primary">Test starten</button>`);
    btn.onclick = () => {
      this.startedAt = Date.now();
      this.renderTask();
    };
    this.footer.append(btn);
  }

  renderTask() {
    const task = this.test.tasks[this.index];
    const res = this.results[this.index];
    this.setProgress(this.index);
    this.footer.innerHTML = "";

    this.stage.innerHTML = "";
    const card = html(`<div class="card card--code test-task">
      <div class="test-task__head">
        <span class="test-task__no">Aufgabe ${this.index + 1} von ${this.test.tasks.length}</span>
        <span class="test-task__title">${escapeHtml(task.title)}</span>
      </div>
      <div class="prose task">${renderMarkdown(task.prompt)}</div>
      <div class="editor"></div>
      ${task.needsInput ? `
        <label class="sim-input-label">
          🧪 Eingaben zum Ausprobieren (eine pro Zeile, für input())
          <textarea class="sim-input" rows="2" placeholder="z. B.&#10;17&#10;5"></textarea>
        </label>` : ""}
      <div class="run-row">
        <button class="btn btn--primary btn--check">✓ Abgeben &amp; prüfen</button>
        <button class="btn btn--run">▶ Ausführen</button>
        <button class="btn btn--ghost btn--skip">⏭️ Überspringen</button>
        <span class="run-status"></span>
      </div>
      <pre class="output" hidden></pre>
      <div class="feedback" hidden></div>
      <ul class="check-list" hidden></ul>
    </div>`);
    this.stage.append(card);

    this.editor = createEditor(card.querySelector(".editor"), task.starterCode ?? "");

    const status = card.querySelector(".run-status");
    const output = card.querySelector(".output");
    const feedback = card.querySelector(".feedback");
    const checkList = card.querySelector(".check-list");
    const runBtn = card.querySelector(".btn--run");
    const checkBtn = card.querySelector(".btn--check");
    const skipBtn = card.querySelector(".btn--skip");
    const simInput = card.querySelector(".sim-input");

    runBtn.onclick = async () => {
      runBtn.disabled = true;
      const inputs = simInput ? simInput.value.split("\n") : [];
      const r = await runPython(this.editor.getCode(), {
        inputs,
        onStatus: (s) => (status.textContent = s),
      });
      status.textContent = "";
      output.hidden = false;
      output.textContent = r.error
        ? `${r.error.original}\n\n→ ${r.error.explanation}`
        : r.stdout || "(keine Ausgabe)";
      runBtn.disabled = false;
    };

    checkBtn.onclick = async () => {
      checkBtn.disabled = true;
      status.textContent = "Wird geprüft…";
      const result = await evaluateCode(this.editor.getCode(), task.checks, {
        onStatus: (s) => (status.textContent = s),
      });
      status.textContent = "";
      res.attempts++;

      // Jede einzelne Anforderung wird sichtbar abgehakt - das ist die
      // ausführliche Rückmeldung, die den Test vom reinen Richtig/Falsch trennt.
      const passedCount = result.results.filter((r) => r.ok).length;
      res.passedChecks = passedCount;
      res.failedChecks = result.results.filter((r) => !r.ok).map((r) => r.label);

      checkList.hidden = false;
      checkList.innerHTML = result.results
        .map((r) => `<li class="check-list__item ${r.ok ? "is-ok" : "is-no"}">
            <span class="check-list__mark">${r.ok ? "✓" : "✗"}</span>
            <div class="check-list__text">
              <span>${escapeHtml(r.label)}</span>
              ${r.diff ? renderDiff(r.diff) : ""}
            </div>
          </li>`)
        .join("");

      if (result.stdout) {
        output.hidden = false;
        output.textContent = result.stdout;
      }

      feedback.hidden = false;
      if (result.passed) {
        res.passed = true;
        feedback.className = "feedback feedback--ok";
        feedback.innerHTML = "✅ Alle Anforderungen erfüllt!";
        playCorrect();
        runBtn.disabled = true;
        skipBtn.disabled = true;

        // Auch bei richtiger Loesung zurueckmelden, wenn es einen saubereren
        // Weg gaebe. Das wandert auch in den Bogen fuer die Lehrkraft.
        const offen = await evaluateTips(this.editor.getCode(), task.tips ?? []);
        res.openTips = offen;
        if (offen.length) {
          card.append(html(`<div class="better">
            <div class="better__head">💡 So geht es noch besser</div>
            <div class="better__body">${offen.map((t) => renderMarkdown(t)).join("")}</div>
          </div>`));
        }

        this.nextButton("Weiter");
      } else {
        feedback.className = "feedback feedback--no";
        if (result.error) {
          feedback.innerHTML = `Dein Programm bricht mit einem Fehler ab:<br>
            <span class="err-detail">${escapeHtml(result.error.original)}</span><br>→ ${escapeHtml(result.error.explanation)}`;
        } else {
          feedback.innerHTML = `Noch nicht vollständig – <strong>${passedCount} von ${result.results.length}</strong> Anforderungen erfüllt. Sieh dir die Liste an und versuch es nochmal.`;
        }
        playWrong();
        checkBtn.disabled = false;
        // Auch ohne Erfolg weiterkommen - ein Test darf nicht blockieren.
        this.nextButton("Trotzdem weiter");
      }
    };

    skipBtn.onclick = () => {
      res.attempts++;
      this.advance();
    };
  }

  nextButton(text) {
    this.footer.innerHTML = "";
    const last = this.index === this.test.tasks.length - 1;
    const btn = html(`<button class="btn btn--primary">${last ? "Test abschließen" : text}</button>`);
    btn.onclick = () => this.advance();
    this.footer.append(btn);
  }

  advance() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    this.index++;
    if (this.index >= this.test.tasks.length) this.finish();
    else this.renderTask();
  }

  finish() {
    this.setProgress(this.test.tasks.length);
    const durationSeconds = Math.round((Date.now() - this.startedAt) / 1000);
    const saved = saveTestResult(this.test.id, {
      tasks: this.results,
      durationSeconds,
    });

    const points = this.results.filter((r) => r.passed).length;
    const max = this.results.length;
    const bestanden = points >= Math.ceil(max / 2);

    playFinish();
    if (bestanden) burstBig();

    const rows = this.results.map((r, i) => `
      <li class="test-summary__row ${r.passed ? "is-ok" : "is-no"}">
        <span class="test-summary__mark">${r.passed ? "✓" : "✗"}</span>
        <div>
          <strong>Aufgabe ${i + 1}: ${escapeHtml(r.title)}</strong>
          ${r.passed
            ? `<span class="test-summary__meta">gelöst${r.attempts > 1 ? ` (${r.attempts} Versuche)` : ""}</span>
               ${(r.openTips || []).length
                 ? `<ul class="test-summary__tips">${r.openTips.map((t) => `<li>💡 ${escapeHtml(stripMd(t))}</li>`).join("")}</ul>`
                 : ""}`
            : `<ul class="test-summary__missing">${
                r.failedChecks.length
                  ? r.failedChecks.map((f) => `<li>${escapeHtml(f)}</li>`).join("")
                  : "<li>nicht bearbeitet</li>"
              }</ul>`}
        </div>
      </li>`).join("");

    this.stage.innerHTML = `
      <div class="card card--finish test-finish">
        <div class="finish__emoji">${bestanden ? "🏆" : "📘"}</div>
        <h2>Test abgeschlossen</h2>
        <p class="test-finish__score"><strong>${points} / ${max}</strong> Aufgaben gelöst</p>
        <p class="test-finish__hint">${
          bestanden
            ? "Gut gemacht! Dein Ergebnis steht im Lernbericht für deine Lehrkraft."
            : "Schau dir die offenen Punkte an und wiederhole die passenden Kapitel. Dein Ergebnis steht im Lernbericht."
        }</p>
        <h3 class="test-finish__sub">Deine Auswertung</h3>
        <ul class="test-summary">${rows}</ul>
        ${saved && saved.repeats > 0 ? `<p class="test-finish__repeat">Das ist dein ${saved.repeats + 1}. Durchgang – im Bericht steht dein bestes Ergebnis.</p>` : ""}
      </div>
    `;
    this.footer.innerHTML = "";
    const back = html(`<a class="btn btn--ghost" href="#/">Zur Übersicht</a>`);
    const report = html(`<a class="btn btn--primary" href="#/bericht">Lernbericht ansehen</a>`);
    this.footer.append(back, report);
  }
}

function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Für kurze Listeneinträge: Markdown-Auszeichnungen entfernen statt rendern.
function stripMd(s = "") {
  return String(s).replace(/\*\*/g, "").replace(/`/g, "");
}
