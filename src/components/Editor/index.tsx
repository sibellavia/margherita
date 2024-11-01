import React, { useRef, useEffect, useState } from "react";
import { useCodeMirror } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import ReactMarkdown from "react-markdown";

const Editor = () => {
  const editor = useRef(null);
  const [doc, setDoc] = useState("");

  const { setContainer } = useCodeMirror({
    container: editor.current,
    extensions: [
      EditorView.lineWrapping,
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
        addKeymap: true,
      }),
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.theme({
        "&": {
          height: "100%",
        },
        ".cm-editor": {
          backgroundColor: "#1e1e1e",
          height: "100%",
        },
        ".cm-content": {
          backgroundColor: "#1e1e1e",
          color: "#d4d4d4",
          caretColor: "#fff",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "14px",
          lineHeight: "1.6",
          padding: "16px",
        },
        ".cm-line": {
          padding: "0 8px",
        },
        ".cm-gutters": {
          backgroundColor: "#1e1e1e",
          color: "#858585",
          border: "none",
          borderRight: "1px solid #404040",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#2c313a",
        },
        ".cm-scroller": {
          backgroundColor: "#1e1e1e",
          overflow: "auto",
        },
        ".cm-selectionBackground": {
          backgroundColor: "#264f78",
        },
        "&.cm-focused .cm-selectionBackground": {
          backgroundColor: "#264f78",
        },
        // Markdown syntax highlighting
        ".cm-header": { color: "#569CD6" },
        ".cm-strong": { color: "#CE9178" },
        ".cm-emphasis": { color: "#CE9178", fontStyle: "italic" },
        ".cm-link": { color: "#4EC9B0" },
        ".cm-url": { color: "#9CDCFE" },
        ".cm-quote": { color: "#608B4E" },
        ".cm-atom": { color: "#9CDCFE" },
        ".cm-list": { color: "#CE9178" },
      }),
    ],
    value: "",
    onChange: (value) => setDoc(value),
    basicSetup: {
      lineNumbers: true,
      highlightActiveLineGutter: true,
      highlightActiveLine: false,
      autocompletion: false,
    },
  });

  useEffect(() => {
    if (editor.current) {
      setContainer(editor.current);
    }
  }, [editor.current]);

  return (
    <div className="h-full flex bg-[#1e1e1e]">
      {/* Editor */}
      <div ref={editor} className="w-1/2 h-full border-r border-gray-800" />

      {/* Preview */}
      <div className="w-1/2 h-full overflow-auto bg-[#1e1e1e] p-8">
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{doc}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default Editor;
