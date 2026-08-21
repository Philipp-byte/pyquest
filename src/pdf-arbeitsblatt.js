// Erzeugt das ausgefuellte Aufgabenblatt als PDF-Datei zum Herunterladen.
//
// Warum nicht ueber die Druckfunktion des Browsers? Die hat sich als zu
// unzuverlaessig erwiesen (leere Seiten, je nach Browser und Einstellungen).
// Eine erzeugte Datei sieht ueberall gleich aus und laesst sich direkt
// abgeben - ohne dass jemand im Druckdialog etwas einstellen muss.
//
// Gestaltung nach dem Corporate Design der JJWS: Navy und Markenblau,
// Bildmarke OBEN RECHTS (die verbindliche Position fuer Arbeitsblaetter),
// serifenlose Schrift. Open Sans wird bewusst nicht eingebettet, damit die
// Datei klein bleibt - Helvetica ist die eingebaute Entsprechung zu Arial.

import { getLesson, isDone } from "./store.js";
import { holeLoesung } from "./loesungen.js";

const BASE = import.meta.env.BASE_URL;

// A4 in Millimetern
const SEITE_B = 210;
const SEITE_H = 297;
const RAND = 16;
const BREITE = SEITE_B - 2 * RAND;

// JJWS-Markenfarben
const NAVY = [0, 52, 77];        // #00344D
const BLAU = [0, 159, 227];      // #009FE3
const INFO_BG = [234, 246, 252]; // #EAF6FC
const GRAU = [100, 116, 139];
const GRUEN = [22, 101, 52];
const TEXT = [29, 29, 27];       // #1D1D1B

// Die eingebauten PDF-Schriften kennen nur den westeuropaeischen
// Zeichensatz. Umlaute sind darin enthalten, Pfeile, Haken und Emojis
// nicht - die wuerden als Kauderwelsch erscheinen.
const ERSATZ = {
  "→": "->", "←": "<-", "⇒": "=>", "…": "...",
  "–": "-", "—": "-", "≠": "!=", "≤": "<=", "≥": ">=",
  "„": '"', "“": '"', "”": '"', "‚": "'", "‘": "'", "’": "'",
  "✓": "OK", "✅": "OK", "❌": "X", "☐": "[ ]", "⭐": "*", "★": "*",
  "•": "-", "·": "-",
};

function pdfSicher(text = "") {
  let s = String(text);
  for (const [zeichen, ersatz] of Object.entries(ERSATZ)) {
    s = s.split(zeichen).join(ersatz);
  }
  return s.replace(/[^\x20-\x7E -ÿ\n\t]/g, "");
}

