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
//   abStufe    frueheste Kapitelnummer (0-basiert); der erste Flug bleibt frei
//   pause      Sekunden zwischen zwei Auftritten, abhaengig von der Stufe
//   erstesAb   Sekunde des ersten Auftritts
//   warnung    Hinweistext auf der Starttafel
//   erzeuge    legt ein Objekt an (bekommt das Spiel)
//   bewege     pro Bild; false = Objekt entfernen
//   zeichne    pro Bild
//
// Die Funktionen bekommen immer das Flugspiel und duerfen dessen Zustand
// lesen (schiff, meteore, sternObjekte, zeit, breite, hoehe) und seine
// Aktionen nutzen (treffer, funkenAusloesen, explosionAusloesen, melde).

const BASE = import.meta.env.BASE_URL;

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
  erstesAb: 6,
  pause: (stufe) => Math.max(11 - stufe * 0.5, 5.5),
  warnung: `⚠️ Professor Null schickt <strong>Nullbit</strong> mit. Kommt die
    Drohne nah heran, blinkt sie rot und explodiert – dann nichts wie weg!
    Ihre Druckwelle zerlegt allerdings auch jeden Meteoriten in der Nähe.`,

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
// Bedingung da. Im Flug laesst er genau das fallen: kleine Fehlerbrocken,
// die wie Meteoriten treffen. Er selbst tut nichts - man muss seiner Spur
// ausweichen, nicht ihm.

const BUG = {
  ordner: "null-bug",
  name: "Bug",
  pose: "action",
  abStufe: 4,             // ab Kapitel 5
  erstesAb: 9,
  pause: (stufe) => Math.max(13 - stufe * 0.4, 7),
  warnung: `🐛 <strong>Bug</strong> schleicht durchs Bild und lässt überall
    kleine <strong>Fehler</strong> fallen. Die treffen genau wie Meteoriten –
    also nicht in seine Spur fliegen.`,

  erzeuge(spiel) {
    const r = 22;
    const y = freieHoehe(spiel, r);
    if (y === null) return null;
    return {
      x: spiel.breite + r + 20, y, r,
      vx: mischwert(105, 165, spiel.fortschritt),
      grundY: y, schwung: Math.random() * 6,
      letzterFehler: 0, puls: 0,
    };
  },

  bewege(b, dt, spiel) {
    b.x -= b.vx * dt;
    // Schlingerkurs - er "sucht" sich seine Stellen.
    b.schwung += dt * 1.6;
    b.y = b.grundY + Math.sin(b.schwung) * 70;
    b.puls += dt * 5;

    // alle 0,45 s einen Fehler fallen lassen
    b.letzterFehler += dt;
    if (b.letzterFehler > 0.45) {
      b.letzterFehler = 0;
      spiel.meteore.push({
        x: b.x, y: b.y,
        r: 9 + Math.random() * 4,
        vx: b.vx * 0.55,
        vy: (Math.random() - 0.5) * 30,
        dreh: Math.random() * Math.PI,
        drehV: (Math.random() - 0.5) * 4,
        fehler: true,               // wird andersfarbig gezeichnet
      });
    }
    return b.x > -b.r - 20;
  },

  zeichne(b, spiel) {
    const c = spiel.ctx;
    c.save();
    const schein = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2);
    schein.addColorStop(0, "rgba(163, 230, 53, .4)");
    schein.addColorStop(1, "rgba(163, 230, 53, 0)");
    c.fillStyle = schein;
    c.beginPath(); c.arc(b.x, b.y, b.r * 2, 0, Math.PI * 2); c.fill();

    const bild = spiel.bild(BUG.ordner, BUG.pose);
    const wippen = Math.sin(b.puls) * 3;
    if (bild) {
      const h = b.r * 2.4, w = (bild.naturalWidth / bild.naturalHeight) * h;
      c.drawImage(bild, b.x - w / 2, b.y - h / 2 + wippen, w, h);
    } else {
      c.fillStyle = "#4d7c0f";
      c.beginPath(); c.arc(b.x, b.y + wippen, b.r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
};

// ---- Typo: faelscht Sterne ----------------------------------------------
// Typo dreht Buchstaben um und tauscht Zeichen aus - "meistens merkt es
// keiner". Im Flug legt er falsche Sterne aus, die den echten sehr aehneln.
// Wer nicht genau hinschaut, sammelt einen ein und verliert ein Leben.
// Erkennbar sind sie an der Farbe (blass-violett statt goldgelb) und daran,
// dass sie sich falsch herum drehen.

const TYPO = {
  ordner: "null-typo",
  name: "Typo",
  pose: "action",
  abStufe: 4,             // ab Kapitel 5
  erstesAb: 12,
  pause: (stufe) => Math.max(15 - stufe * 0.4, 8),
  warnung: `✳️ <strong>Typo</strong> legt <strong>falsche Sterne</strong> aus.
    Sie sehen den echten ähnlich, sind aber blass-violett statt goldgelb.
    Wer einen einsammelt, verliert ein Leben – also genau hinschauen.`,

  erzeuge(spiel) {
    const r = 20;
    const y = freieHoehe(spiel, r);
    if (y === null) return null;
    return { x: spiel.breite + r + 20, y, r, puls: 0, gelegt: 0,
             vx: mischwert(115, 175, spiel.fortschritt) };
  },

  bewege(t, dt, spiel) {
    t.x -= t.vx * dt;
    t.puls += dt * 4;
    t.y += Math.sin(t.puls * 0.7) * 30 * dt;

    // Zwei falsche Sterne pro Auftritt, sonst wird es zur Minenwueste.
    t.gelegt += dt;
    if (t.gelegt > 1.6 && (t.falsche ?? 0) < 2) {
      t.gelegt = 0;
      t.falsche = (t.falsche ?? 0) + 1;
      spiel.sternObjekte.push({
        x: t.x, y: t.y + (Math.random() - 0.5) * 90,
        r: 13, vx: mischwert(150, 250, spiel.fortschritt),
        dreh: Math.random() * Math.PI, versatz: Math.random() * 6,
        falsch: true,               // kostet ein Leben statt zu zaehlen
      });
    }
    return t.x > -t.r - 20;
  },

  zeichne(t, spiel) {
    const c = spiel.ctx;
    c.save();
    const schein = c.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r * 2);
    schein.addColorStop(0, "rgba(192, 132, 252, .42)");
    schein.addColorStop(1, "rgba(192, 132, 252, 0)");
    c.fillStyle = schein;
    c.beginPath(); c.arc(t.x, t.y, t.r * 2, 0, Math.PI * 2); c.fill();

    const bild = spiel.bild(TYPO.ordner, TYPO.pose);
    const wippen = Math.sin(t.puls) * 4;
    if (bild) {
      const h = t.r * 2.4, w = (bild.naturalWidth / bild.naturalHeight) * h;
      c.drawImage(bild, t.x - w / 2, t.y - h / 2 + wippen, w, h);
    } else {
      c.fillStyle = "#7e22ce";
      c.beginPath(); c.arc(t.x, t.y + wippen, t.r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
};

// ---- Verzeichnis --------------------------------------------------------

export const GEGNER = {
  "null-nullbit": NULLBIT,
  "null-bug": BUG,
  "null-typo": TYPO,
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
