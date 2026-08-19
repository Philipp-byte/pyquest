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

// Baut den Auftritt einer Figur: beim ersten Mal die Vorstellung, danach
// einen zufaelligen Spruch aus der passenden Liste.
function auftritt(figuren, id, feld) {
  const figur = figuren?.[id];
  if (!figur) return null;

  if (!istBekannt(id)) {
    merkeBekannt(id);
    const v = figur.vorstellung;
    if (v) {
      return {
        id,
        name: figur.name,
        rolle: figur.rolle,
        bild: figurBild(figur.ordner, v.pose),
        text: v.text,
        vorstellung: true,
      };
    }
  }

  const spruch = zufall(figur[feld] ?? []);
  if (!spruch) return null;
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
  let letzterHandlanger = null;

  return {
    // Falsche Antwort: ein Handlanger von Professor Null taucht auf.
    fehler() {
      if (!handlanger.length) return null;
      // Noch nicht vorgestellte Handlanger zuerst - so lernt man sie
      // nacheinander kennen, statt gleich alle auf einmal.
      const neue = handlanger.filter((id) => !istBekannt(id));
      const id = neue.length ? neue[0] : zufall(handlanger);
      letzterHandlanger = id;
      return auftritt(figuren, id, "spott");
    },

    // Richtige Loesung. Kam vorher ein Fehler, zieht sich der Handlanger
    // zurueck, der gerade noch gestichelt hat - sonst lobt ein Verbuendeter.
    erfolg({ nachFehler = false } = {}) {
      if (nachFehler && letzterHandlanger) {
        const id = letzterHandlanger;
        letzterHandlanger = null;
        const rueckzug = auftritt(figuren, id, "rueckzug");
        if (rueckzug) return rueckzug;
      }
      if (!verbuendete.length) return null;
      const neue = verbuendete.filter((id) => !istBekannt(id));
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
