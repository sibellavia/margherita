import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import MarkdownEditor from "./components/Editor";
import FileTree from "./components/FileTree";

function App() {
  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800">
        <FileTree />
      </div>

      {/* Editor container */}
      <div className="flex-1 h-full">
        <MarkdownEditor />
      </div>
    </div>
  );
}

export default App;
