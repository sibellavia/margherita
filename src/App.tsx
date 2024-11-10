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

  // Load file content when a file is selected
  const handleFileSelect = useCallback(async (path: string) => {
    try {
      debug.log('Loading file:', path);
      const file = await invoke<FileContent>("read_file", { path });
      setSelectedFilePath(path); // Use the relative path
      setCurrentContent(file.content);
    } catch (err) {
      debug.error('Failed to load file:', err);
    }
  }, []);

  // Save file content and refresh the file tree
  const handleSave = useCallback(async (content: string) => {
    if (!selectedFilePath) {
      debug.warn('No file selected for save');
      return;
    }

    try {
      await invoke<string>("save_file", {
        request: {
          name: selectedFilePath,
          content,
        },
      });

      debug.log('File saved successfully', { path: selectedFilePath });
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      debug.error('Failed to save file', err);
      // might want to add error handling UI here
      throw err; // Re-throw to let the Editor component handle the error
    }
  }, [selectedFilePath]);

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
          content={currentContent || ''}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

export default App;