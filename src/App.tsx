import Editor from "./components/Editor";

function App() {
  return (
    <div className="h-screen flex bg-[#1e1e1e]">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800">
        {/* FileTree will go here */}
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor />
      </div>
    </div>
  );
}

export default App;
