// Raumverkehr im Hintergrund des Datenkosmos.
//
// Die feste Kulisse (Stern, Planeten, Asteroiden, Station, Meteore) steckt
// in CSS. Die Schiffe dagegen sollen sich NICHT immer gleich verhalten -
// deshalb werden sie hier zur Laufzeit erzeugt: zufaelliger Typ,
// zufaellige Route, Groesse, Geschwindigkeit und Aktion.
//
// Bewegt wird ueber die Web-Animations-Schnittstelle, also weiterhin nur
// transform und opacity. Jedes Schiff raeumt sich nach seinem Auftritt
// selbst weg.

const SCHIFFE = [
  {
    name: "Frachter",
    breite: 190,
    laser: true, // hat einen Bergbaulaser
    svg: `<svg class="kosmos-schiff__bild" viewBox="0 0 240 62">
      <defs><linearGradient id="ks-glut1" x1="1" x2="0">
        <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0"/>
        <stop offset="100%" stop-color="#e0f2fe" stop-opacity=".9"/></linearGradient></defs>
      <path class="kosmos-schiff__glut" d="M6 31 40 24v14z" fill="url(#ks-glut1)"/>
      <path d="M40 22h34l10-8h56l14 8h52l30 9-30 9h-52l-14 8H84l-10-8H40z" fill="#1e2836"/>
      <path d="M40 22h34l10-8h56l14 8h52l30 9H40z" fill="#38455a"/>
      <path d="M74 22h150l22 9H74z" fill="#4b5b73" opacity=".7"/>
      <rect x="150" y="26" width="26" height="2.4" fill="#93c5fd" opacity=".85"/>
      <circle class="kosmos-schiff__pos" cx="236" cy="31" r="1.9" fill="#f87171"/>
    </svg>`,
  },
  {
    name: "Kurier",
    breite: 120,
    laser: false,
    svg: `<svg class="kosmos-schiff__bild" viewBox="0 0 200 44">
      <defs><linearGradient id="ks-glut2" x1="1" x2="0">
        <stop offset="0%" stop-color="#a78bfa" stop-opacity="0"/>
        <stop offset="100%" stop-color="#ede9fe" stop-opacity=".9"/></linearGradient></defs>
      <path class="kosmos-schiff__glut" d="M2 22 30 16v12z" fill="url(#ks-glut2)"/>
      <path d="M30 14h60l60-6 48 14-48 14-60-6H30z" fill="#232b3d"/>
      <path d="M30 14h60l60-6 48 14H30z" fill="#3d4a66"/>
      <path d="M120 10h30l30 8h-46z" fill="#8fa3c6" opacity=".5"/>
      <rect x="120" y="20" width="30" height="1.8" fill="#c4b5fd" opacity=".8"/>
      <circle class="kosmos-schiff__pos" cx="194" cy="22" r="1.6" fill="#f87171"/>
    </svg>`,
  },
  {
    name: "Schwerer Kreuzer",
    breite: 260,
    laser: true,
    svg: `<svg class="kosmos-schiff__bild" viewBox="0 0 300 80">
      <defs><linearGradient id="ks-glut3" x1="1" x2="0">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0"/>
        <stop offset="100%" stop-color="#bae6fd" stop-opacity=".85"/></linearGradient></defs>
      <path class="kosmos-schiff__glut" d="M4 40 44 30v20z" fill="url(#ks-glut3)"/>
      <path d="M44 26h60l16-12h70l20 12h56l30 14-30 14h-56l-20 12h-70l-16-12H44z" fill="#1a2331"/>
      <path d="M44 26h60l16-12h70l20 12h56l30 14H44z" fill="#333f54"/>
      <path d="M104 26h150l30 14H104z" fill="#46566f" opacity=".75"/>
      <path d="M150 18h50l14 8h-64z" fill="#8399ba" opacity=".5"/>
      <g fill="#93c5fd" opacity=".8"><rect x="150" y="33" width="34" height="2.2"/><rect x="200" y="34" width="20" height="1.8"/></g>
      <circle class="kosmos-schiff__pos" cx="294" cy="40" r="2.1" fill="#f87171"/>
    </svg>`,
  },
  {
    name: "Sonde",
    breite: 96,
    laser: false,
    svg: `<svg class="kosmos-schiff__bild" viewBox="0 0 120 46">
      <path d="M6 20h32v6H6zM82 20h32v6H82z" fill="#243044"/>
      <rect x="8" y="14" width="28" height="18" rx="1" fill="#1e3a8a" opacity=".85"/>
      <rect x="84" y="14" width="28" height="18" rx="1" fill="#1e3a8a" opacity=".85"/>
      <g stroke="#60a5fa" stroke-width=".7" opacity=".5"><path d="M8 20h28M8 26h28M84 20h28M84 26h28"/></g>
      <rect x="44" y="13" width="32" height="20" rx="3" fill="#4b5b73"/>
      <circle cx="60" cy="23" r="3.4" fill="#0f172a"/><circle cx="60" cy="23" r="1.6" fill="#7dd3fc"/>
      <path d="M60 13V4" stroke="#8aa0bd" stroke-width="1.4"/>
      <circle class="kosmos-schiff__pos" cx="60" cy="3" r="1.6" fill="#f87171"/>
    </svg>`,
  },
  {
    name: "Schlepper",
    breite: 150,
    laser: false,
    svg: `<svg class="kosmos-schiff__bild" viewBox="0 0 210 70">
      <defs><linearGradient id="ks-glut4" x1="1" x2="0">
        <stop offset="0%" stop-color="#fbbf24" stop-opacity="0"/>
        <stop offset="100%" stop-color="#fde68a" stop-opacity=".8"/></linearGradient></defs>
      <path class="kosmos-schiff__glut" d="M4 34 30 27v14z" fill="url(#ks-glut4)"/>
      <path d="M30 24h44l12-10h34l10 10h20v22h-20l-10 10H86l-12-10H30z" fill="#242c3a"/>
      <path d="M30 24h44l12-10h34l10 10h20v10H30z" fill="#3f4c63"/>
      <path d="M150 26h56v18h-56z" fill="#2b3446"/>
      <path d="M150 26h56v6h-56z" fill="#55637d" opacity=".8"/>
      <g stroke="#6b7a94" stroke-width="2"><path d="M142 30h10M142 40h10"/></g>
      <circle class="kosmos-schiff__pos" cx="34" cy="34" r="1.7" fill="#4ade80"/>
    </svg>`,
  },
];

