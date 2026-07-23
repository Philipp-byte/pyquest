// Erfolgs-Animationen: mehrere Varianten pro Anlass, zufaellig ausgewaehlt,
// damit sich nicht jede richtige Antwort/jeder Lektionsabschluss gleich
// anfuehlt.

import confetti from "canvas-confetti";

// ---------- Kleine Feiern (richtige Antwort bei Quiz/Fill/Code) ----------

function confettiPop() {
  confetti({
    particleCount: 40, spread: 55, startVelocity: 30,
    origin: { y: 0.7 }, colors: ["#22c55e", "#16a34a", "#facc15", "#38bdf8"],
  });
}

function confettiStars() {
  confetti({
    particleCount: 28, spread: 70, startVelocity: 35, scalar: 1.1,
    shapes: ["star"], origin: { y: 0.7 },
    colors: ["#facc15", "#f472b6", "#a78bfa"],
  });
}

function confettiRing() {
  confetti({
    particleCount: 45, spread: 360, startVelocity: 22, ticks: 60, scalar: 0.9,
    origin: { y: 0.6 }, colors: ["#38bdf8", "#22c55e", "#f472b6"],
  });
}

// Kleine DOM-Animation statt Konfetti - fuer Abwechslung auch jenseits von
// canvas-confetti.
function emojiPop() {
  const emojis = ["🎉", "✨", "👏", "🔥", "💯", "⭐"];
  const el = document.createElement("div");
  el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `
    position: fixed; top: 28%; left: 50%; transform: translate(-50%, -50%) scale(.4);
    font-size: 4rem; pointer-events: none; z-index: 9999; opacity: 0;
    transition: transform .5s cubic-bezier(.34,1.56,.64,1), opacity .5s;
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translate(-50%, -50%) scale(1.3)";
  });
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translate(-50%, -60%) scale(1)";
  }, 550);
  setTimeout(() => el.remove(), 1100);
}

const smallCelebrations = [confettiPop, confettiStars, confettiRing, emojiPop];

export function burstSmall() {
  const pick = smallCelebrations[Math.floor(Math.random() * smallCelebrations.length)];
  pick();
}

// ---------- Grosse Feiern (Lektion abgeschlossen) ----------

function sideCannons() {
  const end = Date.now() + 700;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, colors: ["#22c55e", "#facc15", "#38bdf8", "#f472b6"] });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, colors: ["#22c55e", "#facc15", "#38bdf8", "#f472b6"] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

function fireworks() {
  const end = Date.now() + 900;
  (function frame() {
    confetti({
      particleCount: 25, spread: 60, startVelocity: 40,
      origin: { x: Math.random() * 0.6 + 0.2, y: Math.random() * 0.3 + 0.3 },
      colors: ["#a78bfa", "#38bdf8", "#facc15"],
    });
    if (Date.now() < end) setTimeout(frame, 250);
  })();
}

function starRain() {
  const end = Date.now() + 800;
  (function frame() {
    confetti({
      particleCount: 8, startVelocity: 10, spread: 100, ticks: 100, gravity: 0.6,
      origin: { x: Math.random(), y: -0.1 }, shapes: ["star"],
      colors: ["#facc15", "#22c55e", "#f472b6"],
    });
    if (Date.now() < end) setTimeout(frame, 120);
  })();
}

const bigCelebrations = [sideCannons, fireworks, starRain];

export function burstBig() {
  const pick = bigCelebrations[Math.floor(Math.random() * bigCelebrations.length)];
  pick();
}
