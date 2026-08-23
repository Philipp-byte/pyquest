// Der Flug zwischen zwei Welten - ein kleines Wiederholungsspiel.
//
// Ablauf: Py springt ins Raumschiff und startet. Danach steuern die
// Lernenden das Schiff rund drei Minuten lang durch ein Meteoritenfeld und
// sammeln dabei Sterne ein. Nach jeweils fuenf Sternen haelt der Flug an und
// eine Frage aus dem gerade abgeschlossenen Kapitel erscheint in einem
// eigenen Fenster - fliegen und lesen gleichzeitig war zu viel auf einmal.
//
//   Treffer durch Meteorit  -> ein Leben weniger
//   falsche Antwort         -> ein Leben weniger, das Schiff explodiert
//   richtige Antwort        -> ein Leben mehr (hoechstens 10)
//
// Die Leben zaehlen ueber den ganzen Kurs (siehe leben.js). Bei 0 Leben
// endet der Flug, die Leben stehen wieder auf 3 - niemand soll dauerhaft
// festhaengen. Das Spiel geht NICHT in die Bewertung ein und laesst sich
// jederzeit ueberspringen.
//
// Die Schwierigkeit steigt doppelt: mit dem Kapitel (spaetere Welten sind
// von vornherein haerter) und waehrend des Flugs (gegen Ende kommen die
// Brocken schneller, dichter und in Gruppen).

import { renderHeader, wireHeader, html } from "../ui.js";
import { getLeben, lebenDazu, lebenAbziehen, lebenZuruecksetzen, MAX_LEBEN } from "../leben.js";
import { playCorrect, playWrong, playFinish } from "../sound.js";

const BASE = import.meta.env.BASE_URL;
const BUCHSTABEN = ["A", "B", "C", "D"];
const FLUGDAUER = 180;   // Sekunden bis zur naechsten Welt
const STERNE_PRO_FRAGE = 5;

// Es darf immer nur EIN Flug laufen. Ohne das lief beim Verlassen der
// Ansicht die alte Spielschleife weiter, griff auf die neue Seite zu und
// veraenderte dort sogar die Leben.
let laufendesSpiel = null;

export function renderFlug(app, curriculum, chapterId) {
  laufendesSpiel?.beenden();
  const chapter = curriculum.chapters.find((c) => c.id === chapterId);
  if (!chapter) {
    app.innerHTML = `${renderHeader("path")}<main class="path"><p class="empty-hint">Kapitel nicht gefunden.</p></main>`;
    wireHeader(app);
    return;
  }

  const stufe = curriculum.chapters.findIndex((c) => c.id === chapterId); // 0-basiert
  const fragen = sammleFragen(chapter);

  app.innerHTML = `
    ${renderHeader("path")}
    <main class="path flug">
      <a class="back-link" href="#/chapter/${chapterId}">← Zurück zum Kapitel</a>
      <div class="flug__buehne">
        <canvas class="flug__leinwand"></canvas>
        <button class="flug__beenden" title="Flug beenden" aria-label="Flug beenden" hidden>✕</button>

        <div class="flug__kopf">
          <span class="flug__leben" title="Leben"></span>
          <span class="flug__sterne" title="Sterne bis zur nächsten Frage"></span>
          <span class="flug__ziel">Nächste Welt: <strong>${escape(naechsteWelt(curriculum, stufe))}</strong></span>
        </div>
        <div class="flug__strecke"><div class="flug__strecke-fuell"></div></div>

        <div class="flug__frage" hidden>
          <div class="flug__frage-fenster">
            <p class="flug__frage-marke">Frage aus dem Kapitel</p>
            <p class="flug__frage-text"></p>
            <div class="flug__antworten"></div>
            <p class="flug__rueckmeldung" hidden></p>
            <button class="btn btn--primary flug__weiter" hidden>Weiterfliegen 🚀</button>
          </div>
        </div>

        <div class="flug__tafel">
          <h2 class="flug__titel">Bereit zum Abflug?</h2>
          <p class="flug__text">
            Py fliegt weiter zur nächsten Welt – und du steuerst.
            Weiche den Meteoriten aus und sammle <strong>Sterne</strong> ein.
            Nach jeweils <strong>fünf Sternen</strong> hält der Flug an und du
            bekommst eine Frage aus dem Kapitel. Richtig beantwortet gibt es
            ein <strong>Herz</strong> dazu.
          </p>
          <p class="flug__steuerung">⬆️⬇️ Pfeiltasten – oder mit dem Finger ziehen · rund 3 Minuten bis zur nächsten Welt</p>
          <div class="flug__knoepfe">
            <button class="btn btn--primary flug__start">🚀 Losfliegen</button>
            <button class="btn btn--ghost flug__skip">Überspringen</button>
          </div>
        </div>
      </div>
    </main>
  `;
  wireHeader(app);

  const spiel = new Flugspiel(app, { chapter, stufe, fragen, chapterId });
  laufendesSpiel = spiel;
  spiel.zeigeLeben();
  spiel.zeigeSterne();

  app.querySelector(".flug__start").onclick = () => spiel.starten();
  app.querySelector(".flug__skip").onclick = () => {
    spiel.beenden();
    location.hash = `#/chapter/${chapterId}`;
  };
}

