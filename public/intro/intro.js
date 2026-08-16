import { characterAsset, worldAsset } from './lib/pyquest-assets.js';

const sceneAsset = (name) => new URL(`./assets/scenes/${name}`, import.meta.url).href;

const ACTS = {
  1: { label: 'AKT I', title: 'Der letzte ruhige Morgen' },
  2: { label: 'AKT II', title: 'Der Angriff' },
  3: { label: 'AKT III', title: 'Neustart' },
};

const WORLD_NAMES = [
  'Neustart', 'Speicherstadt', 'Typopolis', 'Textoria',
  'Operatia', 'Dialoga', 'Entscheidora', 'Itera',
  'Listara', 'Forvania', 'Funktoria', 'Matrixa',
  'Lexikona', 'Objektiva', 'Archivia', 'Finalia',
];

const scenes = [
  {
    act: 1,
    background: worldAsset('neustart', 'intact'),
    position: '50% 46%',
    speaker: 'Erzählung',
    tone: 'narration',
    text: 'Hoch über den Wolken wacht die Akademie über den Quellcode, der sechzehn Welten miteinander verbindet.',
    characters: [
      { id: 'ada', pose: 'neutral', position: 'left' },
      { id: 'py', pose: 'funny', position: 'right', small: true },
    ],
    effect: 'hope',
    sfx: 'chime',
  },
  {
    act: 1,
    background: worldAsset('neustart', 'intact'),
    position: '47% 52%',
    speaker: 'Wächterin Ada',
    tone: 'hero',
    text: 'Siehst du die Portallichter, Py? Jedes davon ist ein Versprechen: Wissen soll allen gehören.',
    characters: [
      { id: 'ada', pose: 'clever', position: 'left' },
      { id: 'py', pose: 'thoughtful', position: 'right', small: true },
    ],
    effect: 'hope',
    sfx: 'spark',
  },
  {
    act: 1,
    background: worldAsset('neustart', 'intact'),
    position: '56% 48%',
    speaker: 'Py',
    tone: 'hero',
    side: 'right',
    text: 'Und wenn ich einen Fehler mache? Einen richtig großen?',
    characters: [
      { id: 'ada', pose: 'funny', position: 'left' },
      { id: 'py', pose: 'worried', position: 'right' },
    ],
    effect: 'hope',
    sfx: 'soft',
  },
  {
    act: 1,
    background: worldAsset('neustart', 'intact'),
    position: '44% 44%',
    speaker: 'Wächterin Ada',
    tone: 'hero',
    text: 'Dann lösen wir ihn gemeinsam. Mut heißt nicht, fehlerfrei zu sein. Mut heißt, weiterzusuchen.',
    characters: [
      { id: 'ada', pose: 'thoughtful', position: 'left' },
      { id: 'py', pose: 'clever', position: 'right', small: true },
    ],
    effect: 'hope',
    sfx: 'chime',
  },
  {
    act: 1,
    // Bildverlauf: Bei der Warnung ist die Akademie noch nicht zerstoert -
    // die Korruption beginnt gerade erst (zerstoert wird sie erst ab dem
    // zweiten Schlag auf den Kern).
    background: worldAsset('neustart', 'corrupted'),
    position: '50% 45%',
    speaker: 'Akademie-System',
    tone: 'danger',
    text: 'WARNUNG: Unbekannter Zugriff auf den Quellcode-Kern. Schutzringe eins bis sieben fallen aus.',
    badge: { eyebrow: 'SICHERHEITSSTUFE ROT', title: 'FREMDZUGRIFF ERKANNT' },
    characters: [
      { id: 'ada', pose: 'surprised', position: 'left' },
      { id: 'py', pose: 'surprised', position: 'right', small: true },
    ],
    effect: 'danger',
    sfx: 'alarm',
  },
  {
    act: 1,
    background: sceneAsset('null-attacks.webp'),
    position: '48% 44%',
    speaker: 'Erzählung',
    tone: 'narration',
    text: 'Aus einem Riss im Code tritt der Mann, der die Akademie verraten hat: Professor Null.',
    badge: { eyebrow: 'PROFESSOR NULL', title: 'FEINDLICHER EINDRINGLING', enemy: true },
    characters: [],
    effect: 'glitch',
    sfx: 'glitch',
  },
  {
    act: 1,
    background: sceneAsset('null-attacks.webp'),
    position: '42% 40%',
    speaker: 'Professor Null · Feind',
    tone: 'null',
    text: 'Ihr nennt es Freiheit. Ich nenne es Chaos. Heute lösche ich jede Wahl – und schreibe nur noch meine Regeln.',
    badge: { eyebrow: 'HAUPTGEGNER', title: 'PROFESSOR NULL', enemy: true },
    characters: [],
    effect: 'glitch',
    sfx: 'warning',
  },
  {
    act: 1,
    // Bildverlauf: Der Kern ist hier noch heil ("Er WILL ihn zerbrechen") -
    // deshalb die laufende Attacke zeigen, nicht die schon zerstoerte Halle.
    background: sceneAsset('null-attacks.webp'),
    position: '50% 50%',
    speaker: 'Wächterin Ada',
    tone: 'danger',
    text: 'Py, hinter mich! Er will den Kern zerbrechen und alle sechzehn Welten voneinander abschneiden.',
    characters: [
      { id: 'ada', pose: 'angry', position: 'left' },
      { id: 'py', pose: 'worried', position: 'right', small: true },
    ],
    effect: 'danger',
    sfx: 'alarm',
  },
  {
    act: 2,
    background: sceneAsset('null-attacks.webp'),
    position: '52% 43%',
    speaker: 'Professor Null · Feind',
    tone: 'null',
    side: 'right',
    text: 'Zu spät, Ada. Ein einziger Befehl – und eure schöne Zukunft zerfällt.',
    characters: [
      { id: 'ada', pose: 'angry', position: 'left' },
      { id: 'null', pose: 'victory', position: 'right' },
    ],
    effect: 'glitch',
    sfx: 'warning',
  },
  {
    act: 2,
    background: sceneAsset('null-attacks.webp'),
    position: '49% 47%',
    speaker: 'Wächterin Ada',
    tone: 'danger',
    text: 'PY – RUNTER!',
    badge: { eyebrow: 'ENERGIESCHILD', title: 'TREFFER ABGEWEHRT' },
    characters: [
      { id: 'ada', pose: 'angry', position: 'left' },
      { id: 'py', pose: 'worried', position: 'right', small: true },
    ],
    effect: 'impact',
    impactWord: 'ZZZAAK!',
    sfx: 'impact',
  },
  {
    act: 2,
    background: sceneAsset('academy-destroyed.webp'),
    position: '50% 43%',
    speaker: 'Erzählung',
    tone: 'narration',
    text: 'Adas Schild hält. Doch Nulls zweiter Schlag trifft den Quellcode-Kern.',
    characters: [
      { id: 'ada', pose: 'worried', position: 'left' },
      { id: 'null', pose: 'angry', position: 'right' },
    ],
    effect: 'impact',
    sfx: 'impact',
  },
  {
    act: 2,
    background: worldAsset('matrixa', 'corrupted'),
    position: '50% 48%',
    speaker: 'Erzählung',
    tone: 'narration',
    text: 'Der Kern zerbricht in sechzehn Fragmente. Wie Sternschnuppen stürzen sie durch die Portale.',
    characters: [],
    effect: 'portal',
    sfx: 'shatter',
  },
  {
    act: 2,
    background: worldAsset('finalia', 'corrupted'),
    position: '50% 44%',
    speaker: 'Professor Null · Feind',
    tone: 'null',
    side: 'right',
    text: 'Jede Stadt bekommt einen Teil meiner Leere. Wer lernen will, muss zuerst an mir vorbei.',
    characters: [
      { id: 'null', pose: 'victory', position: 'right' },
    ],
    effect: 'glitch',
    sfx: 'glitch',
  },
  {
    act: 2,
    background: sceneAsset('academy-destroyed.webp'),
    position: '43% 52%',
    speaker: 'Py',
    tone: 'hero',
    side: 'right',
    text: 'Ada! Der Kern … die ganze Akademie …',
    characters: [
      { id: 'ada', pose: 'worried', position: 'left' },
      { id: 'py', pose: 'surprised', position: 'right', small: true },
    ],
    effect: 'danger',
    sfx: 'soft',
  },
  {
    act: 2,
    background: sceneAsset('academy-portal.webp'),
    position: '50% 52%',
    speaker: 'Akademie-System',
    tone: 'ally',
    text: 'Rettungskapsel 01 entriegelt. Zielportal „Neustart“ ist instabil, aber erreichbar.',
    badge: { eyebrow: 'RETTUNGSKAPSEL 01', title: 'STARTBEREIT' },
    characters: [],
    effect: 'portal',
    sfx: 'unlock',
  },
  {
    act: 2,
    background: sceneAsset('academy-portal.webp'),
    position: '52% 50%',
    speaker: 'Wächterin Ada',
    tone: 'hero',
    text: 'Py, in die Rettungskapsel. Ich öffne dir das Portal und halte Null auf.',
    badge: { eyebrow: 'FLUCHTROUTE', title: 'PORTAL NACH NEUSTART' },
    characters: [],
    effect: 'portal',
    sfx: 'portal',
  },
  {
    act: 2,
    background: sceneAsset('academy-portal.webp'),
    position: '47% 53%',
    speaker: 'Py',
    tone: 'hero',
    side: 'right',
    text: 'Nein. Ich lasse dich nicht hier. Nicht mit ihm.',
    characters: [],
    effect: 'danger',
    sfx: 'soft',
  },
  {
    act: 2,
    background: sceneAsset('academy-portal.webp'),
    position: '46% 48%',
    speaker: 'Wächterin Ada',
    tone: 'hero',
    text: 'Du lässt mich nicht zurück. Du trägst unsere Hoffnung weiter. Finde die Fragmente – und bring die Welten wieder zusammen.',
    characters: [],
    effect: 'hope',
    sfx: 'chime',
  },
  {
    act: 2,
    background: sceneAsset('academy-portal.webp'),
    position: '57% 49%',
    speaker: 'Py',
    tone: 'hero',
    side: 'right',
    text: 'Ich komme zurück. Das verspreche ich.',
    badge: { eyebrow: 'RETTUNGSKAPSEL 01', title: 'START IN 3 … 2 … 1' },
    characters: [],
    effect: 'portal',
    sfx: 'launch',
  },
  {
    act: 3,
    background: sceneAsset('portal-flight.webp'),
    position: '50% 50%',
    speaker: 'Erzählung',
    tone: 'narration',
    text: 'Die Kapsel schießt in den Datentunnel. Hinter Py versinkt die Akademie im violetten Sturm.',
    badge: { eyebrow: 'KAPSEL 01', title: 'TRANSIT NACH NEUSTART' },
    characters: [],
    effect: 'portal',
    sfx: 'launch',
  },
  {
    act: 3,
    background: sceneAsset('null-attacks.webp'),
    position: '48% 43%',
    speaker: 'Professor Null · Feind',
    tone: 'null',
    text: 'Du glaubst, eine kleine Schlange könne meinen perfekten Code besiegen?',
    characters: [],
    effect: 'glitch',
    sfx: 'warning',
  },
  {
    act: 3,
    background: sceneAsset('academy-portal.webp'),
    position: '42% 46%',
    speaker: 'Wächterin Ada',
    tone: 'danger',
    text: 'Nicht perfekt, Null. Frei. Und Freiheit findet immer einen neuen Weg.',
    // Laut Szenenplan ein SICHTBARER Kampf - deshalb stehen beide im Bild.
    characters: [
      { id: 'ada', pose: 'angry', position: 'left' },
      { id: 'null', pose: 'angry', position: 'right' },
    ],
    effect: 'impact',
    impactWord: 'KRRAAAM!',
    sfx: 'impact',
  },
  {
    act: 3,
    background: sceneAsset('portal-flight.webp'),
    position: '57% 48%',
    speaker: 'Py',
    tone: 'hero',
    side: 'right',
    text: 'Komm schon … nur noch ein kleines Stück!',
    characters: [],
    effect: 'portal',
    sfx: 'portal',
  },
  {
    act: 3,
    background: sceneAsset('portal-flight.webp'),
    position: '44% 50%',
    speaker: 'Kapsel-System',
    tone: 'danger',
    text: 'Portal kollabiert. Steuerung ausgefallen. Aufprall in fünf Sekunden.',
    badge: { eyebrow: 'KRITISCHER FEHLER', title: 'MANUELLE STEUERUNG AUSGEFALLEN' },
    characters: [],
    effect: 'glitch',
    sfx: 'alarm',
  },
  {
    act: 3,
    background: sceneAsset('capsule-crash.webp'),
    position: '50% 55%',
    speaker: 'Erzählung',
    tone: 'narration',
    text: 'Mit kreischendem Metall schlägt die Rettungskapsel in Neustart auf. Py lebt – aber die Verbindung zur Akademie ist fort.',
    badge: { eyebrow: 'RETTUNGSKAPSEL 01', title: 'NOTLANDUNG' },
    characters: [],
    effect: 'impact',
    impactWord: 'KRRRASH!',
    sfx: 'crash',
  },
  {
    act: 3,
    background: sceneAsset('capsule-crash.webp'),
    position: '44% 55%',
    speaker: 'Professor Null · Übertragung',
    tone: 'null',
    side: 'right',
    text: 'Lauf nur, Py. Bald gehört jede Stadt mir.',
    badge: { eyebrow: 'RETTUNGSKAPSEL 01', title: 'NOTLANDUNG' },
    characters: [
      { id: 'null', pose: 'victory', position: 'right', transmission: true },
    ],
    effect: 'glitch',
    sfx: 'glitch',
  },
  {
    act: 3,
    background: sceneAsset('capsule-crash.webp'),
    position: '58% 56%',
    speaker: 'Py',
    tone: 'hero',
    side: 'right',
    text: 'Ich habe Angst. Aber Ada hat mir vertraut. Also stehe ich wieder auf.',
    characters: [],
    effect: 'rain',
    sfx: 'soft',
  },
  {
    act: 3,
    // Bildverlauf: Die Folgeszene zeigt dieselbe Stadt als "corrupted" -
    // und Nulls Plan ist Korrumpierung, nicht Totalzerstoerung. Deshalb
    // hier derselbe Zustand, sonst "erholt" sich die Stadt rueckwaerts.
    background: worldAsset('neustart', 'corrupted'),
    position: '50% 48%',
    speaker: 'Code-Scout Nia',
    tone: 'ally',
    text: 'Dann stehst du nicht allein auf. Ich bin Nia – und Null hat auch meine Stadt angegriffen.',
    characters: [
      { id: 'nia', pose: 'clever', position: 'left' },
      { id: 'py', pose: 'surprised', position: 'right', small: true },
    ],
    effect: 'hope',
    sfx: 'chime',
  },
  {
    act: 3,
    background: worldAsset('neustart', 'corrupted'),
    position: '50% 50%',
    speaker: 'Byte',
    tone: 'ally',
    text: 'Analyse abgeschlossen: sechzehn Fragmente, sechzehn Städte – und eine sehr gute Chance, Nulls Plan zu debuggen.',
    characters: [
      { id: 'glitch', pose: 'funny', position: 'left', small: true },
      { id: 'byte', pose: 'clever', position: 'center', small: true },
      { id: 'py', pose: 'funny', position: 'right', small: true },
    ],
    effect: 'hope',
    sfx: 'spark',
  },
  {
    act: 3,
    background: worldAsset('finalia', 'corrupted'),
    position: '50% 48%',
    speaker: 'Archivarin Memo',
    tone: 'ally',
    text: 'Jede Welt bewahrt ein Stück des Wissens. Lernt ihre Sprache, öffnet ihre Tore und holt den Quellcode zurück.',
    characters: [
      { id: 'memo', pose: 'thoughtful', position: 'left' },
      { id: 'nia', pose: 'angry', position: 'right' },
    ],
    worldMap: true,
    effect: 'portal',
    sfx: 'chime',
  },
  {
    act: 3,
    background: worldAsset('neustart', 'restored'),
    position: '50% 46%',
    speaker: 'Py',
    tone: 'hero',
    side: 'right',
    text: 'Dann beginnen wir hier. Wir retten die Städte, wir finden Ada – und wir zeigen Null, dass unser Code uns allen gehört.',
    characters: [
      { id: 'nia', pose: 'victory', position: 'left', small: true },
      { id: 'py', pose: 'victory', position: 'center' },
      { id: 'byte', pose: 'victory', position: 'right', small: true },
    ],
    effect: 'hope',
    sfx: 'victory',
  },
];