const zufall = (min, max) => min + Math.random() * (max - min);
const waehle = (liste) => liste[Math.floor(Math.random() * liste.length)];

let laufenderTimer = null;
let aktiverHintergrund = null;

// Startet den Verkehr in einem Hintergrund-Element. Ein vorheriger Lauf
// wird beendet - sonst blieben beim Wechsel der Ansicht Zeitgeber und
// Schiffe eines abgeraeumten Hintergrunds uebrig.
export function starteVerkehr(hintergrund) {
  stoppeVerkehr();
  if (!hintergrund) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  aktiverHintergrund = hintergrund;
  // Der erste Auftritt kommt schnell, danach in unregelmaessigen Abstaenden.
  planeNaechstes(zufall(1500, 5000));
}

export function stoppeVerkehr() {
  clearTimeout(laufenderTimer);
  laufenderTimer = null;
  aktiverHintergrund = null;
}

function planeNaechstes(verzoegerung) {
  laufenderTimer = setTimeout(() => {
    if (!aktiverHintergrund || !aktiverHintergrund.isConnected) {
      stoppeVerkehr();
      return;
    }
    // Nicht mehr als drei Schiffe gleichzeitig - sonst wird aus der
    // ruhigen Weite ein Flughafen.
    if (aktiverHintergrund.querySelectorAll(".kosmos-schiff").length < 3) {
      schiffLosschicken(aktiverHintergrund);
    }
    // Mal folgt gleich das naechste, mal bleibt der Himmel eine Weile leer.
    planeNaechstes(zufall(12000, 38000));
  }, verzoegerung);
}

function schiffLosschicken(hintergrund) {
  const typ = waehle(SCHIFFE);
  const breite = hintergrund.clientWidth;
  const hoehe = hintergrund.clientHeight;

  // Entfernung: kleinere Schiffe wirken weiter weg und ziehen langsamer.
  const naehe = zufall(0.45, 1.05);
  const groesse = typ.breite * naehe;
  const nachRechts = Math.random() < 0.6;

  const el = document.createElement("div");
  el.className = "kosmos-schiff";
  el.style.width = `${groesse}px`;
  el.style.opacity = String(zufall(0.5, 0.9) * (0.6 + naehe * 0.4));
  el.innerHTML = typ.svg;
  hintergrund.appendChild(el);

  const verhalten = waehleVerhalten(typ, hintergrund);
  verhalten({ el, typ, breite, hoehe, groesse, naehe, nachRechts, hintergrund });
}

function waehleVerhalten(typ, hintergrund) {
  const moeglich = [vorbeiflug, vorbeiflug, schraegflug, sprung];
  // Nur Schiffe mit Laser koennen am Asteroidenfeld arbeiten - und nur,
  // wenn das Feld ueberhaupt sichtbar ist (auf dem Handy ist es aus).
  // Bewusst hoch gewichtet: Kommt der Bergbau zu selten vor, sieht ihn
  // in einer Unterrichtsstunde niemand.
  const feld = hintergrund.querySelector(".kosmos-asteroiden");
  if (typ.laser && feld && feld.offsetParent !== null) {
    return Math.random() < 0.6 ? bergbau : waehle(moeglich);
  }
  return waehle(moeglich);
}