// Alle Quizfragen des Kapitels einsammeln und mischen. In drei Minuten
// kommen je nach Sammelglueck sieben bis zehn Fragen dran - mehr, als die
// meisten Kapitel hergeben. Reicht der Vorrat nicht, wird von vorne
// begonnen (siehe naechsteFrage).
function sammleFragen(chapter) {
  const alle = [];
  for (const lesson of chapter.lessons) {
    for (const step of lesson.steps) {
      if (step.type === "quiz" && step.choices?.length) {
        alle.push({
          frage: nurText(step.question),
          antworten: step.choices.map(nurText),
          richtig: step.answer,
        });
      }
    }
  }
  return mische(alle);
}

function mische(liste) {
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  return liste;
}

// Zwischen zwei Werten ueberblenden - dafuer, dass es waehrend des Flugs
// gleichmaessig schwerer wird.
function blende(von, bis, p) {
  return von + (bis - von) * Math.max(0, Math.min(1, p));
}

function naechsteWelt(curriculum, stufe) {
  const naechstes = curriculum.chapters[stufe + 1];
  return naechstes ? naechstes.title : "Zurück zur Akademie";
}

function nurText(md = "") {
  return String(md)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}

function escape(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

class Flugspiel {
  constructor(app, { chapter, stufe, fragen, chapterId }) {
    this.app = app;
    this.chapter = chapter;
    this.stufe = stufe;
    this.fragen = fragen;
    this.chapterId = chapterId;

    this.leinwand = app.querySelector(".flug__leinwand");
    this.ctx = this.leinwand.getContext("2d");
    this.tafel = app.querySelector(".flug__tafel");
    this.frageFeld = app.querySelector(".flug__frage");

    // Schwierigkeit: Startwert haengt am Kapitel, waehrend des Flugs wird
    // dann bis zum Endwert hochgefahren. Bei 1280 px Breite entspricht das
    // rund 7 Brocken gleichzeitig am Anfang und rund 16 am Schluss.
    this.tempoStart = 190 + stufe * 11;
    this.tempoEnde = 380 + stufe * 18;
    this.pauseStart = Math.max(900 - stufe * 30, 480);
    this.pauseEnde = Math.max(210 - stufe * 6, 120);
    this.laeuft = false;
    this.pyBild = null;

    this.aufTaste = (e) => this.taste(e, true);
    this.aufTasteAuf = (e) => this.taste(e, false);
    this.aufGroesse = () => this.passeGroesseAn();

    this.passeGroesseAn();
    window.addEventListener("resize", this.aufGroesse);
    this.zeichneStandbild();

    // Py fuer das Cockpit laden - klappt es nicht, faehrt das Spiel ohne.
    const bild = new Image();
    bild.onload = () => { this.pyBild = bild; if (!this.laeuft) this.zeichneStandbild(); };
    bild.src = `${BASE}figuren/py/clever.webp`;
  }

  // Das Spiel fuellt waehrend des Flugs den Bildschirm. Der echte
  // Vollbildmodus wird zusaetzlich versucht; scheitert er, sorgt die
  // Klasse allein schon fuer dieselbe Darstellung.
  vollbildAn() {
    const buehne = this.app.querySelector(".flug__buehne");
    if (!buehne) return;
    buehne.classList.add("flug__buehne--voll");
    const schliessen = this.app.querySelector(".flug__beenden");
    if (schliessen) {
      schliessen.hidden = false;
      schliessen.onclick = () => {
        this.beenden();
        location.hash = `#/chapter/${this.chapterId}`;
      };
    }
    try { buehne.requestFullscreen?.().catch(() => {}); } catch { /* egal */ }
    // Nach dem Wechsel hat die Buehne eine andere Groesse.
    requestAnimationFrame(() => this.passeGroesseAn());
    this.aufVollbild = () => this.passeGroesseAn();
    document.addEventListener("fullscreenchange", this.aufVollbild);
  }

  vollbildAus() {
    const buehne = this.app.querySelector(".flug__buehne");
    buehne?.classList.remove("flug__buehne--voll");
    const schliessen = this.app.querySelector(".flug__beenden");
    if (schliessen) schliessen.hidden = true;
    if (this.aufVollbild) {
      document.removeEventListener("fullscreenchange", this.aufVollbild);
      this.aufVollbild = null;
    }
    if (document.fullscreenElement) {
      try { document.exitFullscreen?.().catch(() => {}); } catch { /* egal */ }
    }
    this.passeGroesseAn();
  }

  passeGroesseAn() {
    const buehne = this.app.querySelector(".flug__buehne");
    if (!buehne) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.breite = buehne.clientWidth;
    this.hoehe = buehne.clientHeight;
    this.leinwand.width = this.breite * dpr;
    this.leinwand.height = this.hoehe * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  zeigeLeben() {
    const feld = this.app.querySelector(".flug__leben");
    if (!feld) return;
    const n = getLeben();
    feld.innerHTML = `${"❤️".repeat(n)}<span class="flug__leben-zahl">${n}/${MAX_LEBEN}</span>`;
  }

  zeigeSterne() {
    const feld = this.app.querySelector(".flug__sterne");
    if (!feld) return;
    const n = this.eingesammelt ?? 0;
    feld.innerHTML = `${"⭐".repeat(n)}${"·".repeat(STERNE_PRO_FRAGE - n)}`
      + `<span class="flug__sterne-zahl">${n}/${STERNE_PRO_FRAGE}</span>`;
  }

  zeigeStrecke() {
    const fuell = this.app.querySelector(".flug__strecke-fuell");
    if (!fuell) return;
    fuell.style.width = `${Math.min(100, ((this.zeit ?? 0) / FLUGDAUER) * 100)}%`;
  }

  // 0 am Start, 1 am Ziel - daran haengt die ganze Schwierigkeitskurve.
  get fortschritt() {
    return Math.min((this.zeit ?? 0) / FLUGDAUER, 1);
  }

  // ---- Ablauf ----------------------------------------------------------

  starten() {
    this.tafel.hidden = true;
    this.vollbildAn();
    this.laeuft = true;
    this.zeit = 0;
    this.letzterMeteor = 0;
    this.meteore = [];
    this.sterne = Array.from({ length: 60 }, () => ({
      x: Math.random() * this.breite,
      y: Math.random() * this.hoehe,
      r: Math.random() * 1.4 + 0.3,
      v: Math.random() * 40 + 12,
    }));
    this.schiff = { x: this.breite * 0.22, y: this.hoehe / 2, vy: 0, r: 28 };
    this.hoch = false;
    this.runter = false;
    this.zielY = null;         // fuer Steuerung per Finger/Maus
    this.unverwundbarBis = 0;
    this.frageIndex = 0;
    this.explosion = [];
    this.funkeln = [];         // kleine Funken beim Einsammeln
    this.sternObjekte = [];    // die einsammelbaren Sterne
    this.letzterStern = 0;
    this.eingesammelt = 0;     // Sterne seit der letzten Frage
    this.phase = "start";      // start -> flug -> frage -> ende
    this.startZeit = 0;
    this.meldung = null;
    this.zeigeSterne();
    this.zeigeStrecke();
    this.feldVorfuellen();

    window.addEventListener("keydown", this.aufTaste);
    window.addEventListener("keyup", this.aufTasteAuf);
    this.leinwand.addEventListener("pointerdown", this.aufZeiger = (e) => this.zeiger(e));
    this.leinwand.addEventListener("pointermove", this.aufZeigerBewegung = (e) => this.zeiger(e));
    this.leinwand.addEventListener("pointerup", this.aufZeigerAuf = () => (this.zielY = null));
    this.leinwand.style.touchAction = "none";

    this.letzterRahmen = performance.now();
    this.schleife = (jetzt) => this.rahmen(jetzt);
    requestAnimationFrame(this.schleife);
  }

  beenden() {
    if (laufendesSpiel === this) laufendesSpiel = null;
    this.vollbildAus();
    this.laeuft = false;
    cancelAnimationFrame(this.anforderung);
    window.removeEventListener("keydown", this.aufTaste);
    window.removeEventListener("keyup", this.aufTasteAuf);
    window.removeEventListener("resize", this.aufGroesse);
    if (this.aufZeiger) {
      this.leinwand.removeEventListener("pointerdown", this.aufZeiger);
      this.leinwand.removeEventListener("pointermove", this.aufZeigerBewegung);
      this.leinwand.removeEventListener("pointerup", this.aufZeigerAuf);
    }
  }

  taste(e, gedrueckt) {
    if (e.key === "ArrowUp") { this.hoch = gedrueckt; e.preventDefault(); }
    if (e.key === "ArrowDown") { this.runter = gedrueckt; e.preventDefault(); }
  }

  zeiger(e) {
    if (e.buttons === 0 && e.type === "pointermove") return;
    const r = this.leinwand.getBoundingClientRect();
    this.zielY = e.clientY - r.top;
  }

  // ---- Spielschleife ---------------------------------------------------

  rahmen(jetzt) {
    if (!this.laeuft) return;
    // Wurde die Ansicht ersetzt (Zurueck-Knopf, anderer Menuepunkt),
    // haengt die Leinwand nicht mehr im Dokument - dann sofort aufhoeren.
    if (!this.leinwand.isConnected) { this.beenden(); return; }
    const dt = Math.min((jetzt - this.letzterRahmen) / 1000, 0.05);
    this.letzterRahmen = jetzt;
    this.zeit += dt;

    this.aktualisiere(dt);
    this.zeichne();
    this.anforderung = requestAnimationFrame(this.schleife);
  }

  aktualisiere(dt) {
    // Sternenfeld zieht immer
    for (const s of this.sterne) {
      s.x -= s.v * dt;
      if (s.x < -2) { s.x = this.breite + 2; s.y = Math.random() * this.hoehe; }
    }

    if (this.phase === "start") {
      this.startZeit += dt;
      if (this.startZeit > 2.6) this.phase = "flug";
      return;
    }
    if (this.phase === "ende") return;

    // Waehrend einer Frage steht der Flug still - nur die Explosion laeuft
    // weiter, damit man den Treffer sieht.
    if (this.phase === "frage") {
      this.explosionBewegen(dt);
      this.funkelnBewegen(dt);
      return;
    }
    this.explosionBewegen(dt);
    this.funkelnBewegen(dt);

    // Schiff steuern
    const schub = 420;
    if (this.zielY !== null) {
      this.schiff.vy = (this.zielY - this.schiff.y) * 6;
    } else {
      if (this.hoch) this.schiff.vy -= schub * dt * 3;
      if (this.runter) this.schiff.vy += schub * dt * 3;
      if (!this.hoch && !this.runter) this.schiff.vy *= 0.86;
    }
    this.schiff.vy = Math.max(-380, Math.min(380, this.schiff.vy));
    this.schiff.y += this.schiff.vy * dt;
    const rand = this.schiff.r + 6;
    if (this.schiff.y < rand) { this.schiff.y = rand; this.schiff.vy = 0; }
    if (this.schiff.y > this.hoehe - rand) { this.schiff.y = this.hoehe - rand; this.schiff.vy = 0; }

    this.meteoreBewegen(dt);
    this.sterneBewegen(dt);
    this.zeigeStrecke();

    // Fuenf Sterne beisammen -> der Flug haelt an und es gibt eine Frage.
    if (this.eingesammelt >= STERNE_PRO_FRAGE && this.fragen.length) {
      this.frageStarten();
      return;
    }
    // Drei Minuten geschafft -> naechste Welt
    if (this.zeit >= FLUGDAUER) this.zielErreicht();
  }

  // ---- Sterne einsammeln -----------------------------------------------

  sterneBewegen(dt) {
    // Etwas schneller als am Anfang, damit die Frage nicht ewig auf sich
    // warten laesst - aber langsamer als die Meteoriten.
    const pause = blende(2.4, 1.5, this.fortschritt);
    if (this.zeit - this.letzterStern > pause) {
      this.letzterStern = this.zeit;
      this.neuerStern();
    }
    for (const s of this.sternObjekte) {
      s.x -= s.vx * dt;
      s.y += Math.sin((this.zeit + s.versatz) * 1.8) * 22 * dt;
      s.dreh += dt * 1.1;
      if (this.faengt(s)) s.weg = true;
    }
    const vorher = this.sternObjekte.length;
    this.sternObjekte = this.sternObjekte.filter((s) => !s.weg && s.x > -s.r - 10);
    if (vorher !== this.sternObjekte.length) this.zeigeSterne();
  }

  neuerStern() {
    const r = 13;
    // Auch der Stern sucht sich eine freie Bahn - er soll einsammelbar
    // sein, ohne dass man zwangslaeufig in einen Brocken fliegt.
    const belegt = this.meteore
      .filter((m) => m.x > this.breite - 200)
      .map((m) => ({ y: m.y, r: m.r + 60 }));
    let y = 0;
    for (let versuch = 0; versuch < 12; versuch++) {
      y = r + 20 + Math.random() * (this.hoehe - 2 * r - 40);
      if (!belegt.some((o) => Math.abs(o.y - y) < o.r + r)) break;
      if (versuch === 11) return;
    }
    this.sternObjekte.push({
      x: this.breite + r + Math.random() * 40,
      y,
      r,
      vx: blende(150, 250, this.fortschritt),
      dreh: Math.random() * Math.PI,
      versatz: Math.random() * 6,
      weg: false,
    });
  }

  faengt(s) {
    const dx = s.x - this.schiff.x;
    const dy = s.y - this.schiff.y;
    if (Math.hypot(dx, dy) > s.r + this.schiff.r * 0.9) return false;
    this.eingesammelt++;
    playCorrect();
    this.funkenAusloesen(s.x, s.y);
    return true;
  }

  funkenAusloesen(x, y) {
    for (let i = 0; i < 12; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 110;
      this.funkeln.push({
        x, y, vx: Math.cos(w) * v, vy: Math.sin(w) * v,
        leben: 0.3 + Math.random() * 0.35, alter: 0, r: 1.5 + Math.random() * 2.5,
      });
    }
  }

  funkelnBewegen(dt) {
    if (!this.funkeln?.length) return;
    for (const f of this.funkeln) {
      f.alter += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= 0.93;
      f.vy *= 0.93;
    }
    this.funkeln = this.funkeln.filter((f) => f.alter < f.leben);
  }

  meteoreBewegen(dt) {
    const p = this.fortschritt;
    if (this.zeit - this.letzterMeteor > blende(this.pauseStart, this.pauseEnde, p) / 1000) {
      this.letzterMeteor = this.zeit;
      // Gegen Ende kommen die Brocken in Gruppen statt einzeln.
      let anzahl = 1;
      if (p > 0.75) anzahl = Math.random() < 0.45 ? 3 : 2;
      else if (p > 0.45) anzahl = Math.random() < 0.5 ? 2 : 1;
      for (let i = 0; i < anzahl; i++) this.neuerMeteor();
    }
    for (const m of this.meteore) {
      m.x -= m.vx * dt;
      m.y += m.vy * dt;
      m.dreh += m.drehV * dt;
      if (m.y < m.r || m.y > this.hoehe - m.r) m.vy *= -1;
      if (this.zeit > this.unverwundbarBis && this.trifft(m)) this.treffer();
    }
    this.meteore = this.meteore.filter((m) => m.x > -m.r - 10);
  }

  // Ohne das startet der Flug in einem leeren Weltraum und fuellt sich erst
  // nach rund sechs Sekunden - genau die Zeit, in der man den Eindruck
  // gewinnt, es kaeme ja gar nichts. Also gleich verteilt anfangen. Die
  // rechte Haelfte bleibt frei, damit niemand sofort in einen Brocken faellt.
  feldVorfuellen() {
    const anzahl = Math.round(this.breite / 190);
    for (let i = 0; i < anzahl; i++) {
      this.neuerMeteor();
      const m = this.meteore[this.meteore.length - 1];
      if (m) m.x = this.schiff.x + 220 + Math.random() * (this.breite - this.schiff.x - 240);
    }
  }

  // Dicht ja, unfair nein: Ein neuer Brocken darf weder einen anderen am
  // rechten Rand ueberlappen (sonst entsteht eine luekenlose Wand) noch
  // einen Stern zudecken (sonst ist die Belohnung nicht erreichbar).
  neuerMeteor() {
    const r = 12 + Math.random() * (16 + this.stufe);
    const tempo = blende(this.tempoStart, this.tempoEnde, this.fortschritt);
    const frisch = (o) => o.x > this.breite - 200;
    const belegt = [
      ...this.meteore.filter(frisch).map((m) => ({ y: m.y, r: m.r + 55 })),
      ...this.sternObjekte.filter(frisch).map((s) => ({ y: s.y, r: s.r + 60 })),
    ];
    let y = 0;
    for (let versuch = 0; versuch < 12; versuch++) {
      y = r + Math.random() * (this.hoehe - 2 * r);
      if (!belegt.some((o) => Math.abs(o.y - y) < o.r + r)) break;
      if (versuch === 11) return; // kein Platz frei - diesmal lieber keiner
    }
    this.meteore.push({
      x: this.breite + r + Math.random() * 60,
      y,
      r,
      vx: tempo * (0.8 + Math.random() * 0.6),
      vy: (Math.random() - 0.5) * 50,
      dreh: Math.random() * Math.PI,
      drehV: (Math.random() - 0.5) * 1.6,
    });
  }

  // Explosion am Schiff - bei Meteoritentreffer und bei falscher Antwort.
  explosionAusloesen() {
    this.explosion = [];
    for (let i = 0; i < 26; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 220;
      this.explosion.push({
        x: this.schiff.x, y: this.schiff.y,
        vx: Math.cos(w) * v, vy: Math.sin(w) * v,
        leben: 0.5 + Math.random() * 0.6,
        alter: 0,
        r: 2 + Math.random() * 4,
      });
    }
  }

  explosionBewegen(dt) {
    if (!this.explosion?.length) return;
    for (const f of this.explosion) {
      f.alter += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= 0.96;
      f.vy *= 0.96;
    }
    this.explosion = this.explosion.filter((f) => f.alter < f.leben);
  }

  // Das Schiff ist ein flacher Keil, kein Kreis - ein grosszuegiger
  // Trefferkreis fuehlt sich deshalb ungerecht an ("das war doch vorbei!").
  trifft(m) {
    const dx = m.x - this.schiff.x;
    const dy = m.y - this.schiff.y;
    return Math.hypot(dx, dy) < m.r + this.schiff.r * 0.55;
  }

  treffer() {
    // Grosszuegige Schutzzeit: Wer einmal in einen Pulk geraet, soll nicht
    // gleich drei Leben auf einmal verlieren.
    this.unverwundbarBis = this.zeit + 2.2;
    this.explosionAusloesen();
    playWrong();
    const uebrig = lebenAbziehen(1);
    this.zeigeLeben();
    this.melde("Treffer!", "#fca5a5");
    if (uebrig <= 0) this.abgestuerzt();
  }

  // ---- Fragen ----------------------------------------------------------

  // Der Flug haelt an und die Frage erscheint in einem eigenen Fenster -
  // fliegen und lesen gleichzeitig war zu viel auf einmal.
  // Reicht der Vorrat des Kapitels nicht fuer drei Minuten, wird neu
  // gemischt und von vorne begonnen.
  naechsteFrage() {
    if (this.frageIndex >= this.fragen.length) {
      this.fragen = mische(this.fragen);
      this.frageIndex = 0;
    }
    return this.fragen[this.frageIndex];
  }

  frageStarten() {
    const frage = this.naechsteFrage();
    this.phase = "frage";
    this.zielY = null;
    this.hoch = this.runter = false;
    this.eingesammelt = 0;
    this.zeigeSterne();

    const feld = this.frageFeld;
    feld.hidden = false;
    feld.querySelector(".flug__frage-text").textContent = frage.frage;
    feld.querySelector(".flug__rueckmeldung").hidden = true;
    const weiter = feld.querySelector(".flug__weiter");
    weiter.hidden = true;

    const box = feld.querySelector(".flug__antworten");
    box.innerHTML = "";
    frage.antworten.forEach((text, i) => {
      const knopf = html(`<button class="flug__antwort"><b>${BUCHSTABEN[i]}</b> ${escape(text)}</button>`);
      knopf.onclick = () => this.antwortGewaehlt(i, frage, box, weiter);
      box.append(knopf);
    });
    // Tastatur: A/B/C oder 1/2/3. Pfeiltasten und Leertaste duerfen hier
    // NICHTS ausloesen - sonst antwortet man beim Steuern versehentlich.
    this.aufAntwortTaste = (e) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      const buchstabe = "abcd".indexOf(e.key.toLowerCase());
      const ziffer = "1234".indexOf(e.key);
      const idx = buchstabe >= 0 ? buchstabe : ziffer;
      if (idx < 0) return;
      const knopf = box.children[idx];
      if (!knopf || knopf.disabled) return;
      e.preventDefault();
      knopf.click();
    };
    window.addEventListener("keydown", this.aufAntwortTaste);
  }

  antwortGewaehlt(gewaehlt, frage, box, weiter) {
    window.removeEventListener("keydown", this.aufAntwortTaste);
    [...box.children].forEach((k, i) => {
      k.disabled = true;
      if (i === frage.richtig) k.classList.add("flug__antwort--richtig");
      if (i === gewaehlt && i !== frage.richtig) k.classList.add("flug__antwort--falsch");
    });

    const rueck = this.frageFeld.querySelector(".flug__rueckmeldung");
    rueck.hidden = false;
    if (gewaehlt === frage.richtig) {
      playCorrect();
      const neu = lebenDazu(1);
      rueck.className = "flug__rueckmeldung flug__rueckmeldung--ok";
      rueck.textContent = neu >= MAX_LEBEN
        ? "Richtig! Du hast schon alle 10 Leben."
        : "Richtig! Ein Leben dazu.";
    } else {
      playWrong();
      // Der Treffer soll sichtbar sein: Das Schiff explodiert im Hintergrund.
      this.explosionAusloesen();
      this.unverwundbarBis = this.zeit + 2;
      const uebrig = lebenAbziehen(1);
      rueck.className = "flug__rueckmeldung flug__rueckmeldung--no";
      rueck.textContent = `Leider falsch. Richtig ist ${BUCHSTABEN[frage.richtig]}: ${frage.antworten[frage.richtig]}`;
      if (uebrig <= 0) {
        this.zeigeLeben();
        this.frageFeld.hidden = true;
        this.abgestuerzt();
        return;
      }
    }
    this.zeigeLeben();

    weiter.hidden = false;
    weiter.onclick = () => this.frageBeenden();
    weiter.focus();
  }

  frageBeenden() {
    this.frageFeld.hidden = true;
    this.frageIndex++;
    this.phase = "flug";
    this.unverwundbarBis = this.zeit + 1.2;
    // Freie Bahn nach der Frage - sonst startet man direkt in einem Brocken.
    this.meteore = this.meteore.filter((m) => m.x > this.schiff.x + 160);
    // Drei Minuten schon voll? Dann war das die letzte Frage.
    if (this.zeit >= FLUGDAUER) this.zielErreicht();
  }

  melde(text, farbe) {
    this.meldung = { text, farbe, bis: this.zeit + 1.4 };
  }

  // ---- Ende ------------------------------------------------------------

  zielErreicht() {
    this.phase = "ende";
    playFinish();
    this.zeigeStrecke();
    this.zeigeTafel(
      "🌍 Angekommen!",
      `Py hat die nächste Welt erreicht – drei Minuten durchs Meteoritenfeld.
       Du hast <strong>${getLeben()} von ${MAX_LEBEN}</strong> Leben.`,
      true
    );
  }

  abgestuerzt() {
    this.phase = "ende";
    lebenZuruecksetzen();
    this.zeigeLeben();
    this.zeigeTafel(
      "💥 Notlandung!",
      "Keine Leben mehr – Py setzt auf dem nächsten Felsen auf. Du startest wieder mit <strong>3 Leben</strong>. Das Kapitel bleibt natürlich abgeschlossen.",
      true
    );
  }

  zeigeTafel(titel, text, mitNeustart) {
    // Der Flug ist vorbei - zurueck aus dem Vollbild, damit Kopfzeile und
    // Navigation wieder erreichbar sind.
    this.vollbildAus();
    this.frageFeld.hidden = true;
    this.tafel.hidden = false;
    this.tafel.querySelector(".flug__titel").innerHTML = titel;
    this.tafel.querySelector(".flug__text").innerHTML = text;
    this.tafel.querySelector(".flug__steuerung").hidden = true;
    const knoepfe = this.tafel.querySelector(".flug__knoepfe");
    knoepfe.innerHTML = "";
    if (mitNeustart) {
      const nochmal = html(`<button class="btn btn--ghost">Nochmal fliegen</button>`);
      nochmal.onclick = () => {
        this.tafel.querySelector(".flug__steuerung").hidden = false;
        this.starten();
      };
      knoepfe.append(nochmal);
    }
    const weiter = html(`<a class="btn btn--primary" href="#/">Weiter zum Datenkosmos</a>`);
    knoepfe.append(weiter);
  }

  // ---- Zeichnen --------------------------------------------------------

  zeichneStandbild() {
    const c = this.ctx;
    c.fillStyle = "#070b1c";
    c.fillRect(0, 0, this.breite, this.hoehe);
    c.fillStyle = "rgba(255,255,255,.5)";
    for (let i = 0; i < 70; i++) {
      c.fillRect(Math.random() * this.breite, Math.random() * this.hoehe, 1.4, 1.4);
    }
  }

  zeichne() {
    const c = this.ctx;
    c.fillStyle = "#070b1c";
    c.fillRect(0, 0, this.breite, this.hoehe);

    // Sterne
    c.fillStyle = "rgba(255,255,255,.65)";
    for (const s of this.sterne) c.fillRect(s.x, s.y, s.r, s.r);

    if (this.phase === "start") { this.zeichneStart(); return; }

    for (const s of this.sternObjekte) this.zeichneSammelstern(s);
    for (const m of this.meteore) this.zeichneMeteor(m);
    this.zeichneSchiff(this.schiff.x, this.schiff.y, this.schiff.vy);

    this.zeichneFunkeln();
    this.zeichneExplosion();

    if (this.meldung && this.zeit < this.meldung.bis) {
      c.save();
      c.globalAlpha = Math.min(1, (this.meldung.bis - this.zeit) / 0.6);
      c.fillStyle = this.meldung.farbe;
      c.font = "bold 26px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText(this.meldung.text, this.breite / 2, this.hoehe / 2);
      c.restore();
    }
  }

  // Py huepft ins Schiff, dann Start.
  zeichneStart() {
    const c = this.ctx;
    const t = this.startZeit;
    const schiffX = this.breite * 0.22;
    const schiffY = this.hoehe / 2;

    if (t < 1.4) {
      // Anlauf und Sprung von links
      const p = t / 1.4;
      const x = 40 + (schiffX - 40) * p;
      const huepf = Math.abs(Math.sin(p * Math.PI * 3)) * 26;
      this.zeichneSchiff(schiffX, schiffY, 0, true);
      this.zeichnePy(x, schiffY + 18 - huepf, 46);
      c.fillStyle = "rgba(226,232,240,.9)";
      c.font = "600 16px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText("Py steigt ein …", this.breite / 2, 40);
    } else {
      const p = Math.min((t - 1.4) / 1.2, 1);
      const x = schiffX + Math.pow(p, 3) * 40;
      this.zeichneSchiff(x, schiffY, 0);
      c.fillStyle = "rgba(226,232,240,.9)";
      c.font = "600 16px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText(p < 1 ? "Startvorbereitung …" : "Los geht's!", this.breite / 2, 40);
    }
  }

  // Py wird gespiegelt gezeichnet: Die Vorlage schaut nach links, das
  // Schiff fliegt aber nach rechts - ungespiegelt sitzt Py verkehrt herum
  // im Cockpit und huepft rueckwaerts zum Schiff.
  zeichnePy(x, y, groesse) {
    if (!this.pyBild) return;
    const b = this.pyBild;
    const h = groesse;
    const w = (b.naturalWidth / b.naturalHeight) * h;
    const c = this.ctx;
    c.save();
    c.translate(x, y - h);
    c.scale(-1, 1);
    c.drawImage(b, -w / 2, 0, w, h);
    c.restore();
  }

  zeichneSchiff(x, y, vy, leer = false) {
    const c = this.ctx;
    const blinkt = this.zeit < this.unverwundbarBis && Math.floor(this.zeit * 12) % 2 === 0;
    c.save();
    c.translate(x, y);
    c.rotate(Math.max(-0.3, Math.min(0.3, vy / 900)));
    if (blinkt) c.globalAlpha = 0.35;

    // Triebwerksglut
    const glut = c.createLinearGradient(-46, 0, -18, 0);
    glut.addColorStop(0, "rgba(125,211,252,0)");
    glut.addColorStop(1, "rgba(186,230,253,.95)");
    c.fillStyle = glut;
    c.beginPath();
    c.moveTo(-46, 0); c.lineTo(-18, -7); c.lineTo(-18, 7); c.closePath(); c.fill();

    // Rumpf - rund 40 % groesser als im ersten Entwurf
    c.scale(1.4, 1.4);
    c.fillStyle = "#cbd5e1";
    c.beginPath();
    c.moveTo(34, 0); c.lineTo(6, -15); c.lineTo(-20, -11);
    c.lineTo(-20, 11); c.lineTo(6, 15); c.closePath(); c.fill();
    c.fillStyle = "#94a3b8";
    c.beginPath();
    c.moveTo(34, 0); c.lineTo(6, 15); c.lineTo(-20, 11); c.closePath(); c.fill();

    // Kanzel mit Py (gespiegelt, damit Py nach vorne schaut)
    c.fillStyle = "#7dd3fc";
    c.beginPath(); c.ellipse(6, -2, 13, 10, 0, 0, Math.PI * 2); c.fill();
    if (!leer && this.pyBild) {
      c.save();
      c.beginPath(); c.ellipse(6, -2, 12, 9, 0, 0, Math.PI * 2); c.clip();
      const h = 24;
      const w = (this.pyBild.naturalWidth / this.pyBild.naturalHeight) * h;
      c.translate(6, -2 - h * 0.55);
      c.scale(-1, 1);
      c.drawImage(this.pyBild, -w / 2, 0, w, h);
      c.restore();
    }
    c.restore();
  }

  zeichneExplosion() {
    if (!this.explosion?.length) return;
    const c = this.ctx;
    for (const f of this.explosion) {
      const p = 1 - f.alter / f.leben;
      c.globalAlpha = Math.max(0, p);
      c.fillStyle = p > 0.6 ? "#fef3c7" : p > 0.3 ? "#fb923c" : "#7f1d1d";
      c.beginPath();
      c.arc(f.x, f.y, f.r * (0.6 + p), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  // Fuenfzackiger Stern mit Schein - die eingesammelt werden wollen.
  zeichneSammelstern(s) {
    const c = this.ctx;
    c.save();
    c.translate(s.x, s.y);
    c.rotate(s.dreh);
    const schein = c.createRadialGradient(0, 0, 0, 0, 0, s.r * 2.4);
    schein.addColorStop(0, "rgba(253, 224, 71, .55)");
    schein.addColorStop(1, "rgba(253, 224, 71, 0)");
    c.fillStyle = schein;
    c.beginPath(); c.arc(0, 0, s.r * 2.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fde047";
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const w = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? s.r : s.r * 0.44;
      c.lineTo(Math.cos(w) * r, Math.sin(w) * r);
    }
    c.closePath(); c.fill();
    c.restore();
  }

  zeichneFunkeln() {
    if (!this.funkeln?.length) return;
    const c = this.ctx;
    for (const f of this.funkeln) {
      const p = 1 - f.alter / f.leben;
      c.globalAlpha = Math.max(0, p);
      c.fillStyle = "#fde047";
      c.beginPath(); c.arc(f.x, f.y, f.r * p, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  }

  zeichneMeteor(m) {
    const c = this.ctx;
    c.save();
    c.translate(m.x, m.y);
    c.rotate(m.dreh);
    c.fillStyle = "#4b5563";
    c.beginPath();
    for (let i = 0; i < 7; i++) {
      const w = (i / 7) * Math.PI * 2;
      const r = m.r * (0.78 + ((i * 37) % 10) / 40);
      c.lineTo(Math.cos(w) * r, Math.sin(w) * r);
    }
    c.closePath(); c.fill();
    c.fillStyle = "rgba(148,163,184,.55)";
    c.beginPath(); c.arc(-m.r * 0.25, -m.r * 0.3, m.r * 0.4, 0, Math.PI * 2); c.fill();
    c.restore();
  }


}