class Soundscape {
  constructor() {
    this.context = null;
    this.master = null;
    this.music = null;
    this.effects = null;
    this.muted = false;
    this.ambientNodes = [];
  }

  async start() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.context.createGain();
      this.music = this.context.createGain();
      this.effects = this.context.createGain();
      this.master.gain.value = .16;
      this.music.gain.value = .18;
      this.effects.gain.value = .68;
      this.music.connect(this.master);
      this.effects.connect(this.master);
      this.master.connect(this.context.destination);
      this.startAmbient();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  startAmbient() {
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = .7;
    filter.connect(this.music);

    [55, 82.41, 110].forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = index === 1 ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 1 ? .08 : .055;
      oscillator.connect(gain).connect(filter);
      oscillator.start();
      this.ambientNodes.push(oscillator, gain);
    });

    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.frequency.value = .07;
    lfoGain.gain.value = .035;
    lfo.connect(lfoGain).connect(this.music.gain);
    lfo.start();
    this.ambientNodes.push(lfo, lfoGain, filter);
  }

  setMuted(nextMuted) {
    this.muted = nextMuted;
    if (!this.master || !this.context) return;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.linearRampToValueAtTime(nextMuted ? 0 : .16, this.context.currentTime + .12);
  }

  tone(frequency, duration = .2, type = 'sine', gainValue = .25, delay = 0, endFrequency = null) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(this.effects);
    oscillator.start(start);
    oscillator.stop(start + duration + .05);
  }

  noise(duration = .28, gainValue = .22, frequency = 900, delay = 0) {
    if (!this.context || this.muted) return;
    const sampleCount = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      const fade = 1 - index / sampleCount;
      data[index] = (Math.random() * 2 - 1) * fade;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const start = this.context.currentTime + delay;
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.effects);
    source.start(start);
  }

  play(name) {
    if (!this.context || this.muted) return;
    const effects = {
      soft: () => this.tone(220, .25, 'sine', .08, 0, 196),
      spark: () => {
        this.tone(740, .16, 'sine', .13);
        this.tone(988, .22, 'sine', .1, .08);
      },
      chime: () => {
        this.tone(392, .4, 'sine', .11);
        this.tone(523.25, .5, 'sine', .11, .1);
        this.tone(659.25, .65, 'sine', .09, .2);
      },
      alarm: () => {
        this.tone(480, .18, 'square', .12);
        this.tone(320, .22, 'square', .1, .2);
        this.tone(480, .18, 'square', .1, .45);
      },
      warning: () => {
        this.tone(170, .55, 'sawtooth', .18, 0, 115);
        this.tone(255, .32, 'square', .07, .08, 190);
      },
      glitch: () => {
        [0, .06, .13, .2].forEach((delay, index) => this.tone(460 - index * 72, .055, 'square', .1, delay));
        this.noise(.25, .08, 1800);
      },
      impact: () => {
        this.noise(.42, .34, 720);
        this.tone(115, .5, 'sawtooth', .28, 0, 42);
      },
      shatter: () => {
        this.noise(.55, .25, 2500);
        [920, 760, 610, 480].forEach((frequency, index) => this.tone(frequency, .22, 'triangle', .08, index * .06, frequency * .55));
      },
      unlock: () => {
        this.tone(280, .15, 'sine', .12);
        this.tone(560, .3, 'triangle', .11, .12);
      },
      portal: () => {
        this.tone(120, .75, 'sine', .18, 0, 620);
        this.tone(360, .55, 'triangle', .08, .12, 920);
      },
      launch: () => {
        this.noise(.85, .22, 1100);
        this.tone(75, .9, 'sawtooth', .24, 0, 310);
      },
      crash: () => {
        this.noise(.8, .4, 520);
        this.tone(90, .75, 'sawtooth', .32, 0, 34);
        this.noise(.35, .18, 1800, .22);
      },
      victory: () => {
        [392, 523.25, 659.25, 783.99].forEach((frequency, index) => this.tone(frequency, .65, 'triangle', .12, index * .12));
      },
    };
    (effects[name] || effects.soft)();
  }
}

