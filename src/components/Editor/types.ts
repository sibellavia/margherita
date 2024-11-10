export type NodeType = 'paragraph' | 'heading' | 'list_item' | 'code_block';

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Selection {
  range: Range;
  isCollapsed: boolean;
  type: SelectionType;
}

export type SelectionType = 'none' | 'text' | 'line' | 'document';

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

export type DocumentNode = Node;

export interface DocumentState {
  nodes: DocumentNode[];
  selection: Selection | null;
  activeNodeId: string | null;
  lastSelectionType?: SelectionType; // For tracking double Cmd/Ctrl+A
  lastSelectionTime?: number;        // For timing double Cmd/Ctrl+A
}