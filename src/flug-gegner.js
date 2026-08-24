// Professor Nulls Gefolge im Flugspiel.
//
// Jeder Handlanger tut hier GENAU DAS, was er in den Lektionen tut. Nullbit
// spaeht und zuendet, Bug streut Fehler, Typo faelscht Sterne. Damit ist die
// Figur nicht Deko, sondern die Lernidee als Spielmechanik.
//
// Welche Figur in welchem Kapitel auftaucht, steht in
// public/content/figuren.json unter kapitel[...].handlanger - dieselbe
// Quelle wie fuer die Lektionen. Wer dort eingetragen ist und hier eine
// Umsetzung hat, fliegt mit; alle anderen werden schlicht uebersprungen.
//
// Aufbau eines Eintrags:
//
//   abStufe      frueheste Kapitelnummer (0-basiert); der erste Flug bleibt frei
//   schautRechts wohin die Bildvorlage blickt (fuer die Spiegelung)
//   warnung      Hinweistext auf der Starttafel
//   erzeuge    legt ein Objekt an (bekommt das Spiel)
//   bewege     pro Bild; false = Objekt entfernen
//   zeichne    pro Bild
//
// Die Funktionen bekommen immer das Flugspiel und duerfen dessen Zustand
// lesen (schiff, meteore, sternObjekte, zeit, breite, hoehe) und seine
// Aktionen nutzen (treffer, funkenAusloesen, explosionAusloesen, melde).

const BASE = import.meta.env.BASE_URL;

// Alle 25 Sekunden tritt EIN Gegner auf - der naechste in der Reihe.
// Vorher zog jede Art auf eigenem Takt endlos durchs Bild; jetzt hat jeder
// einen kurzen Auftritt, und in Kapiteln mit zwei Handlangern wechseln
// sie sich ab.
export const GEGNER_PAUSE = 25;
export const GEGNER_ERSTER = 9;

// ---- gemeinsame Helfer -------------------------------------------------

function mischwert(von, bis, p) {
  return von + (bis - von) * Math.max(0, Math.min(1, p));
}

// Eine freie Hoehe suchen, damit der Gegner nicht in einem Brocken landet.
function freieHoehe(spiel, r, abstand = 60) {
  const belegt = spiel.meteore
    .filter((m) => m.x > spiel.breite - 200)
    .map((m) => ({ y: m.y, r: m.r + abstand }));
  for (let i = 0; i < 12; i++) {
    const y = r + 30 + Math.random() * (spiel.hoehe - 2 * r - 60);
    if (!belegt.some((o) => Math.abs(o.y - y) < o.r + r)) return y;
  }
  return null;
}

// Ein Gleiter fuer die Handlanger, die keine Maschinen sind.
//
// Bug und Typo sind Geschoepfe mit Beinen - frei im Weltraum schwebend
// sahen sie schlicht falsch aus. Sie sitzen deshalb in einem kleinen
// Feindgleiter: dunkler Rumpf, Kanzel nach vorne (links, in Flugrichtung),
// Triebwerk hinten. Die Figur wird in die Kanzel geclippt.
//
// Nullbit braucht das nicht - sie IST eine Drohne.
function zeichneFeindGleiter(c, x, y, h, opt) {
  const { bild, rumpf, glut, kanzel, wippen = 0, blick = -1, schautRechts = true } = opt;
  const b = h * 1.55;                 // Rumpflaenge
  c.save();
  c.translate(x, y + wippen);
  // Die Nase zeigt IMMER in die Flugrichtung. Gezeichnet wird nach links;
  // beim Rueckzug nach rechts wird alles gespiegelt.
  if (blick > 0) c.scale(-1, 1);

  // Triebwerksglut hinten
  const flamme = c.createRadialGradient(b * 0.5, 0, 0, b * 0.5, 0, h * 0.55);
  flamme.addColorStop(0, glut);
  flamme.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = flamme;
  c.beginPath(); c.arc(b * 0.5, 0, h * 0.55, 0, Math.PI * 2); c.fill();

  // Rumpf: Keil, Spitze nach vorne
  c.beginPath();
  c.moveTo(-b * 0.5, 0);
  c.lineTo(-b * 0.12, -h * 0.42);
  c.lineTo(b * 0.42, -h * 0.34);
  c.lineTo(b * 0.46, h * 0.34);
  c.lineTo(-b * 0.12, h * 0.42);
  c.closePath();
  c.fillStyle = rumpf;
  c.fill();
  c.strokeStyle = kanzel; c.lineWidth = 2; c.stroke();

  // Fluegel, nach hinten gepfeilt
  c.fillStyle = rumpf;
  c.beginPath();
  c.moveTo(b * 0.05, -h * 0.3); c.lineTo(b * 0.3, -h * 0.72);
  c.lineTo(b * 0.42, -h * 0.3); c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(b * 0.05, h * 0.3); c.lineTo(b * 0.3, h * 0.72);
  c.lineTo(b * 0.42, h * 0.3); c.closePath(); c.fill();

  // Kanzel mit der Figur darin
  const kx = -b * 0.08, kr = h * 0.4;
  c.save();
  c.beginPath(); c.arc(kx, 0, kr, 0, Math.PI * 2); c.clip();
  c.fillStyle = "rgba(15, 23, 42, .95)";
  c.fill();
  if (bild) {
    const bh = kr * 2.1;
    const bw = (bild.naturalWidth / bild.naturalHeight) * bh;
    c.save();
    c.translate(kx, 0);
    // Die Vorlagen schauen nicht alle in dieselbe Richtung (Bug nach
    // rechts, Typo nach links). Nur wer nach rechts schaut, wird
    // gespiegelt - sonst sitzt einer von beiden verkehrt herum drin.
    if (schautRechts) c.scale(-1, 1);
    c.drawImage(bild, -bw / 2, -bh * 0.52, bw, bh);
    c.restore();
  }
  c.restore();
  // Glas ueber der Kanzel
  c.beginPath(); c.arc(kx, 0, kr, 0, Math.PI * 2);
  c.strokeStyle = kanzel; c.lineWidth = 2.5; c.stroke();
  const glas = c.createLinearGradient(kx - kr, -kr, kx + kr, kr);
  glas.addColorStop(0, "rgba(255,255,255,.22)");
  glas.addColorStop(.5, "rgba(255,255,255,.04)");
  glas.addColorStop(1, "rgba(255,255,255,.16)");
  c.fillStyle = glas;
  c.beginPath(); c.arc(kx, 0, kr, 0, Math.PI * 2); c.fill();

  c.restore();
}

