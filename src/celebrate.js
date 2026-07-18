// Erfolgs-Animationen: Konfetti bei richtigen Loesungen und Lektionsabschluss.

import confetti from "canvas-confetti";

export function burstSmall() {
  confetti({
    particleCount: 40,
    spread: 55,
    startVelocity: 30,
    origin: { y: 0.7 },
    colors: ["#22c55e", "#16a34a", "#facc15", "#38bdf8"],
  });
}

export function burstBig() {
  const end = Date.now() + 700;
  (function frame() {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 60,
      origin: { x: 0 },
      colors: ["#22c55e", "#facc15", "#38bdf8", "#f472b6"],
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 60,
      origin: { x: 1 },
      colors: ["#22c55e", "#facc15", "#38bdf8", "#f472b6"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
