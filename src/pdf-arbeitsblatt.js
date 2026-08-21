// Erzeugt das ausgefuellte Aufgabenblatt als PDF-Datei zum Herunterladen.
//
// Warum nicht ueber die Druckfunktion des Browsers? Die hat sich als zu
// unzuverlaessig erwiesen (leere Seiten, je nach Browser und Einstellungen).
// Eine erzeugte Datei sieht ueberall gleich aus und laesst sich direkt
// abgeben - ohne dass jemand im Druckdialog etwas richtig einstellen muss.

import { getLesson, isDone } from "./store.js";
import { holeLoesung } from "./loesungen.js";

// A4 in Millimetern
const SEITE_B = 210;
const SEITE_H = 297;
const RAND = 18;
const BREITE = SEITE_B - 2 * RAND;

const NAVY = [0, 52, 77];
const BLAU = [0, 159, 227];
const GRAU = [100, 116, 139];
const GRUEN = [22, 101, 52];

// Die eingebauten PDF-Schriften kennen nur den westeuropaeischen
// Zeichensatz. Umlaute sind darin enthalten, Pfeile, Haken und Emojis
// nicht - die wuerden als Kaestchen oder Kauderwelsch erscheinen.
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
  // Alles, was der Zeichensatz nicht kann (v. a. Emojis), faellt weg.
  return s.replace(/[^\x20-\x7E -ÿ\n\t]/g, "");
}

// Markdown-Reste entfernen - im PDF steht reiner Text.
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