const elements = {
  startScreen: document.querySelector('#startScreen'),
  startButton: document.querySelector('#startButton'),
  player: document.querySelector('#player'),
  endScreen: document.querySelector('#endScreen'),
  stage: document.querySelector('#stage'),
  backdropA: document.querySelector('#backdropA'),
  backdropB: document.querySelector('#backdropB'),
  sceneOverlay: document.querySelector('#sceneOverlay'),
  particles: document.querySelector('#particles'),
  characterLayer: document.querySelector('#characterLayer'),
  worldMap: document.querySelector('#worldMap'),
  sceneBadge: document.querySelector('#sceneBadge'),
  badgeEyebrow: document.querySelector('#badgeEyebrow'),
  badgeTitle: document.querySelector('#badgeTitle'),
  speechBubble: document.querySelector('#speechBubble'),
  speakerName: document.querySelector('#speakerName'),
  dialogueText: document.querySelector('#dialogueText'),
  actLabel: document.querySelector('#actLabel'),
  actTitle: document.querySelector('#actTitle'),
  sceneNumber: document.querySelector('#sceneNumber'),
  sceneTotal: document.querySelector('#sceneTotal'),
  topProgress: document.querySelector('#topProgress'),
  backButton: document.querySelector('#backButton'),
  nextButton: document.querySelector('#nextButton'),
  soundButton: document.querySelector('#soundButton'),
  skipButton: document.querySelector('#skipButton'),
  adventureButton: document.querySelector('#adventureButton'),
  replayButton: document.querySelector('#replayButton'),
};

