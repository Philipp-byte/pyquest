// Lektions-Player: spielt die Schritte einer Lektion nacheinander ab.
// Schritt-Typen: explain, example, quiz, fill, code.

import { renderHeader } from "../ui.js";
import { renderMarkdown } from "../markdown.js";
import { html } from "../ui.js";
import { createEditor } from "../editor.js";
import { runPython } from "../pyodide-runner.js";
import { evaluateCode, evaluateFill } from "../evaluator.js";
import { completeLesson, isUnlocked } from "../progress.js";
import { burstSmall, burstBig } from "../celebrate.js";
import { navigate } from "../router.js";
import { findLesson, flattenLessons } from "../content.js";

export function renderLesson(app, curriculum, chapterId, lessonId) {
  const found = findLesson(curriculum, chapterId, lessonId);
  if (!found) {
    app.innerHTML = `${renderHeader()}<main class="lesson"><p>Lektion nicht gefunden.</p></main>`;
    return;
  }
  if (!isUnlocked(curriculum, chapterId, lessonId)) {
    app.innerHTML = `${renderHeader()}<main class="lesson"><p>Diese Lektion ist noch gesperrt. 🔒</p><a class="btn" href="#/">Zurück zum Lernpfad</a></main>`;
    return;
  }

  const { lesson } = found;
  const player = new LessonPlayer(app, curriculum, lesson);
  player.start();
}

class LessonPlayer {
  constructor(app, curriculum, lesson) {
    this.app = app;
    this.curriculum = curriculum;
    this.lesson = lesson;
    this.stepIndex = 0;
    this.mistakes = 0; // fuer Sterne-Berechnung
    this.hintsUsed = 0;
    this.editor = null;
  }

  start() {
    this.app.innerHTML = `
      ${renderHeader()}
      <main class="lesson">
        <div class="lesson__top">
          <a class="lesson__quit" href="#/" title="Lektion verlassen">✕</a>
          <div class="lesson__progress"><div class="lesson__progress-fill"></div></div>
        </div>
        <div class="lesson__stage"></div>
        <div class="lesson__footer"></div>
      </main>
    `;
    this.stage = this.app.querySelector(".lesson__stage");
    this.footer = this.app.querySelector(".lesson__footer");
    this.progressFill = this.app.querySelector(".lesson__progress-fill");
    this.renderStep();
  }

  updateProgress() {
    const pct = (this.stepIndex / this.lesson.steps.length) * 100;
    this.progressFill.style.width = `${pct}%`;
  }

