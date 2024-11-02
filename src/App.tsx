import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useState } from "react";
import MarkdownEditor from "./components/Editor";
import FileTree from "./components/FileTree";

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFileSaved = () => {
    // Increment to trigger FileTree refresh
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800">
        <FileTree key={refreshTrigger} />
      </div>

      {/* Editor container */}
      <div className="flex-1 h-full">
        <MarkdownEditor onSave={handleFileSaved} />
      </div>
    </div>
  );
}

export default App;
