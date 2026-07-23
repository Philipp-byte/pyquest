// Lehrer-Dashboard: Klassen anlegen, Accounts generieren (druckbare Liste),
// Fortschritt der Klasse einsehen, Kapitel freischalten/sperren, Rangliste
// ein/aus. Siehe PLAN.md Abschnitt 10.

import { api } from "../api.js";
import { logout } from "../progress-remote.js";

export async function renderTeacherDashboard(app, me) {
  const dash = new TeacherDashboard(app, me);
  await dash.start();
}

class TeacherDashboard {
  constructor(app, me) {
    this.app = app;
    this.me = me;
    this.classes = [];
    this.selectedClassId = null;
  }

  async start() {
    await this.loadClasses();
    this.render();
  }

  async loadClasses() {
    this.classes = await api("/api/teacher/classes");
    if (!this.selectedClassId && this.classes.length) {
      this.selectedClassId = this.classes[0].id;
    }
  }

  render() {
    this.app.innerHTML = `
      <header class="topbar">
        <span class="topbar__brand">🐍 Py<span>Quest</span> · Lehrer</span>
        <span class="topbar__who">${this.me.pseudonym}</span>
        <button class="logout-btn" title="Abmelden" aria-label="Abmelden">🚪</button>
      </header>
      <main class="dashboard">
        <aside class="class-list">
          <h2>Meine Klassen</h2>
          <ul class="class-list__items"></ul>
          <form class="new-class-form">
            <input type="text" name="name" placeholder="Neue Klasse…" aria-label="Name der neuen Klasse" required>
            <button type="submit" class="btn btn--primary">+ Anlegen</button>
          </form>
        </aside>
        <section class="class-detail"></section>
      </main>
    `;

    this.app.querySelector(".logout-btn").onclick = async () => {
      await logout();
      location.reload();
    };

    const listEl = this.app.querySelector(".class-list__items");
    listEl.innerHTML = this.classes
      .map(
        (c) => `
        <li>
          <button class="class-list__item ${c.id === this.selectedClassId ? "is-active" : ""}" data-id="${c.id}">
            <span>${escapeHtml(c.name)}</span>
            <span class="class-list__count">${c.studentCount} SuS</span>
          </button>
        </li>`
      )
      .join("") || `<li class="class-list__empty">Noch keine Klasse angelegt.</li>`;

    listEl.querySelectorAll(".class-list__item").forEach((btn) => {
      btn.onclick = () => {
        this.selectedClassId = Number(btn.dataset.id);
        this.render();
        this.renderDetail();
      };
    });

    const newClassForm = this.app.querySelector(".new-class-form");
    newClassForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = new FormData(newClassForm).get("name");
      const created = await api("/api/teacher/classes", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await this.loadClasses();
      this.selectedClassId = created.id;
      this.render();
      this.renderDetail();
    };

    this.renderDetail();
  }

