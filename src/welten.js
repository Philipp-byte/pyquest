// Der Weltenbaum: Jedes Kapitel ist eine Welt aus der Intro-Geschichte.
//
// Professor Null hat alle sechzehn Welten zerstoert. Wer ein Kapitel
// abschliesst, stellt seine Welt wieder her - genau das erzaehlt das Intro
// als Auftrag ("Findet die Fragmente und bringt die Welten wieder zusammen").
//
// Die Zuordnung folgt dem Welten-Manifest der Grafik-Bibliothek: Die Welten
// wurden dort bereits passend zu den Kapiteln benannt (Textoria = Strings,
// Itera = while, Forvania = for, Matrixa = verschachtelte Listen, ...).
// Bilder liegen unter public/welten/<ordner>/{corrupted,restored}.webp
// (siehe arbeitsblaetter/welten_uebernehmen.py).

import { ORTE } from "./orte-daten.js";

const BASE = import.meta.env.BASE_URL;

const WELTEN = {
  "01-erste-schritte": { ordner: "01-neustart", name: "Neustart" },
  "02-variablen": { ordner: "02-speicherstadt", name: "Speicherstadt" },
  "03-datentypen": { ordner: "03-typopolis", name: "Typopolis" },
  "04-string-funktionen": { ordner: "04-textoria", name: "Textoria" },
  "05-operatoren": { ordner: "05-operatia", name: "Operatia" },
  "06-eingaben": { ordner: "06-dialoga", name: "Dialoga" },
  "07-bedingungen": { ordner: "07-entscheidora", name: "Entscheidora" },
  "08-while-schleifen": { ordner: "08-itera", name: "Itera" },
  "09-listen": { ordner: "09-listara", name: "Listara" },
  "10-for-schleifen": { ordner: "10-forvania", name: "Forvania" },
  "11-funktionen": { ordner: "11-funktoria", name: "Funktoria" },
  "12-verschachtelte-listen": { ordner: "12-matrixa", name: "Matrixa" },
  "13-dictionaries": { ordner: "13-lexikona", name: "Lexikona" },
  "14-klassen": { ordner: "14-objektiva", name: "Objektiva" },
  "15-dateien": { ordner: "15-archivia", name: "Archivia" },
  "16-projekte": { ordner: "16-finalia", name: "Finalia" },
};

// Liefert Name und Bilder der Welt eines Kapitels (oder null, falls ein
// kuenftiges Kapitel einmal keine Welt haben sollte - dann faellt die
// Ansicht auf die schlichte Karte zurueck).
export function weltFuerKapitel(chapterId) {
  const welt = WELTEN[chapterId];
  if (!welt) return null;
  return {
    name: welt.name,
    corrupted: `${BASE}welten/${welt.ordner}/corrupted.webp`,
    restored: `${BASE}welten/${welt.ordner}/restored.webp`,
  };
}

// Schauplatz einer Lektion auf der Kapitel-Landkarte. Jede Welt hat drei
// Orte; die Lektionen werden gleichmaessig darauf verteilt, sodass die
// Reise durch das Kapitel nacheinander alle drei Gegenden besucht
// (bei 7 Lektionen z. B. 3x Ort 1, 2x Ort 2, 2x Ort 3).
export function ortFuerLektion(chapterId, index, gesamt) {
  const welt = WELTEN[chapterId];
  const orte = welt ? ORTE[welt.ordner] : null;
  if (!orte || !orte.length || !gesamt) return null;
  const ort = orte[Math.min(Math.floor((index * orte.length) / gesamt), orte.length - 1)];
  return {
    name: ort.name,
    bild: `${BASE}welten/${welt.ordner}/orte/${ort.datei}`,
  };
}
