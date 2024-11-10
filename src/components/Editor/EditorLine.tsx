import React, { useCallback } from 'react';
import { Node } from './types';
import { debug } from './debug';

interface EditorLineProps {
  node: Node;
  isActive: boolean;
  prevNode?: Node;
  onChange: (id: string, content: string) => void;
  onFocus: () => void;
  onInsert: () => void;
  onRemove: () => void;
}

export const EditorLine: React.FC<EditorLineProps> = ({
  node,
  isActive,
  prevNode,
  onChange,
  onFocus,
  onInsert,
  onRemove
}) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle list behavior
    if (node.type === 'list_item') {
      if (e.key === 'Tab') {
        e.preventDefault();
        const newIndent = e.shiftKey 
          ? Math.max(0, (node.attributes.listIndent || 0) - 1)
          : (node.attributes.listIndent || 0) + 1;

        // Maintain list continuity with previous node
        const shouldKeepNumbering = 
          prevNode?.type === 'list_item' && 
          prevNode.attributes.listType === node.attributes.listType &&
          prevNode.attributes.listIndent === newIndent;

        const listNumber = shouldKeepNumbering
          ? (prevNode.attributes.listNumber || 0) + 1
          : 1;

        const spaces = '  '.repeat(newIndent);
        const listMarker = node.attributes.listType === 'ordered' 
          ? `${listNumber}. ` 
          : '- ';

        onChange(node.id, `${spaces}${listMarker}${node.content}`);
        return;
      }

      if (e.key === 'Enter' && node.content.trim() === '') {
        e.preventDefault();
        onChange(node.id, '');
        return;
      }
    }

    // Handle basic navigation and editing
    switch (e.key) {
      case 'Enter':
        if (!e.shiftKey) {
          e.preventDefault();
          onInsert();
        }
        break;
        
      case 'Backspace':
        if (node.content === '') {
          e.preventDefault();
          onRemove();
        }
        break;
    }
  }, [node, onChange, onInsert, onRemove]);

  const renderPreview = () => {
    switch (node.type) {
      case 'heading':
        return (
          <div className={getHeadingClass(node.attributes.level)}>
            {node.content}
          </div>
        );
        
      case 'list_item':
        return renderListItem();
        
      case 'code_block':
        return (
          <pre className="font-mono text-sm bg-gray-900/50 p-2 rounded">
            <code>{node.content}</code>
          </pre>
        );
        
      default:
        return <div className="text-gray-100">{node.content}</div>;
    }
  };

  const renderListItem = () => {
    const indentSize = node.attributes.listIndent || 0;
    const marker = node.attributes.listType === 'ordered' 
      ? `${node.attributes.listNumber}.`
      : '•';
    
    return (
      <div className={`flex items-start ${indentSize > 0 ? `ml-${indentSize * 6}` : ''}`}>
        <span className="w-6 text-gray-500 flex-shrink-0 select-none">
          {marker}
        </span>
        <span className="flex-1">{node.content}</span>
      </div>
    );
  };

  const getHeadingClass = (level?: number): string => {
    const baseClasses = 'font-bold text-white tracking-tight';
    switch (level) {
      case 1: return `${baseClasses} text-5xl`;
      case 2: return `${baseClasses} text-4xl`;
      case 3: return `${baseClasses} text-3xl`;
      case 4: return `${baseClasses} text-2xl`;
      case 5: return `${baseClasses} text-xl`;
      case 6: return `${baseClasses} text-lg`;
      default: return 'text-base';
    }
  };

  return (
    <div
      data-line-id={node.id}
      className={`
        rounded-md transition-colors duration-100
        ${isActive ? 'bg-gray-800/20 ring-1 ring-gray-700' : 'hover:bg-gray-900/20'}
      `}
    >
      {isActive ? (
        <input
          type="text"
          value={node.rawContent}
          onChange={e => {
            debug.log('Line content change', { id: node.id, content: e.target.value });
            onChange(node.id, e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          className={`
            w-full bg-transparent px-3 py-1.5
            focus:outline-none font-mono
            ${node.type === 'heading' ? getHeadingClass(node.attributes.level) : 'text-base'}
            ${node.type === 'list_item' ? `ml-${(node.attributes.listIndent || 0) * 6}` : ''}
          `}
          autoFocus
        />
      ) : (
        <div 
          className="px-3 py-1.5 cursor-text"
          onClick={onFocus}
        >
          {renderPreview()}
        </div>
      )}
    </div>
  );
};