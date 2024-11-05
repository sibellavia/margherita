import React, { useState, useRef, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

interface Position {
  node: number;      // Index of the node in the nodes array
  offset: number;    // Character offset within the node
}

interface Selection {
  anchor: Position;
  head: Position;
  isBackward: boolean;
}

interface DocumentState {
  nodes: EditorNode[];
  selection: Selection | null;
  composition: boolean;
  activeNode: string | null;  // Track active node for fusion mode
}

interface Transaction {
  before: DocumentState;
  after: DocumentState;
  timestamp: number;
  type: TransactionType;
}

type TransactionType =
  | 'insert_text'      // Basic text insertion
  | 'delete_text'      // Basic text deletion
  | 'split_node'       // When Enter is pressed
  | 'merge_nodes'      // When Backspace is pressed at start of node
  | 'change_type'      // Generic type change
  | 'toggle_heading'   // Specifically for heading changes (including level changes)
  | 'create_list'      // Converting to a list
  | 'remove_list'      // Converting from a list back to paragraph
  | 'indent_list'      // Increasing list indent
  | 'outdent_list'     // Decreasing list indent
  | 'change_list_type' // Switching between ordered and unordered
  | 'join_with_next'   // When Delete is pressed at end of node
  | 'split_list_item'  // When Enter is pressed in a list item
  | 'merge_list_items' // When Backspace is pressed at start of list item
  | 'change_heading_level'; // Specifically for changing heading levels

class History {
  private done: Transaction[] = [];
  private undone: Transaction[] = [];
  private lastAddedAt: number = 0;
  private minTimeDelta = 1000;  // Minimum time between transactions to be considered separate

  addTransaction(tr: Transaction) {
    // Clear undone transactions when a new change is made
    this.undone = [];

    const shouldAdd =
      this.done.length === 0 ||
      tr.timestamp - this.lastAddedAt > this.minTimeDelta ||
      this.done[this.done.length - 1].type !== tr.type;

    if (shouldAdd) {
      this.done.push(tr);
      this.lastAddedAt = tr.timestamp;
    } else {
      // Merge with last transaction
      const last = this.done[this.done.length - 1];
      last.after = tr.after;
    }
  }

  undo(): DocumentState | null {
    const tr = this.done.pop();
    if (!tr) return null;

    this.undone.push(tr);
    return tr.before;
  }

  redo(): DocumentState | null {
    const tr = this.undone.pop();
    if (!tr) return null;

    this.done.push(tr);
    return tr.after;
  }

  canUndo(): boolean {
    return this.done.length > 0;
  }

  canRedo(): boolean {
    return this.undone.length > 0;
  }
}

interface EditorNode {
  id: string;
  type: NodeType;
  content: Fragment[];
  rawContent: string;    // Store raw markdown for fusion mode
  attrs?: NodeAttrs;
}

interface Fragment {
  text: string;
  marks?: Mark[];
}

interface Mark {
  type: 'bold' | 'italic' | 'code' | 'link';
  attrs?: Record<string, any>;
}

type NodeType = 'paragraph' | 'heading' | 'list_item';

interface NodeAttrs {
  level?: number;
  listType?: 'bullet' | 'ordered';
  listIndent?: number;
}

const parseMarkdown = (text: string): {
  type: NodeType;
  content: Fragment[];
  rawContent: string;
  attrs?: NodeAttrs;
} => {
  // Clean the input text
  const cleanText = text.replace(/\u200B/g, ''); // Remove zero-width spaces
  const trimmedText = cleanText.trim();

  console.log('Parsing markdown:', {
    originalText: text,
    cleanText,
    trimmedText,
    charCodes: Array.from(trimmedText).map(c => c.charCodeAt(0)),
    length: trimmedText.length,
    startsWithHash: trimmedText.startsWith('#'),
    secondChar: trimmedText[1]
  });

  // More specific heading matching
  if (trimmedText.startsWith('#')) {
    const [hashes, ...rest] = trimmedText.split(/(\s+)/);
    const level = hashes.length;
    const content = rest.join('').trim();

    if (level >= 1 && level <= 6 && content) {
      console.log('Heading detected:', {
        level,
        content,
        hashes,
        rest
      });

      return {
        type: 'heading',
        content: [{ text: content }],
        rawContent: text,
        attrs: { level }
      };
    }
  }

  return {
    type: 'paragraph',
    content: [{ text: trimmedText }],
    rawContent: text
  };
};

const Editor: React.FC = () => {
  const [state, setState] = useState<DocumentState>({
    nodes: [{
      id: '1',
      type: 'paragraph',
      content: [{ text: '' }],
      rawContent: ''
    }],
    selection: null,
    composition: false,
    activeNode: '1'
  });

  const historyRef = useRef(new History());

  const editorRef = useRef<HTMLDivElement>(null);

  // Helper to create and apply transactions
  const dispatch = (
    newState: DocumentState,
    type: TransactionType
  ) => {
    const transaction: Transaction = {
      before: state,
      after: newState,
      timestamp: Date.now(),
      type
    };

    historyRef.current.addTransaction(transaction);
    setState(newState);
  };

  // List operations
  const toggleList = (nodeId: string, listType: 'bullet' | 'ordered') => {
    const newState: DocumentState = {
      ...state,
      nodes: state.nodes.map(currentNode => {
        if (currentNode.id !== nodeId) return currentNode;

        // If already a list of this type, convert to paragraph
        if (currentNode.type === 'list_item' && currentNode.attrs?.listType === listType) {
          return {
            ...currentNode,
            type: 'paragraph',
            attrs: undefined,
            rawContent: currentNode.content[0].text,
            content: [{ text: currentNode.content[0].text }]
          };
        }

        // Convert to list or change list type
        return {
          ...currentNode,
          type: 'list_item',
          attrs: {
            listType,
            listIndent: currentNode.attrs?.listIndent || 0
          },
          rawContent: `${listType === 'bullet' ? '- ' : '1. '}${currentNode.content[0].text}`,
          content: [{ text: currentNode.content[0].text }]
        };
      })
    };

    // Find the node we're operating on to determine the transaction type
    const targetNode = state.nodes.find(n => n.id === nodeId);
    dispatch(newState, targetNode?.type === 'list_item' ? 'remove_list' : 'create_list');
  };

  const changeListIndent = (nodeId: string, delta: number) => {
    const newState: DocumentState = {
      ...state,
      nodes: state.nodes.map(node => {
        if (node.id !== nodeId || node.type !== 'list_item') return node;

        const newIndent = Math.max(0, (node.attrs?.listIndent || 0) + delta);
        const spaces = '  '.repeat(newIndent);
        const marker = node.attrs?.listType === 'ordered' ? '1. ' : '- ';

        return {
          ...node,
          attrs: {
            ...node.attrs,
            listIndent: newIndent
          },
          rawContent: `${spaces}${marker}${node.content[0].text}`
        };
      })
    };

    dispatch(newState, delta > 0 ? 'indent_list' : 'outdent_list');
  };

  // Heading operations
  const toggleHeading = (nodeId: string, level?: number) => {
    const newState: DocumentState = {
      ...state,
      nodes: state.nodes.map(currentNode => {
        if (currentNode.id !== nodeId) return currentNode;

        // If already a heading of this level, convert to paragraph
        if (currentNode.type === 'heading' && currentNode.attrs?.level === level) {
          return {
            ...currentNode,
            type: 'paragraph',
            attrs: undefined,
            rawContent: currentNode.content[0].text,
            content: [{ text: currentNode.content[0].text }]
          };
        }

        // Convert to heading or change heading level
        const newLevel = level || 1;
        return {
          ...currentNode,
          type: 'heading',
          attrs: { level: newLevel },
          rawContent: `${'#'.repeat(newLevel)} ${currentNode.content[0].text}`,
          content: [{ text: currentNode.content[0].text }]
        };
      })
    };

    // Find the target node to determine the transaction type
    const targetNode = state.nodes.find(n => n.id === nodeId);
    dispatch(newState, targetNode?.type === 'heading' ? 'change_heading_level' : 'toggle_heading');
  };

  // Render a node based on fusion mode
  const renderNode = (node: EditorNode, isActive: boolean) => {
    const getHeadingClass = (level?: number) => {
      switch (level) {
        case 1: return 'text-4xl font-bold';
        case 2: return 'text-3xl font-bold';
        case 3: return 'text-2xl font-bold';
        case 4: return 'text-xl font-bold';
        case 5: return 'text-lg font-bold';
        case 6: return 'text-base font-bold';
        default: return 'text-base';
      }
    };

    // Get current cursor position for this node
    const getCursorPosition = () => {
      if (!state.selection) return null;
      const nodeIndex = state.nodes.findIndex(n => n.id === node.id);
      if (state.selection.head.node !== nodeIndex) return null;
      return state.selection.head.offset;
    };

    if (isActive) {
      // For headings, only show the text content, not the markdown
      const displayContent = node.type === 'heading'
        ? node.content[0].text
        : node.rawContent;

      return (
        <div
          className={`min-h-[1.5em] px-3 py-1.5 font-mono relative ${node.type === 'heading' ? getHeadingClass(node.attrs?.level) : ''
            }`}
          contentEditable
          suppressContentEditableWarning
          data-node-id={node.id}
          data-type={node.type}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Capture selection in a constant to help TypeScript
            const selection = state.selection;
            if (!selection) return;

            requestAnimationFrame(() => {
              const el = editorRef.current?.querySelector(`[data-node-id="${node.id}"]`);
              if (el instanceof HTMLElement) {
                const range = document.createRange();
                const sel = window.getSelection();
                const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);

                if (textNode && sel) {
                  const maxLength = textNode.textContent?.length || 0;
                  const safeOffset = Math.min(selection.head.offset, maxLength);

                  range.setStart(textNode, safeOffset);
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);
                }
              }
            });
          }}
        >
          {displayContent || '\u200B'}
        </div>
      );
    } else {
      switch (node.type) {
        case 'heading':
          return (
            <div
              className={`px-3 py-1.5 ${getHeadingClass(node.attrs?.level)}`}
              data-node-id={node.id}
            >
              {node.content[0].text}
            </div>
          );

        default:
          return (
            <div
              className="px-3 py-1.5"
              data-node-id={node.id}
            >
              {node.content[0].text}
            </div>
          );
      }
    }

    // Render formatted content for inactive nodes
    switch (node.type) {
      case 'heading':
        return (
          <div
            className={`px-3 py-1.5 ${getHeadingClass(node.attrs?.level)}`}
            data-node-id={node.id}
          >
            {node.content[0].text}
          </div>
        );

      case 'list_item':
        const indent = node.attrs?.listIndent || 0;
        const marker = node.attrs?.listType === 'ordered' ? '1.' : '•';
        return (
          <div
            className={`px-3 py-1.5 flex`}
            style={{ paddingLeft: `${indent * 1.5 + 1}rem` }}
            data-node-id={node.id}
          >
            <span className="w-6 text-gray-500">{marker}</span>
            <span>{node.content[0].text}</span>
          </div>
        );

      default:
        return (
          <div
            className="px-3 py-1.5"
            data-node-id={node.id}
          >
            {node.content[0].text}
          </div>
        );
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (state.composition) return;

    const content = e.currentTarget.textContent || '';
    const nodeId = e.currentTarget.getAttribute('data-node-id');
    if (!nodeId) return;

    const selection = window.getSelection();
    const currentOffset = selection?.anchorOffset || 0;
    const nodeIndex = state.nodes.findIndex(n => n.id === nodeId);

    // Parse markdown
    const result = parseMarkdown(content);

    // For headings, handle the content and cursor differently
    let displayText = content;
    let newOffset = currentOffset;

    if (result.type === 'heading') {
      const headingMatch = content.match(/^(#{1,6})\s*(.*?)$/);
      if (headingMatch) {
        const [, hashes, text] = headingMatch;
        displayText = text;

        // Keep cursor position in sync with visible text
        const prefixLength = hashes.length + 1; // +1 for the space
        const isInPrefix = currentOffset <= prefixLength;

        if (isInPrefix) {
          // If cursor is in the prefix area, move it to the start of the text
          newOffset = 0;
        } else {
          // Otherwise, adjust position relative to visible text
          newOffset = currentOffset - prefixLength;
        }

        console.log('Cursor calculation:', {
          contentLength: content.length,
          displayLength: displayText.length,
          currentOffset,
          prefixLength,
          isInPrefix,
          newOffset
        });
      }
    }

    console.log('Content handling:', {
      original: content,
      display: displayText,
      type: result.type,
      oldOffset: currentOffset,
      newOffset
    });

    const newState: DocumentState = {
      ...state,
      nodes: state.nodes.map(node =>
        node.id === nodeId
          ? {
            ...node,
            type: result.type,
            content: [{ text: displayText }],
            rawContent: content,
            attrs: result.attrs
          }
          : node
      ),
      selection: {
        anchor: { node: nodeIndex, offset: newOffset },
        head: { node: nodeIndex, offset: newOffset },
        isBackward: false
      }
    };

    dispatch(newState, 'insert_text');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const nodeId = e.currentTarget.getAttribute('data-node-id');
    if (!nodeId) return;

    // Handle Enter key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      const currentNodeIndex = state.nodes.findIndex(n => n.id === nodeId);
      const currentNode = state.nodes[currentNodeIndex];

      // Create new node
      const newNodeId = Math.random().toString(36).substr(2, 9);

      // If current node is a heading, create a normal paragraph
      // Otherwise, inherit the current node's type
      const newNode: EditorNode = {
        id: newNodeId,
        type: 'paragraph',
        content: [{ text: '' }],
        rawContent: ''
      };

      const newState: DocumentState = {
        ...state,
        nodes: [
          ...state.nodes.slice(0, currentNodeIndex + 1),
          newNode,
          ...state.nodes.slice(currentNodeIndex + 1)
        ],
        activeNode: newNodeId,
        selection: {
          anchor: { node: currentNodeIndex + 1, offset: 0 },
          head: { node: currentNodeIndex + 1, offset: 0 },
          isBackward: false
        }
      };

      dispatch(newState, 'split_node');
      return;
    }

    // Existing commands (cmd/ctrl+z for undo/redo)
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          const newState = historyRef.current.redo();
          if (newState) setState(newState);
        } else {
          const newState = historyRef.current.undo();
          if (newState) setState(newState);
        }
        return;
      }
    }

    // List commands
    if (e.key === 'Tab') {
      e.preventDefault();
      const node = state.nodes.find(n => n.id === nodeId);
      if (node?.type === 'list_item') {
        changeListIndent(nodeId, e.shiftKey ? -1 : 1);
      }
      return;
    }

    // Heading commands
    if (e.metaKey || e.ctrlKey) {
      const headingLevel = parseInt(e.key);
      if (headingLevel >= 1 && headingLevel <= 6) {
        e.preventDefault();
        toggleHeading(nodeId, headingLevel);
        return;
      }
    }

    // Handle arrow keys
    if (e.key.startsWith('Arrow')) {
      e.preventDefault(); // Prevent default to handle our own navigation

      const currentNodeIndex = state.nodes.findIndex(n => n.id === nodeId);
      const currentNode = state.nodes[currentNodeIndex];
      if (!currentNode || !state.selection) return;

      const currentPosition = state.selection.head;
      const text = currentNode.content[0].text;

      switch (e.key) {
        case 'ArrowLeft': {
          if (currentPosition.offset > 0) {
            // Move left within current node
            setState(prev => ({
              ...prev,
              selection: {
                anchor: { ...currentPosition, offset: currentPosition.offset - 1 },
                head: { ...currentPosition, offset: currentPosition.offset - 1 },
                isBackward: false
              }
            }));
          } else if (currentNodeIndex > 0) {
            // Move to end of previous node
            const prevNode = state.nodes[currentNodeIndex - 1];
            const newOffset = prevNode.content[0].text.length;
            setState(prev => ({
              ...prev,
              activeNode: prevNode.id,
              selection: {
                anchor: { node: currentNodeIndex - 1, offset: newOffset },
                head: { node: currentNodeIndex - 1, offset: newOffset },
                isBackward: false
              }
            }));
          }
          break;
        }

        case 'ArrowRight': {
          if (currentPosition.offset < text.length) {
            // Move right within current node
            setState(prev => ({
              ...prev,
              selection: {
                anchor: { ...currentPosition, offset: currentPosition.offset + 1 },
                head: { ...currentPosition, offset: currentPosition.offset + 1 },
                isBackward: false
              }
            }));
          } else if (currentNodeIndex < state.nodes.length - 1) {
            // Move to start of next node
            const nextNode = state.nodes[currentNodeIndex + 1];
            setState(prev => ({
              ...prev,
              activeNode: nextNode.id,
              selection: {
                anchor: { node: currentNodeIndex + 1, offset: 0 },
                head: { node: currentNodeIndex + 1, offset: 0 },
                isBackward: false
              }
            }));
          }
          break;
        }

        case 'ArrowUp': {
          if (currentNodeIndex > 0) {
            const prevNode = state.nodes[currentNodeIndex - 1];
            const newOffset = Math.min(currentPosition.offset, prevNode.content[0].text.length);
            setState(prev => ({
              ...prev,
              activeNode: prevNode.id,
              selection: {
                anchor: { node: currentNodeIndex - 1, offset: newOffset },
                head: { node: currentNodeIndex - 1, offset: newOffset },
                isBackward: false
              }
            }));
          }
          break;
        }

        case 'ArrowDown': {
          if (currentNodeIndex < state.nodes.length - 1) {
            const nextNode = state.nodes[currentNodeIndex + 1];
            const newOffset = Math.min(currentPosition.offset, nextNode.content[0].text.length);
            setState(prev => ({
              ...prev,
              activeNode: nextNode.id,
              selection: {
                anchor: { node: currentNodeIndex + 1, offset: newOffset },
                head: { node: currentNodeIndex + 1, offset: newOffset },
                isBackward: false
              }
            }));
          }
          break;
        }
      }

      return;
    }
  };

  // Handle undo/redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      if (e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          // Redo
          const newState = historyRef.current.redo();
          if (newState) setState(newState);
        } else {
          // Undo
          const newState = historyRef.current.undo();
          if (newState) setState(newState);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add status bar to show undo/redo availability
  const canUndo = historyRef.current.canUndo();
  const canRedo = historyRef.current.canRedo();

  const handleNodeClick = (nodeId: string) => {
    setState(prev => ({
      ...prev,
      activeNode: nodeId
    }));
  };

  // Helper function to get the current cursor position from DOM selection
  const getCurrentPosition = (domNode: Node | null, offset: number): Position | null => {
    if (!domNode) return null;

    let current: Node | null = domNode;
    while (current && !(current instanceof HTMLElement && current.hasAttribute('data-node-id'))) {
      current = current.parentNode;
      if (!current) break;
    }

    if (!(current instanceof HTMLElement)) return null;

    const nodeId = current.getAttribute('data-node-id');
    const nodeIndex = state.nodes.findIndex(n => n.id === nodeId);

    if (nodeIndex === -1) return null;

    return {
      node: nodeIndex,
      offset: offset
    };
  };

  // Add this to your Editor component
  const handleSelectionChange = () => {
    const domSelection = document.getSelection();
    if (!domSelection || !editorRef.current?.contains(domSelection.anchorNode)) {
      return;
    }

    const position = getCurrentPosition(domSelection.anchorNode, domSelection.anchorOffset);
    if (!position) return;

    setState(prev => ({
      ...prev,
      selection: {
        anchor: position,
        head: position,
        isBackward: false
      }
    }));
  };

  // Add selection change listener
  useEffect(() => {
    const handleSelectionChange = () => {
      const domSelection = document.getSelection();
      if (!domSelection || !editorRef.current?.contains(domSelection.anchorNode)) {
        return;
      }

      const position = getCurrentPosition(domSelection.anchorNode, domSelection.anchorOffset);
      if (!position) return;

      setState(prev => ({
        ...prev,
        selection: {
          anchor: position,
          head: position,
          isBackward: false
        }
      }));
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    if (state.selection && state.activeNode) {
      const selection = state.selection;

      // Add a check for current cursor position to prevent unnecessary updates
      const currentSel = window.getSelection();
      const currentNode = currentSel?.anchorNode?.parentElement?.getAttribute('data-node-id');
      const currentOffset = currentSel?.anchorOffset;

      // Only restore if position actually changed
      if (currentNode !== state.activeNode || currentOffset !== selection.head.offset) {
        requestAnimationFrame(() => {
          const el = editorRef.current?.querySelector(`[data-node-id="${state.activeNode}"]`);
          if (el instanceof HTMLElement) {
            const range = document.createRange();
            const sel = window.getSelection();

            const walker = document.createTreeWalker(
              el,
              NodeFilter.SHOW_TEXT,
              null
            );

            const textNode = walker.nextNode();

            if (textNode && sel) {
              console.log('Restoring cursor:', {
                offset: selection.head.offset,
                text: textNode.textContent,
                nodeId: state.activeNode,
                currentNode,
                currentOffset
              });

              range.setStart(textNode, selection.head.offset);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              el.focus();
            }
          }
        });
      }
    }
  }, [state.selection, state.activeNode]);

  return (

    <div className="h-full flex flex-col bg-gray-950 text-gray-100">
      <div className="flex-1 overflow-auto">
        <div
          ref={editorRef}
          className="h-full bg-gray-950 text-gray-100 overflow-auto"
        >
          <div className="min-h-full p-4">
            {state.nodes.map(node => (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className={`
              rounded-md
              ${node.id === state.activeNode ? 'bg-gray-800/20 ring-1 ring-gray-700' : ''}
              hover:bg-gray-900/20 transition-colors duration-100
            `}
              >
                {renderNode(node, node.id === state.activeNode)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 px-4 py-2 text-sm text-gray-500 flex items-center space-x-4">
        <button
          onClick={() => {
            const newState = historyRef.current.undo();
            if (newState) setState(newState);
          }}
          disabled={!canUndo}
          className={`${!canUndo ? 'opacity-50' : ''}`}
        >
          Undo
        </button>
        <button
          onClick={() => {
            const newState = historyRef.current.redo();
            if (newState) setState(newState);
          }}
          disabled={!canRedo}
          className={`${!canRedo ? 'opacity-50' : ''}`}
        >
          Redo
        </button>
      </div>
    </div>
  );
};

export default Editor;