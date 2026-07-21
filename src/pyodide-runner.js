// Fuehrt Python-Code komplett im Browser aus (Pyodide / WebAssembly).
// Es wird KEIN Code an einen Server geschickt – wichtig fuer den Datenschutz.
//
// Pyodide wird erst geladen, wenn zum ersten Mal Code ausgefuehrt werden soll
// (lazy), damit die Startseite schnell bleibt.

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise = null;

// Laedt Pyodide genau einmal. onStatus bekommt Textmeldungen fuer die UI.
export function ensurePyodide(onStatus = () => {}) {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = (async () => {
    onStatus("Python-Umgebung wird geladen…");
    await loadScript(`${PYODIDE_URL}pyodide.js`);
    // eslint-disable-next-line no-undef
    const pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
    onStatus("");
    return pyodide;
  })();

  return pyodidePromise;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Pyodide konnte nicht geladen werden."));
    document.head.appendChild(s);
  });
}

// Fuehrt Nutzercode aus. Liefert { stdout, error, namespace }.
// inputs: Liste von Strings, die input() der Reihe nach zurueckgibt.
export async function runPython(code, { inputs = [], onStatus } = {}) {
  const pyodide = await ensurePyodide(onStatus);

  let stdout = "";
  pyodide.setStdout({ batched: (s) => (stdout += s + "\n") });
  pyodide.setStderr({ batched: (s) => (stdout += s + "\n") });

  // Frischer Namensraum pro Ausfuehrung, damit nichts von vorher haengen bleibt.
  const namespace = pyodide.toPy({});

  // input() so umbiegen, dass es Testwerte zurueckgibt statt zu blockieren.
  // Wichtig: im FRISCHEN namespace setzen (nicht pyodide.globals), sonst
  // findet der Code unten (der mit globals: namespace laeuft) die Variable nicht.
  namespace.set("__pq_inputs", pyodide.toPy(inputs));
  const prelude = `
import builtins as __b
__pq_i = 0
def __pq_input(prompt=""):
    global __pq_i
    if prompt:
        print(prompt, end="")
    vals = __pq_inputs
    if __pq_i < len(vals):
        v = vals[__pq_i]
        __pq_i += 1
        print(v)
        return v
    return ""
__b.input = __pq_input
`;

  let error = null;
  try {
    pyodide.runPython(prelude, { globals: namespace });
    pyodide.runPython(code, { globals: namespace });
  } catch (e) {
    error = friendlyError(e);
  }

  return { stdout: stripTrailingNewline(stdout), error, namespace, pyodide };
}

function stripTrailingNewline(s) {
  return s.replace(/\n$/, "");
}

// Belaesst die originale Python-Fehlermeldung unveraendert (englisch, wie
// Python sie ausgibt) und ergaenzt eine deutsche ERKLAERUNG dazu, die moeglichst
// konkret auf die wahrscheinliche Ursache und Loesung hinweist – die Meldung
// selbst wird nicht uebersetzt.
function friendlyError(e) {
  const msg = String(e.message || e);
  const original =
    msg.trim().split("\n").filter(Boolean).pop() || "Unbekannter Fehler";

  return { original, explanation: explainError(msg) };
}

function explainError(msg) {
  // NameError: haeufigster Anfaengerfehler ist ein vergessenes Anfuehrungszeichen,
  // dadurch haelt Python den Text faelschlich fuer einen Variablennamen.
  const nameMatch = msg.match(/NameError: name '([^']+)' is not defined/);
  if (nameMatch) {
    const name = nameMatch[1];
    return (
      `Python kennt den Namen „${name}" nicht und behandelt ihn wie eine Variable. ` +
      `Wolltest du den Text „${name}" ausgeben? Dann fehlen die Anführungszeichen: ` +
      `schreibe "${name}" statt ${name}. ` +
      `Falls es wirklich eine Variable sein soll, musst du ihr vorher einen Wert geben.`
    );
  }

  if (/unterminated string literal|EOL while scanning string/.test(msg)) {
    return "Ein Anführungszeichen fehlt oder ist zu viel. Jeder Text braucht ein Anführungszeichen am Anfang UND am Ende.";
  }
  if (/unexpected EOF|was never closed|SyntaxError: '.*' was never closed/.test(msg)) {
    return "Eine Klammer wurde geöffnet, aber nicht wieder geschlossen. Prüfe, ob zu jeder ( auch eine ) gehört.";
  }
  if (/expected ':'/.test(msg)) {
    return "Am Ende der Zeile fehlt ein Doppelpunkt (:) – z. B. nach if, for, while oder def.";
  }
  if (/IndentationError/.test(msg)) {
    return "Die Einrückung stimmt nicht. Zeilen, die zu einem Block gehören (z. B. nach einem :), müssen gleich weit eingerückt sein – am besten mit 4 Leerzeichen.";
  }
  if (/SyntaxError/.test(msg)) {
    return "Irgendwo stimmt die Schreibweise nicht. Prüfe Klammern, Anführungszeichen und Doppelpunkte in der angezeigten Zeile.";
  }
  if (/can only concatenate str.*to str|unsupported operand type.*str.*int|str.*int/.test(msg) && /TypeError/.test(msg)) {
    return "Du versuchst, Text und Zahl direkt zu verbinden. Wandle die Zahl mit str(zahl) in Text um – oder die Eingabe mit int(text) in eine Zahl.";
  }
  if (/TypeError/.test(msg)) {
    return "Hier passen zwei Dinge nicht zusammen – oft werden Text und Zahl vermischt. Prüfe, ob du an einer Stelle str() oder int() brauchst.";
  }
  if (/ZeroDivisionError/.test(msg)) {
    return "Du teilst durch 0 – das ist mathematisch nicht möglich. Prüfe den Wert, durch den du teilst.";
  }
  if (/IndexError/.test(msg)) {
    return "Du greifst auf eine Stelle in einer Liste zu, die es nicht gibt. Denk daran: die erste Stelle ist 0, nicht 1.";
  }
  if (/KeyError/.test(msg)) {
    return "Diesen Schlüssel gibt es im Dictionary nicht. Prüfe die Schreibweise des Schlüssels.";
  }
  if (/ValueError.*invalid literal for int/.test(msg)) {
    return "Du versuchst, Text in eine Zahl umzuwandeln, der keine Zahl ist. int() funktioniert nur mit Ziffern wie \"42\".";
  }
  if (/ValueError/.test(msg)) {
    return "Der Wert passt nicht zu dem, was erwartet wird. Prüfe, was du an dieser Stelle übergibst.";
  }
  if (/ModuleNotFoundError|ImportError/.test(msg)) {
    return "Dieses Modul ist hier nicht verfügbar.";
  }
  return "Schau dir die Fehlermeldung oben genau an – oft steht die betroffene Zeile mit dabei.";
}
