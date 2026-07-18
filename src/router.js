// Einfacher Hash-basierter Router (funktioniert ohne Server-Konfiguration,
// wichtig fuer GitHub Pages). Routen:
//   #/                        -> Lernpfad
//   #/lesson/<chapter>/<lesson> -> Lektion
//   #/profil                  -> Profil

const routes = [];

export function route(pattern, handler) {
  // pattern z. B. "/lesson/:chapter/:lesson"
  const parts = pattern.split("/").filter(Boolean);
  routes.push({ parts, handler });
}

function match(path) {
  const segs = path.split("/").filter(Boolean);
  for (const { parts, handler } of routes) {
    if (parts.length !== segs.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(":")) params[parts[i].slice(1)] = decodeURIComponent(segs[i]);
      else if (parts[i] !== segs[i]) { ok = false; break; }
    }
    if (ok) return { handler, params };
  }
  return null;
}

export function navigate(path) {
  window.location.hash = path;
}

export function startRouter(fallback) {
  async function resolve() {
    const path = window.location.hash.replace(/^#/, "") || "/";
    const m = match(path);
    if (m) await m.handler(m.params);
    else await fallback();
  }
  window.addEventListener("hashchange", resolve);
  return resolve;
}