export async function erzeugeArbeitsblattPdf(curriculum, chapterId, { name = "" } = {}) {
  const { jsPDF } = await import("jspdf");
  const chapter = curriculum.chapters.find((c) => c.id === chapterId);
  if (!chapter) throw new Error("Kapitel nicht gefunden.");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const nummer = curriculum.chapters.findIndex((c) => c.id === chapterId) + 1;
  let y = RAND;

  // --- Hilfsfunktionen ---------------------------------------------------
  function neueSeite() {
    doc.addPage();
    y = RAND;
  }
  function platzPruefen(hoehe) {
    if (y + hoehe > SEITE_H - RAND) neueSeite();
  }
  function text(inhalt, { size = 10, style = "normal", farbe = [17, 24, 39], abstand = 1.6 } = {}) {
    if (!inhalt) return;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...farbe);
    for (const zeile of doc.splitTextToSize(pdfSicher(inhalt), BREITE)) {
      platzPruefen(abstand + 2);
      doc.text(zeile, RAND, y);
      y += size * 0.42 + abstand;
    }
  }
  // Code in Schreibmaschinenschrift mit hinterlegtem Kasten.
  function codeKasten(code, { rahmen = [203, 213, 225], fuellung = [241, 245, 249] } = {}) {
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    const zeilen = pdfSicher(code).split("\n").flatMap((z) => doc.splitTextToSize(z, BREITE - 6));
    const hoehe = zeilen.length * 4.2 + 5;
    platzPruefen(hoehe + 3);
    doc.setFillColor(...fuellung);
    doc.setDrawColor(...rahmen);
    doc.roundedRect(RAND, y - 3, BREITE, hoehe, 1.5, 1.5, "FD");
    doc.setTextColor(15, 23, 42);
    let cy = y + 1.5;
    for (const z of zeilen) {
      doc.text(z, RAND + 3, cy);
      cy += 4.2;
    }
    y += hoehe + 3;
  }

  // --- Kopf --------------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLAU);
  doc.text("INFORMATIK - PYQUEST", RAND, y);
  y += 7;
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text("Information- & Aufgabenblatt", RAND, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(pdfSicher(`Kapitel ${nummer}: ${chapter.title}`), RAND, y);
  y += 8;

  // Namensfeld
  doc.setDrawColor(...GRAU);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAU);
  const datum = new Date().toLocaleDateString("de-DE");
  doc.text("Name:", RAND, y);
  doc.line(RAND + 14, y + 1, RAND + 80, y + 1);
  if (name) {
    doc.setTextColor(17, 24, 39);
    doc.text(pdfSicher(name), RAND + 16, y);
    doc.setTextColor(...GRAU);
  }
  doc.text("Klasse:", RAND + 90, y);
  doc.line(RAND + 105, y + 1, RAND + 135, y + 1);
  doc.text(`Datum: ${datum}`, RAND + 140, y);
  y += 6;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(RAND, y, SEITE_B - RAND, y);
  doc.setLineWidth(0.2);
  y += 7;

  // --- Inhalt ------------------------------------------------------------
  let aufgabenNr = 0;
  let beantwortet = 0;
  let gesamt = 0;

  for (const lesson of chapter.lessons) {
    platzPruefen(14);
    doc.setFillColor(...BLAU);
    doc.rect(RAND, y - 4, 1.5, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(pdfSicher(lesson.title), RAND + 4, y);
    if (isDone(lesson.id)) {
      const sterne = getLesson(lesson.id).stars ?? 0;
      doc.setFontSize(9);
      doc.setTextColor(...GRAU);
      doc.text("*".repeat(sterne) + ` (${sterne}/3)`, SEITE_B - RAND - 20, y);
    }
    y += 6;

    lesson.steps.forEach((step, si) => {
      if (step.type === "explain" && step.text) {
        text(nurText(step.text), { size: 10 });
        y += 1;
      } else if (step.type === "example" && step.code) {
        if (step.text) text(nurText(step.text), { size: 10, farbe: GRAU });
        codeKasten(step.code);
      } else if (step.type === "quiz") {
        aufgabenNr++;
        gesamt++;
        const erledigt = isDone(lesson.id);
        if (erledigt) beantwortet++;
        text(`Aufgabe ${aufgabenNr}: ${nurText(step.question)}`, { size: 10, style: "bold", farbe: NAVY });
        (step.choices || []).forEach((c) => text("   [ ]  " + nurText(c), { size: 10 }));
        if (erledigt) {
          text("Deine Antwort: " + nurText(step.choices[step.answer]), { size: 10, style: "bold", farbe: GRUEN });
        } else {
          text("Noch nicht bearbeitet.", { size: 9, style: "italic", farbe: GRAU });
        }
        y += 3;
      } else if (step.type === "code") {
        aufgabenNr++;
        gesamt++;
        const eigene = holeLoesung(lesson.id, si);
        text(`Aufgabe ${aufgabenNr}:`, { size: 10, style: "bold", farbe: NAVY });
        text(nurText(step.task), { size: 10 });
        if (eigene) {
          beantwortet++;
          text("Deine Lösung:", { size: 9, style: "bold", farbe: GRUEN });
          codeKasten(eigene, { rahmen: [34, 197, 94], fuellung: [240, 253, 244] });
        } else {
          // Platz zum Ausfuellen von Hand
          platzPruefen(26);
          doc.setDrawColor(...GRAU);
          doc.setLineDashPattern([1, 1], 0);
          doc.roundedRect(RAND, y - 2, BREITE, 22, 1.5, 1.5, "D");
          doc.setLineDashPattern([], 0);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(...GRAU);
          doc.text("Noch nicht geloest - hier ist Platz fuer deine Loesung.", RAND + 3, y + 3);
          y += 24;
        }
        y += 2;
      }
    });
    y += 3;
  }

  // --- Fusszeilen --------------------------------------------------------
  const seiten = doc.getNumberOfPages();
  for (let i = 1; i <= seiten; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAU);
    doc.text(pdfSicher(`PyQuest - Kapitel ${nummer}: ${chapter.title}`), RAND, SEITE_H - 10);
    doc.text(`Seite ${i} von ${seiten}`, SEITE_B - RAND, SEITE_H - 10, { align: "right" });
  }

  const sauber = (name || "").trim().replace(/[^\wäöüÄÖÜß -]/g, "").replace(/\s+/g, "-");
  const datei = `PyQuest-Kapitel-${String(nummer).padStart(2, "0")}${sauber ? "-" + sauber : ""}.pdf`;
  // Nicht selbst speichern: So laesst sich das Ergebnis auch pruefen oder
  // spaeter anders weiterverwenden.
  return { doc, datei, beantwortet, gesamt, seiten };
}

// Erzeugt das PDF und stoesst den Download an.
export async function ladeArbeitsblattHerunter(curriculum, chapterId, optionen) {
  const ergebnis = await erzeugeArbeitsblattPdf(curriculum, chapterId, optionen);
  ergebnis.doc.save(ergebnis.datei);
  return ergebnis;
}
