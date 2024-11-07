import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useState } from "react";
import Editor from "./components/Editor";
import FileTree from "./components/FileTree";

function App() {
  // keep track of the current file path and when to refresh the file tree
  const [selectedFilePath, setSelectedFilePath] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Called when a file is selected in the file tree
  const handleFileSelect = (path: string) => {
    setSelectedFilePath(path);
  };

  // Called after a successful save to refresh the file tree
  const handleSave = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

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
        <Editor onSave={handleSave} filePath={selectedFilePath} />
      </div>
    </div>
  );
}

export default App;
