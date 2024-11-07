import { useRef, useEffect, useState } from 'react';

interface LineContent {
  raw: string;      // Raw markdown text
  rendered: string; // HTML representation
  isHeading: boolean;
}

const Editor = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  // Track raw content for each line
  const [lines, setLines] = useState<LineContent[]>([{ 
    raw: '', 
    rendered: '<br>', 
    isHeading: false 
  }]);
  
  // Get raw markdown content for saving
  const getRawContent = () => {
    return lines.map(line => line.raw).join('\n');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editorRef.current) return;
    
    if (e.key === ' ') {
      try {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const currentLine = range.startContainer.parentElement;
        const lineIndex = Array.from(editorRef.current.children).indexOf(currentLine as Element);
        
        // Check if we're in a line that starts with #
        if (currentLine && currentLine.textContent?.startsWith('#')) {
          e.preventDefault();
          
          const text = currentLine.textContent.slice(1); // Remove the #
          const rawContent = `# ${text}`; // Preserve raw markdown
          
          setLines(prev => prev.map((line, i) => 
            i === lineIndex 
              ? {
                  raw: rawContent,
                  rendered: text,
                  isHeading: true
                }
              : line
          ));
          
          currentLine.className = 'text-2xl font-bold';
          currentLine.textContent = text;
          
          if (currentLine.firstChild) {
            const newRange = document.createRange();
            newRange.setStart(currentLine.firstChild, Math.min(1, currentLine.firstChild.textContent?.length || 0));
            newRange.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      } catch (error) {
        console.warn('Error handling space key:', error);
      }
    }
    
    if (e.key === 'Enter') {
      try {
        e.preventDefault();
        
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const currentLine = range.startContainer.parentElement;
        if (!currentLine) return;
        
        // Create new line in both DOM and state
        const newLine = document.createElement('div');
        newLine.innerHTML = '<br>';
        
        setLines(prev => [...prev, { 
          raw: '', 
          rendered: '<br>', 
          isHeading: false 
        }]);
        
        if (currentLine.nextSibling) {
          editorRef.current.insertBefore(newLine, currentLine.nextSibling);
        } else {
          editorRef.current.appendChild(newLine);
        }
        
        const newRange = document.createRange();
        newRange.selectNodeContents(newLine);
        newRange.collapse(true);
        
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (error) {
        console.warn('Error handling enter key:', error);
      }
    }
  };
  
  const handleInput = (e: React.FormEvent) => {
    if (!editorRef.current) return;
    
    // Update raw content when typing
    const currentLines = Array.from(editorRef.current.children);
    setLines(currentLines.map((element, i) => {
      const content = element.textContent || '';
      const currentLine = lines[i] || { raw: '', rendered: '', isHeading: false };
      
      return {
        ...currentLine,
        raw: currentLine.isHeading ? `# ${content}` : content,
        rendered: content
      };
    }));
  };

  // Example save function
  const saveContent = async () => {
    const rawMarkdown = getRawContent();
    console.log('Raw markdown to save:', rawMarkdown);
    // Here you would implement the actual save to file logic
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div 
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: '<div><br></div>' }}
        className="
          w-full max-w-2xl mx-auto
          min-h-[200px] p-4
          bg-gray-900 text-gray-100
          rounded-lg shadow-xl
          focus:outline-none
          [&>div]:min-h-[1.5em]
        "
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        spellCheck={false}
      />
      
      {/* Debug info */}
      <div className="mt-4 text-gray-400 font-mono text-sm">
        <div>Raw Content:</div>
        <pre>{getRawContent()}</pre>
      </div>
    </div>
  );
};

export default Editor;