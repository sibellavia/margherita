import React, { useState, useRef, useEffect } from "react";

interface Line {
  id: string;
  text: string;
  isActive: boolean;
}

const MarkdownEditor = () => {
  const [lines, setLines] = useState<Line[]>([
    {
      id: "1",
      text: "",
      isActive: false,
    },
  ]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Parse a single line of markdown
  const parseMarkdownLine = (text: string): string => {
    // Headers
    if (text.startsWith("# ")) {
      return `<h1 class="text-2xl font-bold my-2">${text.slice(2)}</h1>`;
    }
    if (text.startsWith("## ")) {
      return `<h2 class="text-xl font-bold my-2">${text.slice(3)}</h2>`;
    }
    if (text.startsWith("### ")) {
      return `<h3 class="text-lg font-bold my-2">${text.slice(4)}</h3>`;
    }

    // Lists
    if (text.startsWith("- ")) {
      return `<div class="flex gap-2 my-1">• ${text.slice(2)}</div>`;
    }

    // Bold and Italic
    let processed = text;
    processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Code
    processed = processed.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-800 px-1 rounded">$1</code>',
    );

    return processed ? `<div class="my-1">${processed}</div>` : "<br>";
  };

  // Handle focus on a line
  const handleLineClick = (id: string, event: React.MouseEvent) => {
    event.preventDefault();
    setLines((prevLines) =>
      prevLines.map((line) => ({
        ...line,
        isActive: line.id === id,
      })),
    );
  };

  // Handle line content changes
  const handleLineChange = (id: string, newText: string) => {
    setLines((prevLines) =>
      prevLines.map((line) =>
        line.id === id ? { ...line, text: newText } : line,
      ),
    );
  };

  // Handle key presses for new lines and navigation
  const handleKeyDown = (event: React.KeyboardEvent, lineId: string) => {
    if (event.key === "Enter") {
      event.preventDefault();

      const newLine: Line = {
        id: Date.now().toString(),
        text: "",
        isActive: true,
      };

      setLines((prevLines) => {
        const currentIndex = prevLines.findIndex((l) => l.id === lineId);
        return [
          ...prevLines.slice(0, currentIndex + 1),
          newLine,
          ...prevLines.slice(currentIndex + 1),
        ].map((line) => ({
          ...line,
          isActive: line.id === newLine.id,
        }));
      });
    }
  };

  return (
    <div
      ref={editorRef}
      className="h-full bg-gray-950 text-gray-100 p-4 overflow-auto focus:outline-none"
      tabIndex={-1}
    >
      {lines.map((line) => (
        <div
          key={line.id}
          onClick={(e) => handleLineClick(line.id, e)}
          className={`cursor-text ${line.isActive ? "bg-gray-900" : ""}`}
        >
          {line.isActive ? (
            <input
              type="text"
              value={line.text}
              onChange={(e) => handleLineChange(line.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, line.id)}
              className="w-full bg-transparent p-1 focus:outline-none font-mono"
              autoFocus
            />
          ) : (
            <div
              className="p-1 prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: parseMarkdownLine(line.text) }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default MarkdownEditor;
