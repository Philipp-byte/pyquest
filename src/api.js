// Duenner fetch()-Wrapper fuer alle Server-API-Aufrufe (Schulmodus).
// Gemeinsam genutzt von progress-remote.js, teacher-view.js und admin-view.js.

export async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Serverfehler (${res.status})`);
  }
  return res.json();
}