const soundscape = new Soundscape();
let currentScene = 0;
let activeBackdrop = 0;
let hasStarted = false;

function setBackdrop(scene, immediate = false) {
  const backdrops = [elements.backdropA, elements.backdropB];
  const current = backdrops[activeBackdrop];
  const nextIndex = immediate ? activeBackdrop : 1 - activeBackdrop;
  const next = backdrops[nextIndex];
  next.style.backgroundImage = `url("${scene.background}")`;
  next.style.setProperty('--background-position', scene.position || '50% 50%');
  next.style.setProperty('--camera-x-start', scene.camera?.[0] || '-.45%');
  next.style.setProperty('--camera-y-start', scene.camera?.[1] || '-.25%');
  next.style.setProperty('--camera-x-end', scene.camera?.[2] || '.45%');
  next.style.setProperty('--camera-y-end', scene.camera?.[3] || '.25%');

  if (immediate) {
    next.classList.add('is-active');
    return;
  }

  next.classList.remove('is-leaving');
  next.classList.add('is-active');
  current.classList.add('is-leaving');
  current.classList.remove('is-active');
  activeBackdrop = nextIndex;
  window.setTimeout(() => current.classList.remove('is-leaving'), 950);
}

function renderCharacters(characters = []) {
  const nodes = characters.map((character) => {
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    figure.className = [
      'character',
      `character--${character.position || 'left'}`,
      character.small ? 'character--small' : '',
      character.transmission ? 'character--transmission' : '',
    ].filter(Boolean).join(' ');
    image.src = characterAsset(character.id, character.pose);
    image.alt = '';
    image.decoding = 'async';
    figure.append(image);
    return figure;
  });
  elements.characterLayer.replaceChildren(...nodes);
}

