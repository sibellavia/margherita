import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

interface Line {
  id: string;
  text: string;
  isActive: boolean;
}

interface FileContent {
  path: string;
  content: string;
}

interface SaveFileRequest {
  name: string;
  content: string;
}

interface EditorProps {
  onSave?: () => void;
  filePath?: string;
}

interface StyledSegment {
  text: string;
  type: "bold" | "italic" | "heading" | "list" | "code" | "plain";
  level?: number;
}

const parseFusionLine = (text: string): StyledSegment[] => {
  const segments: StyledSegment[] = [];
  let currentText = text;

  // Handle headings first
  if (text.startsWith("# ")) {
    return [{ text, type: "heading", level: 1 }];
  } else if (text.startsWith("## ")) {
    return [{ text, type: "heading", level: 2 }];
  } else if (text.startsWith("### ")) {
    return [{ text, type: "heading", level: 3 }];
  }

  // Process the text segment by segment
  let position = 0;
  let result = "";

  while (position < text.length) {
    // Bold
    if (text.slice(position).match(/^\*\*.*?\*\*/)) {
      const match = text.slice(position).match(/^\*\*(.*?)\*\*/);
      if (match) {
        if (result) {
          segments.push({ text: result, type: "plain" });
          result = "";
        }
        segments.push({ text: match[0], type: "bold" });
        position += match[0].length;
        continue;
      }
    }

    // Italic (using single asterisk)
    if (text.slice(position).match(/^\*[^*].*?\*/)) {
      const match = text.slice(position).match(/^\*(.*?)\*/);
      if (match) {
        if (result) {
          segments.push({ text: result, type: "plain" });
          result = "";
        }
        segments.push({ text: match[0], type: "italic" });
        position += match[0].length;
        continue;
      }
    }

    // Inline Code
    if (text.slice(position).match(/^`.*?`/)) {
      const match = text.slice(position).match(/^`(.*?)`/);
      if (match) {
        if (result) {
          segments.push({ text: result, type: "plain" });
          result = "";
        }
        segments.push({ text: match[0], type: "code" });
        position += match[0].length;
        continue;
      }
    }

    // Lists
    if (position === 0 && text.startsWith("- ")) {
      return [{ text, type: "list" }];
    }

    result += text[position];
    position++;
  }

  if (result) {
    segments.push({ text: result, type: "plain" });
  }

  return segments.length ? segments : [{ text, type: "plain" }];
};

