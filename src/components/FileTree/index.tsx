// src/components/FileTree/index.tsx

import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Folder, File } from "lucide-react";

interface FileItem {
  name: string;
  is_dir: boolean;
}

const FileTree: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const items = await invoke<FileItem[]>("list_files");
        setFiles(items);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load files");
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, []);

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-red-500">{error}</div>;
  }

  if (files.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No files yet. Start writing and save to create your first document.
      </div>
    );
  }

  return (
    <div className="p-2">
      <ul className="space-y-1">
        {files.map((file, index) => (
          <li
            key={index}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 cursor-pointer text-sm"
          >
            {file.is_dir ? (
              <Folder className="w-4 h-4 text-gray-400" />
            ) : (
              <File className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-gray-200">{file.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileTree;
