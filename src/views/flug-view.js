// Der Flug zwischen zwei Welten - ein kleines Wiederholungsspiel.
//
// Ablauf: Py springt ins Raumschiff und startet. Danach steuern die
// Lernenden das Schiff rund zwei Minuten lang durch ein Meteoritenfeld und
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
import { ladeHandlanger, gegnerAuswahl, GEGNER_PAUSE, GEGNER_ERSTER } from "../flug-gegner.js";
import { istNeu, merkeGezeigt } from "../flug-hinweise.js";
import { istLehrerModus } from "../lehrer.js";

const BASE = import.meta.env.BASE_URL;
const BUCHSTABEN = ["A", "B", "C", "D"];
const FLUGDAUER = 120;   // Sekunden bis zur naechsten Welt
const STERNE_PRO_FRAGE = 5;

// Ab Kapitel 3 treibt gelegentlich ein Schutzschild durchs Bild. Wer es
// einsammelt, haelt die naechsten drei Treffer aus, ohne ein Leben zu
// verlieren. Es schuetzt vor Meteoriten und Drohnen - eine falsche
// Antwort kostet weiterhin ein Leben, sonst waeren die Fragen egal.
const SCHILD_AB_STUFE = 2;
const SCHILD_LADUNGEN = 3;
const SCHILD_PAUSE = 26;    // Abstand zwischen zwei Schilden in Sekunden
const SCHILD_ERSTES = 14;   // das erste kommt frueher - sonst sieht es nie,
                            // wer die ersten Sekunden nicht uebersteht

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

  // Jede Regel wird nur einmal erklaert - in dem Kapitel, in dem sie neu
  // dazu kommt. Im Lehrer-Modus immer, damit sich alles vorfuehren laesst.
  const alleZeigen = istLehrerModus();
  const offeneHinweise = [];
  const zeigeHinweis = (id) => {
    if (alleZeigen) return true;
    if (!istNeu(id)) return false;
    offeneHinweise.push(id);
    return true;
  };

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
          <span class="flug__schild" title="Schutzschild: hält so viele Treffer aus" hidden></span>
          <span class="flug__ziel">Nächste Welt: <strong>${escape(naechsteWelt(curriculum, stufe))}</strong></span>
        </div>
        <div class="flug__strecke"><div class="flug__strecke-fuell"></div></div>

        <div class="flug__frage" hidden>
          <div class="flug__frage-fenster">
            <p class="flug__frage-marke">Frage aus dem Kapitel</p>
            <p class="flug__frage-text"></p>
            <pre class="flug__frage-code" hidden><code></code></pre>
            <div class="flug__antworten"></div>
            <p class="flug__rueckmeldung" hidden></p>
            <button class="btn btn--primary flug__weiter" hidden>Weiterfliegen 🚀</button>
          </div>
        </div>

        <div class="flug__tafel">
          <h2 class="flug__titel">Bereit zum Abflug?</h2>
          <p class="flug__text">${zeigeHinweis("grundregeln") ? `
            Weiche den Meteoriten aus und sammle <strong>Sterne</strong>.
            Nach <strong>fünf Sternen</strong> kommt eine Frage – richtig
            beantwortet gibt es ein <strong>Herz</strong>.` : `
            Sterne sammeln, Fragen beantworten, Meteoriten ausweichen.`}
          </p>
          <div class="flug__gegnerwarnungen"></div>
          ${stufe >= SCHILD_AB_STUFE && zeigeHinweis("schild") ? `
          <p class="flug__schutz">
            🛡️ Ein eingesammeltes <strong>Schutzschild</strong> hält
            <strong>drei Treffer</strong> aus.
          </p>` : ""}
          <p class="flug__steuerung">⬆️⬇️ Pfeiltasten – oder mit dem Finger ziehen · rund 2 Minuten bis zur nächsten Welt</p>
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

  // Der zusaetzliche Fragenvorrat wird nebenher geladen. Die erste Frage
  // kommt fruehestens nach fuenf Sternen, bis dahin ist er laengst da -
  // und falls die Datei fehlt, laeuft der Flug mit den Kapitelfragen weiter.
  ladeFlugfragen(chapterId).then((extra) => {
    if (laufendesSpiel !== spiel || !extra.length) return;
    spiel.fragen = mische(sammleFragen(chapter, extra));
    spiel.frageIndex = 0;
  });

  // Welche Handlanger in diesem Kapitel mitfliegen, steht in figuren.json -
  // dieselbe Quelle wie fuer die Lektionen. Die Warnungen auf der Starttafel
  // schreiben die Gegner selbst.
  ladeHandlanger(chapterId).then((handlanger) => {
    if (laufendesSpiel !== spiel) return;
    const typen = gegnerAuswahl(handlanger, stufe);
    spiel.setzeGegner(typen);
    const kasten = app.querySelector(".flug__gegnerwarnungen");
    if (kasten) {
      // Auch die Gegner stellen sich nur einmal vor - beim ersten Kapitel,
      // in dem sie mitfliegen.
      kasten.innerHTML = typen
        .filter((t) => t.warnung && zeigeHinweis(`gegner:${t.ordner}`))
        .map((t) => `<p class="flug__warnung">${t.warnung}</p>`)
        .join("");
    }
  });

  app.querySelector(".flug__start").onclick = () => {
    // Erst beim Losfliegen merken: Wer die Tafel nur kurz oeffnet und
    // wieder geht, soll die Erklaerung beim naechsten Mal noch bekommen.
    if (!alleZeigen && offeneHinweise.length) merkeGezeigt(offeneHinweise);
    spiel.starten();
  };
  app.querySelector(".flug__skip").onclick = () => {
    spiel.beenden();
    location.hash = `#/chapter/${chapterId}`;
  };
}

