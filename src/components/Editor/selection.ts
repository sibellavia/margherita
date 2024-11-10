import { Selection, Position, Range, SelectionType, DocumentNode } from './types';
import { debug } from './debug';

const DOUBLE_PRESS_TIMEOUT = 500; // ms

export class SelectionManager {
  private lastSelectionType?: SelectionType;
  private lastSelectionTime?: number;

  constructor() {
    this.lastSelectionType = undefined;
    this.lastSelectionTime = undefined;
  }

  public handleSelectAll(nodes: DocumentNode[], currentLine: number): Selection {
    const now = Date.now();
    
    debug.log('Handling Cmd/Ctrl+A', {
      lastType: this.lastSelectionType,
      timeDiff: this.lastSelectionTime ? now - this.lastSelectionTime : null,
      currentLine
    });

    const isDoublePressCandidate = 
      this.lastSelectionType === 'line' &&
      this.lastSelectionTime &&
      (now - this.lastSelectionTime) < DOUBLE_PRESS_TIMEOUT;

    let newSelection: Selection;

    if (isDoublePressCandidate) {
      debug.log('Double Cmd/Ctrl+A detected, selecting entire document');
      newSelection = this.createDocumentSelection(nodes);
      this.lastSelectionType = 'document';
    } else {
      debug.log('Single Cmd/Ctrl+A detected, selecting current line', { currentLine });
      newSelection = this.createLineSelection(currentLine, nodes);
      this.lastSelectionType = 'line';
    }

    this.lastSelectionTime = now;
    return newSelection;
  }

  public createLineSelection(lineIndex: number, nodes: DocumentNode[]): Selection {
    if (lineIndex < 0 || lineIndex >= nodes.length) {
      debug.warn('Invalid line index for line selection', { lineIndex });
      return this.createEmptySelection();
    }

    const node = nodes[lineIndex];
    return {
      range: {
        start: { line: lineIndex, column: 0 },
        end: { line: lineIndex, column: node.rawContent.length }
      },
      isCollapsed: false,
      type: 'line'
    };
  }

  public createDocumentSelection(nodes: DocumentNode[]): Selection {
    if (nodes.length === 0) {
      return this.createEmptySelection();
    }

    return {
      range: {
        start: { line: 0, column: 0 },
        end: {
          line: nodes.length - 1,
          column: nodes[nodes.length - 1].rawContent.length
        }
      },
      isCollapsed: false,
      type: 'document'
    };
  }

  public createEmptySelection(): Selection {
    return {
      range: {
        start: { line: 0, column: 0 },
        end: { line: 0, column: 0 }
      },
      isCollapsed: true,
      type: 'none'
    };
  }

  public handleMouseSelection(
    anchorNode: Node | null,
    focusNode: Node | null,
    anchorOffset: number,
    focusOffset: number,
    getLineNumber: (node: Node) => number
  ): Selection | null {
    if (!anchorNode || !focusNode) {
      return null;
    }

    const start: Position = {
      line: getLineNumber(anchorNode),
      column: anchorOffset
    };

    const end: Position = {
      line: getLineNumber(focusNode),
      column: focusOffset
    };

    // Reset last selection type when user makes a mouse selection
    this.lastSelectionType = 'text';
    this.lastSelectionTime = undefined;

    debug.log('Mouse selection created', { start, end });
    return this.createSelection(start, end, 'text');
  }

  public createSelection(
    start: Position,
    end: Position,
    type: SelectionType = 'text'
  ): Selection {
    return {
      range: { start, end },
      isCollapsed: this.isCollapsed(start, end),
      type
    };
  }

  private isCollapsed(start: Position, end: Position): boolean {
    return start.line === end.line && start.column === end.column;
  }

  public normalizeRange(range: Range, nodes: DocumentNode[]): Range {
    // Ensure start comes before end
    if (
      range.start.line > range.end.line ||
      (range.start.line === range.end.line && range.start.column > range.end.column)
    ) {
      return { start: range.end, end: range.start };
    }

    // Clamp values within valid ranges
    return {
      start: this.clampPosition(range.start, nodes),
      end: this.clampPosition(range.end, nodes)
    };
  }

  private clampPosition(pos: Position, nodes: DocumentNode[]): Position {
    const line = Math.max(0, Math.min(pos.line, nodes.length - 1));
    const maxColumn = nodes[line].rawContent.length;
    const column = Math.max(0, Math.min(pos.column, maxColumn));
    
    return { line, column };
  }

  // Method to debug current state
  public getDebugState() {
    return {
      lastSelectionType: this.lastSelectionType,
      lastSelectionTime: this.lastSelectionTime
    };
  }
}