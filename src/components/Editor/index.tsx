import React, { useState, useRef, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

interface EditorProps {
  onSave?: () => void;
  filePath?: string;
}

interface FileContent {
  path: string;
  content: string;
}

type NodeType = 'paragraph' | 'heading' | 'list_item';

interface Node {
  id: string;
  type: NodeType;
  content: string;
  rawContent: string;
  level?: number;       // For headings
  listType?: 'bullet' | 'ordered';
  listIndent?: number;  // Number of spaces for indentation
  listNumber?: number;  // For ordered lists
}

// Enhanced markdown parser for better heading support
const parseMarkdown = (text: string, prevNode?: Node): Partial<Node> => {
  // Heading parsing
  const headingMatch = text.match(/^(#{1,6})(\s+)(.+?)(\s*)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    if (level <= 6) {
      const content = headingMatch[3].trim();
      if (content) {
        return {
          type: 'heading',
          level,
          content,
          rawContent: text
        };
      }
    }
  }

  // List parsing with context
  const listMatch = text.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
  if (listMatch) {
    const [, indent, marker, content] = listMatch;
    const indentLevel = Math.floor(indent.length / 2);
    const isOrdered = /^\d+\.$/.test(marker);
    
    if (isOrdered) {
      let listNumber = parseInt(marker);
      
      if (prevNode?.type === 'list_item' && 
          prevNode.listType === 'ordered' &&
          prevNode.listIndent === indentLevel) {
        listNumber = (prevNode.listNumber || 0) + 1;
      }

      return {
        type: 'list_item',
        content: content.trim(),
        rawContent: text,
        listType: 'ordered',
        listIndent: indentLevel,
        listNumber
      };
    }

    return {
      type: 'list_item',
      content: content.trim(),
      rawContent: text,
      listType: 'bullet',
      listIndent: indentLevel
    };
  }

  return {
    type: 'paragraph',
    content: text,
    rawContent: text
  };
};

const FusionLine: React.FC<{
  node: Node;
  isActive: boolean;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  prevNode?: Node;
}> = React.memo(({ node, isActive, onChange, onKeyDown, onFocus, prevNode }) => {
  const getHeadingClass = (level?: number) => {
    switch (level) {
      case 1: return 'text-5xl font-extrabold text-white tracking-tight';
      case 2: return 'text-4xl font-bold text-white tracking-tight';
      case 3: return 'text-3xl font-bold text-white tracking-tight';
      case 4: return 'text-2xl font-bold text-white tracking-tight';
      case 5: return 'text-xl font-bold text-white tracking-tight';
      case 6: return 'text-lg font-bold text-white tracking-tight';
      default: return 'text-base text-white';
    }
  };

  const renderListItem = (node: Node) => {
    const indentSize = node.listIndent || 0;
    const marker = node.listType === 'ordered' ? `${node.listNumber}.` : '•';
    
    return (
      <div className={`
        flex items-start
        ${indentSize > 0 ? `ml-${indentSize * 6}` : ''}
      `}>
        <span className="w-6 text-gray-500 flex-shrink-0 select-none">
          {marker}
        </span>
        <span className="flex-1">{node.content}</span>
      </div>
    );
  };

  if (isActive) {
    return (
      <input
        type="text"
        value={node.rawContent}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className={`
          w-full bg-transparent px-3 py-1.5
          focus:outline-none font-mono
          ${node.type === 'heading' ? getHeadingClass(node.level) : 'text-base'}
          ${node.type === 'list_item' ? `ml-${(node.listIndent || 0) * 6}` : ''}
        `}
        autoFocus
      />
    );
  }

  return (
    <div 
      className="px-3 py-1.5 cursor-text"
      onClick={onFocus}
    >
      {node.type === 'heading' ? (
        <div className={getHeadingClass(node.level)}>
          {node.content}
        </div>
      ) : node.type === 'list_item' ? (
        renderListItem(node)
      ) : (
        <div>{node.content}</div>
      )}
    </div>
  );
});

const MarkdownEditor: React.FC<EditorProps> = ({ onSave, filePath }) => {
  const [nodes, setNodes] = useState<Node[]>([
    { id: '1', type: 'paragraph', content: '', rawContent: '' }
  ]);
  const [activeId, setActiveId] = useState<string>('1');
  const [currentFilePath, setCurrentFilePath] = useState<string>("");
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
    nodeId: string | null;
  } | null>(null);
  
  const editorRef = useRef<HTMLDivElement>(null);

  // Track selection changes
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || !editorRef.current?.contains(selection.anchorNode)) {
        return;
      }

      // Find the containing node element
      let element = selection.anchorNode;
      while (element && !(element instanceof HTMLElement && element.hasAttribute('data-node-id'))) {
        element = element.parentElement;
      }

      if (element) {
        const nodeId = (element as HTMLElement).getAttribute('data-node-id');
        setSelection({
          start: selection.anchorOffset,
          end: selection.focusOffset,
          nodeId
        });
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // Handle selection within a node
  const handleNodeSelection = (nodeId: string, e: React.SyntheticEvent) => {
    const element = e.target as HTMLElement;
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0) {
      setSelection({
        start: selection.anchorOffset,
        end: selection.focusOffset,
        nodeId
      });
    }
  };

  const handleNodeChange = (id: string, newContent: string) => {
    setNodes(prevNodes => {
      const currentIndex = prevNodes.findIndex(n => n.id === id);
      const prevNode = currentIndex > 0 ? prevNodes[currentIndex - 1] : undefined;
      
      if (newContent.trim() === '' && prevNodes[currentIndex].type === 'list_item') {
        return prevNodes.map(node => 
          node.id === id 
            ? { ...node, type: 'paragraph', content: '', rawContent: '', listType: undefined, listIndent: undefined }
            : node
        );
      }
      
      return prevNodes.map(node => {
        if (node.id === id) {
          const parsed = parseMarkdown(newContent, prevNode);
          return { ...node, ...parsed };
        }
        return node;
      });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, nodeId: string) => {
    const currentIndex = nodes.findIndex(n => n.id === nodeId);
    const currentNode = nodes[currentIndex];
    
    if (currentNode.type === 'list_item') {
      if (e.key === 'Tab') {
        e.preventDefault();
        const newIndent = e.shiftKey 
          ? Math.max(0, (currentNode.listIndent || 0) - 1)
          : (currentNode.listIndent || 0) + 1;

        setNodes(prevNodes =>
          prevNodes.map(node => {
            if (node.id === nodeId) {
              const spaces = '  '.repeat(newIndent);
              const listMarker = node.listType === 'ordered' ? '1. ' : '- ';
              const content = node.content;
              
              return {
                ...node,
                listIndent: newIndent,
                rawContent: `${spaces}${listMarker}${content}`
              };
            }
            return node;
          })
        );
        return;
      }

      if (e.key === 'Enter' && currentNode.content.trim() === '') {
        e.preventDefault();
        setNodes(prevNodes =>
          prevNodes.map(node =>
            node.id === nodeId
              ? { ...node, type: 'paragraph', listType: undefined, listIndent: undefined, content: '', rawContent: '' }
              : node
          )
        );
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const newNode: Node = {
        id: Math.random().toString(36).substr(2, 9),
        type: currentNode.type === 'list_item' ? 'list_item' : 'paragraph',
        content: '',
        rawContent: '',
        ...(currentNode.type === 'list_item' && {
          listType: currentNode.listType,
          listIndent: currentNode.listIndent,
          listNumber: currentNode.listType === 'ordered' ? (currentNode.listNumber || 0) + 1 : undefined
        })
      };

      if (newNode.type === 'list_item') {
        const spaces = '  '.repeat(newNode.listIndent || 0);
        const marker = newNode.listType === 'ordered' ? `${newNode.listNumber}. ` : '- ';
        newNode.rawContent = `${spaces}${marker}`;
      }
      
      setNodes(prevNodes => [
        ...prevNodes.slice(0, currentIndex + 1),
        newNode,
        ...prevNodes.slice(currentIndex + 1)
      ]);
      setActiveId(newNode.id);
      return;
    }
    
    if (e.key === 'ArrowUp' && currentIndex > 0) {
      e.preventDefault();
      setActiveId(nodes[currentIndex - 1].id);
    }
    
    if (e.key === 'ArrowDown' && currentIndex < nodes.length - 1) {
      e.preventDefault();
      setActiveId(nodes[currentIndex + 1].id);
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }

    if (e.key === 'Backspace' && currentNode.content === '' && nodes.length > 1) {
      e.preventDefault();
      const newNodes = nodes.filter((_, i) => i !== currentIndex);
      setNodes(newNodes);
      setActiveId(newNodes[Math.max(0, currentIndex - 1)].id);
    }
  };

  const handleSave = async () => {
    try {
      let filePath = currentFilePath;
      if (!filePath) {
        const path = await save({
          defaultPath: "untitled.md",
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });

        if (!path) return;
        filePath = path;
        setCurrentFilePath(filePath);
      }

      const content = nodes.map(node => node.rawContent).join('\n');

      await invoke<string>("save_file", {
        request: {
          name: filePath,
          content: content,
        },
      });

      onSave?.();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  useEffect(() => {
    const loadFile = async () => {
      if (!filePath) return;

      try {
        const file = await invoke<FileContent>("read_file", { path: filePath });
        setCurrentFilePath(file.path);

        const newNodes = file.content.split('\n')
          .map(line => ({
            id: Math.random().toString(36).substr(2, 9),
            ...parseMarkdown(line)
          } as Node));
        
        setNodes(newNodes);
        setActiveId(newNodes[0].id);
      } catch (err) {
        console.error("Failed to load file:", err);
      }
    };

    loadFile();
  }, [filePath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, currentFilePath]);

  return (
    <div 
      ref={editorRef}
      className="h-full bg-gray-950 text-gray-100 overflow-auto"
      onClick={() => editorRef.current?.focus()}
      tabIndex={-1}
    >
      <div className="min-h-full p-4 space-y-0.5">
        {nodes.map((node, index) => (
          <div
            key={node.id}
            className={`
              ${node.id === activeId ? 'bg-gray-800/20 ring-1 ring-gray-700' : ''}
              hover:bg-gray-900/20 transition-colors duration-100
              rounded-md
            `}
            onClick={(e) => {
              e.stopPropagation();
              setActiveId(node.id);
            }}
          >
            <FusionLine
              node={node}
              isActive={node.id === activeId}
              onChange={text => handleNodeChange(node.id, text)}
              onKeyDown={e => handleKeyDown(e, node.id)}
              onFocus={() => setActiveId(node.id)}
              prevNode={index > 0 ? nodes[index - 1] : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarkdownEditor;