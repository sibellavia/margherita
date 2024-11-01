import React, { useState } from "react";

const MarkdownEditor = () => {
  const [content, setContent] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  return (
    <div className="h-full">
      <textarea
        value={content}
        onChange={handleChange}
        className="w-full h-full p-4 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 resize-none focus:outline-none font-sans"
        placeholder="Start writing..."
      />
    </div>
  );
};

export default MarkdownEditor;
