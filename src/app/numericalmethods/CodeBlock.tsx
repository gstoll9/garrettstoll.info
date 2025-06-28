import React, { useState } from "react";

type CodeBlockProps = {
  codeMap: { [language: string]: string };
};

export default function CodeBlock({ codeMap }: CodeBlockProps) {
  const languages = Object.keys(codeMap);
  const [selected, setSelected] = useState(languages[0]);

  return (
    <div className="codeblock-outer">
      <div className="codeblock-toolbar">
        {languages.map((lang) => (
          <button
            key={lang}
            className={selected === lang ? "active" : ""}
            onClick={() => setSelected(lang)}
          >
            {lang}
          </button>
        ))}
      </div>
      <pre className="code-block">
        <code>{codeMap[selected]}</code>
      </pre>
      <style jsx>{`
        .codeblock-outer {
          background: #23272e;
          border-radius: 8px;
          box-shadow: 0 2px 8px #0004;
          margin: 1em 0;
          overflow: hidden;
        }
        .codeblock-toolbar {
          display: flex;
          background: #1a1d22;
          padding: 0.5em 0.75em;
          border-bottom: 1px solid #2e3b2f;
        }
        .codeblock-toolbar button {
          background: none;
          border: none;
          color: #b2c2b2;
          margin-right: 1em;
          padding: 0.25em 0.75em;
          font-family: inherit;
          font-size: 1em;
          cursor: pointer;
          border-radius: 4px 4px 0 0;
          transition: background 0.2s, color 0.2s;
        }
        .codeblock-toolbar button.active,
        .codeblock-toolbar button:hover {
          background: #2e3b2f;
          color: #7fff7f;
        }
        .code-block {
          background: #23272e;
          color: #e0e0e0;
          padding: 1em;
          font-family: 'Fira Mono', 'Consolas', 'Courier New', monospace;
          font-size: 1em;
          overflow-x: auto;
        }
        code {
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}