// Vergleicht erwartete und tatsaechliche Ausgabe und erklaert den Unterschied.
//
// Hintergrund: Die Aufgaben pruefen die Ausgabe ganz genau - Rechtschreibung
// und Satzzeichen gehoeren dazu. Ein fehlender Punkt oder ein Leerzeichen zu
// viel faellt beim Lesen aber kaum auf. Statt nur "stimmt nicht" zu melden,
// zeigen wir deshalb GENAU die Stelle und sagen in Worten, was fehlt.

const ZEICHEN_NAMEN = {
  ".": "ein Punkt (.)",
  ",": "ein Komma (,)",
  "!": "ein Ausrufezeichen (!)",
  "?": "ein Fragezeichen (?)",
  ":": "ein Doppelpunkt (:)",
  ";": "ein Semikolon (;)",
  "-": "ein Bindestrich (-)",
  '"': "ein Anführungszeichen (\")",
  "'": "ein Apostroph (')",
  " ": "ein Leerzeichen",
  "\t": "ein Tabulator",
};

const SATZZEICHEN = /[.,!?;:'"()\-–—]/g;

function nurText(s) {
  return s.replace(SATZZEICHEN, "");
}

function ohneLeerraum(s) {
  return s.replace(/\s+/g, "");
}

function benenne(zeichen) {
  if (!zeichen) return "";
  const einzeln = [...new Set(zeichen.split(""))];
  const namen = einzeln.map((c) => ZEICHEN_NAMEN[c] || `„${c}“`);
  if (namen.length === 1) return namen[0];
  return namen.slice(0, -1).join(", ") + " und " + namen[namen.length - 1];
}

// Zerlegt zwei Zeilen in gemeinsamen Anfang, unterschiedliche Mitte und
// gemeinsames Ende - so laesst sich die Abweichung punktgenau markieren.
export function zerlege(erwartet, bekommen) {
  let start = 0;
  while (start < erwartet.length && start < bekommen.length && erwartet[start] === bekommen[start]) {
    start++;
  }
  let ende = 0;
  while (
    ende < erwartet.length - start &&
    ende < bekommen.length - start &&
    erwartet[erwartet.length - 1 - ende] === bekommen[bekommen.length - 1 - ende]
  ) {
    ende++;
  }
  return {
    anfang: erwartet.slice(0, start),
    erwartetMitte: erwartet.slice(start, erwartet.length - ende),
    bekommenMitte: bekommen.slice(start, bekommen.length - ende),
    schluss: erwartet.slice(erwartet.length - ende),
  };
}

// Liefert eine Erklaerung in Alltagssprache - oder null, wenn die Ausgaben
// gleich sind.
export function erklaereUnterschied(erwartet = "", bekommen = "") {
  if (erwartet === bekommen) return null;

  const eZeilen = erwartet.split("\n");
  const bZeilen = bekommen.split("\n");

  // Zuerst die Zeilenzahl - das ist der haeufigste grobe Fehler.
  let zeilenHinweis = null;
  if (eZeilen.length !== bZeilen.length) {
    zeilenHinweis =
      bZeilen.length < eZeilen.length
        ? `Es fehlen Zeilen: erwartet sind ${eZeilen.length}, ausgegeben wurden ${bZeilen.length}.`
        : `Es sind zu viele Zeilen: erwartet sind ${eZeilen.length}, ausgegeben wurden ${bZeilen.length}.`;
  }

  // Erste abweichende Zeile suchen.
  let idx = 0;
  while (idx < eZeilen.length && idx < bZeilen.length && eZeilen[idx] === bZeilen[idx]) idx++;
  const e = eZeilen[idx] ?? "";
  const b = bZeilen[idx] ?? "";

  const teile = zerlege(e, b);
  const { erwartetMitte, bekommenMitte } = teile;

  // Art des Unterschieds bestimmen - von "nur Kleinigkeit" zu "echt anders".
  let art = "text";
  let hinweis;

  if (nurText(e) === nurText(b) && e !== b) {
    art = "satzzeichen";
    if (erwartetMitte && !bekommenMitte) {
      hinweis = `Fast! Es fehlt nur ${benenne(erwartetMitte)}.`;
    } else if (!erwartetMitte && bekommenMitte) {
      hinweis = `Fast! Da ist ${benenne(bekommenMitte)} zu viel.`;
    } else {
      hinweis = `Fast! Bei den Satzzeichen stimmt etwas nicht: erwartet ${benenne(erwartetMitte)}, ausgegeben ${benenne(bekommenMitte)}.`;
    }
  } else if (ohneLeerraum(e) === ohneLeerraum(b) && e !== b) {
    art = "leerzeichen";
    if (erwartetMitte.trim() === "" && bekommenMitte === "") {
      hinweis = `Fast! Es fehlt ${benenne(erwartetMitte)}.`;
    } else if (bekommenMitte.trim() === "" && erwartetMitte === "") {
      hinweis = `Fast! Da ist ${benenne(bekommenMitte)} zu viel.`;
    } else {
      hinweis = "Fast! Die Zeichen stimmen, aber die Leerzeichen sitzen anders.";
    }
  } else if (e.toLowerCase() === b.toLowerCase()) {
    art = "grossschreibung";
    hinweis = `Fast! Es unterscheidet sich nur die Groß- und Kleinschreibung: erwartet „${erwartetMitte}“, ausgegeben „${bekommenMitte}“.`;
  } else if (!erwartetMitte && bekommenMitte) {
    art = "zuviel";
    hinweis = `In dieser Zeile steht zu viel: „${bekommenMitte}“.`;
  } else if (erwartetMitte && !bekommenMitte) {
    art = "fehlt";
    hinweis = `In dieser Zeile fehlt: „${erwartetMitte}“.`;
  } else {
    hinweis = `An dieser Stelle steht „${bekommenMitte}“, erwartet wird aber „${erwartetMitte}“.`;
  }

  return {
    art,
    hinweis: zeilenHinweis ? `${zeilenHinweis} ${hinweis}` : hinweis,
    zeile: idx + 1,
    mehrzeilig: eZeilen.length > 1 || bZeilen.length > 1,
    erwartetZeile: e,
    bekommenZeile: b,
    teile,
  };
}
