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
      isActive: true, // Start with active first line
    },
  ]);
  const editorRef = useRef<HTMLDivElement>(null);

  const parseMarkdownLine = (text: string): string => {
    if (text.startsWith("# ")) {
      return `<h1 class="text-3xl font-bold mb-4">${text.slice(2)}</h1>`;
    }
    if (text.startsWith("## ")) {
      return `<h2 class="text-2xl font-bold mb-3">${text.slice(3)}</h2>`;
    }
    if (text.startsWith("### ")) {
      return `<h3 class="text-lg font-bold mb-2">${text.slice(4)}</h3>`;
    }

    if (text.startsWith("- ")) {
      return `<div class="flex gap-2 my-1 ml-4">• ${text.slice(2)}</div>`;
    }

    let processed = text;
    processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");
    processed = processed.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-800 px-1 rounded">$1</code>',
    );

    return processed
      ? `<div class="mb-1 leading-relaxed">${processed}</div>`
      : '<div class="h-6"></div>';
  };

  const handleLineChange = (id: string, newText: string) => {
    setLines((prevLines) =>
      prevLines.map((line) =>
        line.id === id ? { ...line, text: newText } : line,
      ),
    );
  };

  const navigateLines = (currentId: string, direction: "up" | "down") => {
    const currentIndex = lines.findIndex((l) => l.id === currentId);
    let nextIndex;

    if (direction === "up") {
      nextIndex = Math.max(0, currentIndex - 1);
    } else {
      nextIndex = Math.min(lines.length - 1, currentIndex + 1);
    }

    setLines((prevLines) =>
      prevLines.map((line, index) => ({
        ...line,
        isActive: index === nextIndex,
      })),
    );
  };

  const removeLine = (lineId: string) => {
    const currentIndex = lines.findIndex((l) => l.id === lineId);

    if (lines.length === 1) {
      return;
    }

    setLines((prevLines) => {
      const newLines = prevLines.filter((line) => line.id !== lineId);
      const newActiveIndex = Math.max(0, currentIndex - 1);
      return newLines.map((line, index) => ({
        ...line,
        isActive: index === newActiveIndex,
      }));
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent, lineId: string) => {
    const currentIndex = lines.findIndex((l) => l.id === lineId);
    const currentLine = lines[currentIndex];

    switch (event.key) {
      case "Enter":
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
        break;

      case "Backspace":
        if (currentLine.text === "" && lines.length > 1) {
          event.preventDefault();
          removeLine(lineId);
        }
        break;

      case "ArrowUp":
        event.preventDefault();
        navigateLines(lineId, "up");
        break;

      case "ArrowDown":
        event.preventDefault();
        navigateLines(lineId, "down");
        break;
    }
  };

  const handleEditorClick = (event: React.MouseEvent) => {
    if (
      event.target === event.currentTarget ||
      event.target === editorRef.current?.firstChild
    ) {
      if (lines.every((line) => !line.isActive)) {
        setLines((prevLines) =>
          prevLines.map((line, index) => ({
            ...line,
            isActive: index === prevLines.length - 1,
          })),
        );
      }
    }
  };

  const handleLineClick = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setLines((prevLines) =>
      prevLines.map((line) => ({
        ...line,
        isActive: line.id === id,
      })),
    );
  };

  return (
    <div
      ref={editorRef}
      className="h-full bg-gray-950 text-gray-100 overflow-auto focus:outline-none"
      onClick={handleEditorClick}
      tabIndex={-1}
    >
      <div className="min-h-full space-y-1">
        {lines.map((line) => (
          <div
            key={line.id}
            onClick={(e) => handleLineClick(line.id, e)}
            className={`relative rounded cursor-text group ${
              line.isActive ? "bg-opacity-50" : ""
            }`}
          >
            {line.isActive ? (
              <div className="relative">
                <input
                  type="text"
                  value={line.text}
                  onChange={(e) => handleLineChange(line.id, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, line.id)}
                  className="w-full bg-transparent py-1 px-4 focus:outline-none font-mono relative z-10"
                  autoFocus
                />
                <div className="absolute inset-0 bg-gray-800 opacity-20 rounded" />
              </div>
            ) : (
              <div className="py-1 px-4 prose prose-invert max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdownLine(line.text),
                  }}
                  className="group-hover:bg-gray-900 group-hover:bg-opacity-20 rounded transition-colors duration-100"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarkdownEditor;
