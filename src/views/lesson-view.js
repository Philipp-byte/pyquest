// Lektions-Player: spielt die Schritte einer Lektion nacheinander ab.
// Schritt-Typen: explain, example, quiz, fill, code.

import { renderHeader, wireHeader, animateNumber, html } from "../ui.js";
import { renderMarkdown } from "../markdown.js";
import { createEditor } from "../editor.js";
import { runPython } from "../pyodide-runner.js";
import { evaluateCode, evaluateFill, evaluateTips } from "../evaluator.js";
import { completeLesson, isUnlocked, getXp, levelProgress } from "../store.js";
import { burstSmall, burstBig } from "../celebrate.js";
import { playCorrect, playWrong, playFinish, playLevelUp, playBadge } from "../sound.js";
import { findLesson, flattenLessons } from "../content.js";
import { renderDiff } from "./diff-view.js";
import { createRegie } from "../figuren.js";

export function renderLesson(app, curriculum, chapterId, lessonId) {
  const found = findLesson(curriculum, chapterId, lessonId);
  if (!found) {
    app.innerHTML = `${renderHeader()}<main class="lesson"><p>Lektion nicht gefunden.</p></main>`;
    return;
  }
  if (!isUnlocked(curriculum, chapterId, lessonId)) {
    app.innerHTML = `${renderHeader()}<main class="lesson"><p>Diese Lektion ist noch gesperrt. 🔒</p><a class="btn" href="#/chapter/${chapterId}">Zurück zum Kapitel</a></main>`;
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
    // Begleitfiguren des Kapitels (null, wenn dieses Kapitel keine hat).
    this.regie = createRegie(curriculum.figuren, lesson.chapterId);
    this.fehlerImSchritt = false;
  }

  // Laesst eine Figur zu Wort kommen: Sprechblase mit Bild unter der Aufgabe.
  // Eine aeltere Blase im selben Schritt wird ersetzt, damit sich nichts
  // stapelt.
  zeigeFigur(auftritt, card) {
    if (!auftritt) return;
    card.querySelector(".figur")?.remove();
    const blase = html(`<div class="figur figur--${auftritt.rolle}${auftritt.vorstellung ? " figur--vorstellung" : ""}">
      <img class="figur__bild" src="${auftritt.bild}" alt="${escape(auftritt.name)}" loading="lazy">
      <div class="figur__blase">
        <span class="figur__name">${escape(auftritt.name)}</span>
        <div class="figur__text">${renderMarkdown(auftritt.text)}</div>
      </div>
    </div>`);
    card.append(blase);
  }

  start() {
    this.app.innerHTML = `
      ${renderHeader()}
      <main class="lesson">
        <div class="lesson__top">
          <a class="lesson__quit" href="#/chapter/${this.lesson.chapterId}" title="Lektion verlassen">✕</a>
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
    this.renderStep();
  }

  updateProgress() {
    const pct = (this.stepIndex / this.lesson.steps.length) * 100;
    this.progressFill.style.width = `${pct}%`;
  }

  async next() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    this.stepIndex++;
    if (this.stepIndex >= this.lesson.steps.length) await this.finish();
    else this.renderStep();
  }

  renderStep() {
    this.updateProgress();
    const step = this.lesson.steps[this.stepIndex];
    this.stage.innerHTML = "";
    this.footer.innerHTML = "";
    this.stage.scrollTop = 0;
    this.fehlerImSchritt = false;
    this.regie?.neuerSchritt();

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
          playCorrect();
          burstSmall();
          this.zeigeFigur(this.regie?.erfolg({ nachFehler: this.fehlerImSchritt }), card);
          this.continueButton();
        } else {
          this.mistakes++;
          this.fehlerImSchritt = true;
          b.classList.add("choice--wrong");
          b.disabled = true;
          feedback.hidden = false;
          feedback.className = "feedback feedback--no";
          feedback.innerHTML = renderMarkdown(step.explainWrong || "Das war nicht richtig. Versuch es nochmal!");
          playWrong();
          this.zeigeFigur(this.regie?.fehler(), card);
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
        playCorrect();
        burstSmall();
        this.zeigeFigur(this.regie?.erfolg({ nachFehler: this.fehlerImSchritt }), card);
        this.footer.innerHTML = "";
        this.continueButton();
      } else {
        this.mistakes++;
        this.fehlerImSchritt = true;
        feedback.hidden = false;
        feedback.className = "feedback feedback--no";
        feedback.textContent = "Noch nicht ganz. Versuch es nochmal!";
        playWrong();
        this.zeigeFigur(this.regie?.fehler(), card);
      }
    };
  }

  // ---- Schritt: Frei programmieren ----
  renderCode(step) {
    const card = html(`<div class="card card--code">
      <div class="prose task">${renderMarkdown(step.task)}</div>
      <div class="editor"></div>
      ${step.needsInput ? `
        <label class="sim-input-label">
          🧪 Eingaben zum Ausprobieren (eine pro Zeile, für input())
          <textarea class="sim-input" rows="2" placeholder="z. B.\nAda\n16"></textarea>
        </label>
      ` : ""}
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
    const simInput = card.querySelector(".sim-input");

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
      const inputs = simInput ? simInput.value.split("\n") : [];
      const res = await runPython(this.editor.getCode(), {
        inputs,
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
        playCorrect();
        burstSmall();
        checkBtn.disabled = true;
        runBtn.disabled = true;

        // Die Loesung funktioniert - jetzt noch pruefen, ob sie auch sauber
        // geschrieben ist. Solche Hinweise zaehlen nicht als Fehler, sie
        // zeigen nur den besseren Weg.
        const offen = await evaluateTips(this.editor.getCode(), step.tips ?? []);
        if (offen.length) {
          const box = html(`<div class="better">
            <div class="better__head">💡 So geht es noch besser</div>
            <div class="better__body">${offen.map((t) => renderMarkdown(t)).join("")}</div>
          </div>`);
          card.append(box);
        }

        this.zeigeFigur(this.regie?.erfolg({ nachFehler: this.fehlerImSchritt }), card);
        this.footer.innerHTML = "";
        this.continueButton();
      } else {
        this.mistakes++;
        this.fehlerImSchritt = true;
        feedback.hidden = false;
        feedback.className = "feedback feedback--no";
        if (result.error) {
          feedback.innerHTML = `<span class="err-detail">${escape(result.error.original)}</span><br>→ ${escape(result.error.explanation)}`;
        } else {
          const offen = result.results.filter((r) => !r.ok);
          const failed = offen.map((r) => `<li>${r.label}</li>`).join("");
          // Wenn nur die Ausgabe abweicht, zeigen wir die genaue Stelle -
          // ein vergessener Punkt ist sonst kaum zu finden.
          const diff = offen.find((r) => r.diff)?.diff;
          feedback.innerHTML =
            `Noch nicht ganz. Diese Prüfung fehlt noch:<ul>${failed}</ul>` +
            (diff ? renderDiff(diff) : "") +
            (step.hints?.length ? "Tipp: Nutze den 💡-Button." : "");
        }
        playWrong();
        this.zeigeFigur(this.regie?.fehler(), card);
        checkBtn.disabled = false;
      }
    };
  }

  // ---- Abschluss ----
  async finish() {
    this.updateProgress();
    this.progressFill.style.width = "100%";

    // Sterne: 3 makellos, sonst Abzug fuer Fehler/Tipps (min. 1).
    const penalty = this.mistakes + (this.hintsUsed > 0 ? 1 : 0);
    const stars = Math.max(1, 3 - penalty);

    const result = await completeLesson(
      this.lesson.id,
      { xp: this.lesson.xp ?? 10, stars },
      this.curriculum
    );

    playFinish();
    burstBig();
    this.updateHeaderXp();
    if (result.leveledUp) setTimeout(() => playLevelUp(), 500);
    if (result.newBadges.length) setTimeout(() => playBadge(), 900);

    const nextHref = this.nextLessonHref();

    this.stage.innerHTML = `
      <div class="card card--finish">
        <div class="finish__emoji">🏆</div>
        <h2>Lektion geschafft!</h2>
        <div class="finish__stars">
          ${[0,1,2].map(i => `<span class="star star--big ${i < stars ? "star--on" : ""}">★</span>`).join("")}
        </div>
        <p class="finish__xp">${result.firstTime ? `+${result.gainedXp} XP` : "Wiederholt – kein neues XP"}</p>

        ${result.leveledUp ? `<p class="finish__levelup">🎉 Level ${result.level} erreicht!</p>` : ""}

        ${result.newBadges.length ? `
          <div class="finish__badges">
            <p class="finish__badges-title">Neue Abzeichen!</p>
            <div class="badge-reveal-row">
              ${result.newBadges.map((b) => `
                <div class="badge-chip badge-chip--earned badge-chip--new" title="${b.desc}">
                  <span class="badge-chip__icon">${b.icon}</span>
                  <span class="badge-chip__title">${b.title}</span>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    `;

    // Zum Schluss meldet sich eine Figur des Kapitels und ordnet die Lektion
    // in die Geschichte ein.
    const abschluss = this.regie?.abschluss();
    if (abschluss) this.zeigeFigur(abschluss, this.stage.querySelector(".card--finish"));

    this.footer.innerHTML = "";
    const back = html(`<a class="btn btn--ghost" href="#/chapter/${this.lesson.chapterId}">Zum Kapitel</a>`);
    this.footer.append(back);
    if (nextHref) {
      const nextBtn = html(`<a class="btn btn--primary" href="${nextHref}">Nächste Lektion →</a>`);
      this.footer.append(nextBtn);
    }
  }

  // Aktualisiert Level/XP-Balken/Zahl im (bereits gerenderten) Header live,
  // ohne die ganze Seite neu zu laden.
  updateHeaderXp() {
    const xp = getXp();
    const { level, ratio } = levelProgress(xp);
    const xpEl = this.app.querySelector(".xp-count");
    const fillEl = this.app.querySelector(".xpbar__fill");
    const levelEl = this.app.querySelector(".badge-level");
    if (xpEl) animateNumber(xpEl, xp);
    if (fillEl) fillEl.style.width = `${Math.round(ratio * 100)}%`;
    if (levelEl) levelEl.textContent = `Level ${level}`;
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
