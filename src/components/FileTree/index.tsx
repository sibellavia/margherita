// src/components/FileTree/index.tsx

import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface FileItem {
  name: string;
}

const FileTree: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const items = await invoke<FileItem[]>("list_files");
        setFiles(items);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load files");
      }
    };

    loadFiles();
  }, []);

  return (
    <div className="p-2">
      {error ? (
        <div className="text-red-500 text-sm">{error}</div>
      ) : (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li key={index} className="text-gray-200 text-sm">
              {file.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileTree;
