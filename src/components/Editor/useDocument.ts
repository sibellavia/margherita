import { useState, useCallback, useEffect } from 'react';
import { Document } from './document';
import { Selection } from './types';
import { debug } from './debug';

export function useDocument(content: string) {
  const [document] = useState(() => new Document(content));
  const [state, setState] = useState(() => document.getState());

  // Update document when content changes
  useEffect(() => {
    debug.log('Content changed in useDocument', { contentLength: content.length });
    document.setContent(content);
    setState(document.getState());
  }, [content, document]);

  const handleNodeChange = useCallback((id: string, content: string) => {
    debug.log('Node change', { id, content });
    document.updateNode(id, content);
    setState(document.getState());
  }, [document]);

  const handleSelectionChange = useCallback((selection: Selection) => {
    debug.log('Selection change', selection);
    document.updateSelection(selection);
    setState(document.getState());
  }, [document]);

  const handleActiveNodeChange = useCallback((id: string) => {
    document.setActiveNode(id);
    setState(document.getState());
  }, [document]);

  const handleNodeInsert = useCallback((afterId: string) => {
    document.insertNode(afterId);
    setState(document.getState());
  }, [document]);

  const handleNodeRemove = useCallback((id: string) => {
    document.removeNode(id);
    setState(document.getState());
  }, [document]);

  const handleDeleteSelected = useCallback(() => {
    document.deleteSelectedContent();
    setState(document.getState());
  }, [document]);

  return {
    state,
    handlers: {
      handleNodeChange,
      handleSelectionChange,
      handleActiveNodeChange,
      handleNodeInsert,
      handleNodeRemove,
      handleDeleteSelected
    }
  };
}