import type { Node } from '@xmldom/xmldom';

import { createXdmNode, type XdmItem, type XdmNode } from '../../xdm/types.js';
import type { DynamicContext } from '../../xpath/eval/context.js';
import { evaluate } from '../../xpath/eval/evaluator.js';
import type { XPathAst } from '../../xpath/parse/ast.js';
import type { Instruction } from '../compile/ir.js';

export function renderNumberInstruction(
  instruction: Extract<Instruction, { readonly kind: 'number' }>,
  context: DynamicContext,
): string {
  const node = asXdmNode(context.contextItem)?.node;
  if (node === undefined) {
    return '';
  }

  const counts = getNumberingCounts(
    node,
    instruction.count,
    context.staticContext,
    instruction.level,
  );
  if (counts.length === 0) {
    return '';
  }

  return formatNumberCounts(counts, instruction.format);
}

function getNumberingCounts(
  node: Node,
  countPattern: XPathAst,
  staticContext: DynamicContext['staticContext'],
  level: 'single' | 'multiple' | 'any',
): readonly number[] {
  if (level === 'any') {
    return [countAnyPreceding(node, countPattern, staticContext) + 1];
  }

  if (level === 'multiple') {
    const chain: Node[] = [];
    for (let current: Node | null = node; current !== null; current = current.parentNode) {
      if (matchesNumberPattern(current, countPattern, staticContext)) {
        chain.push(current);
      }
    }

    chain.reverse();
    return chain.map((current) => countSinglePosition(current, countPattern, staticContext));
  }

  return [countSinglePosition(node, countPattern, staticContext)];
}

function countSinglePosition(
  node: Node,
  countPattern: XPathAst,
  staticContext: DynamicContext['staticContext'],
): number {
  const parent = node.parentNode;
  if (parent === null) {
    return 1;
  }

  let position = 0;
  for (const sibling of getChildNodes(parent)) {
    if (!matchesNumberPattern(sibling, countPattern, staticContext)) {
      continue;
    }

    position += 1;
    if (sibling === node) {
      return position;
    }
  }

  return position === 0 ? 1 : position;
}

function countAnyPreceding(
  node: Node,
  countPattern: XPathAst,
  staticContext: DynamicContext['staticContext'],
): number {
  const root = node.nodeType === node.DOCUMENT_NODE ? node : (node.ownerDocument ?? node);
  let count = 0;
  let finished = false;

  const visit = (current: Node): void => {
    if (finished) {
      return;
    }

    if (current === node) {
      finished = true;
      return;
    }

    if (matchesNumberPattern(current, countPattern, staticContext)) {
      count += 1;
    }

    for (const child of getChildNodes(current)) {
      visit(child);
      if (finished) {
        return;
      }
    }
  };

  visit(root);
  return count;
}

function matchesNumberPattern(
  node: Node,
  pattern: XPathAst,
  staticContext: DynamicContext['staticContext'],
): boolean {
  const contextNode =
    node.nodeType === node.DOCUMENT_NODE ? node : (node.parentNode ?? node.ownerDocument ?? node);
  const context = {
    staticContext,
    contextItem: createXdmNode(contextNode),
    contextPosition: 1,
    contextSize: 1,
    variables: new Map(),
  } satisfies DynamicContext;

  try {
    return [...evaluate(pattern, context)].some((item) => asXdmNode(item)?.node === node);
  } catch {
    return false;
  }
}

function formatNumberCounts(counts: readonly number[], format: string): string {
  if (counts.length === 0) {
    return '';
  }

  if (counts.length === 1) {
    return formatSingleCount(counts[0]!, format);
  }

  const formatParts = format.split('.').filter((part) => part.length > 0);
  const parts = counts.map((count, index) =>
    formatSingleCount(count, formatParts[index] ?? formatParts.at(-1) ?? '1'),
  );
  return parts.join('.');
}

function formatSingleCount(count: number, format: string): string {
  if (format === 'i') {
    return toRomanNumeral(count).toLowerCase();
  }

  if (format === 'I') {
    return toRomanNumeral(count).toUpperCase();
  }

  return String(count);
}

function toRomanNumeral(value: number): string {
  if (value <= 0) {
    return '';
  }

  const symbols: readonly [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let remaining = Math.floor(value);
  let result = '';
  for (const [threshold, symbol] of symbols) {
    while (remaining >= threshold) {
      result += symbol;
      remaining -= threshold;
    }
  }

  return result;
}

function getChildNodes(node: Node): readonly Node[] {
  const children: Node[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child !== null) {
      children.push(child);
    }
  }

  return children;
}

function asXdmNode(item: unknown): XdmNode | undefined {
  return typeof item === 'object' && item !== null && (item as XdmItem).xdmKind === 'node'
    ? (item as XdmNode)
    : undefined;
}