// Spiegelt NUR die Silhouette, nicht das Schiff-Element. Sonst wuerde
// ein nach links fliegendes Schiff auch seinen Laserstrahl spiegeln.
function blickrichtung(el, nachRechts) {
  if (nachRechts) return;
  const bild = el.querySelector(".kosmos-schiff__bild");
  if (bild) bild.style.transform = "scaleX(-1)";
}

// Laesst ein Schiff seine Bahn fliegen und raeumt es danach weg.
function fliege(el, keyframes, dauer, easing = "linear") {
  const anim = el.animate(keyframes, { duration: dauer, easing, fill: "forwards" });
  anim.onfinish = () => el.remove();
  anim.oncancel = () => el.remove();
  return anim;
}

// --- Verhalten -----------------------------------------------------------

// Ruhiger Querflug in zufaelliger Hoehe.
function vorbeiflug({ el, breite, hoehe, groesse, naehe, nachRechts }) {
  const y = zufall(0.08, 0.82) * hoehe;
  const dauer = zufall(38000, 90000) / naehe;
  const start = nachRechts ? -groesse - 40 : breite + 40;
  const ziel = nachRechts ? breite + 40 : -groesse - 40;
  el.style.top = `${y}px`;
  el.style.left = "0";
  blickrichtung(el, nachRechts);
  fliege(el, [
    { transform: `translate(${start}px, 0)` },
    { transform: `translate(${(start + ziel) / 2}px, ${zufall(-24, 24)}px)` },
    { transform: `translate(${ziel}px, 0)` },
  ], dauer);
}

// Schraeg durchs Bild - wirkt so, als kaeme das Schiff aus der Tiefe.
function schraegflug({ el, breite, hoehe, groesse, naehe, nachRechts }) {
  const dauer = zufall(45000, 95000) / naehe;
  const vonOben = Math.random() < 0.5;
  const startX = nachRechts ? -groesse - 40 : breite + 40;
  const zielX = nachRechts ? breite + 40 : -groesse - 40;
  const startY = vonOben ? -60 : hoehe + 60;
  const zielY = vonOben ? hoehe * zufall(0.55, 0.95) : hoehe * zufall(0.05, 0.4);
  const neigung = (vonOben ? 1 : -1) * (nachRechts ? 8 : -8);
  el.style.top = "0";
  el.style.left = "0";
  blickrichtung(el, nachRechts);
  fliege(el, [
    { transform: `translate(${startX}px, ${startY}px) rotate(${neigung}deg)` },
    { transform: `translate(${zielX}px, ${zielY}px) rotate(${neigung}deg)` },
  ], dauer, "cubic-bezier(.35,0,.65,1)");
}

// Sprung: taucht auf, beschleunigt und verschwindet mit einem Lichtstreifen.
function sprung({ el, breite, hoehe, groesse, naehe, nachRechts }) {
  const y = zufall(0.12, 0.78) * hoehe;
  const dauer = zufall(7000, 12000);
  const startX = nachRechts ? breite * zufall(0.1, 0.3) : breite * zufall(0.7, 0.9);
  const zielX = nachRechts ? breite + 200 : -groesse - 200;
  el.style.top = `${y}px`;
  el.style.left = "0";
  el.classList.add("kosmos-schiff--sprung");
  blickrichtung(el, nachRechts);
  fliege(el, [
    { transform: `translate(${startX}px, 0) scale(.4)`, opacity: 0, offset: 0 },
    { transform: `translate(${startX}px, 0) scale(1)`, opacity: 0.85, offset: 0.12 },
    { transform: `translate(${startX + (zielX - startX) * 0.2}px, 0) scale(1)`, opacity: 0.85, offset: 0.55 },
    { transform: `translate(${zielX}px, 0) scaleX(2.4) scaleY(.5)`, opacity: 0, offset: 1 },
  ], dauer, "cubic-bezier(.6,0,.9,.2)");
}