// Alle Quizfragen des Kapitels einsammeln und mischen. In zwei Minuten
// kommen je nach Sammelglueck vier bis sechs Fragen dran. Reicht der
// Vorrat eines Kapitels nicht, wird von vorne begonnen (siehe
// naechsteFrage).
function sammleFragen(chapter, extraFragen = []) {
  const alle = [];
  for (const lesson of chapter.lessons) {
    for (const step of lesson.steps) {
      if (step.type === "quiz" && step.choices?.length) {
        alle.push({
          frage: nurText(step.question),
          // Ohne den Codeblock waere "Wie viele Zeilen gibt dieses Programm
          // aus?" nicht zu beantworten - das Programm gehoert mit ins Fenster.
          code: codeAus(step.question),
          antworten: step.choices.map(nurText),
          richtig: step.answer,
        });
      }
    }
  }
  for (const f of extraFragen) {
    if (!f?.frage || !f.antworten?.length) continue;
    alle.push({ frage: f.frage, code: f.code ?? "", antworten: f.antworten, richtig: f.richtig ?? 0 });
  }
  return mische(alle);
}

// Zusaetzliche Fragen zum Kapitelthema (public/content/flugfragen.json).
// Sie werden einmal geladen und dann fuer alle Fluege behalten.
let flugfragenCache = null;
async function ladeFlugfragen(chapterId) {
  try {
    if (!flugfragenCache) {
      const antwort = await fetch(`${BASE}content/flugfragen.json`);
      if (!antwort.ok) throw new Error(String(antwort.status));
      flugfragenCache = await antwort.json();
    }
    return flugfragenCache[chapterId] ?? [];
  } catch {
    return []; // ohne Zusatzfragen laeuft der Flug trotzdem
  }
}

