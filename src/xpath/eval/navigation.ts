import type { Node } from '@xmldom/xmldom';

import { createXdmNode, type XdmNode } from '../../xdm/types.js';
import { getNamespaceDeclarationPrefix } from './names.js';
import type { StepExpression } from '../parse/ast.js';

export function getRootNode(item: XdmNode): XdmNode {
  let current = item.node;
  let parent = getParentNode(current);
  while (parent !== null) {
    current = parent;
    parent = getParentNode(current);
  }
  return createXdmNode(current);
}

export function selectAxis(step: StepExpression, node: Node): XdmNode[] {
  switch (step.axis) {
    case 'ancestor':
      return collectAncestors(node, false).map(createXdmNode);
    case 'ancestor-or-self':
      return collectAncestors(node, true).map(createXdmNode);
    case 'attribute':
      return collectAttributes(node).map(createXdmNode);
    case 'child':
      return collectChildren(node).map(createXdmNode);
    case 'descendant':
      return collectDescendants(node).map(createXdmNode);
    case 'descendant-or-self':
      return collectDescendantsOrSelf(node).map(createXdmNode);
    case 'following':
      return collectFollowingNodes(node).map(createXdmNode);
    case 'following-sibling':
      return collectFollowingSiblings(node).map(createXdmNode);
    case 'namespace':
      return collectNamespaceNodes(node).map(createXdmNode);
    case 'parent':
      return collectParent(node).map(createXdmNode);
    case 'preceding':
      return collectPrecedingNodes(node).map(createXdmNode);
    case 'preceding-sibling':
      return collectPrecedingSiblings(node).map(createXdmNode);
    case 'self':
      return [createXdmNode(node)];
  }
}

export function compareNodeOrder(left: Node, right: Node): number {
  if (left === right) {
    return 0;
  }

  const leftPath = getDocumentOrderPath(left);
  const rightPath = getDocumentOrderPath(right);
  const length = Math.min(leftPath.length, rightPath.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftPath[index]!;
    const rightPart = rightPath[index]!;
    if (leftPart !== rightPart) {
      return leftPart < rightPart ? -1 : 1;
    }
  }

  return leftPath.length < rightPath.length ? -1 : 1;
}

export function normalizeNodeSequence(items: readonly XdmNode[]): XdmNode[] {
  const uniqueNodes = new Map<Node, XdmNode>();

  for (const item of items) {
    if (!uniqueNodes.has(item.node)) {
      uniqueNodes.set(item.node, item);
    }
  }

  return [...uniqueNodes.values()].sort((left, right) => compareNodeOrder(left.node, right.node));
}

function getParentNode(node: Node): Node | null {
  const ownerElement = node as Node & { ownerElement?: Node | null };
  return node.parentNode ?? ownerElement.ownerElement ?? null;
}

function collectAttributes(node: Node): Node[] {
  const attributes = (node as Node & {
    attributes?: { readonly length: number; item(index: number): Node | null };
  }).attributes;
  if (attributes === undefined) {
    return [];
  }

  const items: Node[] = [];
  for (let index = 0; index < attributes.length; index += 1) {
    const attribute = attributes.item(index);
    if (attribute !== null) {
      items.push(attribute);
    }
  }
  return items;
}

function collectNamespaceNodes(node: Node): Node[] {
  const items: Node[] = [];
  const seenPrefixes = new Set<string>();
  let current: Node | null = node;

  while (current !== null) {
    for (const attribute of collectAttributes(current)) {
      const prefix = getNamespaceDeclarationPrefix(attribute);
      if (prefix === undefined || seenPrefixes.has(prefix)) {
        continue;
      }
      seenPrefixes.add(prefix);
      items.push(attribute);
    }
    current = current.parentNode;
  }

  return items;
}

function collectChildren(node: Node): Node[] {
  const items: Node[] = [];
  const children = node.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const child = children.item(index);
    if (child !== null) {
      items.push(child);
    }
  }
  return items;
}

function collectDescendants(node: Node): Node[] {
  const items: Node[] = [];
  for (const child of collectChildren(node)) {
    items.push(child);
    items.push(...collectDescendants(child));
  }
  return items;
}

function collectDescendantsOrSelf(node: Node): Node[] {
  return [node, ...collectDescendants(node)];
}

function collectParent(node: Node): Node[] {
  const parent = getParentNode(node);
  return parent === null ? [] : [parent];
}

function collectAncestors(node: Node, includeSelf: boolean): Node[] {
  const items: Node[] = [];

  if (includeSelf) {
    items.push(node);
  }

  let current = getParentNode(node);
  while (current !== null) {
    items.push(current);
    current = getParentNode(current);
  }

  return items;
}

function collectFollowingSiblings(node: Node): Node[] {
  const parent = getParentNode(node);
  if (parent === null) {
    return [];
  }

  const siblings = parent.childNodes;
  const items: Node[] = [];
  let seenCurrent = false;
  for (let index = 0; index < siblings.length; index += 1) {
    const sibling = siblings.item(index);
    if (sibling === null) {
      continue;
    }
    if (seenCurrent) {
      items.push(sibling);
      continue;
    }
    if (sibling === node) {
      seenCurrent = true;
    }
  }

  return items;
}

function collectPrecedingSiblings(node: Node): Node[] {
  const parent = getParentNode(node);
  if (parent === null) {
    return [];
  }

  const siblings = parent.childNodes;
  const items: Node[] = [];
  for (let index = 0; index < siblings.length; index += 1) {
    const sibling = siblings.item(index);
    if (sibling === null) {
      continue;
    }
    if (sibling === node) {
      break;
    }
    items.push(sibling);
  }

  return items.reverse();
}

function collectFollowingNodes(node: Node): Node[] {
  const items: Node[] = [];
  let current: Node | null = node;

  while (current !== null && getParentNode(current) !== null) {
    for (const sibling of collectFollowingSiblings(current)) {
      items.push(sibling);
      items.push(...collectDescendants(sibling));
    }
    current = getParentNode(current);
  }

  return items;
}

function collectPrecedingNodes(node: Node): Node[] {
  const items: Node[] = [];
  let current: Node | null = node;

  while (current !== null && getParentNode(current) !== null) {
    for (const sibling of collectPrecedingSiblings(current)) {
      items.push(...collectDescendantsOrSelfReverse(sibling));
    }
    current = getParentNode(current);
  }

  return items;
}

function collectDescendantsOrSelfReverse(node: Node): Node[] {
  const items: Node[] = [];
  for (const child of collectChildren(node).reverse()) {
    items.push(...collectDescendantsOrSelfReverse(child));
  }
  items.push(node);
  return items;
}

function getDocumentOrderPath(node: Node): readonly number[] {
  const path: number[] = [];
  let current: Node | null = node;

  while (current !== null) {
    path.unshift(getNodeSiblingIndex(current));
    current = current.parentNode;
  }

  return path;
}

function getNodeSiblingIndex(node: Node): number {
  const parent = node.parentNode;
  if (parent === null) {
    return 0;
  }

  const siblings = parent.childNodes;
  for (let index = 0; index < siblings.length; index += 1) {
    if (siblings.item(index) === node) {
      return index;
    }
  }

  return 0;
}