function renderParticles(effect) {
  const shouldRender = ['portal', 'hope', 'glitch', 'danger'].includes(effect);
  if (!shouldRender) {
    elements.particles.replaceChildren();
    return;
  }
  const colors = effect === 'glitch' || effect === 'danger'
    ? ['#c967ff', '#ff5d90', '#724cff']
    : ['#65f4c7', '#55d8ff', '#d8fff5'];
  const nodes = Array.from({ length: effect === 'portal' ? 20 : 12 }, (_, index) => {
    const particle = document.createElement('span');
    const size = 2 + Math.random() * 5;
    particle.className = 'particle';
    particle.style.setProperty('--left', `${4 + Math.random() * 92}%`);
    particle.style.setProperty('--top', `${20 + Math.random() * 70}%`);
    particle.style.setProperty('--size', `${size}px`);
    particle.style.setProperty('--duration', `${3.5 + Math.random() * 4}s`);
    particle.style.setProperty('--delay', `${-Math.random() * 4}s`);
    particle.style.setProperty('--drift', `${-40 + Math.random() * 80}px`);
    particle.style.setProperty('--color', colors[index % colors.length]);
    particle.style.setProperty('--radius', effect === 'glitch' ? '1px' : '50%');
    return particle;
  });
  elements.particles.replaceChildren(...nodes);
}