  next() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    this.stepIndex++;
    if (this.stepIndex >= this.lesson.steps.length) this.finish();
    else this.renderStep();
  }

  renderStep() {
    this.updateProgress();
    const step = this.lesson.steps[this.stepIndex];
    this.stage.innerHTML = "";
    this.footer.innerHTML = "";
    this.stage.scrollTop = 0;

    switch (step.type) {
      case "explain": return this.renderExplain(step);
      case "example": return this.renderExample(step);
      case "quiz": return this.renderQuiz(step);
      case "fill": return this.renderFill(step);
      case "code": return this.renderCode(step);
      default: return this.renderExplain({ text: "Unbekannter Schritt." });
    }
  }

  continueButton(label = "Weiter") {
    const btn = html(`<button class="btn btn--primary">${label}</button>`);
    btn.onclick = () => this.next();
    this.footer.append(btn);
    return btn;
  }

  // ---- Schritt: Erklaerung ----
  renderExplain(step) {
    this.stage.append(
      html(`<div class="card card--explain">
        <div class="mascot">🐍</div>
        <div class="prose">${renderMarkdown(step.text)}</div>
      </div>`)
    );
    this.continueButton();
  }

  // ---- Schritt: Beispiel mit Ausfuehren ----
  renderExample(step) {
    const card = html(`<div class="card">
      ${step.text ? `<div class="prose">${renderMarkdown(step.text)}</div>` : ""}
      <pre class="codeblock"><code>${escape(step.code)}</code></pre>
      <div class="run-row">
        <button class="btn btn--run">▶ Ausführen</button>
        <span class="run-status"></span>
      </div>
      <pre class="output" hidden></pre>
    </div>`);
    this.stage.append(card);

    const runBtn = card.querySelector(".btn--run");
    const status = card.querySelector(".run-status");
    const output = card.querySelector(".output");

    runBtn.onclick = async () => {
      runBtn.disabled = true;
      const res = await runPython(step.code, {
        onStatus: (s) => (status.textContent = s),
      });
      status.textContent = "";
      output.hidden = false;
      output.textContent = res.error
        ? `${res.error.original}\n\n→ ${res.error.explanation}`
        : res.stdout || "(keine Ausgabe)";
      runBtn.disabled = false;
    };

    this.continueButton();
  }

  // ---- Schritt: Multiple Choice ----
  renderQuiz(step) {
    const card = html(`<div class="card">
      <div class="prose">${renderMarkdown(step.question)}</div>
      <div class="choices"></div>
      <div class="feedback" hidden></div>
    </div>`);
    const choicesEl = card.querySelector(".choices");
    const feedback = card.querySelector(".feedback");
    this.stage.append(card);

    let answered = false;
    step.choices.forEach((choice, i) => {
      const b = html(`<button class="choice">${renderMarkdown(choice)}</button>`);
      b.onclick = () => {
        if (answered) return;
        const correct = i === step.answer;
        if (correct) {
          answered = true;
          b.classList.add("choice--correct");
          feedback.hidden = false;
          feedback.className = "feedback feedback--ok";
          feedback.innerHTML = renderMarkdown(step.explainCorrect || "Richtig! ✅");
          burstSmall();
          this.continueButton();
        } else {
          this.mistakes++;
          b.classList.add("choice--wrong");
          b.disabled = true;
          feedback.hidden = false;
          feedback.className = "feedback feedback--no";
          feedback.innerHTML = renderMarkdown(step.explainWrong || "Das war nicht richtig. Versuch es nochmal!");
        }
      };
      choicesEl.append(b);
    });
  }

  // ---- Schritt: Lueckentext ----
  renderFill(step) {
    const card = html(`<div class="card">
      ${step.text ? `<div class="prose">${renderMarkdown(step.text)}</div>` : ""}
      <div class="fill">
        <code class="fill__template"></code>
      </div>
      <input class="fill__input" type="text" placeholder="Deine Antwort…" autocomplete="off" spellcheck="false">
      <div class="run-row">
        <button class="btn btn--primary btn--check">Prüfen</button>
        <button class="btn btn--ghost btn--hint">💡 Tipp</button>
        <span class="run-status"></span>
      </div>
      <div class="feedback" hidden></div>
    </div>`);
    this.stage.append(card);

    const tmpl = card.querySelector(".fill__template");
    tmpl.innerHTML = escape(step.template).replace(/___/g, '<span class="blank">___</span>');

    const input = card.querySelector(".fill__input");
    const checkBtn = card.querySelector(".btn--check");
    const hintBtn = card.querySelector(".btn--hint");
    const feedback = card.querySelector(".feedback");

    input.focus();
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") checkBtn.click(); });

    hintBtn.onclick = () => {
      this.hintsUsed++;
      feedback.hidden = false;
      feedback.className = "feedback feedback--hint";
      feedback.textContent = `💡 ${step.hint || "Kein Tipp verfügbar."}`;
    };

    checkBtn.onclick = () => {
      if (evaluateFill(input.value, step)) {
        input.disabled = true;
        checkBtn.disabled = true;
        feedback.hidden = false;
        feedback.className = "feedback feedback--ok";
        feedback.textContent = "Richtig! ✅";
        burstSmall();
        this.footer.innerHTML = "";
        this.continueButton();
      } else {
        this.mistakes++;
        feedback.hidden = false;
        feedback.className = "feedback feedback--no";
        feedback.textContent = "Noch nicht ganz. Versuch es nochmal!";
      }
    };
  }

  // ---- Schritt: Frei programmieren ----
  renderCode(step) {
    const card = html(`<div class="card card--code">
      <div class="prose task">${renderMarkdown(step.task)}</div>
      <div class="editor"></div>
      <div class="run-row">
        <button class="btn btn--primary btn--check">✓ Prüfen</button>
        <button class="btn btn--run">▶ Ausführen</button>
        ${step.hints?.length ? `<button class="btn btn--ghost btn--hint">💡 Tipp</button>` : ""}
        <span class="run-status"></span>
      </div>
      <pre class="output" hidden></pre>
      <div class="feedback" hidden></div>
    </div>`);
    this.stage.append(card);

    const editorEl = card.querySelector(".editor");
    this.editor = createEditor(editorEl, step.starterCode ?? "");

    const status = card.querySelector(".run-status");
    const output = card.querySelector(".output");
    const feedback = card.querySelector(".feedback");
    const runBtn = card.querySelector(".btn--run");
    const checkBtn = card.querySelector(".btn--check");
    const hintBtn = card.querySelector(".btn--hint");

    let hintIndex = 0;
    if (hintBtn) {
      hintBtn.onclick = () => {
        this.hintsUsed++;
        feedback.hidden = false;
        feedback.className = "feedback feedback--hint";
        const hint = step.hints[Math.min(hintIndex, step.hints.length - 1)];
        feedback.innerHTML = `💡 ${renderMarkdown(hint)}`;
        hintIndex++;
      };
    }

    runBtn.onclick = async () => {
      runBtn.disabled = true;
      const res = await runPython(this.editor.getCode(), {
        onStatus: (s) => (status.textContent = s),
      });
      status.textContent = "";
      output.hidden = false;
      output.textContent = res.error
        ? `${res.error.original}\n\n→ ${res.error.explanation}`
        : res.stdout || "(keine Ausgabe)";
      runBtn.disabled = false;
    };

    checkBtn.onclick = async () => {
      checkBtn.disabled = true;
      status.textContent = "Wird geprüft…";
      const result = await evaluateCode(this.editor.getCode(), step.tests, {
        onStatus: (s) => (status.textContent = s),
      });
      status.textContent = "";

      if (result.stdout) {
        output.hidden = false;
        output.textContent = result.stdout;
      }

      if (result.passed) {
        feedback.hidden = false;
        feedback.className = "feedback feedback--ok";
        feedback.innerHTML = "🎉 Super, das ist richtig!";
        burstSmall();
        checkBtn.disabled = true;
        runBtn.disabled = true;
        this.footer.innerHTML = "";
        this.continueButton();
      } else {
        this.mistakes++;
        feedback.hidden = false;
        feedback.className = "feedback feedback--no";
        if (result.error) {
          feedback.innerHTML = `<span class="err-detail">${escape(result.error.original)}</span><br>→ ${escape(result.error.explanation)}`;
        } else {
          const failed = result.results.filter((r) => !r.ok).map((r) => `<li>${r.label}</li>`).join("");
          feedback.innerHTML = `Noch nicht ganz. Diese Prüfung fehlt noch:<ul>${failed}</ul>${step.hints?.length ? "Tipp: Nutze den 💡-Button." : ""}`;
        }
        checkBtn.disabled = false;
      }
    };
  }

  // ---- Abschluss ----
  finish() {
    this.updateProgress();
    this.progressFill.style.width = "100%";

    // Sterne: 3 makellos, sonst Abzug fuer Fehler/Tipps (min. 1).
    const penalty = this.mistakes + (this.hintsUsed > 0 ? 1 : 0);
    const stars = Math.max(1, 3 - penalty);

    const result = completeLesson(this.lesson.id, { xp: this.lesson.xp ?? 10, stars });
    burstBig();

    const nextHref = this.nextLessonHref();

    this.stage.innerHTML = `
      <div class="card card--finish">
        <div class="finish__emoji">🏆</div>
        <h2>Lektion geschafft!</h2>
        <div class="finish__stars">
          ${[0,1,2].map(i => `<span class="star star--big ${i < stars ? "star--on" : ""}">★</span>`).join("")}
        </div>
        <p class="finish__xp">${result.firstTime ? `+${result.gainedXp} XP` : "Wiederholt – kein neues XP"}</p>
      </div>
    `;
    this.footer.innerHTML = "";
    const back = html(`<a class="btn btn--ghost" href="#/">Zum Lernpfad</a>`);
    this.footer.append(back);
    if (nextHref) {
      const nextBtn = html(`<a class="btn btn--primary" href="${nextHref}">Nächste Lektion →</a>`);
      this.footer.append(nextBtn);
    }
  }

  nextLessonHref() {
    const flat = flattenLessons(this.curriculum);
    const idx = flat.findIndex((f) => f.lessonId === this.lesson.id);
    const nx = flat[idx + 1];
    return nx ? `#/lesson/${nx.chapterId}/${nx.lessonId}` : null;
  }
}

function escape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