function nurText(md = "") {
  return pdfSicher(
    String(md)
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^[-*]\s+/gm, "- ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// Laedt ein Bild und gibt es als PNG-Datenadresse zurueck. Der Umweg ueber
// die Zeichenflaeche wandelt nebenbei WebP in PNG um - die Figuren liegen
// als WebP vor, jsPDF kann damit nichts anfangen.
// maxHoehe begrenzt die Aufloesung: Im PDF ist das Bild nur wenige
// Millimeter gross - in voller Groesse eingebettet blaeht es die Datei
// unnoetig auf (gemessen: 253 KB statt 60 KB).
function bildLaden(pfad, maxHoehe = 220) {
  return new Promise((fertig) => {
    const bild = new Image();
    bild.onload = () => {
      const faktor = Math.min(1, maxHoehe / bild.naturalHeight);
      const flaeche = document.createElement("canvas");
      flaeche.width = Math.round(bild.naturalWidth * faktor);
      flaeche.height = Math.round(bild.naturalHeight * faktor);
      flaeche.getContext("2d").drawImage(bild, 0, 0, flaeche.width, flaeche.height);
      try {
        fertig({ daten: flaeche.toDataURL("image/png"), b: flaeche.width, h: flaeche.height });
      } catch {
        fertig(null);
      }
    };
    bild.onerror = () => fertig(null); // ohne Bild wird das Blatt trotzdem erzeugt
    bild.src = pfad;
  });
}

// Sucht zwei Figuren des Kapitels heraus: eine verbuendete und einen
// Handlanger - die kennen die Lernenden aus genau diesem Kapitel.
async function kapitelFiguren(curriculum, chapterId) {
  const daten = curriculum.figuren;
  const kapitel = daten?.kapitel?.[chapterId];
  if (!kapitel) return [];
  const auswahl = [];
  const freund = daten.figuren[kapitel.verbuendete?.[0]];
  const gegner = daten.figuren[kapitel.handlanger?.[0]];
  if (freund) auswahl.push({ figur: freund, pose: freund.lob?.[0]?.pose || "neutral" });
  if (gegner) auswahl.push({ figur: gegner, pose: gegner.spott?.[0]?.pose || "neutral" });

  const geladen = [];
  for (const { figur, pose } of auswahl) {
    const bild = await bildLaden(`${BASE}figuren/${figur.ordner}/${pose}.webp`, 200);
    if (bild) geladen.push({ ...bild, name: figur.name, rolle: figur.rolle });
  }
  return geladen;
}

export async function erzeugeArbeitsblattPdf(curriculum, chapterId, { name = "" } = {}) {
  const { jsPDF } = await import("jspdf");
  const chapter = curriculum.chapters.find((c) => c.id === chapterId);
  if (!chapter) throw new Error("Kapitel nicht gefunden.");

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const nummer = curriculum.chapters.findIndex((c) => c.id === chapterId) + 1;
  const [logo, figuren] = await Promise.all([
    bildLaden(`${BASE}marke/jjws-bildmarke.png`, 150),
    kapitelFiguren(curriculum, chapterId),
  ]);
  let y = RAND;

  // ---- Bausteine --------------------------------------------------------
  function neueSeite() {
    doc.addPage();
    y = RAND;
  }
  function platzPruefen(hoehe) {
    if (y + hoehe > SEITE_H - RAND - 8) neueSeite();
  }
  function zeilen(inhalt, size, breite) {
    doc.setFontSize(size);
    return doc.splitTextToSize(pdfSicher(inhalt), breite);
  }
  function text(inhalt, { size = 9.5, style = "normal", farbe = TEXT, x = RAND, breite = BREITE } = {}) {
    if (!inhalt) return;
    doc.setFont("helvetica", style);
    doc.setTextColor(...farbe);
    for (const zeile of zeilen(inhalt, size, breite)) {
      platzPruefen(6);
      doc.text(zeile, x, y);
      y += size * 0.42 + 1.3;
    }
  }

  // Infotext klar als solcher: heller Kasten mit Markenblau-Kante.
  function infoKasten(inhalt) {
    const innen = BREITE - 8;
    const zs = zeilen(inhalt, 9.5, innen);
    const hoehe = zs.length * 5 + 8;
    platzPruefen(hoehe + 2);
    doc.setFillColor(...INFO_BG);
    doc.setDrawColor(...BLAU);
    doc.setLineWidth(0.2);
    doc.roundedRect(RAND, y - 3, BREITE, hoehe, 1.5, 1.5, "FD");
    doc.setFillColor(...BLAU);
    doc.rect(RAND, y - 3, 1.6, hoehe, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...BLAU);
    doc.text("INFO", RAND + 4, y + 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    let ty = y + 1;
    for (const z of zs) {
      doc.text(z, RAND + 16, ty);
      ty += 5;
    }
    y += hoehe + 2.5;
  }

  function codeKasten(code, { rahmen = [203, 213, 225], fuellung = [246, 248, 250] } = {}) {
    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    const zs = pdfSicher(code).split("\n").flatMap((z) => doc.splitTextToSize(z, BREITE - 8));
    const hoehe = zs.length * 4 + 5;
    platzPruefen(hoehe + 2);
    doc.setFillColor(...fuellung);
    doc.setDrawColor(...rahmen);
    doc.roundedRect(RAND, y - 3, BREITE, hoehe, 1.5, 1.5, "FD");
    doc.setTextColor(15, 23, 42);
    let cy = y + 1;
    for (const z of zs) {
      doc.text(z, RAND + 4, cy);
      cy += 4;
    }
    y += hoehe + 2.5;
  }

  // ---- Kopf mit Logo oben rechts (JJWS-Vorgabe) -------------------------
  if (logo) {
    const h = 13;
    doc.addImage(logo.daten, "PNG", SEITE_B - RAND - (logo.b * h) / logo.h, y - 3, (logo.b * h) / logo.h, h);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLAU);
  doc.text("INFORMATIK - PYQUEST", RAND, y);
  y += 6.5;
  doc.setFontSize(17);
  doc.setTextColor(...NAVY);
  doc.text("Information- & Aufgabenblatt", RAND, y);
  y += 6;
  doc.setFontSize(10.5);
  doc.text(pdfSicher(`Kapitel ${nummer}: ${chapter.title}`), RAND, y);
  y += 7.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAU);
  doc.setDrawColor(...GRAU);
  const datum = new Date().toLocaleDateString("de-DE");
  doc.text("Name:", RAND, y);
  doc.line(RAND + 13, y + 1, RAND + 78, y + 1);
  if (name) {
    doc.setTextColor(...TEXT);
    doc.text(pdfSicher(name), RAND + 15, y);
    doc.setTextColor(...GRAU);
  }
  doc.text("Klasse:", RAND + 86, y);
  doc.line(RAND + 100, y + 1, RAND + 130, y + 1);
  doc.text(`Datum: ${datum}`, RAND + 136, y);
  y += 5;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.9);
  doc.line(RAND, y, SEITE_B - RAND, y);
  doc.setLineWidth(0.2);
  y += 7;

  // Begleitfigur des Kapitels rechts neben die erste Lektion setzen -
  // ein Wiedererkennungspunkt, ohne Platz zu verschwenden.
  let ersteFigur = figuren[0];

  // ---- Inhalt -----------------------------------------------------------
  let aufgabenNr = 0;
  let beantwortet = 0;
  let gesamt = 0;

  chapter.lessons.forEach((lesson) => {
    platzPruefen(16);
    doc.setFillColor(...NAVY);
    doc.roundedRect(RAND, y - 4.5, BREITE, 7.5, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text(pdfSicher(lesson.title), RAND + 3, y);
    if (isDone(lesson.id)) {
      const sterne = getLesson(lesson.id).stars ?? 0;
      doc.setFontSize(8.5);
      doc.text("*".repeat(sterne) + ` (${sterne}/3)`, SEITE_B - RAND - 3, y, { align: "right" });
    }
    y += 7;

    // Figur einmalig neben den Anfang setzen
    if (ersteFigur) {
      const h = 24;
      const b = (ersteFigur.b * h) / ersteFigur.h;
      doc.addImage(ersteFigur.daten, "PNG", SEITE_B - RAND - b, y - 2, b, h);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...GRAU);
      doc.text(pdfSicher(ersteFigur.name), SEITE_B - RAND - b / 2, y + h + 2, { align: "center" });
      ersteFigur = null;
    }

    lesson.steps.forEach((step, si) => {
      if (step.type === "explain" && step.text) {
        infoKasten(nurText(step.text));
      } else if (step.type === "example" && step.code) {
        if (step.text) text(nurText(step.text), { size: 9, farbe: GRAU });
        codeKasten(step.code);
      } else if (step.type === "quiz") {
        aufgabenNr++;
        gesamt++;
        const erledigt = isDone(lesson.id);
        if (erledigt) beantwortet++;
        aufgabenKopf(aufgabenNr);
        text(nurText(step.question), { size: 9.5, style: "bold", farbe: NAVY });
        (step.choices || []).forEach((c) => text("[  ]  " + nurText(c), { size: 9.5, x: RAND + 4, breite: BREITE - 4 }));
        text(
          erledigt ? "Deine Antwort: " + nurText(step.choices[step.answer]) : "Noch nicht bearbeitet.",
          { size: 9, style: erledigt ? "bold" : "italic", farbe: erledigt ? GRUEN : GRAU }
        );
        y += 2.5;
      } else if (step.type === "code") {
        aufgabenNr++;
        gesamt++;
        const eigene = holeLoesung(lesson.id, si);
        aufgabenKopf(aufgabenNr);
        text(nurText(step.task), { size: 9.5 });
        if (eigene) {
          beantwortet++;
          text("Deine Loesung:", { size: 8.5, style: "bold", farbe: GRUEN });
          codeKasten(eigene, { rahmen: [34, 197, 94], fuellung: [240, 253, 244] });
        } else {
          platzPruefen(24);
          doc.setDrawColor(...GRAU);
          doc.setLineDashPattern([1, 1], 0);
          doc.roundedRect(RAND, y - 2, BREITE, 20, 1.5, 1.5, "D");
          doc.setLineDashPattern([], 0);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8.5);
          doc.setTextColor(...GRAU);
          doc.text("Noch nicht geloest - hier ist Platz fuer deine Loesung.", RAND + 3, y + 3);
          y += 22;
        }
        y += 2;
      }
    });
    y += 2.5;
  });

  // Kleine Aufgaben-Marke in Markenblau
  function aufgabenKopf(nr) {
    platzPruefen(10);
    doc.setFillColor(...BLAU);
    doc.roundedRect(RAND, y - 4, 21, 5.5, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`AUFGABE ${nr}`, RAND + 2, y - 0.2);
    y += 5;
  }

  // ---- Abschluss mit der zweiten Figur ----------------------------------
  const gegner = figuren[1];
  if (gegner) {
    platzPruefen(26);
    const h = 20;
    const b = (gegner.b * h) / gegner.h;
    doc.addImage(gegner.daten, "PNG", RAND, y, b, h);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GRAU);
    doc.text(
      pdfSicher(`${gegner.name} hat es in diesem Kapitel versucht - und du hast trotzdem`),
      RAND + b + 4, y + 8
    );
    doc.text(`${beantwortet} von ${gesamt} Aufgaben geloest.`, RAND + b + 4, y + 13);
    y += h + 4;
  }

  // ---- Fusszeilen -------------------------------------------------------
  const seiten = doc.getNumberOfPages();
  for (let i = 1; i <= seiten; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BLAU);
    doc.setLineWidth(0.5);
    doc.line(RAND, SEITE_H - 13, SEITE_B - RAND, SEITE_H - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAU);
    doc.text(pdfSicher(`PyQuest - Kapitel ${nummer}: ${chapter.title}`), RAND, SEITE_H - 9);
    doc.text(`Seite ${i} von ${seiten}`, SEITE_B - RAND, SEITE_H - 9, { align: "right" });
  }

  const sauber = (name || "").trim().replace(/[^\wäöüÄÖÜß -]/g, "").replace(/\s+/g, "-");
  const datei = `PyQuest-Kapitel-${String(nummer).padStart(2, "0")}${sauber ? "-" + sauber : ""}.pdf`;
  return { doc, datei, beantwortet, gesamt, seiten };
}

// Erzeugt das PDF und stoesst den Download an.
export async function ladeArbeitsblattHerunter(curriculum, chapterId, optionen) {
  const ergebnis = await erzeugeArbeitsblattPdf(curriculum, chapterId, optionen);
  ergebnis.doc.save(ergebnis.datei);
  return ergebnis;
}
