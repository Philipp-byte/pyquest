// Stellt den Unterschied zwischen erwarteter und tatsaechlicher Ausgabe dar.
// Die abweichende Stelle wird farbig markiert, damit ein fehlender Punkt oder
// ein Leerzeichen zu viel sofort ins Auge springt.

function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Leerzeichen und Tabulatoren sind unsichtbar - an der Fehlerstelle machen
// wir sie deshalb sichtbar, sonst sieht man dort scheinbar "nichts".
function sichtbar(s = "") {
  return escapeHtml(s).replace(/ /g, "␣").replace(/\t/g, "→");
}

function zeileHtml(anfang, mitte, schluss, klasse) {
  const markiert = mitte === "" ? `<mark class="${klasse} is-empty"></mark>` : `<mark class="${klasse}">${sichtbar(mitte)}</mark>`;
  return `${escapeHtml(anfang)}${markiert}${escapeHtml(schluss)}`;
}

// diff stammt aus erklaereUnterschied() in output-diff.js
export function renderDiff(diff) {
  if (!diff) return "";
  const { anfang, erwartetMitte, bekommenMitte, schluss } = diff.teile;

  return `
    <div class="diff">
      <p class="diff__hint">${escapeHtml(diff.hinweis)}</p>
      <div class="diff__rows">
        <div class="diff__row">
          <span class="diff__tag">erwartet</span>
          <code class="diff__line">${zeileHtml(anfang, erwartetMitte, schluss, "diff__ok")}</code>
        </div>
        <div class="diff__row">
          <span class="diff__tag">deine Ausgabe</span>
          <code class="diff__line">${zeileHtml(anfang, bekommenMitte, schluss, "diff__no")}</code>
        </div>
      </div>
      ${diff.mehrzeilig ? `<p class="diff__where">Betrifft Zeile ${diff.zeile} deiner Ausgabe.</p>` : ""}
      <p class="diff__legend">␣ steht für ein Leerzeichen, → für einen Tabulator.</p>
    </div>`;
}