function renderWorldMap(visible) {
  elements.worldMap.hidden = !visible;
  if (!visible) {
    elements.worldMap.replaceChildren();
    return;
  }
  const nodes = WORLD_NAMES.map((name, index) => {
    const node = document.createElement('span');
    node.className = 'world-node';
    node.style.setProperty('--i', index);
    node.textContent = String(index + 1).padStart(2, '0');
    node.title = name;
    return node;
  });
  elements.worldMap.replaceChildren(...nodes);
}

function renderBadge(badge) {
  elements.sceneBadge.hidden = !badge;
  elements.sceneBadge.classList.toggle('is-enemy', Boolean(badge?.enemy));
  if (!badge) return;
  elements.badgeEyebrow.textContent = badge.eyebrow;
  elements.badgeTitle.textContent = badge.title;
}

function renderImpactWord(word) {
  elements.sceneOverlay.replaceChildren();
  if (!word) return;
  const impact = document.createElement('strong');
  impact.className = 'impact-word';
  impact.textContent = word;
  elements.sceneOverlay.append(impact);
}

function renderScene(index, { immediate = false, silent = false } = {}) {
  currentScene = Math.max(0, Math.min(index, scenes.length - 1));
  const scene = scenes[currentScene];
  const act = ACTS[scene.act];
  setBackdrop(scene, immediate);
  elements.stage.dataset.effect = scene.effect || '';
  elements.stage.classList.remove('scene-impact');
  if (scene.effect === 'impact') {
    void elements.stage.offsetWidth;
    elements.stage.classList.add('scene-impact');
  }
  renderImpactWord(scene.impactWord);
  renderCharacters(scene.characters);
  renderParticles(scene.effect);
  renderWorldMap(scene.worldMap);
  renderBadge(scene.badge);

  elements.speechBubble.dataset.tone = scene.tone || 'hero';
  elements.speechBubble.dataset.side = scene.side || 'left';
  elements.speechBubble.style.animation = 'none';
  void elements.speechBubble.offsetWidth;
  elements.speechBubble.style.animation = '';
  elements.speakerName.textContent = scene.speaker;
  elements.dialogueText.textContent = scene.text;
  elements.actLabel.textContent = act.label;
  elements.actTitle.textContent = act.title;
  elements.sceneNumber.textContent = currentScene + 1;
  elements.sceneTotal.textContent = scenes.length;
  elements.topProgress.style.width = `${((currentScene + 1) / scenes.length) * 100}%`;
  elements.backButton.disabled = currentScene === 0;
  elements.nextButton.innerHTML = currentScene === scenes.length - 1
    ? 'Abenteuer beginnen <span aria-hidden="true">›</span>'
    : 'Weiter <span aria-hidden="true">›</span>';
  document.title = `PyQuest – Szene ${currentScene + 1} von ${scenes.length}`;
  if (!silent) soundscape.play(scene.sfx);
}