// Gemeinsames Auftrittsmuster fuer die Gleiter-Gegner:
// hereinfliegen -> einmal abwerfen -> abdrehen und wegfliegen.
// Sie ziehen also nicht mehr endlos durchs Bild, sondern haben einen
// kurzen Auftritt und kommen spaeter wieder (siehe GEGNER_PAUSE).
function auftritt(o, dt, spiel, abwerfen, opt = {}) {
  o.puls += dt * 5;
  if (o.phase === "anflug") {
    o.blick = -1;
    o.x -= o.vx * dt;
    o.y = o.grundY + Math.sin(o.puls * 0.35) * 40;
    if (o.x <= o.zielX) { o.phase = "abwurf"; o.rest = opt.haltezeit ?? 0.8; }
  } else if (o.phase === "abwurf") {
    o.blick = -1;
    o.x -= o.vx * 0.2 * dt;          // bremst fast auf der Stelle ab
    o.rest -= dt;
    if (!o.abgeworfen) { abwerfen(o, spiel); o.abgeworfen = true; }
    if (opt.waehrendHalten) opt.waehrendHalten(o, spiel, dt);
    if (o.rest <= 0) { o.phase = "rueckzug"; o.tempo = 0; }
  } else {
    o.blick = 1;                      // abgedreht, Nase nach rechts
    o.tempo = Math.min(o.tempo + 320 * dt, o.vx * 2.6);
    o.x += o.tempo * dt;
    o.y += Math.sin(o.puls * 0.5) * 18 * dt;
  }
  return o.x < spiel.breite + 160;
}

// Legt ein Gleiter-Objekt an: von rechts herein, Ziel etwa Bildmitte.
function gleiterObjekt(spiel, r) {
  const y = freieHoehe(spiel, r);
  if (y === null) return null;
  return {
    x: spiel.breite + r + 20, y, grundY: y, r,
    vx: mischwert(150, 220, spiel.fortschritt),
    zielX: spiel.breite * (0.5 + Math.random() * 0.18),
    phase: "anflug", puls: 0, abgeworfen: false, blick: -1, tempo: 0,
  };
}

// Zeichnet Schein + Gleiter in den Farben des jeweiligen Gegners.
function gleiterZeichnen(o, spiel, typ, farben) {
  const c = spiel.ctx;
  c.save();
  const schein = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 2);
  schein.addColorStop(0, farben.schein);
  schein.addColorStop(1, farben.scheinAus);
  c.fillStyle = schein;
  c.beginPath(); c.arc(o.x, o.y, o.r * 2, 0, Math.PI * 2); c.fill();
  zeichneFeindGleiter(c, o.x, o.y, o.r * 2.3, {
    bild: spiel.bild(typ.ordner, typ.pose),
    rumpf: farben.rumpf, kanzel: farben.kanzel, glut: farben.glut,
    wippen: Math.sin(o.puls) * 3, blick: o.blick, schautRechts: typ.schautRechts,
  });
  c.restore();
}

// ---- Nullbit: Spaeherdrohne, zuendet in Schiffsnaehe --------------------

const ZUENDABSTAND = 120;
const ZUENDZEIT = 1.1;
const ZUENDTEMPO = 0.45;
const DRUCKWELLE = 175;
const SCHADENSRADIUS = 95;
// Die Vorlage zeigt unten einen Scan-Strahl. Bei 196 von 360 px wechselt die
// Farbe von Dunkelblau (Koerper) zu Hellblau (Strahl) - im Flug soll nur der
// Koerper zu sehen sein. Die Datei bleibt unangetastet, die Lektionen
// brauchen den Strahl.
const NULLBIT_BILDANTEIL = 196 / 360;
const ANFLUGTIEFE = 140;