// Bergbau: fliegt zum Asteroidenfeld, schneidet einen Brocken an und
// zieht weiter. Der Strahl wird aus der tatsaechlichen Geometrie
// berechnet, damit er wirklich trifft - egal wie gross das Fenster ist.
function bergbau({ el, hintergrund, breite, hoehe, groesse, naehe, nachRechts }) {
  const feld = hintergrund.querySelector(".kosmos-asteroiden");
  const feldRahmen = feld.getBoundingClientRect();
  const bgRahmen = hintergrund.getBoundingClientRect();
  const zielX = feldRahmen.left - bgRahmen.left + feldRahmen.width * zufall(0.2, 0.6);
  const zielY = feldRahmen.top - bgRahmen.top + feldRahmen.height * zufall(0.25, 0.7);

  const flughoehe = zielY - zufall(100, 160);
  const schiffHoehe = el.offsetHeight || groesse * 0.28;
  const startX = nachRechts ? -groesse - 40 : breite + 40;
  const endeX = nachRechts ? breite + 40 : -groesse - 40;
  el.style.top = `${flughoehe}px`;
  el.style.left = "0";
  blickrichtung(el, nachRechts);

  // Arbeitsposition: seitlich versetzt ueber dem Zielbrocken.
  const versatz = zufall(60, 110) * (nachRechts ? -1 : 1);
  const haltX = zielX + versatz - groesse / 2;

  // Der Strahl geht vom Rumpf aus - Mitte des Schiffs, Unterkante.
  const ursprungX = haltX + groesse / 2;
  const ursprungY = flughoehe + schiffHoehe * 0.6;
  const dx = zielX - ursprungX;
  const dy = zielY - ursprungY;
  const laenge = Math.hypot(dx, dy);
  const winkel = (Math.atan2(dx, dy) * 180) / Math.PI;

  // Zeitplan: anfliegen, abbremsen, schneiden, wieder beschleunigen.
  const anflug = zufall(16000, 26000) / naehe;
  const arbeit = zufall(5000, 8000);
  const abflug = zufall(16000, 26000) / naehe;
  const dauer = anflug + arbeit + abflug;
  const haltStart = anflug / dauer;
  const haltEnde = (anflug + arbeit) / dauer;

  const anim = el.animate(
    [
      { transform: `translate(${startX}px, 0)`, easing: "cubic-bezier(.2,0,.5,1)", offset: 0 },
      { transform: `translate(${haltX}px, 0)`, easing: "linear", offset: haltStart },
      // Waehrend der Arbeit driftet das Schiff nur minimal - der Strahl
      // haengt daran, also bleibt er trotzdem am Brocken.
      { transform: `translate(${haltX + (nachRechts ? 5 : -5)}px, 2px)`, easing: "cubic-bezier(.5,0,.8,1)", offset: haltEnde },
      { transform: `translate(${endeX}px, ${zufall(-14, 14)}px)`, offset: 1 },
    ],
    { duration: dauer, fill: "forwards" }
  );
  anim.onfinish = () => el.remove();
  anim.oncancel = () => el.remove();

  // Strahl als KIND des Schiffs - so bleibt er beim Rumpf, egal wo das
  // Schiff gerade ist. Frueher hing er fest im Raum und das Schiff zog
  // waehrend des Schusses rund 80 px darunter weg.
  const strahl = document.createElement("div");
  strahl.className = "kosmos-laser";
  strahl.style.left = `${groesse / 2}px`;
  strahl.style.top = `${schiffHoehe * 0.6}px`;
  strahl.style.height = `${laenge}px`;
  strahl.style.transform = `rotate(${winkel}deg)`;
  el.appendChild(strahl);

  const funken = document.createElement("div");
  funken.className = "kosmos-funken";
  funken.style.left = `${zielX}px`;
  funken.style.top = `${zielY}px`;
  hintergrund.appendChild(funken);

  // Der Schnitt laeuft nur waehrend der Arbeitsphase.
  const vorlauf = arbeit * 0.12;
  const schnittDauer = arbeit - vorlauf * 2;
  const strahlAnim = strahl.animate(
    [
      { opacity: 0, transform: `rotate(${winkel}deg) scaleY(.05)` },
      { opacity: 0.95, transform: `rotate(${winkel}deg) scaleY(1)`, offset: 0.08 },
      { opacity: 0.8, transform: `rotate(${winkel}deg) scaleY(1)`, offset: 0.9 },
      { opacity: 0, transform: `rotate(${winkel}deg) scaleY(.05)` },
    ],
    { duration: schnittDauer, delay: anflug + vorlauf, fill: "forwards" }
  );
  strahlAnim.onfinish = () => strahl.remove();
  strahlAnim.oncancel = () => strahl.remove();

  const funkenAnim = funken.animate(
    [
      { opacity: 0, transform: "scale(.3)" },
      { opacity: 1, transform: "scale(1.6)", offset: 0.12 },
      { opacity: 0.7, transform: "scale(1.1)", offset: 0.5 },
      { opacity: 0.8, transform: "scale(1.4)", offset: 0.8 },
      { opacity: 0, transform: "scale(.4)" },
    ],
    { duration: schnittDauer, delay: anflug + vorlauf + 150, fill: "forwards" }
  );
  funkenAnim.onfinish = () => funken.remove();
  funkenAnim.oncancel = () => funken.remove();
}
