import MarkdownEditor from "./components/Editor";

function App() {
  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800">
        {/* File tree will go here */}
      </div>

      {/* Editor container */}
      <div className="flex-1 h-full">
        <MarkdownEditor />
      </div>
    </div>
  );
}

export default App;