const FusionLine: React.FC<{
  text: string;
  isActive: boolean;
  onChange?: (text: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ text, isActive, onChange, onKeyDown, onClick }) => {
  const segments = parseFusionLine(text);
  const isSpecialFormat =
    text.startsWith("#") ||
    text.includes("**") ||
    text.match(/(?<!\*)\*[^*].*?\*/);
  const isList = text.startsWith("- ");

  if (isActive) {
    // Special handling for formatted text (headings, bold, italic)
    if (isSpecialFormat) {
      return (
        <div className="relative" onClick={onClick}>
          <div className="py-1 px-4 font-mono">
            {segments.map((segment, index) => {
              switch (segment.type) {
                case "heading":
                  return (
                    <span
                      key={index}
                      className={`
                          ${segment.level === 1 ? "text-3xl font-bold" : ""}
                          ${segment.level === 2 ? "text-2xl font-bold" : ""}
                          ${segment.level === 3 ? "text-xl font-bold" : ""}
                        `}
                    >
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => onChange?.(e.target.value)}
                        onKeyDown={onKeyDown}
                        className="w-full bg-transparent focus:outline-none"
                        autoFocus
                      />
                    </span>
                  );
                default:
                  return (
                    <input
                      key={index}
                      type="text"
                      value={text}
                      onChange={(e) => onChange?.(e.target.value)}
                      onKeyDown={onKeyDown}
                      className="w-full bg-transparent focus:outline-none"
                      autoFocus
                    />
                  );
              }
            })}
          </div>
          <div className="absolute inset-0 bg-gray-800 opacity-20 rounded" />
        </div>
      );
    }

    // List handling
    if (isList) {
      return (
        <div className="relative" onClick={onClick}>
          <input
            type="text"
            value={text}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={onKeyDown}
            className="opacity-0 absolute inset-0 w-full bg-transparent focus:outline-none font-mono px-4 py-1"
            autoFocus
          />
          <div className="flex items-start px-4 py-1 pointer-events-none">
            <span className="text-gray-400 w-6 text-center">-</span>
            <span className="flex-1 font-mono">{text.slice(2)}</span>
          </div>
          <div className="absolute inset-0 bg-gray-800 opacity-20 rounded" />
        </div>
      );
    }

    // Normal line
    return (
      <div className="relative" onClick={onClick}>
        <input
          type="text"
          value={text}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent py-1 px-4 focus:outline-none font-mono relative z-10"
          autoFocus
        />
        <div className="absolute inset-0 bg-gray-800 opacity-20 rounded" />
      </div>
    );
  }

  // Non-active lines
  return (
    <div
      className="py-1 px-4 group-hover:bg-gray-900 group-hover:bg-opacity-20 rounded transition-colors duration-100"
      onClick={onClick}
    >
      {segments.map((segment, index) => {
        switch (segment.type) {
          case "heading":
            return (
              <span
                key={index}
                className={`
                    block
                    ${segment.level === 1 ? "text-3xl font-bold mb-4" : ""}
                    ${segment.level === 2 ? "text-2xl font-bold mb-3" : ""}
                    ${segment.level === 3 ? "text-xl font-bold mb-2" : ""}
                  `}
              >
                {segment.text.replace(/^#+\s+/, "")}
              </span>
            );
          case "list":
            return (
              <div key={index} className="flex items-start">
                <span className="text-gray-400 w-6 text-center">•</span>
                <span className="flex-1">{segment.text.slice(2)}</span>
              </div>
            );
          case "bold":
            return (
              <span key={index} className="font-bold">
                {segment.text.replace(/\*\*/g, "")}
              </span>
            );
          case "italic":
            return (
              <span key={index} className="italic">
                {segment.text.replace(/\*/g, "")}
              </span>
            );
          case "code":
            return (
              <span key={index} className="bg-gray-800 px-1 rounded font-mono">
                {segment.text.replace(/`/g, "")}
              </span>
            );
          default:
            return <span key={index}>{segment.text}</span>;
        }
      })}
    </div>
  );
};

const MarkdownEditor: React.FC<EditorProps> = ({ onSave, filePath }) => {
  const [lines, setLines] = useState<Line[]>([
    { id: "1", text: "", isActive: true },
  ]);
  const [currentFilePath, setCurrentFilePath] = useState<string>("");
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
      prevLines.map((line) => {
        if (line.id === id) {
          // If user types "- " at the start, it's a new list item
          if (newText === "- " && !line.text.startsWith("- ")) {
            return { ...line, text: newText };
          }

          // If it's already a list item, preserve the "- " prefix
          if (line.text.startsWith("- ")) {
            // Don't allow removing the "- " prefix by normal typing
            if (!newText.startsWith("- ")) {
              return { ...line, text: "- " + newText };
            }
          }

          return { ...line, text: newText };
        }
        return line;
      }),
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
    const isListItem = currentLine.text.startsWith("- ");

    switch (event.key) {
      case "Enter":
        event.preventDefault();

        // Handle list continuation
        if (isListItem) {
          // If line is empty (just "- "), break out of list
          if (currentLine.text === "- ") {
            setLines((prevLines) => {
              const newLines = [...prevLines];
              newLines[currentIndex] = {
                ...currentLine,
                text: "", // Clear the "- "
              };
              return newLines;
            });
            return;
          }

          // Continue the list with a new item
          const newLine: Line = {
            id: Date.now().toString(),
            text: "- ", // Start with list marker
            isActive: true,
          };

          setLines((prevLines) => {
            const newLines = [
              ...prevLines.slice(0, currentIndex + 1),
              newLine,
              ...prevLines.slice(currentIndex + 1),
            ];
            return newLines.map((line) => ({
              ...line,
              isActive: line.id === newLine.id,
            }));
          });
          return;
        }

        // Normal line handling
        const newLine: Line = {
          id: Date.now().toString(),
          text: "",
          isActive: true,
        };

        setLines((prevLines) => {
          const newLines = [
            ...prevLines.slice(0, currentIndex + 1),
            newLine,
            ...prevLines.slice(currentIndex + 1),
          ];
          return newLines.map((line) => ({
            ...line,
            isActive: line.id === newLine.id,
          }));
        });
        break;

      case "Backspace":
        // If at start of list item, remove the "- " prefix
        if (isListItem && window.getSelection()?.anchorOffset === 2) {
          event.preventDefault();
          setLines((prevLines) =>
            prevLines.map((line) =>
              line.id === lineId ? { ...line, text: "" } : line,
            ),
          );
          return;
        }

        // Normal backspace handling for empty lines
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

  const handleSave = async () => {
    try {
      // Get file path - either existing or from save dialog
      let filePath = currentFilePath;
      if (!filePath) {
        const path = await save({
          defaultPath: "untitled.md",
          filters: [
            {
              name: "Markdown",
              extensions: ["md"],
            },
          ],
        });

        if (!path) return; // User cancelled
        filePath = path;
        setCurrentFilePath(filePath);
      }

      // Prepare content
      const content = lines.map((line) => line.text).join("\n");

      // Save file
      await invoke<string>("save_file", {
        request: {
          name: filePath,
          content: content,
        },
      });

      // Notify parent for file tree refresh
      onSave?.();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  // Update the effect hook to use proper dependencies
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown); // Changed from window to document to match your implementation
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lines]); // Only depend on lines since we're getting currentFilePath from props

  // Load file content when filePath changes
  useEffect(() => {
    const loadFile = async () => {
      if (!filePath) return;

      try {
        const file = await invoke<FileContent>("read_file", { path: filePath });
        setCurrentFilePath(file.path);

        // Convert content to lines
        const content = file.content.split("\n");
        setLines(
          content.map((text, index) => ({
            id: String(index + 1),
            text,
            isActive: index === 0,
          })),
        );
      } catch (err) {
        console.error("Failed to load file:", err);
      }
    };

    loadFile();
  }, [filePath]);

  return (
    <div
      ref={editorRef}
      className="h-full bg-gray-950 text-gray-100 overflow-auto focus:outline-none"
      onClick={handleEditorClick}
      tabIndex={-1}
    >
      <div className="min-h-full space-y-1">
        {lines.map((line) => (
          <div key={line.id} className="relative rounded cursor-text group">
            <FusionLine
              text={line.text}
              isActive={line.isActive}
              onChange={(newText) => handleLineChange(line.id, newText)}
              onKeyDown={(e) => handleKeyDown(e, line.id)}
              onClick={(e) => handleLineClick(line.id, e)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarkdownEditor;
