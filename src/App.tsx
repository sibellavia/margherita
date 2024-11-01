import MarkdownEditor from "./components/Editor";

function App() {
  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800">
        {/* File tree will go here */}
      </div>

      {/* Editor */}
      <div className="flex-1">
        <MarkdownEditor />
      </div>
    </div>
  );
}

export default App;
