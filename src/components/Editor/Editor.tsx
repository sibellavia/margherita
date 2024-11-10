import React, { useRef, useEffect, useCallback } from 'react';
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

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentNodeIndex = state.nodes.findIndex(n => n.id === state.activeNodeId);
    if (currentNodeIndex === -1) return;

    debug.log('Key pressed in editor', { key: e.key, currentNodeIndex });

    switch (e.key) {
      case 'ArrowUp': {
        e.preventDefault();
        if (currentNodeIndex > 0) {
          const prevNode = state.nodes[currentNodeIndex - 1];
          handlers.handleActiveNodeChange(prevNode.id);
          // Preserve horizontal cursor position when possible
          const input = document.querySelector(`[data-line-id="${prevNode.id}"] input`) as HTMLInputElement;
          if (input) {
            requestAnimationFrame(() => {
              input.focus();
              // If coming from an input, try to maintain cursor position
              const sourceInput = e.target as HTMLInputElement;
              if (sourceInput.selectionStart) {
                const pos = Math.min(sourceInput.selectionStart, input.value.length);
                input.setSelectionRange(pos, pos);
              }
            });
          }
        }
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        if (currentNodeIndex < state.nodes.length - 1) {
          const nextNode = state.nodes[currentNodeIndex + 1];
          handlers.handleActiveNodeChange(nextNode.id);
          // Preserve horizontal cursor position when possible
          const input = document.querySelector(`[data-line-id="${nextNode.id}"] input`) as HTMLInputElement;
          if (input) {
            requestAnimationFrame(() => {
              input.focus();
              // If coming from an input, try to maintain cursor position
              const sourceInput = e.target as HTMLInputElement;
              if (sourceInput.selectionStart) {
                const pos = Math.min(sourceInput.selectionStart, input.value.length);
                input.setSelectionRange(pos, pos);
              }
            });
          }
        }
        break;
      }
      case 'Enter': {
        if (!e.shiftKey) {
          e.preventDefault();
          handlers.handleNodeInsert(state.nodes[currentNodeIndex].id);
        }
        break;
      }
      case 'Backspace': {
        const currentNode = state.nodes[currentNodeIndex];
        if (currentNode.content === '' && state.nodes.length > 1) {
          e.preventDefault();
          handlers.handleNodeRemove(currentNode.id);
        }
        break;
      }
    }
  }, [state.nodes, state.activeNodeId, handlers]);

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
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
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

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
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
          <div
            key={node.id}
            data-line-id={node.id}
            onKeyDown={handleKeyDown}
          >
            <EditorLine
              node={node}
              isActive={node.id === state.activeNodeId}
              onChange={handlers.handleNodeChange}
              onFocus={() => handlers.handleActiveNodeChange(node.id)}
              onInsert={() => handlers.handleNodeInsert(node.id)}
              onRemove={() => handlers.handleNodeRemove(node.id)}
              prevNode={index > 0 ? state.nodes[index - 1] : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};