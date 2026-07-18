// Duenner Wrapper um CodeMirror 6 mit Python-Syntaxhervorhebung.

import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

export function createEditor(parent, initialCode = "") {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: initialCode,
      extensions: [
        basicSetup,
        python(),
        keymap.of([indentWithTab]),
        EditorView.theme({
          "&": { fontSize: "15px", height: "100%" },
          ".cm-content": { fontFamily: "'JetBrains Mono', ui-monospace, monospace" },
          ".cm-scroller": { overflow: "auto" },
        }),
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
