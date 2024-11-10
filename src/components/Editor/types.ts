export type NodeType = 'paragraph' | 'heading' | 'list_item' | 'code_block';

export interface Position {
  line: number;
  column: number;
}

export interface Selection {
  anchor: Position;
  focus: Position;
  isCollapsed: boolean;
}

export interface NodeAttributes {
  level?: number;        // For headings (1-6)
  listType?: 'bullet' | 'ordered';
  listIndent?: number;
  listNumber?: number;
  language?: string;     // For code blocks
}

export interface Node {
  id: string;
  type: NodeType;
  content: string;    // Rendered content
  rawContent: string; // Source markdown
  attributes: NodeAttributes;
}

// Alias for Node to avoid conflicts with DOM Node
export type DocumentNode = Node;

export interface DocumentState {
  nodes: DocumentNode[];
  selection: Selection | null;
  activeNodeId: string | null;
}