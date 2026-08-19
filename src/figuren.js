// Begleitfiguren waehrend der Lektionen.
//
// Die Geschichte aus dem Intro laeuft im Lernpfad weiter: Loest jemand eine
// Aufgabe richtig, meldet sich ein Verbuendeter (Py, Nia, Byte, Glitch, Ada).
// Geht etwas schief, taucht ein Handlanger von Professor Null auf und
// stichelt - und zieht sich sichtbar zurueck, sobald die Aufgabe doch
// geloest wird. Genau dieser Rueckzug ist die Belohnung fuers Dranbleiben.
//
// Welche Figuren in welchem Kapitel vorkommen, steht in
// public/content/figuren.json - Texte lassen sich dort ohne Code aendern.

const BASE = import.meta.env.BASE_URL;
const KEY = "pyquest.figuren.v1";

export function figurBild(ordner, pose) {
  return `${BASE}figuren/${ordner}/${pose}.webp`;
}

// ---- Welche Figuren wurden schon vorgestellt? ----
// Jede Figur stellt sich genau EINMAL vor (geraetweit gemerkt), danach sagt
// sie nur noch ihre kurzen Sprueche.

function ladeBekannte() {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

let bekannte = ladeBekannte();

function merkeBekannt(id) {
  bekannte.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...bekannte]));
  } catch {
    // Privater Modus: Dann stellen sich die Figuren eben erneut vor.
  }
}

export function istBekannt(id) {
  return bekannte.has(id);
}

// Fuer Sicherungsdatei und "Fortschritt zuruecksetzen".
export function exportFiguren() {
  return [...bekannte];
}

export function importFiguren(liste) {
  if (!Array.isArray(liste)) return;
  liste.forEach((id) => bekannte.add(id));
  try {
    localStorage.setItem(KEY, JSON.stringify([...bekannte]));
  } catch {
    /* ignorieren */
  }
}

export function resetFiguren() {
  bekannte = new Set();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorieren */
  }
}

// ---- Auswahl der passenden Figur ----

function zufall(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

// Wer stellt sich ueberhaupt vor? Nur NEUE Figuren bekommen in
// figuren.json einen "vorstellung"-Text. Py, Ada, Nia, Byte, Glitch und
// Professor Null kennt man schon aus dem Intro - die legen direkt los.
function stelltSichVor(figuren, id) {
  return Boolean(figuren?.[id]?.vorstellung) && !istBekannt(id);
}

// Baut den Auftritt einer Figur: beim ersten Mal ggf. die Vorstellung,
// sonst einen zufaelligen Spruch aus der passenden Liste.
function auftritt(figuren, id, feld, index = null) {
  const figur = figuren?.[id];
  if (!figur) return null;

  if (stelltSichVor(figuren, id)) {
    merkeBekannt(id);
    const v = figur.vorstellung;
    return {
      id,
      name: figur.name,
      rolle: figur.rolle,
      bild: figurBild(figur.ordner, v.pose),
      text: v.text,
      vorstellung: true,
    };
  }

  const liste = figur[feld] ?? [];
  if (!liste.length) return null;
  // Ohne Index (Lob, Rueckzug) einfach abwechseln. MIT Index (Spott) wird
  // die Liste der Reihe nach abgearbeitet - sie ist nach Strenge sortiert.
  // Der letzte Eintrag bleibt danach stehen.
  const spruch = index === null ? zufall(liste) : liste[Math.min(index, liste.length - 1)];
  return {
    id,
    name: figur.name,
    rolle: figur.rolle,
    bild: figurBild(figur.ordner, spruch.pose),
    text: spruch.text,
    vorstellung: false,
  };
}

// Regie fuer ein Kapitel: merkt sich, welcher Handlanger zuletzt gestichelt
// hat, damit sich genau dieser spaeter zurueckziehen kann.
export function createRegie(figurenDaten, chapterId) {
  const kapitel = figurenDaten?.kapitel?.[chapterId];
  if (!kapitel) return null; // Kapitel ohne Begleitfiguren: alles bleibt wie bisher.

  const figuren = figurenDaten.figuren ?? {};
  const verbuendete = kapitel.verbuendete ?? [];
  const handlanger = kapitel.handlanger ?? [];
  // Innerhalb EINER Aufgabe bleibt derselbe Handlanger - es soll sich
  // anfuehlen, als haette man es mit einem Gegenueber zu tun, das immer
  // ungehaltener wird. Der Zaehler waehlt den naechsten, strengeren Spruch.
  let handlangerImSchritt = null;
  let spottIndex = 0;

  return {
    // Neue Aufgabe: Der naechste Fehler darf wieder von vorne anfangen.
    neuerSchritt() {
      handlangerImSchritt = null;
      spottIndex = 0;
    },

    // Falsche Antwort: ein Handlanger von Professor Null taucht auf.
    fehler() {
      if (!handlanger.length) return null;
      if (!handlangerImSchritt) {
        // Neue Handlanger zuerst - so lernt man sie nacheinander kennen,
        // statt gleich alle auf einmal.
        const neue = handlanger.filter((id) => stelltSichVor(figuren, id));
        handlangerImSchritt = neue.length ? neue[0] : zufall(handlanger);
      }
      const a = auftritt(figuren, handlangerImSchritt, "spott", spottIndex);
      // Die Vorstellung verbraucht noch keinen Spott-Spruch - der erste
      // richtige Spruch kommt beim naechsten Fehler.
      if (a && !a.vorstellung) spottIndex++;
      return a;
    },

    // Richtige Loesung. Kam vorher ein Fehler, zieht sich der Handlanger
    // zurueck, der gerade noch gestichelt hat - sonst lobt ein Verbuendeter.
    erfolg({ nachFehler = false } = {}) {
      if (nachFehler && handlangerImSchritt) {
        const id = handlangerImSchritt;
        handlangerImSchritt = null;
        spottIndex = 0;
        const rueckzug = auftritt(figuren, id, "rueckzug");
        if (rueckzug) return rueckzug;
      }
      if (!verbuendete.length) return null;
      const neue = verbuendete.filter((id) => stelltSichVor(figuren, id));
      const id = neue.length ? neue[0] : zufall(verbuendete);
      return auftritt(figuren, id, "lob");
    },

    // Abschluss einer Lektion.
    abschluss() {
      const a = kapitel.abschluss;
      const figur = figuren[a?.figur];
      if (!a || !figur) return null;
      return {
        id: a.figur,
        name: figur.name,
        rolle: figur.rolle,
        bild: figurBild(figur.ordner, a.pose),
        text: a.text,
        vorstellung: false,
      };
    },
  };
}
