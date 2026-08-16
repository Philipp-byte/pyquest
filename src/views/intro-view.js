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
    </main>
  `;

  const frame = app.querySelector(".intro-frame");

  let fertig = false;
  const beenden = () => {
    if (fertig) return;
    fertig = true;
    markIntroSeen();
    if (onDone) onDone();
    else location.hash = "#/";
  };

  // Verlassen geht ueber die Knoepfe IM Vorspann selbst ("Ohne Intro weiter
  // zum Lernpfad" auf dem Startbildschirm, "Intro ueberspringen" waehrend der
  // Wiedergabe, "Abenteuer beginnen" am Ende) - alle enden im selben
  // Abschluss-Ereignis. Ein eigener Knopf ueber dem iframe lag frueher
  // ueber dem PyQuest-Schriftzug des Vorspanns und ist deshalb weg.
  frame.addEventListener("load", () => {
    try {
      frame.contentWindow.addEventListener("pyquest:intro-complete", beenden);
    } catch {
      // Gleiche Herkunft - der Zugriff funktioniert. Als letztes Netz, falls
      // doch etwas schiefgeht: Zurueck-Navigation des Browsers bleibt immer
      // moeglich, und der Router zeigt dann wieder den Lernpfad.
      markIntroSeen();
    }
  });
}