  async renderDetail() {
    const section = this.app.querySelector(".class-detail");
    if (!this.selectedClassId) {
      section.innerHTML = `<p class="empty-hint">Lege links eine Klasse an, um loszulegen.</p>`;
      return;
    }

    section.innerHTML = `<p class="empty-hint">Lädt…</p>`;
    const [studentsData, chapters] = await Promise.all([
      api(`/api/teacher/classes/${this.selectedClassId}/students`),
      api(`/api/teacher/classes/${this.selectedClassId}/chapters`),
    ]);
    const cls = this.classes.find((c) => c.id === this.selectedClassId);

    section.innerHTML = `
      <div class="detail-header">
        <h2>${escapeHtml(cls.name)}</h2>
        <button class="btn btn--ghost btn--delete-class">Klasse löschen</button>
      </div>

      <div class="stat-row">
        <div class="stat"><span class="stat__num">${studentsData.students.length}</span><span class="stat__label">SuS</span></div>
        <div class="stat"><span class="stat__num">${studentsData.avgXp}</span><span class="stat__label">Ø XP</span></div>
        <div class="stat"><span class="stat__num">${studentsData.totalLessons}</span><span class="stat__label">Lektionen gesamt</span></div>
      </div>

      <div class="chart-card">
        <h3>XP pro Schüler:in</h3>
        <canvas class="xp-chart" height="90"></canvas>
      </div>

      <div class="panel">
        <div class="panel__header">
          <h3>Accounts</h3>
          <form class="generate-form">
            <input type="number" name="count" min="1" max="40" value="5" title="Anzahl" aria-label="Anzahl neuer Accounts">
            <button type="submit" class="btn btn--primary">🎲 Accounts generieren</button>
          </form>
        </div>
        <div class="generated-list" hidden></div>
        <div class="table-scroll">
          <table class="roster">
            <thead>
              <tr><th>Pseudonym</th><th>Level</th><th>XP</th><th>Lektionen</th><th>⭐</th><th>Zuletzt aktiv</th><th></th></tr>
            </thead>
            <tbody>
              ${studentsData.students
                .map(
                  (s) => `
                <tr data-id="${s.id}">
                  <td>${escapeHtml(s.pseudonym)}</td>
                  <td>${s.level}</td>
                  <td>${s.xp}</td>
                  <td>${s.lessonsDone}/${s.totalLessons}</td>
                  <td>${s.stars}</td>
                  <td>${s.lastActive ? formatDate(s.lastActive) : "–"}</td>
                  <td class="roster__actions">
                    <button class="btn btn--ghost btn--sm btn--reset-pw" title="Passwort zurücksetzen" aria-label="Passwort von ${escapeHtml(s.pseudonym)} zurücksetzen">🔑</button>
                    <button class="btn btn--ghost btn--sm btn--delete-student" title="Account löschen" aria-label="Account ${escapeHtml(s.pseudonym)} löschen">🗑</button>
                  </td>
                </tr>`
                )
                .join("") || `<tr><td colspan="7" class="empty-hint">Noch keine Schüler:innen.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>Kapitel freischalten</h3>
        <div class="chapter-toggles">
          ${chapters
            .map(
              (ch) => `
            <label class="chapter-toggle">
              <input type="checkbox" data-chapter="${ch.id}" ${ch.locked ? "" : "checked"}>
              ${ch.id}
            </label>`
            )
            .join("")}
        </div>
      </div>

      <div class="panel">
        <h3>Rangliste</h3>
        <label class="chapter-toggle">
          <input type="checkbox" class="leaderboard-toggle" ${cls.leaderboardEnabled ? "checked" : ""}>
          Für SuS dieser Klasse sichtbar
        </label>
      </div>
    `;

    this.wireDetail(section, studentsData);
  }

  wireDetail(section, studentsData) {
    section.querySelector(".btn--delete-class").onclick = async () => {
      if (!confirm("Klasse wirklich löschen? Die Schüler-Accounts bleiben erhalten.")) return;
      await api(`/api/teacher/classes/${this.selectedClassId}`, { method: "DELETE" });
      this.selectedClassId = null;
      await this.loadClasses();
      this.render();
    };

    const generateForm = section.querySelector(".generate-form");
    generateForm.onsubmit = async (e) => {
      e.preventDefault();
      const count = Number(new FormData(generateForm).get("count"));
      const result = await api(`/api/teacher/classes/${this.selectedClassId}/students/generate`, {
        method: "POST",
        body: JSON.stringify({ count }),
      });
      // Erst die Ansicht neu aufbauen (aktualisierte Liste), DANACH die
      // Passwoerter anzeigen - sonst wuerde renderDetail() die frisch
      // generierte Passwort-Liste sofort wieder ueberschreiben.
      await this.loadClasses();
      await this.renderDetail();
      renderGeneratedList(section.querySelector(".generated-list"), result.created);
    };

    section.querySelectorAll(".btn--reset-pw").forEach((btn) => {
      btn.onclick = async () => {
        const row = btn.closest("tr");
        const studentId = row.dataset.id;
        const result = await api(`/api/teacher/students/${studentId}/reset-password`, {
          method: "POST",
        });
        renderGeneratedList(section.querySelector(".generated-list"), [result]);
      };
    });

    section.querySelectorAll(".btn--delete-student").forEach((btn) => {
      btn.onclick = async () => {
        const row = btn.closest("tr");
        const studentId = row.dataset.id;
        if (!confirm("Diesen Account wirklich löschen? Das kann nicht rückgängig gemacht werden.")) return;
        await api(`/api/teacher/students/${studentId}`, { method: "DELETE" });
        await this.renderDetail();
      };
    });

    section.querySelectorAll(".chapter-toggles input").forEach((checkbox) => {
      checkbox.onchange = async () => {
        await api(
          `/api/teacher/classes/${this.selectedClassId}/chapters/${checkbox.dataset.chapter}/lock`,
          { method: "POST", body: JSON.stringify({ locked: !checkbox.checked }) }
        );
      };
    });

    const leaderboardToggle = section.querySelector(".leaderboard-toggle");
    leaderboardToggle.onchange = async () => {
      await api(`/api/teacher/classes/${this.selectedClassId}/leaderboard`, {
        method: "POST",
        body: JSON.stringify({ enabled: leaderboardToggle.checked }),
      });
      await this.loadClasses();
    };

    renderXpChart(section.querySelector(".xp-chart"), studentsData.students);
  }
}

function renderGeneratedList(container, created) {
  container.hidden = false;
  container.innerHTML = `
    <div class="generated-list__card no-print">
      <div class="generated-list__head">
        <strong>Neue Zugangsdaten – jetzt notieren, werden nicht erneut angezeigt!</strong>
        <button class="btn btn--ghost btn--print">🖨 Drucken</button>
      </div>
      <table class="printable-list">
        <thead><tr><th>Pseudonym</th><th>Passwort</th></tr></thead>
        <tbody>
          ${created.map((c) => `<tr><td>${escapeHtml(c.pseudonym)}</td><td>${escapeHtml(c.password)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
  container.querySelector(".btn--print").onclick = () => window.print();
}

function renderXpChart(canvas, students) {
  if (!canvas || !students.length) return;
  import("chart.js/auto").then(({ default: Chart }) => {
    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: students.map((s) => s.pseudonym),
        datasets: [{ label: "XP", data: students.map((s) => s.xp), backgroundColor: "#22c55e" }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  });
}

function formatDate(iso) {
  try {
    return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
