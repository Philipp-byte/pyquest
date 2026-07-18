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
  pyodide.globals.set("__pq_inputs", pyodide.toPy(inputs));
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

// Uebersetzt haeufige Python-Fehler in verstaendliche deutsche Hinweise.
function friendlyError(e) {
  const msg = String(e.message || e);
  const lastLine =
    msg.trim().split("\n").filter(Boolean).pop() || "Unbekannter Fehler";

  const map = [
    [/SyntaxError/, "Syntaxfehler: Da hat sich ein Tippfehler eingeschlichen. Prüfe Klammern, Anführungszeichen und Doppelpunkte."],
    [/IndentationError/, "Einrückungsfehler: Achte auf die Leerzeichen am Zeilenanfang. In Python müssen Blöcke gleichmäßig eingerückt sein."],
    [/NameError/, "Namensfehler: Python kennt diesen Namen nicht. Hast du dich vertippt oder eine Variable vergessen zu definieren?"],
    [/TypeError/, "Typfehler: Hier passen zwei Dinge nicht zusammen – z. B. Text und Zahl gemischt."],
    [/ZeroDivisionError/, "Du hast durch 0 geteilt – das geht in der Mathematik nicht."],
    [/IndexError/, "Index-Fehler: Du greifst auf eine Stelle in einer Liste zu, die es nicht gibt."],
    [/KeyError/, "Schlüssel-Fehler: Diesen Schlüssel gibt es im Dictionary nicht."],
    [/ValueError/, "Wert-Fehler: Der Wert passt nicht zu dem, was erwartet wird."],
    [/ModuleNotFoundError/, "Dieses Modul ist hier nicht verfügbar."],
  ];

  for (const [re, friendly] of map) {
    if (re.test(msg)) return { friendly, detail: lastLine };
  }
  return { friendly: "Es ist ein Fehler aufgetreten.", detail: lastLine };
}
