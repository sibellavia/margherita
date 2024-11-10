// src/App.tsx
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useState, useCallback } from "react";
import { Editor } from "./components/Editor/Editor";
import FileTree from "./components/FileTree";
import { debug } from "./components/Editor/debug"

interface FileContent {
  path: string;
  content: string;
}

function App() {
  const [selectedFilePath, setSelectedFilePath] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentContent, setCurrentContent] = useState<string>("");

  const handleFileSelect = useCallback(async (path: string) => {
    try {
      debug.log('Loading file:', path);
      const file = await invoke<FileContent>("read_file", { path });
      setSelectedFilePath(path);
      setCurrentContent(file.content);
    } catch (err) {
      debug.error('Failed to load file:', err);
    }
  }, []);

  const handleSave = useCallback(async (content: string, path: string) => {
    try {
      debug.log('Saving file', { path, contentLength: content.length });
      await invoke<string>("save_file", {
        request: {
          name: path,
          content: content,
        },
      });
      setRefreshTrigger(prev => prev + 1);
      debug.log('File saved successfully');
    } catch (err) {
      debug.error('Failed to save file:', err);
      throw err; // Re-throw to let the Editor handle the error
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-950">
      <div className="w-64 border-r border-gray-800">
        <FileTree
          key={refreshTrigger}
          onFileSelect={handleFileSelect}
          currentFile={selectedFilePath}
        />
      </div>
      <div className="flex-1 h-full">
        <Editor 
          content={currentContent}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

export default App;