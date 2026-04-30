import { DOMParser, type Attr, type Document, type Element, type Node } from '@xmldom/xmldom';

import type { SourceLocation } from '../errors/index.js';

/**
 * Parse an XML source string into a DOM document.
 *
 * Thin wrapper so the underlying parser can be swapped later without
 * touching callers. All XML input (source docs and stylesheets) goes
 * through here. Strips a leading UTF-8 BOM because xmldom treats it as
 * content-before-declaration.
 */
export function parseXml(source: string): Document {
  const stripped = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const parser = new DOMParser();
  const document = parser.parseFromString(stripped, 'text/xml');
  stripXmlDeclarationProcessingInstruction(document);
  return document;
}

export type { Document } from '@xmldom/xmldom';

type LocatedNode = Node & {
  readonly lineNumber?: number;
  readonly columnNumber?: number;
};

export function getNodeSourceLocation(source: string, node: Node, sourceName = '<xml>'): SourceLocation | undefined {
  const locatedNode = node as LocatedNode;
  const line = normalizeLineNumber(locatedNode.lineNumber);
  const column = locatedNode.columnNumber;
  if (line === undefined || column === undefined) {
    return undefined;
  }

  const lineStartOffsets = computeLineStartOffsets(source);
  const lineStartOffset = lineStartOffsets[line - 1];
  if (lineStartOffset === undefined) {
    return undefined;
  }

  const offset = lineStartOffset + Math.max(0, column - 1);
  return {
    source: sourceName,
    line,
    column,
    offset,
    endLine: line,
    endColumn: column + 1,
    endOffset: offset + 1,
  };
}

export function getAttributeValueSourceLocation(
  source: string,
  element: Element,
  attributeName: string,
  sourceName = '<xml>',
): SourceLocation | undefined {
  const attribute = element.getAttributeNode(attributeName);
  if (attribute === null) {
    return undefined;
  }

  const line = normalizeLineNumber(attribute.lineNumber);
  const column = attribute.columnNumber;
  if (line === undefined || column === undefined) {
    return undefined;
  }

  const lineStartOffsets = computeLineStartOffsets(source);
  const lineStartOffset = lineStartOffsets[line - 1];
  if (lineStartOffset === undefined) {
    return undefined;
  }

  const lineText = getLineText(source, lineStartOffsets, line);
  if (lineText === undefined) {
    return undefined;
  }

  const valueRange = findAttributeValueRange(lineText, attribute);
  if (valueRange === undefined) {
    return getNodeSourceLocation(source, attribute, sourceName);
  }

  return {
    source: sourceName,
    line,
    column: valueRange.startColumn,
    offset: lineStartOffset + valueRange.startOffset,
    endLine: line,
    endColumn: valueRange.endColumn,
    endOffset: lineStartOffset + valueRange.endOffset,
  };
}

function stripXmlDeclarationProcessingInstruction(document: Document): void {
  const toRemove: Node[] = [];

  for (let index = 0; index < document.childNodes.length; index += 1) {
    const child = document.childNodes.item(index);
    if (child?.nodeType === 7 && child.nodeName === 'xml') {
      toRemove.push(child);
    }
  }

  for (const child of toRemove) {
    document.removeChild(child);
  }
}

function computeLineStartOffsets(source: string): number[] {
  const offsets = [0];

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '\r') {
      if (source[index + 1] === '\n') {
        index += 1;
      }
      offsets.push(index + 1);
      continue;
    }

    if (character === '\n') {
      offsets.push(index + 1);
    }
  }

  return offsets;
}

function getLineText(source: string, lineStartOffsets: readonly number[], line: number): string | undefined {
  const lineStartOffset = lineStartOffsets[line - 1];
  if (lineStartOffset === undefined) {
    return undefined;
  }

  const nextLineOffset = lineStartOffsets[line] ?? source.length;
  let lineEndOffset = nextLineOffset;
  if (lineEndOffset > lineStartOffset && source[lineEndOffset - 1] === '\n') {
    lineEndOffset -= 1;
  }
  if (lineEndOffset > lineStartOffset && source[lineEndOffset - 1] === '\r') {
    lineEndOffset -= 1;
  }

  return source.slice(lineStartOffset, lineEndOffset);
}

function findAttributeValueRange(
  lineText: string,
  attribute: Attr,
): { startOffset: number; endOffset: number; startColumn: number; endColumn: number } | undefined {
  const assignmentIndex = lineText.indexOf(`${attribute.name}=`);
  if (assignmentIndex === -1) {
    return undefined;
  }

  const quoteIndex = assignmentIndex + attribute.name.length + 1;
  const quoteCharacter = lineText[quoteIndex];
  if (quoteCharacter !== '"' && quoteCharacter !== '\'') {
    return undefined;
  }

  const valueStartOffset = quoteIndex + 1;
  const valueEndOffset = lineText.indexOf(quoteCharacter, valueStartOffset);
  if (valueEndOffset === -1) {
    return undefined;
  }

  return {
    startOffset: valueStartOffset,
    endOffset: valueEndOffset,
    startColumn: valueStartOffset + 1,
    endColumn: valueEndOffset + 1,
  };
}

function normalizeLineNumber(lineNumber: number | undefined): number | undefined {
  if (lineNumber === undefined) {
    return undefined;
  }

  return lineNumber <= 0 ? 1 : lineNumber;
}
