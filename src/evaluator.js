// Bewertet Programmier-Aufgaben, indem das VERHALTEN des Codes geprueft wird
// (Ausgabe, Rueckgabewerte, Variablenwerte) – nicht der Wortlaut. Dadurch sind
// automatisch alle korrekten Loesungswege gueltig.

import { runPython } from "./pyodide-runner.js";
import { erklaereUnterschied } from "./output-diff.js";

function normalize(s) {
  return String(s).replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

// Fuehrt alle Tests einer "code"-Aufgabe aus.
// Liefert { passed, stdout, error, results: [{ label, ok }] }.
export async function evaluateCode(userCode, tests = [], { onStatus } = {}) {
  const results = [];
  let anyError = null;
  let lastStdout = "";

  for (const test of tests) {
    // Quelltext-Pruefungen (z. B. "es muss eine Schleife vorkommen") brauchen
    // keinen Programmlauf - sie schauen direkt in den geschriebenen Code.
    if (test.type === "source_matches" || test.type === "source_not_matches") {
      results.push({ label: describeTest(test), ok: checkSource(userCode, test) });
      continue;
    }

    const inputs = test.inputs ?? [];
    const run = await runPython(userCode, { inputs, onStatus });
    lastStdout = run.stdout;

    if (run.error) {
      anyError = run.error;
      results.push({ label: describeTest(test), ok: false });
      continue;
    }

    let ok = false;
    try {
      ok = await checkTest(run, test);
    } catch {
      ok = false;
    }

    // Bei einer fehlgeschlagenen Ausgabe-Pruefung genau sagen, WO es hakt.
    // Ein vergessener Punkt oder ein Leerzeichen zu viel ist sonst kaum zu
    // finden - die Ausgabe sieht auf den ersten Blick ja richtig aus.
    let diff = null;
    if (!ok && (test.type === "output" || test.type === "input_output")) {
      diff = erklaereUnterschied(normalize(test.expected), normalize(run.stdout));
    }

    results.push({ label: describeTest(test), ok, diff });
  }

  const passed = results.length > 0 && results.every((r) => r.ok) && !anyError;
  return { passed, stdout: lastStdout, error: anyError, results };
}

async function checkTest(run, test) {
  switch (test.type) {
    case "output":
    case "input_output":
      return normalize(run.stdout) === normalize(test.expected);
    case "output_contains":
      return normalize(run.stdout).includes(normalize(test.expected));
    case "var": {
      const val = run.namespace.get(test.name);
      const js = toJs(val);
      return deepEqual(js, test.expected);
    }
    case "func": {
      // test.call z. B. "addiere(2, 3)"
      const result = run.pyodide.runPython(test.call, {
        globals: run.namespace,
      });
      return deepEqual(toJs(result), test.expected);
    }
    default:
      return false;
  }
}

// Prueft "So geht es noch besser"-Hinweise.
//
// Diese Pruefungen entscheiden NICHT ueber richtig oder falsch. Sie melden
// sich erst, wenn eine Loesung bereits funktioniert, aber noch nicht sauber
// geschrieben ist - z. B. wenn ein Ergebnis direkt in print() gerechnet wird,
// statt es in einer sprechenden Variable abzulegen.
//
// Zurueck kommen die Texte der Hinweise, die noch offen sind.
export async function evaluateTips(userCode, tips = [], { onStatus } = {}) {
  const offen = [];
  for (const tip of tips) {
    const check = tip.check;
    let ok = false;
    try {
      if (check.type === "source_matches" || check.type === "source_not_matches") {
        ok = checkSource(userCode, check);
      } else {
        const run = await runPython(userCode, { inputs: check.inputs ?? [], onStatus });
        ok = run.error ? false : await checkTest(run, check);
      }
    } catch {
      ok = false;
    }
    if (!ok) offen.push(tip.text);
  }
  return offen;
}

// Prueft den GESCHRIEBENEN Code (nicht sein Verhalten) gegen ein Muster.
// Damit laesst sich in Tests verlangen, dass eine bestimmte Technik benutzt
// wird - z. B. "loese das mit einer Schleife" statt alles einzeln hinzuschreiben.
// Kommentare werden vorher entfernt, sonst wuerde ein "# for ..." schon zaehlen.
function checkSource(userCode, test) {
  const code = stripComments(String(userCode || ""));
  const re = new RegExp(test.pattern, test.flags ?? "m");
  const hit = re.test(code);
  return test.type === "source_not_matches" ? !hit : hit;
}

// Entfernt Kommentare, laesst Zeichenketten aber unangetastet (ein '#' in
// einem String ist kein Kommentar).
function stripComments(code) {
  let out = "";
  let quote = null;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      out += c;
      if (c === "\\") { out += code[++i] ?? ""; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; out += c; continue; }
    if (c === "#") {
      while (i < code.length && code[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    out += c;
  }
  return out;
}

function toJs(val) {
  if (val && typeof val.toJs === "function") {
    const js = val.toJs();
    if (typeof val.destroy === "function") val.destroy();
    return js;
  }
  return val;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function describeTest(test) {
  // In Tests bekommt jede Pruefung einen selbst formulierten, fuer Lernende
  // verstaendlichen Text ("Gibt bei Eingabe 5 die Zahl 120 aus"). Der geht
  // auch in den Lehrerbericht, deshalb hat er Vorrang.
  if (test.label) return test.label;

  switch (test.type) {
    case "source_matches":
    case "source_not_matches":
      return "Der Code erfüllt eine geforderte Vorgabe";
    case "output":
      return `Gibt „${test.expected}" aus`;
    case "output_contains":
      return `Ausgabe enthält „${test.expected}"`;
    case "input_output":
      return `Bei Eingabe ${JSON.stringify(test.inputs)} → „${test.expected}"`;
    case "var":
      return `Variable ${test.name} hat den richtigen Wert`;
    case "func":
      return `${test.call} = ${JSON.stringify(test.expected)}`;
    default:
      return "Test";
  }
}

// Prueft eine "fill"-Aufgabe (Lueckentext) rein textlich.
export function evaluateFill(answer, step) {
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  const accepted = step.accept ?? [step.solution];
  return accepted.some((a) => norm(a) === norm(answer));
}
