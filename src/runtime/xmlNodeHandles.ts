import type { Node } from '@xmldom/xmldom';

import { XTSE0010 } from '../errors/codes.js';
import { XsltError } from '../errors/index.js';
import type { XmlNodeHandle } from '../processor/types.js';

export function createXmlNodeHandle(node: Node, documentUri: string): XmlNodeHandle {
  return {
    documentUri,
    kind: getXmlNodeHandleKind(node),
    path: getXmlNodePath(node),
  };
}

function getXmlNodeHandleKind(node: Node): XmlNodeHandle['kind'] {
  switch (node.nodeType) {
    case node.DOCUMENT_NODE:
      return 'document';
    case node.ELEMENT_NODE:
      return 'element';
    case node.ATTRIBUTE_NODE:
      return 'attribute';
    case node.TEXT_NODE:
      return 'text';
    case node.COMMENT_NODE:
      return 'comment';
    case node.PROCESSING_INSTRUCTION_NODE:
      return 'pi';
    default:
      throw new XsltError(
        XTSE0010,
        `Node type ${node.nodeType} cannot be represented as an XML trace handle.`,
      );
  }
}

function getXmlNodePath(node: Node): string {
  if (node.nodeType === node.DOCUMENT_NODE) {
    return '/';
  }

  if (node.nodeType === node.ATTRIBUTE_NODE) {
    const ownerElement = (node as Node & { ownerElement?: Node | null }).ownerElement;
    if (ownerElement === undefined || ownerElement === null) {
      return `/@${node.nodeName}`;
    }

    return `${getXmlNodePath(ownerElement)}/@${node.nodeName}`;
  }

  const parent = node.parentNode;
  const basePath = parent === null ? '' : getXmlNodePath(parent);
  if (basePath === '' || basePath === '/') {
    return `/${getXmlNodePathSegment(node)}`;
  }

  return `${basePath}/${getXmlNodePathSegment(node)}`;
}

function getXmlNodePathSegment(node: Node): string {
  if (node.nodeType === node.ELEMENT_NODE) {
    return `${node.nodeName}[${countPrecedingMatchingSiblings(node) + 1}]`;
  }

  if (node.nodeType === node.TEXT_NODE) {
    return `text()[${countPrecedingMatchingSiblings(node) + 1}]`;
  }

  if (node.nodeType === node.COMMENT_NODE) {
    return `comment()[${countPrecedingMatchingSiblings(node) + 1}]`;
  }

  if (node.nodeType === node.PROCESSING_INSTRUCTION_NODE) {
    return `processing-instruction(${JSON.stringify(node.nodeName)})[${countPrecedingMatchingSiblings(node) + 1}]`;
  }

  throw new XsltError(
    XTSE0010,
    `Node type ${node.nodeType} cannot be represented as an XML trace path segment.`,
  );
}

function countPrecedingMatchingSiblings(node: Node): number {
  let count = 0;
  let sibling = node.previousSibling;

  while (sibling !== null) {
    if (isSamePathKind(sibling, node)) {
      count += 1;
    }

    sibling = sibling.previousSibling;
  }

  return count;
}

function isSamePathKind(left: Node, right: Node): boolean {
  if (left.nodeType !== right.nodeType) {
    return false;
  }

  if (left.nodeType === left.ELEMENT_NODE || left.nodeType === left.PROCESSING_INSTRUCTION_NODE) {
    return left.nodeName === right.nodeName;
  }

  return true;
}