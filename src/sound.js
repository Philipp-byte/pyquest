// Kleine Soundeffekte, synthetisiert per Web Audio API - keine externen
// Audiodateien noetig. Funktioniert damit auch offline im Schulmodus und
// wirft keine Lizenzfragen auf. Stummschaltung wird lokal gemerkt.

const KEY = "pyquest.muted";
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function isMuted() {
  return localStorage.getItem(KEY) === "1";
}

export function setMuted(muted) {
  localStorage.setItem(KEY, muted ? "1" : "0");
}

export function toggleMuted() {
  const next = !isMuted();
  setMuted(next);
  return next;
}

function tone(freq, start, duration, type = "sine", gain = 0.15) {
  if (isMuted()) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = 0;
    osc.connect(g);
    g.connect(c.destination);
    const t0 = c.currentTime + start;
    g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  } catch {
    // Web Audio nicht verfuegbar - Soundeffekte sind optional, einfach ignorieren.
  }
}

export function playCorrect() {
  tone(660, 0, 0.12);
  tone(880, 0.09, 0.18);
}

export function playWrong() {
  tone(220, 0, 0.18, "sawtooth", 0.1);
}

export function playFinish() {
  tone(523, 0, 0.12);
  tone(659, 0.1, 0.12);
  tone(784, 0.2, 0.25);
}

export function playLevelUp() {
  tone(523, 0, 0.1);
  tone(659, 0.09, 0.1);
  tone(784, 0.18, 0.1);
  tone(1046, 0.27, 0.3);
}

export function playBadge() {
  tone(784, 0, 0.1);
  tone(1046, 0.1, 0.22);
}
