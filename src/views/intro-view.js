// Vorspann (Intro) als eigenstaendige Seite in einem iframe.
//
// Warum ein iframe und keine direkte Einbettung: Das Intro bringt gut 1000
// Zeilen eigenes CSS und einen eigenen Vollbild-Aufbau mit. Im iframe kann
// sich das garantiert nicht mit den Stilen der Lern-App beissen, und der
// Vorspann laedt erst, wenn er wirklich gezeigt wird.
//
// Der Vorspann meldet seinen Abschluss ueber das Ereignis
// "pyquest:intro-complete" (siehe docs/INTEGRATION.md im Intro-Paket).
// Weil das iframe von derselben Herkunft kommt, koennen wir direkt zuhoeren.

import { markIntroSeen } from "../intro-state.js";

const INTRO_URL = `${import.meta.env.BASE_URL}intro/index.html`;

export function renderIntro(app, { onDone } = {}) {
  app.innerHTML = `
    <main class="intro-page">
      <iframe class="intro-frame" src="${INTRO_URL}" title="PyQuest Vorspann"></iframe>
      <button class="intro-exit" type="button" title="Vorspann verlassen">
        ✕ <span>Zum Lernpfad</span>
      </button>
    </main>
  `;

  const frame = app.querySelector(".intro-frame");
  const exit = app.querySelector(".intro-exit");

  let fertig = false;
  const beenden = () => {
    if (fertig) return;
    fertig = true;
    markIntroSeen();
    if (onDone) onDone();
    else location.hash = "#/";
  };

  exit.onclick = beenden;

  // Sobald der Vorspann geladen ist, auf sein Abschluss-Ereignis hoeren.
  frame.addEventListener("load", () => {
    try {
      frame.contentWindow.addEventListener("pyquest:intro-complete", beenden);
    } catch {
      // Sollte der Zugriff wider Erwarten scheitern, bleibt der
      // Verlassen-Knopf als Ausweg - niemand sitzt fest.
    }
  });
}