function codeAus(md = "") {
  const treffer = String(md).match(/```[a-z]*\n([\s\S]*?)```/);
  return treffer ? treffer[1].replace(/\s+$/, "") : "";
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

    this.bilder = new Map();   // Figurenbilder der Gegner, siehe bild()
    this.gegnerTypen = [];     // wird aus figuren.json nachgereicht
    this.gegner = [];
  }

  // Bild einer Gegnerfigur. Beim ersten Aufruf wird geladen; bis es da ist
  // (und falls es fehlt) zeichnet der Gegner seine Ersatzform.
  bild(ordner, pose) {
    const schluessel = `${ordner}/${pose}`;
    if (!this.bilder.has(schluessel)) {
      const b = new Image();
      b.src = `${BASE}figuren/${schluessel}.webp`;
      this.bilder.set(schluessel, b);
    }
    const b = this.bilder.get(schluessel);
    return b.complete && b.naturalHeight ? b : null;
  }

  // Damit die Gegnertabelle keinen eigenen Sound-Import braucht.
  tonFalsch() { playWrong(); }

  // Wird nachgereicht, sobald figuren.json geladen ist - auch mitten im
  // Flug, dann treten die Gegner eben ab da auf.
  setzeGegner(typen) {
    this.gegnerTypen = typen;
    this.gegnerIndex = 0;
    this.letzterGegner = (this.zeit ?? 0) + GEGNER_ERSTER - GEGNER_PAUSE;
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
    this.gegner = [];          // aktive Handlanger im Bild
    this.gegnerIndex = 0;      // wer als naechstes dran ist
    this.letzterGegner = GEGNER_ERSTER - GEGNER_PAUSE;   // erster Auftritt bei 9 s
    this.schilde = [];         // einsammelbare Schutzschilde ab Kapitel 3
    this.letztesSchild = SCHILD_ERSTES - SCHILD_PAUSE;   // erstes bei 14 s
    this.schild = 0;           // verbleibende Ladungen
    this.eingesammelt = 0;     // Sterne seit der letzten Frage
    this.phase = "start";      // start -> flug -> frage -> ende
    this.startZeit = 0;
    this.meldung = null;
    this.zeigeSterne();
    this.zeigeSchild();
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
    this.gegnerBewegen(dt);
    this.schildeBewegen(dt);
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

  // ---- Schutzschild -----------------------------------------------------

  schildeBewegen(dt) {
    if (this.stufe < SCHILD_AB_STUFE) return;
    // Selten genug, dass es sich wie ein Fund anfuehlt.
    if (this.zeit - this.letztesSchild > SCHILD_PAUSE) {
      this.letztesSchild = this.zeit;
      this.neuesSchild();
    }
    for (const s of this.schilde) {
      s.x -= s.vx * dt;
      s.y += Math.sin((this.zeit + s.versatz) * 1.5) * 26 * dt;
      s.puls += dt * 3;
      if (Math.hypot(s.x - this.schiff.x, s.y - this.schiff.y) < s.r + this.schiff.r * 0.9) {
        s.weg = true;
        this.schildAufnehmen();
      }
    }
    this.schilde = this.schilde.filter((s) => !s.weg && s.x > -s.r - 10);
  }

  neuesSchild() {
    const r = 18;
    // Nicht in einen Brocken hineinlegen - man soll es holen koennen.
    const belegt = this.meteore
      .filter((m) => m.x > this.breite - 200)
      .map((m) => ({ y: m.y, r: m.r + 70 }));
    let y = 0;
    for (let versuch = 0; versuch < 12; versuch++) {
      y = r + 30 + Math.random() * (this.hoehe - 2 * r - 60);
      if (!belegt.some((o) => Math.abs(o.y - y) < o.r + r)) break;
      if (versuch === 11) return;
    }
    this.schilde.push({
      x: this.breite + r + 20, y, r,
      vx: blende(150, 250, this.fortschritt),
      puls: 0, versatz: Math.random() * 6, weg: false,
    });
  }

  schildAufnehmen() {
    this.schild = SCHILD_LADUNGEN;   // ein neues Schild laedt voll auf
    playCorrect();
    this.funkenAusloesen(this.schiff.x, this.schiff.y, "#67e8f9");
    this.melde("Schutzschild!", "#67e8f9");
    this.zeigeSchild();
  }

  zeigeSchild() {
    const feld = this.app.querySelector(".flug__schild");
    if (!feld) return;
    feld.hidden = this.schild <= 0;
    feld.textContent = `🛡️ ${this.schild}`;
  }

  // ---- Professor Nulls Gefolge ------------------------------------------
  // Welche Figur auftaucht und was sie tut, steht in flug-gegner.js. Hier
  // laeuft nur der gemeinsame Takt: faellig? erzeugen. Dann bewegen und
  // zeichnen lassen.

  gegnerBewegen(dt) {
    // Ein Gegner nach dem anderen, reihum - nicht mehr alle gleichzeitig
    // auf eigenem Takt.
    if (this.gegnerTypen.length && this.zeit - this.letzterGegner > GEGNER_PAUSE) {
      this.letzterGegner = this.zeit;
      const typ = this.gegnerTypen[this.gegnerIndex % this.gegnerTypen.length];
      this.gegnerIndex++;
      const obj = typ.erzeuge(this);
      if (obj) this.gegner.push({ typ, obj });
    }
    this.gegner = this.gegner.filter((g) => g.typ.bewege(g.obj, dt, this) !== false);
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
    // Von Ciphera verschlossen: Der Stern bleibt liegen, bis das Schloss
    // wieder aufgeht.
    if (s.gesperrtBis > this.zeit) return false;
    // Typos Faelschungen zaehlen nicht - sie kosten. Sonst waere das
    // "genau hinschauen" folgenlos.
    if (s.falsch) {
      this.funkenAusloesen(s.x, s.y, "#c084fc");
      this.melde("Falscher Stern!", "#c084fc");
      if (this.zeit > this.unverwundbarBis) this.treffer();
      return true;
    }
    this.eingesammelt++;
    playCorrect();
    this.funkenAusloesen(s.x, s.y);
    return true;
  }

  funkenAusloesen(x, y, farbe = "#fde047") {
    for (let i = 0; i < 12; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 110;
      this.funkeln.push({
        x, y, vx: Math.cos(w) * v, vy: Math.sin(w) * v, farbe,
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

  // Explosion - am Schiff bei Treffer und falscher Antwort, an der Drohne
  // bei ihrer Zuendung (dann groesser und an anderer Stelle).
  explosionAusloesen(x = this.schiff.x, y = this.schiff.y, teile = 26) {
    for (let i = 0; i < teile; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 240;
      this.explosion.push({
        x, y,
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

  // Das Schiff ist ein flacher Keil, kein Kreis. Ein Kreis von 15 px passte
  // zwar zur Hoehe, aber nicht zur Laenge: Gezeichnet reicht der Rumpf
  // (mit Faktor 1,4) rund 47 px nach vorne. Kleine Brocken sassen deshalb
  // sichtbar auf der Schiffsnase, ohne einen Treffer auszuloesen.
  //
  // Jetzt eine Ellipse laengs des Rumpfs, um den Brockenradius aufgeblaeht.
  // Quer bleibt sie fast so eng wie vorher (44 statt 43 px bei einem
  // grossen Meteoriten) - ausgewichen wird nach oben und unten, dort darf
  // sich am Schwierigkeitsgrad nichts aendern.
  trifft(m) {
    const dx = m.x - this.schiff.x;
    const dy = m.y - this.schiff.y;
    const a = 32 + m.r;   // laengs (Nase bis Heck)
    const b = 16 + m.r;   // quer
    return (dx * dx) / (a * a) + (dy * dy) / (b * b) < 1;
  }

  treffer() {
    // Grosszuegige Schutzzeit: Wer einmal in einen Pulk geraet, soll nicht
    // gleich drei Leben auf einmal verlieren.
    this.unverwundbarBis = this.zeit + 2.2;

    // Das Schutzschild faengt den Treffer ab - ein Leben kostet er dann
    // nicht. Es zerspringt sichtbar, damit man den Verbrauch merkt.
    if (this.schild > 0) {
      this.schild--;
      this.zeigeSchild();
      playWrong();
      this.schildFunken();
      this.melde(this.schild > 0 ? `Schild hält! Noch ${this.schild}` : "Schild zerbrochen!",
                 "#67e8f9");
      return;
    }

    this.explosionAusloesen();
    playWrong();
    const uebrig = lebenAbziehen(1);
    this.zeigeLeben();
    this.melde("Treffer!", "#fca5a5");
    if (uebrig <= 0) this.abgestuerzt();
  }

  // Splitter ringsum das Schiff statt einer Explosion im Schiff.
  schildFunken() {
    for (let i = 0; i < 22; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = 90 + Math.random() * 160;
      this.funkeln.push({
        x: this.schiff.x + Math.cos(w) * this.schiff.r,
        y: this.schiff.y + Math.sin(w) * this.schiff.r,
        vx: Math.cos(w) * v, vy: Math.sin(w) * v, farbe: "#67e8f9",
        leben: 0.35 + Math.random() * 0.35, alter: 0, r: 1.5 + Math.random() * 3,
      });
    }
  }

  // ---- Fragen ----------------------------------------------------------

  // Der Flug haelt an und die Frage erscheint in einem eigenen Fenster -
  // fliegen und lesen gleichzeitig war zu viel auf einmal.
  // Reicht der Vorrat des Kapitels nicht fuer zwei Minuten, wird neu
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
    const codeFeld = feld.querySelector(".flug__frage-code");
    codeFeld.hidden = !frage.code;
    codeFeld.querySelector("code").textContent = frage.code || "";
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
      const vorher = getLeben();
      const neu = lebenDazu(1);
      rueck.className = "flug__rueckmeldung flug__rueckmeldung--ok";
      rueck.textContent = neu >= MAX_LEBEN && neu === vorher
        ? "Richtig! Du hast schon alle 10 Leben."
        : "Richtig! Ein Leben dazu.";
      if (neu > vorher) this.herzGewonnen();
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

  // Kleine Belohnung fuers Auge: Das Herz steigt aus der Mitte auf und die
  // Lebensanzeige pocht, wenn es ankommt.
  herzGewonnen() {
    const buehne = this.app.querySelector(".flug__buehne");
    if (!buehne) return;
    const herz = html(`<div class="flug__herzflug">❤️</div>`);
    buehne.append(herz);
    herz.addEventListener("animationend", () => herz.remove());
    setTimeout(() => { if (herz.isConnected) herz.remove(); }, 2000);

    const anzeige = this.app.querySelector(".flug__leben");
    if (anzeige) {
      anzeige.classList.remove("flug__leben--dazu");
      void anzeige.offsetWidth;              // Neustart der Animation erzwingen
      anzeige.classList.add("flug__leben--dazu");
    }
  }

  frageBeenden() {
    this.frageFeld.hidden = true;
    this.frageIndex++;
    this.phase = "flug";
    this.unverwundbarBis = this.zeit + 1.2;
    // Freie Bahn nach der Frage - sonst startet man direkt in einem Brocken
    // oder neben einer scharfen Drohne.
    this.meteore = this.meteore.filter((m) => m.x > this.schiff.x + 160);
    this.gegner = this.gegner.filter((g) => g.obj.x > this.schiff.x + 220);
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
      `Py hat die nächste Welt erreicht – zwei Minuten durchs Meteoritenfeld.
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
    const nebentexte = this.tafel.querySelectorAll(
      ".flug__steuerung, .flug__warnung, .flug__schutz");
    nebentexte.forEach((p) => (p.hidden = true));
    const knoepfe = this.tafel.querySelector(".flug__knoepfe");
    knoepfe.innerHTML = "";
    if (mitNeustart) {
      const nochmal = html(`<button class="btn btn--ghost">Nochmal fliegen</button>`);
      nochmal.onclick = () => {
        nebentexte.forEach((p) => (p.hidden = false));
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
    for (const s of this.schilde) this.zeichneSchildItem(s);
    for (const m of this.meteore) this.zeichneMeteor(m);
    for (const g of this.gegner) g.typ.zeichne(g.obj, this);
    this.zeichneSchiff(this.schiff.x, this.schiff.y, this.schiff.vy);
    if (this.schild > 0) this.zeichneSchildkuppel();

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
    // Typos Faelschung dreht sich verkehrt herum - ein zweiter Hinweis
    // neben der Farbe.
    c.rotate(s.falsch ? -s.dreh : s.dreh);
    const verschlossen = s.gesperrtBis > this.zeit;
    const kern = verschlossen ? "148, 163, 184"
               : s.falsch ? "192, 132, 252" : "253, 224, 71";
    const schein = c.createRadialGradient(0, 0, 0, 0, 0, s.r * 2.4);
    schein.addColorStop(0, `rgba(${kern}, .5)`);
    schein.addColorStop(1, `rgba(${kern}, 0)`);
    c.fillStyle = schein;
    c.beginPath(); c.arc(0, 0, s.r * 2.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = verschlossen ? "#64748b" : s.falsch ? "#c084fc" : "#fde047";
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const w = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? s.r : s.r * 0.44;
      c.lineTo(Math.cos(w) * r, Math.sin(w) * r);
    }
    c.closePath(); c.fill();
    if (verschlossen) {
      c.rotate(s.falsch ? s.dreh : -s.dreh);   // Schloss steht still
      c.fillStyle = "#e2e8f0";
      c.fillRect(-s.r * 0.32, -s.r * 0.1, s.r * 0.64, s.r * 0.55);
      c.strokeStyle = "#e2e8f0"; c.lineWidth = 2.2;
      c.beginPath(); c.arc(0, -s.r * 0.12, s.r * 0.24, Math.PI, 0); c.stroke();
    }
    c.restore();
  }

  // Das einsammelbare Schutzschild: Wappenform in Tuerkis, klar von den
  // gelben Sternen zu unterscheiden.
  zeichneSchildItem(s) {
    const c = this.ctx;
    const gross = 1 + Math.sin(s.puls) * 0.06;
    c.save();
    c.translate(s.x, s.y);
    c.scale(gross, gross);

    const schein = c.createRadialGradient(0, 0, 0, 0, 0, s.r * 2.1);
    schein.addColorStop(0, "rgba(103, 232, 249, .5)");
    schein.addColorStop(1, "rgba(103, 232, 249, 0)");
    c.fillStyle = schein;
    c.beginPath(); c.arc(0, 0, s.r * 2.1, 0, Math.PI * 2); c.fill();

    const b = s.r * 0.92, h = s.r;
    c.beginPath();
    c.moveTo(0, -h);
    c.lineTo(b, -h * 0.55);
    c.lineTo(b, h * 0.18);
    c.quadraticCurveTo(b, h * 0.85, 0, h * 1.15);
    c.quadraticCurveTo(-b, h * 0.85, -b, h * 0.18);
    c.lineTo(-b, -h * 0.55);
    c.closePath();
    c.fillStyle = "#0e7490";
    c.fill();
    c.lineWidth = 3; c.strokeStyle = "#a5f3fc"; c.stroke();
    c.fillStyle = "#a5f3fc";
    c.font = `bold ${Math.round(s.r * 0.95)}px system-ui, sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("+", 0, h * 0.1);
    c.restore();
  }

  // Kuppel ums Schiff, solange Ladungen uebrig sind. Je weniger, desto
  // duenner - man sieht auf einen Blick, wie viel noch haelt.
  zeichneSchildkuppel() {
    const c = this.ctx;
    const anteil = this.schild / SCHILD_LADUNGEN;
    const r = this.schiff.r * 1.75 + Math.sin(this.zeit * 5) * 2;
    c.save();
    const g = c.createRadialGradient(this.schiff.x, this.schiff.y, r * 0.6,
                                     this.schiff.x, this.schiff.y, r);
    g.addColorStop(0, "rgba(103, 232, 249, 0)");
    g.addColorStop(1, `rgba(103, 232, 249, ${0.16 + anteil * 0.2})`);
    c.fillStyle = g;
    c.beginPath(); c.arc(this.schiff.x, this.schiff.y, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = `rgba(165, 243, 252, ${0.35 + anteil * 0.45})`;
    c.lineWidth = 1 + anteil * 2.5;
    c.beginPath(); c.arc(this.schiff.x, this.schiff.y, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  zeichneFunkeln() {
    if (!this.funkeln?.length) return;
    const c = this.ctx;
    for (const f of this.funkeln) {
      const p = 1 - f.alter / f.leben;
      c.globalAlpha = Math.max(0, p);
      c.fillStyle = f.farbe ?? "#fde047";
      c.beginPath(); c.arc(f.x, f.y, f.r * p, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  }

  zeichneMeteor(m) {
    const c = this.ctx;
    c.save();
    c.translate(m.x, m.y);
    c.rotate(m.dreh);
    // Bugs Fehler sehen anders aus als Gestein - gruenlich und kantig.
    c.fillStyle = m.fehler ? "#3f6212" : "#4b5563";
    c.beginPath();
    for (let i = 0; i < 7; i++) {
      const w = (i / 7) * Math.PI * 2;
      const r = m.r * (0.78 + ((i * 37) % 10) / 40);
      c.lineTo(Math.cos(w) * r, Math.sin(w) * r);
    }
    c.closePath(); c.fill();
    if (m.fehler) {
      c.strokeStyle = "#a3e635"; c.lineWidth = 2; c.stroke();
    } else {
      c.fillStyle = "rgba(148,163,184,.55)";
      c.beginPath(); c.arc(-m.r * 0.25, -m.r * 0.3, m.r * 0.4, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }


}
