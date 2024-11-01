import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ParsedContent {
  html: string;
}

const MarkdownEditor = () => {
  const [content, setContent] = useState("");
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Debounced markdown parsing
  const debouncedParse = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      return (text: string) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          try {
            // Only parse if content has actually changed
            const result = await invoke<ParsedContent>("parse_markdown", {
              input: text,
            });
            setRenderedContent(result.html);
            setError(null);
          } catch (error) {
            console.error("Error parsing markdown:", error);
            setError("Failed to parse markdown");
          }
        }, 150); // Increased debounce time for better performance
      };
    })(),
    [],
  );

  // Memoize the parsing effect
  useEffect(() => {
    if (content.length > 0) {
      debouncedParse(content);
    }
  }, [content, debouncedParse]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
  };

  return (
    <div className="h-full w-full flex flex-row">
      {/* Editor */}
      <div className="flex-1 h-full border-r border-gray-800">
        <textarea
          value={content}
          onChange={handleInput}
          className="w-full h-full p-4 bg-gray-950 text-gray-100 resize-none focus:outline-none font-mono"
          placeholder="Start writing..."
          spellCheck={false}
        />
      </div>

      {/* Preview */}
      <div className="flex-1 h-full p-4 bg-gray-950 text-gray-100 overflow-auto prose prose-invert max-w-none">
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : renderedContent ? (
          <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
        ) : (
          <div className="text-gray-500">Preview will appear here...</div>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;
