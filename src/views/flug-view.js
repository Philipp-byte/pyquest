// Der Flug zwischen zwei Welten - ein kleines Wiederholungsspiel.
//
// Ablauf: Py springt ins Raumschiff und startet. Danach steuern die
// Lernenden das Schiff durch ein Meteoritenfeld. Immer wieder taucht eine
// Frage aus dem gerade abgeschlossenen Kapitel auf; das Schiff muss durch
// das richtige Antwort-Tor fliegen.
//
//   Treffer durch Meteorit  -> ein Leben weniger
//   falsches Tor            -> ein Leben weniger
//   richtiges Tor           -> ein Leben mehr (hoechstens 10)
//
// Die Leben zaehlen ueber den ganzen Kurs (siehe leben.js). Bei 0 Leben
// endet der Flug, die Leben stehen wieder auf 3 - niemand soll dauerhaft
// festhaengen. Das Spiel geht NICHT in die Bewertung ein und laesst sich
// jederzeit ueberspringen.

import { renderHeader, wireHeader, html } from "../ui.js";
import { getLeben, lebenDazu, lebenAbziehen, lebenZuruecksetzen, MAX_LEBEN } from "../leben.js";
import { playCorrect, playWrong, playFinish } from "../sound.js";

const BASE = import.meta.env.BASE_URL;
const BUCHSTABEN = ["A", "B", "C", "D"];

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

        <div class="flug__kopf">
          <span class="flug__leben" title="Leben"></span>
          <span class="flug__ziel">Nächste Welt: <strong>${escape(naechsteWelt(curriculum, stufe))}</strong></span>
        </div>

        <div class="flug__frage" hidden>
          <p class="flug__frage-text"></p>
          <ul class="flug__antworten"></ul>
        </div>

        <div class="flug__tafel">
          <h2 class="flug__titel">Bereit zum Abflug?</h2>
          <p class="flug__text">
            Py fliegt weiter zur nächsten Welt – und du steuerst.
            Weiche den Meteoriten aus und fliege durch das <strong>richtige Antwort-Tor</strong>.
          </p>
          <p class="flug__steuerung">⬆️⬇️ Pfeiltasten – oder mit dem Finger ziehen</p>
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

  app.querySelector(".flug__start").onclick = () => spiel.starten();
  app.querySelector(".flug__skip").onclick = () => {
    spiel.beenden();
    location.hash = `#/chapter/${chapterId}`;
  };
}