async function startIntro() {
  await soundscape.start();
  hasStarted = true;
  elements.startScreen.hidden = true;
  elements.endScreen.hidden = true;
  elements.player.hidden = false;
  renderScene(0, { immediate: true });
  elements.nextButton.focus({ preventScroll: true });
}

function finishIntro() {
  elements.player.hidden = true;
  elements.startScreen.hidden = true;
  elements.endScreen.hidden = false;
  soundscape.play('victory');
  document.title = 'PyQuest – Das Abenteuer beginnt';
  elements.adventureButton.focus({ preventScroll: true });
}

function nextScene() {
  if (currentScene >= scenes.length - 1) {
    finishIntro();
    return;
  }
  renderScene(currentScene + 1);
}

function previousScene() {
  if (currentScene === 0) return;
  renderScene(currentScene - 1);
}

function replayIntro() {
  elements.endScreen.hidden = true;
  elements.player.hidden = false;
  renderScene(0, { immediate: true });
  elements.nextButton.focus({ preventScroll: true });
}

elements.startButton.addEventListener('click', startIntro);
// "Ohne Intro weiter zum Lernpfad" auf dem Startbildschirm: nutzt dasselbe
// Abschluss-Ereignis wie "Abenteuer beginnen" - die Lern-App hoert darauf
// und merkt sich den Vorspann als gesehen.
document.getElementById('startExitButton')?.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('pyquest:intro-complete'));
});
elements.nextButton.addEventListener('click', nextScene);
elements.backButton.addEventListener('click', previousScene);
elements.skipButton.addEventListener('click', finishIntro);
elements.replayButton.addEventListener('click', replayIntro);
elements.adventureButton.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('pyquest:intro-complete'));
  elements.adventureButton.textContent = 'Intro abgeschlossen ✓';
  elements.adventureButton.disabled = true;
});
elements.soundButton.addEventListener('click', () => {
  const nextMuted = !soundscape.muted;
  soundscape.setMuted(nextMuted);
  elements.soundButton.setAttribute('aria-pressed', String(nextMuted));
  elements.soundButton.setAttribute('aria-label', nextMuted ? 'Ton einschalten' : 'Ton ausschalten');
});

document.addEventListener('keydown', (event) => {
  if (!hasStarted || elements.player.hidden) return;
  if (event.key === 'ArrowRight' || event.key === 'PageDown') {
    event.preventDefault();
    nextScene();
  }
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault();
    previousScene();
  }
});

if (scenes.length !== 31) {
  throw new Error(`Das Intro benötigt genau 31 Szenen, gefunden: ${scenes.length}`);
}