const NULLBIT = {
  ordner: "null-nullbit",
  name: "Nullbit",
  pose: "action",
  abStufe: 1,
  warnung: `⚠️ <strong>Nullbit</strong> blinkt rot, kurz bevor sie explodiert –
    dann weg! Die Druckwelle zerlegt auch alle Meteoriten in der Nähe.`,

  erzeuge(spiel) {
    const r = 24;
    const tempo = mischwert(120, 190, spiel.fortschritt);
    return {
      x: spiel.breite + r + 20,
      y: r + 30 + Math.random() * (spiel.hoehe - 2 * r - 60),
      r, vx: tempo, kursX: -tempo, kursY: 0,
      puls: 0, zuendet: null,
    };
  },

  bewege(d, dt, spiel) {
    if (d.zuendet !== null) {
      // Scharf: Kurs festgelegt und abgebremst, sie zielt nicht mehr nach.
      // Sonst koennte man ihr nach dem Warnsignal nicht mehr entkommen.
      d.x += d.kursX * ZUENDTEMPO * dt;
      d.y += d.kursY * ZUENDTEMPO * dt;
    } else if (d.x > spiel.breite - ANFLUGTIEFE) {
      d.x -= d.vx * dt;                 // erst ein Stueck hereinfliegen
      d.kursX = -d.vx; d.kursY = 0;
    } else {
      const zx = spiel.schiff.x - d.x;  // dann Kurs auf Py
      const zy = spiel.schiff.y - d.y;
      const laenge = Math.hypot(zx, zy) || 1;
      d.kursX = (zx / laenge) * d.vx;
      d.kursY = (zy / laenge) * d.vx;
      d.x += d.kursX * dt;
      d.y += d.kursY * dt;
    }
    d.puls += dt * 6;

    const abstand = Math.hypot(d.x - spiel.schiff.x, d.y - spiel.schiff.y);
    if (d.zuendet === null && abstand < ZUENDABSTAND) {
      d.zuendet = ZUENDZEIT;
      spiel.tonFalsch();
    }
    if (d.zuendet !== null) {
      d.zuendet -= dt;
      if (d.zuendet <= 0) { zuenden(d, spiel); return false; }
    }
    return d.x > -d.r - 20;
  },

  zeichne(d, spiel) {
    const c = spiel.ctx;
    const scharf = d.zuendet !== null;
    const blink = scharf && Math.floor(d.zuendet * 14) % 2 === 0;
    c.save();
    if (scharf) {
      const p = 1 - Math.max(d.zuendet, 0) / ZUENDZEIT;
      c.strokeStyle = `rgba(248, 113, 113, ${0.35 + p * 0.5})`;
      c.lineWidth = 3;
      c.setLineDash([9, 7]);
      c.beginPath(); c.arc(d.x, d.y, DRUCKWELLE * (0.45 + p * 0.55), 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
    }
    const schein = c.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 2.2);
    schein.addColorStop(0, blink ? "rgba(248,113,113,.75)" : "rgba(217,70,239,.45)");
    schein.addColorStop(1, "rgba(217,70,239,0)");
    c.fillStyle = schein;
    c.beginPath(); c.arc(d.x, d.y, d.r * 2.2, 0, Math.PI * 2); c.fill();

    const wippen = Math.sin(d.puls) * 3;
    const bild = spiel.bild(NULLBIT.ordner, NULLBIT.pose);
    if (bild) {
      const qw = bild.naturalWidth;
      const qh = Math.round(bild.naturalHeight * NULLBIT_BILDANTEIL);
      const h = d.r * 2.2, w = (qw / qh) * h;
      c.globalAlpha = blink ? 0.65 : 1;
      c.drawImage(bild, 0, 0, qw, qh, d.x - w / 2, d.y - h / 2 + wippen, w, h);
      c.globalAlpha = 1;
    } else {
      c.fillStyle = blink ? "#f87171" : "#4c1d95";
      c.beginPath(); c.arc(d.x, d.y + wippen, d.r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
};

// Die Druckwelle raeumt auf: Meteoriten im Umkreis gehen kaputt. Steht das
// Schiff noch zu nah, kostet es ein Leben.
function zuenden(d, spiel) {
  spiel.explosionAusloesen(d.x, d.y, 34);
  spiel.melde("BUMM!", "#fbbf24");
  spiel.meteore = spiel.meteore.filter((m) => {
    const nah = Math.hypot(m.x - d.x, m.y - d.y) < DRUCKWELLE + m.r;
    if (nah) spiel.funkenAusloesen(m.x, m.y, "#94a3b8");
    return !nah;
  });
  const abstand = Math.hypot(d.x - spiel.schiff.x, d.y - spiel.schiff.y);
  if (abstand < SCHADENSRADIUS && spiel.zeit > spiel.unverwundbarBis) spiel.treffer();
}

// ---- Bug: streut Fehler ins Programm ------------------------------------
// In den Lektionen baut Bug ein falsches Zeichen hier, eine vertauschte
// Bedingung da. Im Flug fliegt er herein, kippt eine Ladung Fehlerbrocken
// aus und dreht wieder ab. Er selbst tut nichts - man weicht seiner
// Ladung aus, nicht ihm.

const BUG = {
  ordner: "null-bug",
  name: "Bug",
  pose: "action",
  schautRechts: true,     // Vorlage schaut nach rechts, wird gespiegelt
  abStufe: 4,             // ab Kapitel 5
  warnung: `🐛 <strong>Bug</strong> kippt eine Ladung <strong>Fehler</strong>
    aus – die treffen wie Meteoriten.`,

  erzeuge(spiel) {
    const r = 22;
    const y = freieHoehe(spiel, r);
    if (y === null) return null;
    return {
      x: spiel.breite + r + 20, y, grundY: y, r,
      vx: mischwert(150, 220, spiel.fortschritt),
      zielX: spiel.breite * (0.5 + Math.random() * 0.18),
      phase: "anflug", puls: 0, abgeworfen: false, blick: -1, tempo: 0,
    };
  },

  bewege(b, dt, spiel) {
    return auftritt(b, dt, spiel, (o, sp) => {
      // Eine Ladung auf einmal, leicht gestreut.
      for (let i = 0; i < 4; i++) {
        sp.meteore.push({
          x: o.x - 10 + Math.random() * 20,
          y: o.y - 45 + Math.random() * 90,
          r: 12 + Math.random() * 5,
          vx: o.vx * 0.5,
          vy: (Math.random() - 0.5) * 40,
          dreh: Math.random() * Math.PI,
          drehV: (Math.random() - 0.5) * 4,
          fehler: true,
        });
      }
      sp.melde("Fehler!", "#a3e635");
    });
  },

  zeichne(b, spiel) {
    const c = spiel.ctx;
    c.save();
    const schein = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2);
    schein.addColorStop(0, "rgba(163, 230, 53, .4)");
    schein.addColorStop(1, "rgba(163, 230, 53, 0)");
    c.fillStyle = schein;
    c.beginPath(); c.arc(b.x, b.y, b.r * 2, 0, Math.PI * 2); c.fill();
    zeichneFeindGleiter(c, b.x, b.y, b.r * 2.3, {
      bild: spiel.bild(BUG.ordner, BUG.pose),
      rumpf: "#1a2e05", kanzel: "#a3e635", glut: "rgba(163, 230, 53, .55)",
      wippen: Math.sin(b.puls) * 3, blick: b.blick, schautRechts: BUG.schautRechts,
    });
    c.restore();
  },
};

// ---- Typo: faelscht Sterne ----------------------------------------------
// Typo dreht Buchstaben um und tauscht Zeichen aus - "meistens merkt es
// keiner". Im Flug legt er beim Vorbeiflug zwei falsche Sterne aus, die
// den echten sehr aehneln: blass-violett statt goldgelb, und sie drehen
// sich verkehrt herum. Wer nicht hinschaut, verliert ein Leben.

const TYPO = {
  ordner: "null-typo",
  name: "Typo",
  pose: "action",
  schautRechts: false,    // Vorlage schaut schon nach links
  abStufe: 4,             // ab Kapitel 5
  warnung: `✳️ <strong>Typo</strong> legt <strong>falsche Sterne</strong> aus:
    blass-violett statt goldgelb. Einsammeln kostet ein Leben.`,

  erzeuge(spiel) {
    const r = 20;
    const y = freieHoehe(spiel, r);
    if (y === null) return null;
    return {
      x: spiel.breite + r + 20, y, grundY: y, r,
      vx: mischwert(150, 220, spiel.fortschritt),
      zielX: spiel.breite * (0.5 + Math.random() * 0.18),
      phase: "anflug", puls: 0, abgeworfen: false, blick: -1, tempo: 0,
    };
  },

  bewege(t, dt, spiel) {
    return auftritt(t, dt, spiel, (o, sp) => {
      for (let i = 0; i < 2; i++) {
        sp.sternObjekte.push({
          x: o.x, y: o.y + (i === 0 ? -50 : 50) + (Math.random() - 0.5) * 30,
          r: 13, vx: mischwert(150, 250, sp.fortschritt),
          dreh: Math.random() * Math.PI, versatz: Math.random() * 6,
          falsch: true,
        });
      }
      sp.melde("Falsche Sterne!", "#c084fc");
    });
  },

  zeichne(t, spiel) {
    const c = spiel.ctx;
    c.save();
    const schein = c.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r * 2);
    schein.addColorStop(0, "rgba(192, 132, 252, .42)");
    schein.addColorStop(1, "rgba(192, 132, 252, 0)");
    c.fillStyle = schein;
    c.beginPath(); c.arc(t.x, t.y, t.r * 2, 0, Math.PI * 2); c.fill();
    zeichneFeindGleiter(c, t.x, t.y, t.r * 2.3, {
      bild: spiel.bild(TYPO.ordner, TYPO.pose),
      rumpf: "#2e1065", kanzel: "#c084fc", glut: "rgba(192, 132, 252, .55)",
      wippen: Math.sin(t.puls) * 4, blick: t.blick, schautRechts: TYPO.schautRechts,
    });
    c.restore();
  },
};

// ---- Loop: die Endlosschleife -------------------------------------------
// "Ich wiederhole jeden Befehl. Immer wieder." Im Flug dreht Loop seine
// Kreise - aber der Kreismittelpunkt wandert dabei nach links. Er rollt
// also quer durchs Bild und kommt zwangslaeufig an Pys Bahn vorbei.
//
// Der erste Entwurf kreiste an einer festen Stelle. Weil das Feld an Py
// vorbeizieht, sah es aus, als flaege Loop einfach mit - und seine Bahn
// lag rechts neben Pys Spur, war also nie zu erreichen. Er war damit
// folgenlos.

const LOOP = {
  ordner: "null-loop",
  name: "Loop",
  pose: "action",
  schautRechts: false,     // frontale Vorlage, Spiegeln braucht sie nicht
  abStufe: 7,              // ab Kapitel 8
  warnung: `🔁 <strong>Loop</strong> dreht drei Runden im Kreis und versperrt
    den Weg. Berühren kostet ein Leben – warte, bis die Schleife endet.`,

  erzeuge(spiel) {
    const r = 24;
    const y = freieHoehe(spiel, r, 80);
    if (y === null) return null;
    return {
      x: spiel.breite + r + 20, y, mittelY: y, mittelX: 0, r,
      vx: mischwert(150, 210, spiel.fortschritt),
      // Der Mittelpunkt wandert langsamer als das Meteoritenfeld - so
      // bleibt genug Zeit, die Luecke in seiner Kreisbahn zu finden.
      drift: mischwert(95, 140, spiel.fortschritt),
      zielX: spiel.breite * 0.8,
      radius: 75 + Math.random() * 25,
      phase: "anflug", winkel: 0, puls: 0, blick: -1,
    };
  },

  bewege(o, dt, spiel) {
    o.puls += dt * 5;
    if (o.phase === "anflug") {
      o.x -= o.vx * dt;
      if (o.x <= o.zielX) {
        o.phase = "kreist";
        o.mittelX = o.x;                 // ab hier rollt der Kreis
      }
      o.blick = -1;
    } else {
      o.mittelX -= o.drift * dt;         // Mittelpunkt wandert nach links
      o.winkel += dt * 2.1;
      o.x = o.mittelX + Math.cos(o.winkel) * o.radius;
      o.y = o.mittelY + Math.sin(o.winkel) * o.radius;
      // Nase in Bewegungsrichtung: Ableitung der Kreisbahn plus Drift.
      o.blick = (-Math.sin(o.winkel) * o.radius * 2.1 - o.drift) < 0 ? -1 : 1;
      // Loop wirft nichts ab - er IST das Hindernis.
      if (spiel.zeit > spiel.unverwundbarBis
          && Math.hypot(o.x - spiel.schiff.x, o.y - spiel.schiff.y) < o.r + 18) {
        spiel.treffer();
      }
    }
    return o.x > -o.r - 60 && o.mittelX > -o.radius - 60;
  },

  zeichne(o, spiel) {
    const c = spiel.ctx;
    // Kreisbahn sichtbar machen - so sieht man, wo er gleich sein wird.
    if (o.phase !== "anflug") {
      c.save();
      c.strokeStyle = "rgba(56, 189, 248, .35)";
      c.lineWidth = 2; c.setLineDash([8, 8]);
      c.beginPath(); c.arc(o.mittelX, o.mittelY, o.radius, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      c.restore();
    }
    gleiterZeichnen(o, spiel, LOOP, {
      schein: "rgba(56, 189, 248, .45)", scheinAus: "rgba(56, 189, 248, 0)",
      rumpf: "#0c2d48", kanzel: "#38bdf8", glut: "rgba(56, 189, 248, .55)",
    });
  },
};

// ---- Rangor: der Grenzwaechter ------------------------------------------
// "Ich verschiebe Anfang und Ende. Bis wohin laeuft range(1, 5) eigentlich
// wirklich?" Im Flug stellt er eine Wand quer durchs Bild - mit genau EINER
// Luecke. Man muss den Durchlass finden.

const RANGOR = {
  ordner: "null-rangor",
  name: "Rangor",
  pose: "action",
  schautRechts: false,     // frontale Vorlage
  abStufe: 9,              // ab Kapitel 10
  warnung: `🚧 <strong>Rangor</strong> stellt eine Wand quer durchs Bild –
    mit genau <strong>einer Lücke</strong>. Finde den Durchlass.`,

  erzeuge(spiel) { return gleiterObjekt(spiel, 23); },

  bewege(o, dt, spiel) {
    return auftritt(o, dt, spiel, (g, sp) => {
      const felder = 7;
      const feldhoehe = sp.hoehe / felder;
      const luecke = Math.floor(Math.random() * felder);
      for (let i = 0; i < felder; i++) {
        if (i === luecke) continue;
        sp.meteore.push({
          x: g.x + 60, y: (i + 0.5) * feldhoehe,
          r: Math.min(feldhoehe * 0.46, 30),
          vx: mischwert(150, 240, sp.fortschritt),
          vy: 0, dreh: Math.random() * Math.PI, drehV: (Math.random() - 0.5) * 1.2,
        });
      }
      sp.melde("Sperre!", "#f0abfc");
    });
  },

  zeichne(o, spiel) {
    gleiterZeichnen(o, spiel, RANGOR, {
      schein: "rgba(240, 171, 252, .45)", scheinAus: "rgba(240, 171, 252, 0)",
      rumpf: "#3b0764", kanzel: "#f0abfc", glut: "rgba(240, 171, 252, .55)",
    });
  },
};

// ---- Void: die Leere ----------------------------------------------------
// "Ich nehme das, was deine Funktion zurueckgeben soll. Und dann gibt sie
// nichts zurueck." Im Flug reisst Void ein Loch auf: Es zieht das Schiff an
// und verschluckt alle Sterne in der Naehe. Wer gegensteuert, kommt heraus.

const VOID_HALT = 3.2;
const VOID_SOG = 190;

const VOID = {
  ordner: "null-void",
  name: "Void",
  pose: "action",
  schautRechts: false,     // Vorlage schaut schon nach links
  abStufe: 10,             // ab Kapitel 11
  warnung: `🕳️ <strong>Void</strong> reißt ein Loch auf: Es <strong>zieht dich
    an</strong> und verschluckt Sterne. Steuere dagegen.`,

  erzeuge(spiel) { return gleiterObjekt(spiel, 22); },

  bewege(o, dt, spiel) {
    return auftritt(o, dt, spiel,
      (g, sp) => { g.loch = 0; sp.melde("Die Leere!", "#a78bfa"); },
      {
        haltezeit: VOID_HALT,
        waehrendHalten: (g, sp, schritt) => {
          g.loch = Math.min((g.loch ?? 0) + schritt * 2.2, 1);
          // Sog auf das Schiff - kostet kein Leben, aber man muss dagegenhalten.
          const dy = g.y - sp.schiff.y;
          const abstand = Math.abs(dy) || 1;
          sp.schiff.y += Math.sign(dy) * VOID_SOG * g.loch
                         * Math.min(1, 260 / abstand) * schritt;
          // Sterne in Reichweite verschwinden.
          sp.sternObjekte = sp.sternObjekte.filter((st) => {
            if (Math.hypot(st.x - g.x, st.y - g.y) > 130) return true;
            sp.funkenAusloesen(st.x, st.y, "#a78bfa");
            return false;
          });
        },
      });
  },

  zeichne(o, spiel) {
    const c = spiel.ctx;
    if (o.loch > 0) {
      c.save();
      const r = 130 * o.loch;
      const g = c.createRadialGradient(o.x, o.y, r * 0.15, o.x, o.y, r);
      g.addColorStop(0, "rgba(2, 2, 10, .95)");
      g.addColorStop(.7, "rgba(76, 29, 149, .45)");
      g.addColorStop(1, "rgba(167, 139, 250, 0)");
      c.fillStyle = g;
      c.beginPath(); c.arc(o.x, o.y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = `rgba(167, 139, 250, ${.3 + .4 * o.loch})`;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(o.x, o.y, r * (.55 + .12 * Math.sin(o.puls * 2)), 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    gleiterZeichnen(o, spiel, VOID, {
      schein: "rgba(167, 139, 250, .45)", scheinAus: "rgba(167, 139, 250, 0)",
      rumpf: "#1e1b4b", kanzel: "#a78bfa", glut: "rgba(167, 139, 250, .55)",
    });
  },
};

// ---- Nibble: der Sternendieb --------------------------------------------
// "Ein Nibble ist ein halbes Byte - aber ich klaue doppelt so gern." Im
// Flug jagt er den naechsten Stern und frisst ihn. Ein Wettrennen: Wer
// zuerst da ist, bekommt ihn. Kosten tut er nichts.

const NIBBLE = {
  ordner: "null-nibble",
  name: "Nibble",
  pose: "action",
  schautRechts: false,     // die Vorlage laeuft schon nach links
  abStufe: 1,              // ab Kapitel 2
  warnung: `🐾 <strong>Nibble</strong> klaut <strong>Sterne</strong> – wer
    zuerst da ist, bekommt ihn.`,

  erzeuge(spiel) {
    const r = 20;
    const y = freieHoehe(spiel, r);
    if (y === null) return null;
    return {
      x: spiel.breite + r + 20, y, grundY: y, r,
      vx: mischwert(170, 240, spiel.fortschritt),
      phase: "jagd", puls: 0, blick: -1, tempo: 0, beute: 0,
    };
  },

  bewege(o, dt, spiel) {
    o.puls += dt * 6;
    if (o.phase === "jagd") {
      // Den naechstgelegenen Stern ansteuern, sonst einfach weiterziehen.
      let ziel = null, kuerzeste = Infinity;
      for (const st of spiel.sternObjekte) {
        if (st.falsch) continue;               // Faelschungen mag er nicht
        const d = Math.hypot(st.x - o.x, st.y - o.y);
        if (d < kuerzeste) { kuerzeste = d; ziel = st; }
      }
      if (ziel) {
        const zx = ziel.x - o.x, zy = ziel.y - o.y;
        const laenge = Math.hypot(zx, zy) || 1;
        o.x += (zx / laenge) * o.vx * dt;
        o.y += (zy / laenge) * o.vx * dt;
        o.blick = zx < 0 ? -1 : 1;
        if (kuerzeste < o.r + ziel.r) {
          spiel.sternObjekte = spiel.sternObjekte.filter((s) => s !== ziel);
          spiel.funkenAusloesen(ziel.x, ziel.y, "#38bdf8");
          spiel.melde("Geklaut!", "#38bdf8");
          o.beute++;
          if (o.beute >= 2) { o.phase = "rueckzug"; o.tempo = 0; }
        }
      } else {
        o.blick = -1;
        o.x -= o.vx * 0.7 * dt;
        o.y = o.grundY + Math.sin(o.puls * 0.4) * 45;
        if (o.x < spiel.breite * 0.2) { o.phase = "rueckzug"; o.tempo = 0; }
      }
    } else {
      o.blick = 1;
      o.tempo = Math.min(o.tempo + 320 * dt, o.vx * 2.4);
      o.x += o.tempo * dt;
    }
    return o.x < spiel.breite + 160 && o.x > -160;
  },

  zeichne(o, spiel) {
    gleiterZeichnen(o, spiel, NIBBLE, {
      schein: "rgba(56, 189, 248, .4)", scheinAus: "rgba(56, 189, 248, 0)",
      rumpf: "#0c2d48", kanzel: "#7dd3fc", glut: "rgba(125, 211, 252, .55)",
    });
  },
};

// ---- Wirr: verheddert Zeilen und Spalten --------------------------------
// "Du greifst nach Zeile 2 und bekommst Zeile 0." Im Flug wirft er einen
// Knoten ab: zwei sich kreuzende Reihen Brocken, ein Gewirr, durch das man
// sich einen Weg suchen muss.

const WIRR = {
  ordner: "null-wirr",
  name: "Wirr",
  pose: "action",
  schautRechts: false,     // frontale Vorlage
  abStufe: 11,             // ab Kapitel 12
  warnung: `🕸️ <strong>Wirr</strong> wirft einen <strong>Knoten</strong> ab –
    zwei gekreuzte Reihen Brocken. Such dir einen Weg hindurch.`,

  erzeuge(spiel) { return gleiterObjekt(spiel, 22); },

  bewege(o, dt, spiel) {
    return auftritt(o, dt, spiel, (g, sp) => {
      const spanne = Math.min(sp.hoehe * 0.6, 320);
      const mitte = Math.max(spanne / 2 + 20,
                    Math.min(sp.hoehe - spanne / 2 - 20, g.y));
      for (let i = 0; i < 5; i++) {
        const anteil = (i / 4 - 0.5) * spanne;
        for (const richtung of [1, -1]) {
          sp.meteore.push({
            x: g.x + 60 + richtung * anteil * 0.55,
            y: mitte + anteil,
            r: 15 + Math.random() * 5,
            vx: mischwert(150, 230, sp.fortschritt),
            vy: 0, dreh: Math.random() * Math.PI, drehV: (Math.random() - 0.5) * 2,
          });
        }
      }
      sp.melde("Verheddert!", "#c084fc");
    });
  },

  zeichne(o, spiel) {
    gleiterZeichnen(o, spiel, WIRR, {
      schein: "rgba(192, 132, 252, .45)", scheinAus: "rgba(192, 132, 252, 0)",
      rumpf: "#3b0764", kanzel: "#c084fc", glut: "rgba(192, 132, 252, .55)",
    });
  },
};

// ---- Ciphera: versteckt hinter Schluesseln ------------------------------
// "Wer den richtigen Schluessel nicht kennt, kommt nicht hinein." Im Flug
// verschluesselt sie die Sterne im Bild: Sie werden grau und sind sechs
// Sekunden lang nicht einsammelbar. Man muss warten, bis sich das Schloss
// wieder oeffnet.

const CIPHERA_SPERRE = 6;

const CIPHERA = {
  ordner: "null-ciphera",
  name: "Ciphera",
  pose: "action",
  schautRechts: false,     // frontale Vorlage
  abStufe: 12,             // ab Kapitel 13
  warnung: `🔒 <strong>Ciphera</strong> verschließt die <strong>Sterne</strong>
    für ein paar Sekunden – so lange lassen sie sich nicht einsammeln.`,

  erzeuge(spiel) { return gleiterObjekt(spiel, 21); },

  bewege(o, dt, spiel) {
    return auftritt(o, dt, spiel, (g, sp) => {
      let gesperrt = 0;
      for (const st of sp.sternObjekte) {
        if (st.falsch) continue;
        st.gesperrtBis = sp.zeit + CIPHERA_SPERRE;
        gesperrt++;
      }
      sp.melde(gesperrt ? "Verschlossen!" : "Kein Schloss noetig", "#93c5fd");
    });
  },

  zeichne(o, spiel) {
    gleiterZeichnen(o, spiel, CIPHERA, {
      schein: "rgba(147, 197, 253, .45)", scheinAus: "rgba(147, 197, 253, 0)",
      rumpf: "#172554", kanzel: "#93c5fd", glut: "rgba(147, 197, 253, .55)",
    });
  },
};

// ---- Klon: fehlerhafte Kopien -------------------------------------------
// "Aus einem Bauplan mache ich viele Objekte - aber meine Kopien sind
// falsch." Im Flug verdoppelt er jeden Brocken im Bild. Aus einem Feld,
// durch das man gerade noch durchkam, wird eines, das man neu lesen muss.

const KLON = {
  ordner: "null-klon",
  name: "Klon",
  pose: "action",
  schautRechts: false,     // frontale Vorlage
  abStufe: 13,             // ab Kapitel 14
  warnung: `👥 <strong>Klon</strong> <strong>verdoppelt</strong> jeden Brocken
    im Bild – auf einmal ist der Weg ein anderer.`,

  erzeuge(spiel) { return gleiterObjekt(spiel, 22); },

  bewege(o, dt, spiel) {
    return auftritt(o, dt, spiel, (g, sp) => {
      // Nur die rechte Bildhaelfte kopieren - sonst entstehen Zwillinge
      // direkt auf dem Schiff, denen niemand mehr ausweichen kann.
      const vorlagen = sp.meteore.filter((m) => m.x > sp.schiff.x + 220);
      for (const m of vorlagen) {
        sp.meteore.push({
          ...m,
          x: m.x + 30 + Math.random() * 40,
          y: Math.max(m.r, Math.min(sp.hoehe - m.r, m.y + (Math.random() < 0.5 ? -70 : 70))),
          dreh: Math.random() * Math.PI,
        });
      }
      sp.melde(vorlagen.length ? "Kopiert!" : "Nichts zu kopieren", "#e9d5ff");
    });
  },

  zeichne(o, spiel) {
    gleiterZeichnen(o, spiel, KLON, {
      schein: "rgba(233, 213, 255, .45)", scheinAus: "rgba(233, 213, 255, 0)",
      rumpf: "#2e1065", kanzel: "#e9d5ff", glut: "rgba(233, 213, 255, .55)",
    });
  },
};

// ---- Krasch: bringt zum Absturz -----------------------------------------
// "Ein kaputter Wert hier, eine fehlende Datei da - und alles faellt
// zusammen." Im Flug nimmt er Anlauf, kuendigt seine Bahn mit einer
// Warnlinie an und rammt dann quer durchs Bild. Wer die Linie raeumt, ist
// sicher; wer stehen bleibt, stuerzt ab.

const KRASCH_ANKUENDIGUNG = 1.3;

const KRASCH = {
  ordner: "null-krasch",
  name: "Krasch",
  pose: "action",
  schautRechts: false,     // frontale Vorlage
  abStufe: 14,             // ab Kapitel 15
  warnung: `💥 <strong>Krasch</strong> rammt auf der <strong>rot markierten
    Linie</strong> quer durchs Bild. Verlasse die Linie, solange sie blinkt.`,

  erzeuge(spiel) {
    const r = 24;
    const y = freieHoehe(spiel, r, 70);
    if (y === null) return null;
    return {
      x: spiel.breite + r + 20, y, r,
      vx: mischwert(150, 210, spiel.fortschritt),
      zielX: spiel.breite * 0.82,
      phase: "anflug", rest: KRASCH_ANKUENDIGUNG, puls: 0, blick: -1, tempo: 0,
    };
  },

  bewege(o, dt, spiel) {
    o.puls += dt * 6;
    if (o.phase === "anflug") {
      o.x -= o.vx * dt;
      if (o.x <= o.zielX) o.phase = "zielt";
    } else if (o.phase === "zielt") {
      o.rest -= dt;
      if (o.rest <= 0) { o.phase = "rammt"; o.tempo = o.vx * 1.2; }
    } else {
      o.tempo = Math.min(o.tempo + 900 * dt, o.vx * 4.5);
      o.x -= o.tempo * dt;
      if (spiel.zeit > spiel.unverwundbarBis
          && Math.hypot(o.x - spiel.schiff.x, o.y - spiel.schiff.y) < o.r + 20) {
        spiel.treffer();
      }
    }
    return o.x > -o.r - 40;
  },

  zeichne(o, spiel) {
    const c = spiel.ctx;
    if (o.phase === "zielt") {
      const p = 1 - Math.max(o.rest, 0) / KRASCH_ANKUENDIGUNG;
      const blink = Math.floor(o.rest * 12) % 2 === 0;
      c.save();
      c.strokeStyle = `rgba(248, 113, 113, ${blink ? .8 : .3})`;
      c.lineWidth = 3 + p * 4;
      c.setLineDash([16, 12]);
      c.beginPath(); c.moveTo(0, o.y); c.lineTo(o.x, o.y); c.stroke();
      c.setLineDash([]);
      c.restore();
    }
    gleiterZeichnen(o, spiel, KRASCH, {
      schein: "rgba(248, 113, 113, .45)", scheinAus: "rgba(248, 113, 113, 0)",
      rumpf: "#450a0a", kanzel: "#f87171", glut: "rgba(248, 113, 113, .6)",
    });
  },
};

// ---- Verzeichnis --------------------------------------------------------

export const GEGNER = {
  "null-nullbit": NULLBIT,
  "null-nibble": NIBBLE,
  "null-bug": BUG,
  "null-typo": TYPO,
  "null-loop": LOOP,
  "null-rangor": RANGOR,
  "null-void": VOID,
  "null-wirr": WIRR,
  "null-ciphera": CIPHERA,
  "null-klon": KLON,
  "null-krasch": KRASCH,
};

// figuren.json einmal laden und behalten - dieselbe Datei, aus der auch die
// Lektionen ihre Begleitfiguren beziehen.
let figurenCache = null;
export async function ladeHandlanger(chapterId) {
  try {
    if (!figurenCache) {
      const antwort = await fetch(`${BASE}content/figuren.json`);
      if (!antwort.ok) throw new Error(String(antwort.status));
      figurenCache = await antwort.json();
    }
    return figurenCache.kapitel?.[chapterId]?.handlanger ?? [];
  } catch {
    return [];   // ohne Datei fliegt der Flug eben ohne Gegner
  }
}

// Welche Gegner treten in diesem Kapitel wirklich auf? Nur die, die in
// figuren.json stehen, hier eine Umsetzung haben und deren abStufe erreicht
// ist. Der allererste Flug bleibt dadurch ohne Gegner.
export function gegnerAuswahl(handlanger, stufe) {
  return handlanger
    .map((ordner) => GEGNER[ordner])
    .filter((g) => g && stufe >= g.abStufe);
}
