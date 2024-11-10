import { Node, NodeType, NodeAttributes } from './types';
import { debug } from './debug';

interface ParseResult {
  type: NodeType;
  content: string;
  rawContent: string;
  attributes: NodeAttributes;
}

export function parseMarkdown(text: string, prevNode?: Node): ParseResult {
  debug.log('Parsing markdown', { text, prevNode });

  // Handle headings
  const headingMatch = text.match(/^(#{1,6})\s+(.+?)(?:\s*#)*\s*$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const content = headingMatch[2].trim();
    
    if (level <= 6 && content) {
      return {
        type: 'heading',
        content,
        rawContent: text,
        attributes: { level }
      };
    }
  }

  // Handle code blocks
  if (text.startsWith('```')) {
    const match = text.match(/^```(\w*)\s*$/);
    if (match) {
      return {
        type: 'code_block',
        content: '',
        rawContent: text,
        attributes: { 
          language: match[1] || undefined 
        }
      };
    }
  }

  // Handle list items
  const listMatch = text.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
  if (listMatch) {
    const [, indent, marker, content] = listMatch;
    const indentLevel = Math.floor(indent.length / 2);
    const isOrdered = /^\d+\.$/.test(marker);
    
    let listNumber = 1;
    if (isOrdered) {
      const markerNumber = parseInt(marker);
      
      if (prevNode?.type === 'list_item' && 
          prevNode.attributes.listType === 'ordered' &&
          prevNode.attributes.listIndent === indentLevel) {
        listNumber = (prevNode.attributes.listNumber || 0) + 1;
      } else {
        listNumber = markerNumber;
      }
    }

    return {
      type: 'list_item',
      content: content.trim(),
      rawContent: text,
      attributes: {
        listType: isOrdered ? 'ordered' : 'bullet',
        listIndent: indentLevel,
        ...(isOrdered && { listNumber })
      }
    };
  }

  // Default to paragraph
  return {
    type: 'paragraph',
    content: text,
    rawContent: text,
    attributes: {}
  };
}

export function formatNode(node: Node): string {
  switch (node.type) {
    case 'heading':
      return `${'#'.repeat(node.attributes.level || 1)} ${node.content}`;
      
    case 'list_item': {
      const indent = '  '.repeat(node.attributes.listIndent || 0);
      const marker = node.attributes.listType === 'ordered'
        ? `${node.attributes.listNumber}.`
        : '-';
      return `${indent}${marker} ${node.content}`;
    }
    
    case 'code_block': {
      const lang = node.attributes.language || '';
      return `\`\`\`${lang}\n${node.content}\n\`\`\``;
    }
    
    default:
      return node.content;
  }
}