// Duenner Wrapper um CodeMirror 6 mit Python-Syntaxhervorhebung.
//
// Wichtig: basicSetup bringt zwar die Python-Grammatik mit, faerbt aber nur
// wenige Token-Arten ein (Schluesselwoerter, Texte, Zahlen). Variablen,
// Funktionsnamen, Attribute und Operatoren blieben schwarz - dabei markiert
// die Grammatik sie sehr wohl. Unten steht deshalb ein eigener Farbstil, der
// alle vorhandenen Token-Arten nutzt.
//
// Die Farben kommen aus CSS-Variablen (--syn-*). Dadurch reicht EIN Farbstil
// fuer helle und dunkle Oberflaeche - die Werte tauscht styles.css.

import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Reihenfolge ist wichtig: spezielle Regeln (z. B. Funktionsaufruf) muessen
// VOR den allgemeinen stehen (z. B. Variable), sonst gewinnt die allgemeine.
const pyQuestHighlight = HighlightStyle.define([
  // Kommentare
  { tag: t.lineComment, color: "var(--syn-comment)", fontStyle: "italic" },
  { tag: t.comment, color: "var(--syn-comment)", fontStyle: "italic" },

  // Schluesselwoerter
  { tag: t.controlKeyword, color: "var(--syn-keyword)", fontWeight: "700" },
  { tag: t.definitionKeyword, color: "var(--syn-keyword)", fontWeight: "700" },
  { tag: t.moduleKeyword, color: "var(--syn-keyword)", fontWeight: "700" },
  { tag: t.operatorKeyword, color: "var(--syn-keyword)" },
  { tag: t.keyword, color: "var(--syn-keyword)" },
  { tag: t.modifier, color: "var(--syn-keyword)" },

  // Werte
  { tag: t.string, color: "var(--syn-string)" },
  { tag: t.special(t.string), color: "var(--syn-string)" },
  { tag: t.escape, color: "var(--syn-escape)", fontWeight: "700" },
  { tag: t.number, color: "var(--syn-number)" },
  { tag: t.bool, color: "var(--syn-atom)", fontWeight: "700" },
  { tag: t.null, color: "var(--syn-atom)", fontWeight: "700" },

  // Funktionen und Klassen (spezieller als "Variable", deshalb zuerst)
  { tag: t.function(t.definition(t.variableName)), color: "var(--syn-funcdef)", fontWeight: "700" },
  { tag: t.function(t.variableName), color: "var(--syn-funccall)" },
  { tag: t.function(t.propertyName), color: "var(--syn-method)" },
  { tag: t.definition(t.className), color: "var(--syn-class)", fontWeight: "700" },
  { tag: t.className, color: "var(--syn-class)" },

  // Variablen und Attribute
  { tag: t.variableName, color: "var(--syn-variable)" },
  { tag: t.propertyName, color: "var(--syn-property)" },

  // Operatoren und Zeichensetzung
  { tag: t.definitionOperator, color: "var(--syn-operator)", fontWeight: "700" },
  { tag: t.updateOperator, color: "var(--syn-operator)", fontWeight: "700" },
  { tag: t.arithmeticOperator, color: "var(--syn-operator)" },
  { tag: t.compareOperator, color: "var(--syn-operator)" },
  { tag: t.bitwiseOperator, color: "var(--syn-operator)" },
  { tag: t.derefOperator, color: "var(--syn-operator)" },
  { tag: t.paren, color: "var(--syn-bracket)" },
  { tag: t.squareBracket, color: "var(--syn-bracket)" },
  { tag: t.brace, color: "var(--syn-bracket)" },
  { tag: t.separator, color: "var(--syn-bracket)" },
  { tag: t.punctuation, color: "var(--syn-bracket)" },
  { tag: t.meta, color: "var(--syn-class)" },
]);

// Grundgeruest des Editors - ebenfalls ueber CSS-Variablen, damit der Editor
// im dunklen Modus nicht als weisser Kasten stehen bleibt.
const pyQuestTheme = EditorView.theme({
  "&": {
    fontSize: "15px",
    height: "100%",
    backgroundColor: "var(--editor-bg)",
    color: "var(--syn-variable)",
  },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    caretColor: "var(--editor-caret)",
  },
  ".cm-scroller": { overflow: "auto", lineHeight: "1.6" },
  ".cm-gutters": {
    backgroundColor: "var(--editor-gutter-bg)",
    color: "var(--editor-gutter-fg)",
    border: "none",
  },
  ".cm-activeLine": { backgroundColor: "var(--editor-active-line)" },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--editor-active-line)",
    color: "var(--editor-gutter-active)",
  },
  "&.cm-focused .cm-cursor": { borderLeftColor: "var(--editor-caret)", borderLeftWidth: "2px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--editor-selection)",
  },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "var(--editor-bracket-match)",
    outline: "1px solid var(--syn-operator)",
  },
});

export function createEditor(parent, initialCode = "") {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: initialCode,
      extensions: [
        basicSetup,
        python(),
        keymap.of([indentWithTab]),
        // Nach basicSetup eingehaengt, damit unser Farbstil den Standard
        // ueberschreibt.
        syntaxHighlighting(pyQuestHighlight),
        pyQuestTheme,
      ],
    }),
  });

  return {
    view,
    getCode: () => view.state.doc.toString(),
    setCode: (code) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: code },
      });
    },
    destroy: () => view.destroy(),
  };
}
