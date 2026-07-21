// Login-Bildschirm fuer den Schulmodus (Pseudonym + Passwort).
// Wird nur angezeigt, wenn ein Server erkannt wurde und noch keine
// gueltige Sitzung besteht - siehe main.js (detectSchoolMode).

import { login } from "../progress-remote.js";
import { api } from "../api.js";

export async function renderLogin(app, { onLoggedIn }) {
  let schoolName = "";
  try {
    ({ schoolName } = await api("/api/settings/public"));
  } catch {
    // Kein Problem, dann bleibt der generische Untertitel stehen.
  }

  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-card__logo">🐍</div>
        <h1>PyQuest</h1>
        <p class="login-card__sub">${schoolName ? escapeHtml(schoolName) : "Schulmodus – bitte anmelden"}</p>
        <form class="login-form">
          <label>Benutzername
            <input type="text" name="pseudonym" autocomplete="username" required autofocus>
          </label>
          <label>Passwort
            <input type="password" name="password" autocomplete="current-password" required>
          </label>
          <button type="submit" class="btn btn--primary">Anmelden</button>
          <p class="login-form__error" hidden></p>
        </form>
      </div>
    </div>
  `;

  const form = app.querySelector(".login-form");
  const errorEl = form.querySelector(".login-form__error");
  const submitBtn = form.querySelector("button");

  form.onsubmit = async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    const fd = new FormData(form);
    try {
      await login(fd.get("pseudonym"), fd.get("password"));
      onLoggedIn();
    } catch {
      errorEl.hidden = false;
      errorEl.textContent = "Anmeldung fehlgeschlagen. Bitte Benutzername und Passwort prüfen.";
      submitBtn.disabled = false;
    }
  };
}

function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
