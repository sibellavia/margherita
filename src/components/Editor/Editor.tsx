import React, { useRef, useEffect } from 'react';
import { useDocument } from './useDocument';
import { EditorLine } from './EditorLine';
import { Selection, DocumentNode } from './types';
import { debug } from './debug';

interface EditorProps {
  content: string;
  onSave?: (content: string) => Promise<void>;
}

export const Editor: React.FC<EditorProps> = ({ 
  content = '',
  onSave 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const { state, handlers } = useDocument(content);
  
  useEffect(() => {
    debug.log('Content updated in editor', { contentLength: content.length });
  }, [content]);

  // Track selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || !editorRef.current?.contains(selection.anchorNode)) {
        return;
      }

      const anchorElement = findLineElement(selection.anchorNode);
      const focusElement = findLineElement(selection.focusNode);
      
      if (!anchorElement || !focusElement) return;

      const newSelection: Selection = {
        anchor: {
          line: getLineNumber(anchorElement),
          column: selection.anchorOffset
        },
        focus: {
          line: getLineNumber(focusElement),
          column: selection.focusOffset
        },
        isCollapsed: selection.isCollapsed
      };

      debug.log('Selection changed', newSelection);
      handlers.handleSelectionChange(newSelection);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handlers]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && onSave) {
        e.preventDefault();
        try {
          await onSave(state.nodes.map((n: DocumentNode) => n.rawContent).join('\n'));
          debug.log('Document saved successfully');
        } catch (err) {
          debug.error('Failed to save document', err);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.nodes, onSave]);

  // Helper functions for selection handling
  const findLineElement = (node: globalThis.Node | null): HTMLElement | null => {
    while (node && !(node instanceof HTMLElement && node.hasAttribute('data-line-id'))) {
      node = node.parentElement;
    }
    return node as HTMLElement;
  };

  const getLineNumber = (element: HTMLElement): number => {
    const lineId = element.getAttribute('data-line-id');
    return state.nodes.findIndex((n: DocumentNode) => n.id === lineId);
  };

  return (
    <div 
      ref={editorRef}
      className="h-full bg-gray-950 text-gray-100 overflow-auto outline-none"
      tabIndex={-1}
    >
      <div className="min-h-full p-4 space-y-0.5">
        {state.nodes.map((node: DocumentNode, index) => (
          <EditorLine
            key={node.id}
            node={node}
            isActive={node.id === state.activeNodeId}
            onChange={handlers.handleNodeChange}
            onFocus={() => handlers.handleActiveNodeChange(node.id)}
            onInsert={() => handlers.handleNodeInsert(node.id)}
            onRemove={() => handlers.handleNodeRemove(node.id)}
            prevNode={index > 0 ? state.nodes[index - 1] : undefined}
          />
        ))}
      </div>
    </div>
  );
};