// Alle Quizfragen des Kapitels einsammeln und mischen - hoechstens vier,
// sonst wird der Flug zur Prueferei.
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
  for (let i = alle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [alle[i], alle[j]] = [alle[j], alle[i]];
  }
  return alle.slice(0, 4);
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

    // Schwierigkeit steigt mit dem Kapitel.
    this.tempo = 130 + stufe * 12;
    this.meteorPause = Math.max(1500 - stufe * 85, 480);
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

  // ---- Ablauf ----------------------------------------------------------

  starten() {
    this.tafel.hidden = true;
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
    this.schiff = { x: this.breite * 0.22, y: this.hoehe / 2, vy: 0, r: 20 };
    this.hoch = false;
    this.runter = false;
    this.zielY = null;         // fuer Steuerung per Finger/Maus
    this.unverwundbarBis = 0;
    this.frageIndex = 0;
    this.tor = null;
    this.naechsteFrageAb = 4.5; // Sekunden bis zur ersten Frage
    this.phase = "start";       // start -> flug -> ende
    this.startZeit = 0;
    this.meldung = null;

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

    if (this.tor) this.torBewegen(dt);
    else this.meteoreBewegen(dt);

    // Zeit fuer die naechste Frage?
    if (!this.tor && this.zeit > this.naechsteFrageAb && this.frageIndex < this.fragen.length) {
      this.frageStarten();
    }
    // Alle Fragen durch und keine mehr unterwegs -> Ziel erreicht
    if (!this.tor && this.frageIndex >= this.fragen.length && this.zeit > this.naechsteFrageAb + 2) {
      this.zielErreicht();
    }
  }

  meteoreBewegen(dt) {
    if (this.zeit - this.letzterMeteor > this.meteorPause / 1000) {
      this.letzterMeteor = this.zeit;
      const r = 12 + Math.random() * (16 + this.stufe);
      this.meteore.push({
        x: this.breite + r,
        y: r + Math.random() * (this.hoehe - 2 * r),
        r,
        vx: this.tempo * (0.8 + Math.random() * 0.6),
        vy: (Math.random() - 0.5) * 40,
        dreh: Math.random() * Math.PI,
        drehV: (Math.random() - 0.5) * 1.6,
      });
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

  trifft(m) {
    const dx = m.x - this.schiff.x;
    const dy = m.y - this.schiff.y;
    return Math.hypot(dx, dy) < m.r + this.schiff.r * 0.75;
  }

  treffer() {
    this.unverwundbarBis = this.zeit + 1.6;
    playWrong();
    const uebrig = lebenAbziehen(1);
    this.zeigeLeben();
    this.melde("Treffer!", "#fca5a5");
    if (uebrig <= 0) this.abgestuerzt();
  }

  // ---- Fragen ----------------------------------------------------------

  frageStarten() {
    const frage = this.fragen[this.frageIndex];
    // Meteoriten aus dem Weg raeumen, damit das Tor fair bleibt.
    this.meteore = this.meteore.filter((m) => m.x < this.breite * 0.5);

    const anzahl = frage.antworten.length;
    const hoeheProTor = this.hoehe / anzahl;
    this.tor = {
      x: this.breite + 60,
      breite: 26,
      gewertet: false,
      oeffnungen: frage.antworten.map((text, i) => ({
        y0: i * hoeheProTor + 6,
        y1: (i + 1) * hoeheProTor - 6,
        buchstabe: BUCHSTABEN[i],
        richtig: i === frage.richtig,
        text,
      })),
    };

    this.frageFeld.hidden = false;
    this.frageFeld.querySelector(".flug__frage-text").textContent = frage.frage;
    this.frageFeld.querySelector(".flug__antworten").innerHTML = frage.antworten
      .map((a, i) => `<li><b>${BUCHSTABEN[i]}</b> ${escape(a)}</li>`)
      .join("");
  }

  torBewegen(dt) {
    this.tor.x -= this.tempo * 0.75 * dt;
    // Auswertung, sobald das Tor das Schiff erreicht
    if (!this.tor.gewertet && this.tor.x <= this.schiff.x) {
      this.tor.gewertet = true;
      const treffer = this.tor.oeffnungen.find(
        (o) => this.schiff.y >= o.y0 && this.schiff.y <= o.y1
      );
      if (treffer && treffer.richtig) {
        playCorrect();
        lebenDazu(1);
        this.melde("Richtig! +1 Leben", "#86efac");
      } else {
        playWrong();
        const uebrig = lebenAbziehen(1);
        this.melde(treffer ? "Leider falsch" : "Tor verpasst", "#fca5a5");
        if (uebrig <= 0) { this.zeigeLeben(); this.abgestuerzt(); return; }
      }
      this.zeigeLeben();
    }
    if (this.tor.x < -80) {
      this.tor = null;
      this.frageFeld.hidden = true;
      this.frageIndex++;
      this.naechsteFrageAb = this.zeit + 6;
    }
  }

  melde(text, farbe) {
    this.meldung = { text, farbe, bis: this.zeit + 1.4 };
  }

  // ---- Ende ------------------------------------------------------------

  zielErreicht() {
    this.phase = "ende";
    playFinish();
    this.zeigeTafel(
      "🌍 Angekommen!",
      `Py hat die nächste Welt erreicht. Du hast <strong>${getLeben()} von ${MAX_LEBEN}</strong> Leben.`,
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

    for (const m of this.meteore) this.zeichneMeteor(m);
    if (this.tor) this.zeichneTor();
    this.zeichneSchiff(this.schiff.x, this.schiff.y, this.schiff.vy);

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

  zeichnePy(x, y, groesse) {
    if (!this.pyBild) return;
    const b = this.pyBild;
    const h = groesse;
    const w = (b.naturalWidth / b.naturalHeight) * h;
    this.ctx.drawImage(b, x - w / 2, y - h, w, h);
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

    // Rumpf
    c.fillStyle = "#cbd5e1";
    c.beginPath();
    c.moveTo(34, 0); c.lineTo(6, -15); c.lineTo(-20, -11);
    c.lineTo(-20, 11); c.lineTo(6, 15); c.closePath(); c.fill();
    c.fillStyle = "#94a3b8";
    c.beginPath();
    c.moveTo(34, 0); c.lineTo(6, 15); c.lineTo(-20, 11); c.closePath(); c.fill();

    // Kanzel mit Py
    c.fillStyle = "#7dd3fc";
    c.beginPath(); c.ellipse(6, -2, 13, 10, 0, 0, Math.PI * 2); c.fill();
    if (!leer && this.pyBild) {
      c.save();
      c.beginPath(); c.ellipse(6, -2, 12, 9, 0, 0, Math.PI * 2); c.clip();
      const h = 22;
      const w = (this.pyBild.naturalWidth / this.pyBild.naturalHeight) * h;
      c.drawImage(this.pyBild, 6 - w / 2, -2 - h * 0.55, w, h);
      c.restore();
    }
    c.restore();
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

  zeichneTor() {
    const c = this.ctx;
    const t = this.tor;
    for (const o of t.oeffnungen) {
      const hoehe = o.y1 - o.y0;
      c.fillStyle = "rgba(56,189,248,.14)";
      c.fillRect(t.x, o.y0, t.breite, hoehe);
      c.strokeStyle = "rgba(125,211,252,.85)";
      c.lineWidth = 3;
      c.strokeRect(t.x, o.y0, t.breite, hoehe);
      c.fillStyle = "#e0f2fe";
      c.font = "bold 30px system-ui, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(o.buchstabe, t.x + t.breite / 2, o.y0 + hoehe / 2);
    }
    // Trennbalken zwischen den Toren
    c.fillStyle = "#1e293b";
    for (let i = 1; i < t.oeffnungen.length; i++) {
      c.fillRect(t.x - 3, t.oeffnungen[i].y0 - 8, t.breite + 6, 12);
    }
  }
}
