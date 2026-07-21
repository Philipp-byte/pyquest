// Admin-Bereich: Lehrer-/Admin-Accounts verwalten, globale Einstellungen.
// Siehe PLAN.md Abschnitt 10.

import { api } from "../api.js";
import { logout } from "../progress-remote.js";

export async function renderAdminDashboard(app, me) {
  const dash = new AdminDashboard(app, me);
  await dash.start();
}

class AdminDashboard {
  constructor(app, me) {
    this.app = app;
    this.me = me;
  }

  async start() {
    const [teachers, settings] = await Promise.all([
      api("/api/admin/teachers"),
      api("/api/admin/settings"),
    ]);
    this.teachers = teachers;
    this.settings = settings;
    this.render();
  }

  render() {
    this.app.innerHTML = `
      <header class="topbar">
        <span class="topbar__brand">🐍 Py<span>Quest</span> · Admin</span>
        <span class="topbar__who">${this.me.pseudonym}</span>
        <button class="logout-btn" title="Abmelden">🚪</button>
      </header>
      <main class="dashboard dashboard--single">
        <div class="panel">
          <div class="panel__header">
            <h3>Lehrer- &amp; Admin-Accounts</h3>
            <form class="new-teacher-form">
              <input type="text" name="pseudonym" placeholder="Benutzername" required>
              <input type="password" name="password" placeholder="Passwort" minlength="4" required>
              <select name="role">
                <option value="teacher">Lehrkraft</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" class="btn btn--primary">+ Anlegen</button>
            </form>
          </div>
          <p class="form-msg" hidden></p>
          <table class="roster">
            <thead><tr><th>Benutzername</th><th>Rolle</th><th>Zuletzt aktiv</th><th></th></tr></thead>
            <tbody>
              ${this.teachers
                .map(
                  (t) => `
                <tr data-id="${t.id}">
                  <td>${escapeHtml(t.pseudonym)}</td>
                  <td>${t.role === "admin" ? "Admin" : "Lehrkraft"}</td>
                  <td>${t.lastActive ? t.lastActive : "–"}</td>
                  <td class="roster__actions">
                    <button class="btn btn--ghost btn--sm btn--reset-pw">🔑</button>
                    ${t.id === this.me.id ? "" : `<button class="btn btn--ghost btn--sm btn--delete">🗑</button>`}
                  </td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="panel">
          <h3>Globale Einstellungen</h3>
          <form class="settings-form">
            <label>Schulname (erscheint auf dem Login-Bildschirm)
              <input type="text" name="schoolName" value="${escapeHtml(this.settings.schoolName)}">
            </label>
            <label class="checkbox-label">
              <input type="checkbox" name="defaultSoundEnabled" ${this.settings.defaultSoundEnabled ? "checked" : ""}>
              Sound standardmäßig an
            </label>
            <button type="submit" class="btn btn--primary">Speichern</button>
            <p class="settings-msg" hidden></p>
          </form>
        </div>
      </main>
    `;

    this.wire();
  }

  wire() {
    this.app.querySelector(".logout-btn").onclick = async () => {
      await logout();
      location.reload();
    };

    const msg = this.app.querySelector(".form-msg");
    const newTeacherForm = this.app.querySelector(".new-teacher-form");
    newTeacherForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(newTeacherForm);
      try {
        await api("/api/admin/teachers", {
          method: "POST",
          body: JSON.stringify({
            pseudonym: fd.get("pseudonym"),
            password: fd.get("password"),
            role: fd.get("role"),
          }),
        });
        await this.start();
      } catch (err) {
        msg.hidden = false;
        msg.textContent = "Anlegen fehlgeschlagen – ist der Benutzername schon vergeben?";
      }
    };

    this.app.querySelectorAll(".btn--reset-pw").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.closest("tr").dataset.id;
        const newPassword = prompt("Neues Passwort eingeben (min. 4 Zeichen):");
        if (!newPassword) return;
        await api(`/api/admin/teachers/${id}/reset-password`, {
          method: "POST",
          body: JSON.stringify({ new_password: newPassword }),
        });
        alert("Passwort geändert.");
      };
    });

    this.app.querySelectorAll(".btn--delete").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.closest("tr").dataset.id;
        if (!confirm("Diesen Account wirklich löschen?")) return;
        await api(`/api/admin/teachers/${id}`, { method: "DELETE" });
        await this.start();
      };
    });

    const settingsForm = this.app.querySelector(".settings-form");
    const settingsMsg = this.app.querySelector(".settings-msg");
    settingsForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(settingsForm);
      await api("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({
          schoolName: fd.get("schoolName"),
          defaultSoundEnabled: fd.get("defaultSoundEnabled") === "on",
        }),
      });
      settingsMsg.hidden = false;
      settingsMsg.textContent = "Gespeichert.";
    };
  }
}

function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
