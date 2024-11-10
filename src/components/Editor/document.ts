import { nanoid } from 'nanoid';
import { Node, NodeType, Selection, DocumentState, NodeAttributes } from './types';
import { parseMarkdown } from './parser';
import { debug } from './debug';

export class Document {
  private state: DocumentState;

  constructor(initialContent?: string) {
    debug.log('Creating new document', { initialContent });
    this.state = {
      nodes: initialContent 
        ? this.parseContent(initialContent)
        : [this.createEmptyNode()],
      selection: null,
      activeNodeId: null
    };
  }

  private parseContent(content: string): Node[] {
    return content.split('\n').map(line => ({
      id: nanoid(),
      ...parseMarkdown(line)
    }));
  }

  private createEmptyNode(type: NodeType = 'paragraph', attributes: NodeAttributes = {}): Node {
    return {
      id: nanoid(),
      type,
      content: '',
      rawContent: '',
      attributes
    };
  }

  public getState(): DocumentState {
    return { ...this.state };
  }

  public setContent(content: string): void {
    debug.log('Setting new content', { contentLength: content.length });
    this.state.nodes = content ? this.parseContent(content) : [this.createEmptyNode()];
    this.state.activeNodeId = this.state.nodes[0]?.id || null;
    this.state.selection = null;
  }

  public updateNode(id: string, content: string): void {
    debug.log('Updating node', { id, content });
    const index = this.state.nodes.findIndex(n => n.id === id);
    if (index === -1) return;

    const prevNode = index > 0 ? this.state.nodes[index - 1] : undefined;
    const parsed = parseMarkdown(content, prevNode);
    
    this.state.nodes[index] = {
      id: this.state.nodes[index].id,
      ...parsed
    };
  }

  public insertNode(afterId: string): void {
    const index = this.state.nodes.findIndex(n => n.id === afterId);
    if (index === -1) return;

    const currentNode = this.state.nodes[index];
    const newType: NodeType = currentNode.type === 'list_item' ? 'list_item' : 'paragraph';
    const newAttributes = currentNode.type === 'list_item' 
      ? { ...currentNode.attributes } 
      : {};

    const newNode = this.createEmptyNode(newType, newAttributes);

    this.state.nodes.splice(index + 1, 0, newNode);
    this.state.activeNodeId = newNode.id;
  }

  public removeNode(id: string): void {
    const index = this.state.nodes.findIndex(n => n.id === id);
    if (index === -1 || this.state.nodes.length === 1) return;

    this.state.nodes = this.state.nodes.filter(n => n.id !== id);
    this.state.activeNodeId = this.state.nodes[Math.max(0, index - 1)].id;
  }

  public updateSelection(selection: Selection): void {
    debug.log('Updating selection', selection);
    this.state.selection = selection;
  }

  public setActiveNode(id: string): void {
    if (this.state.nodes.some(n => n.id === id)) {
      this.state.activeNodeId = id;
    }
  }

  public toMarkdown(): string {
    return this.state.nodes.map(n => n.rawContent).join('\n');
  }
}