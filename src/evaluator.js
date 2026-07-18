// Bewertet Programmier-Aufgaben, indem das VERHALTEN des Codes geprueft wird
// (Ausgabe, Rueckgabewerte, Variablenwerte) – nicht der Wortlaut. Dadurch sind
// automatisch alle korrekten Loesungswege gueltig.

import { runPython } from "./pyodide-runner.js";

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
    results.push({ label: describeTest(test), ok });
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
  switch (test.type) {
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
