import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Folder, File } from "lucide-react";
import { debug } from "../Editor/debug";

interface FileItem {
  name: string;
  is_dir: boolean;
}

interface FileTreeProps {
  onFileSelect?: (path: string) => void;
  currentFile?: string;
}

const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, currentFile }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeFileTree = async () => {
      try {
        debug.log('Initializing FileTree');
        // First ensure the directory exists
        await invoke("ensure_margherita_dir");
        debug.log('Margherita directory ensured');
        
        // Then list files
        const items = await invoke<FileItem[]>("list_files");
        debug.log('Files listed:', items);
        setFiles(items);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        debug.error('FileTree error:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFileTree();
  }, []); // Empty dependency array to run only on mount

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-gray-400 text-sm animate-pulse">Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="p-4">
        <div className="text-gray-400 text-sm">
          No files yet. Create a new document to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
      <ul className="space-y-1">
        {files.map((file) => (
          <li
            key={file.name}
            onClick={() => {
              debug.log('File selected:', file.name);
              onFileSelect?.(file.name);
            }}
            className={`
              flex items-center gap-2 px-2 py-1.5 rounded
              hover:bg-gray-800/50 cursor-pointer text-sm
              transition-colors duration-150 ease-in-out
              ${currentFile === file.name ? "bg-gray-800 ring-1 ring-gray-700" : ""}
            `}
          >
            {file.is_dir ? (
              <Folder className="w-4 h-4 text-gray-400" />
            ) : (
              <File className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-gray-200 truncate">{file.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileTree;