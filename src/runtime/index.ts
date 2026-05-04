import type { Node } from '@xmldom/xmldom';

import type { TransformOptions, TransformResult } from '../processor/types.js';
import { parseXml, type Document } from '../xml/parse.js';
import { runTransform } from '../xslt/eval/transform.js';
import type { StylesheetIR } from '../xslt/compile/ir.js';

export type TransformContext = TransformOptions;

export type { TransformOptions, TransformResult, StylesheetIR };

export function createCompiledDocument(sourceXml: string): Document {
  return parseXml(sourceXml);
}

export function selectSimplePathNode(startNode: Node, path: readonly string[]): Node | null {
  let current: Node = startNode;

  for (const segment of path) {
    const next = findChildElement(current, segment);
    if (next === null) {
      return null;
    }

    current = next;
  }

  return current;
}

export function selectSimplePathNodes(startNode: Node, path: readonly string[]): readonly Node[] {
  let currentNodes: Node[] = [startNode];

  for (const segment of path) {
    const nextNodes: Node[] = [];

    for (const currentNode of currentNodes) {
      for (let index = 0; index < currentNode.childNodes.length; index += 1) {
        const child = currentNode.childNodes.item(index);
        if (child === null || child.nodeType !== child.ELEMENT_NODE) {
          continue;
        }

        const childLocalName = child.localName ?? child.nodeName;
        if (childLocalName === segment && (child.namespaceURI ?? '') === '') {
          nextNodes.push(child);
        }
      }
    }

    if (nextNodes.length === 0) {
      return [];
    }

    currentNodes = nextNodes;
  }

  return currentNodes;
}

export function selectDescendantElementsByName(startNode: Node, localName: string): readonly Node[] {
  const matches: Node[] = [];
  collectDescendantElementsByName(startNode, localName, matches);
  return matches;
}

export function applyBuiltInTemplatesByPath(
  startNode: Node,
  path: readonly string[],
  renderMatchedNode: (node: Node) => string,
  absolute = false,
): string {
  if (path.length === 0) {
    return '';
  }

  return renderBuiltInTemplateChildren(startNode, path, renderMatchedNode, absolute);
}

export function selectSimplePathText(startNode: Node, path: readonly string[]): string {
  const node = selectSimplePathNode(startNode, path);
  if (node === null) {
    return '';
  }

  return collectStringValue(node);
}

export function selectSimplePathExists(startNode: Node, path: readonly string[]): boolean {
  return selectSimplePathNode(startNode, path) !== null;
}

export function stringValueOfNode(node: Node): string {
  return collectStringValue(node);
}

export function nameOfNode(node: Node | null): string {
  if (node === null || node.nodeType === node.DOCUMENT_NODE) {
    return '';
  }

  return node.nodeName ?? '';
}

export function localNameOfNode(node: Node | null): string {
  if (node === null || node.nodeType === node.DOCUMENT_NODE) {
    return '';
  }

  return node.localName ?? node.nodeName ?? '';
}

export function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function transformCompiledStylesheet(
  ir: StylesheetIR,
  sourceXml: string,
  context: TransformContext = {},
): TransformResult {
  return runTransform(ir, sourceXml, context);
}

function findChildElement(node: Node, localName: string): Node | null {
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child === null || child.nodeType !== child.ELEMENT_NODE) {
      continue;
    }

    const childLocalName = child.localName ?? child.nodeName;
    if (childLocalName === localName && (child.namespaceURI ?? '') === '') {
      return child;
    }
  }

  return null;
}

function collectDescendantElementsByName(node: Node, localName: string, matches: Node[]): void {
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child === null || child.nodeType !== child.ELEMENT_NODE) {
      continue;
    }

    const childLocalName = child.localName ?? child.nodeName;
    if (childLocalName === localName && (child.namespaceURI ?? '') === '') {
      matches.push(child);
    }

    collectDescendantElementsByName(child, localName, matches);
  }
}

function renderBuiltInTemplateChildren(
  node: Node,
  path: readonly string[],
  renderMatchedNode: (node: Node) => string,
  absolute: boolean,
): string {
  let output = '';

  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child === null || child.nodeType !== child.ELEMENT_NODE) {
      if (child !== null) {
        output += renderBuiltInTemplateNode(child, path, renderMatchedNode, absolute);
      }

      continue;
    }

    output += renderBuiltInTemplateNode(child, path, renderMatchedNode, absolute);
  }

  return output;
}

function renderBuiltInTemplateNode(
  node: Node,
  path: readonly string[],
  renderMatchedNode: (node: Node) => string,
  absolute: boolean,
): string {
  if (matchesSimplePath(node, path, absolute)) {
    return renderMatchedNode(node);
  }

  if (node.nodeType === node.DOCUMENT_NODE || node.nodeType === node.ELEMENT_NODE) {
    return renderBuiltInTemplateChildren(node, path, renderMatchedNode, absolute);
  }

  if (
    node.nodeType === node.TEXT_NODE
    || node.nodeType === node.CDATA_SECTION_NODE
    || node.nodeType === node.ATTRIBUTE_NODE
  ) {
    return escapeText(node.nodeValue ?? '');
  }

  return '';
}

function matchesSimplePath(node: Node, path: readonly string[], absolute: boolean): boolean {
  let current: Node | null = node;

  for (let index = path.length - 1; index >= 0; index -= 1) {
    const segment = path[index];
    if (segment === undefined || !isUnqualifiedElementNamed(current, segment)) {
      return false;
    }

    current = current?.parentNode ?? null;
  }

  return !absolute || current?.nodeType === current?.DOCUMENT_NODE;
}

function isUnqualifiedElementNamed(node: Node | null, localName: string): boolean {
  if (node === null || node.nodeType !== node.ELEMENT_NODE) {
    return false;
  }

  const nodeLocalName = node.localName ?? node.nodeName;
  return nodeLocalName === localName && (node.namespaceURI ?? '') === '';
}

function collectStringValue(node: Node): string {
  if (
    node.nodeType === node.TEXT_NODE
    || node.nodeType === node.CDATA_SECTION_NODE
    || node.nodeType === node.ATTRIBUTE_NODE
  ) {
    return node.nodeValue ?? '';
  }

  let value = '';
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child !== null) {
      value += collectStringValue(child);
    }
  }

  return value;
}