/**
 * XPath evaluator.
 *
 * Walks a parsed XPath AST and produces an XDM sequence given a dynamic
 * context.
 */

import type { Node } from '@xmldom/xmldom';

import { FOAR0001, XPDY0002, XPST0008, XPTY0004 } from '../../errors/codes.js';
import { XPathError } from '../../errors/XPathError.js';
import { createSequence, materialize } from '../../xdm/sequence.js';
import {
  createXdmBoolean,
  createXdmNode,
  createXdmNumber,
  createXdmString,
  type XdmAtomicValue,
  type XdmItem,
  type XdmNode,
  type XdmSequence,
} from '../../xdm/types.js';
import type { DynamicContext } from './context.js';
import type { PathExpression, StepExpression, XPathAst, XPathBinaryOperator } from '../parse/ast.js';

type SpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

export function evaluate(ast: XPathAst, context: DynamicContext): XdmSequence {
  return createSequence(evaluateExpression(ast, context));
}

function evaluateExpression(ast: XPathAst, context: DynamicContext): XdmItem[] {
  switch (ast.kind) {
    case 'binary':
      return evaluateBinaryExpression(ast.operator, ast.left, ast.right, context, ast.span);
    case 'contextItem':
      return [requireContextItem(context, ast.span)];
    case 'number':
      return [createXdmNumber(ast.value)];
    case 'string':
      return [createXdmString(ast.value)];
    case 'unary': {
      const operand = requireSingleNumber(evaluateExpression(ast.operand, context), ast.operand.span);
      return [createXdmNumber(-operand)];
    }
    case 'variable':
      return resolveVariableReference(ast.name, context, ast.span);
    case 'path':
      return evaluatePath(ast, context);
  }
}

function evaluateBinaryExpression(
  operator: XPathBinaryOperator,
  leftAst: XPathAst,
  rightAst: XPathAst,
  context: DynamicContext,
  span: SpanLike,
): XdmItem[] {
  if (operator === 'and') {
    const leftValue = effectiveBooleanValue(evaluateExpression(leftAst, context), leftAst.span);
    if (!leftValue) {
      return [createXdmBoolean(false)];
    }
    return [createXdmBoolean(effectiveBooleanValue(evaluateExpression(rightAst, context), rightAst.span))];
  }

  if (operator === 'or') {
    const leftValue = effectiveBooleanValue(evaluateExpression(leftAst, context), leftAst.span);
    if (leftValue) {
      return [createXdmBoolean(true)];
    }
    return [createXdmBoolean(effectiveBooleanValue(evaluateExpression(rightAst, context), rightAst.span))];
  }

  if (operator === '+' || operator === '-' || operator === '*' || operator === 'div' || operator === 'mod') {
    const left = requireSingleNumber(evaluateExpression(leftAst, context), leftAst.span);
    const right = requireSingleNumber(evaluateExpression(rightAst, context), rightAst.span);
    if ((operator === 'div' || operator === 'mod') && right === 0) {
      throw createXPathError(FOAR0001, 'Division by zero.', span);
    }

    switch (operator) {
      case '+':
        return [createXdmNumber(left + right)];
      case '-':
        return [createXdmNumber(left - right)];
      case '*':
        return [createXdmNumber(left * right)];
      case 'div':
        return [createXdmNumber(left / right)];
      case 'mod':
        return [createXdmNumber(left % right)];
    }
  }

  return [
    createXdmBoolean(
      compareGeneral(
        operator,
        evaluateExpression(leftAst, context),
        evaluateExpression(rightAst, context),
        span,
      ),
    ),
  ];
}

function evaluatePath(ast: PathExpression, context: DynamicContext): XdmNode[] {
  let nodes = ast.absolute
    ? [getRootNode(requireContextNode(context, ast.span))]
    : [requireContextNode(context, ast.span)];

  if (ast.absolute && ast.steps.length === 0) {
    return nodes;
  }

  for (const step of ast.steps) {
    nodes = applyStep(step, nodes, context);
  }

  return nodes;
}

function applyStep(step: StepExpression, input: readonly XdmNode[], context: DynamicContext): XdmNode[] {
  let selected = input.flatMap((item) => selectAxis(step, item.node));
  selected = selected.filter((item) => matchesNodeTest(step, item.node));

  for (const predicate of step.predicates) {
    const size = selected.length;
    selected = selected.filter((item, index) => {
      const predicateResult = evaluateExpression(predicate, {
        ...context,
        contextItem: item,
        contextPosition: index + 1,
        contextSize: size,
      });
      return predicateMatches(predicateResult, index + 1, predicate.span);
    });
  }

  return selected;
}

function selectAxis(step: StepExpression, node: Node): XdmNode[] {
  switch (step.axis) {
    case 'attribute':
      return collectAttributes(node).map(createXdmNode);
    case 'child':
      return collectChildren(node).map(createXdmNode);
    case 'descendant':
      return collectDescendants(node).map(createXdmNode);
    case 'descendant-or-self':
      return collectDescendantsOrSelf(node).map(createXdmNode);
    case 'self':
      return [createXdmNode(node)];
  }
}

function matchesNodeTest(step: StepExpression, node: Node): boolean {
  if (step.nodeTest.kind === 'wildcardTest') {
    return true;
  }
  if (step.nodeTest.kind === 'kindTest') {
    return step.nodeTest.name === 'node' ? true : node.nodeType === 3;
  }
  return node.nodeName === step.nodeTest.name;
}

function predicateMatches(result: readonly XdmItem[], position: number, span: SpanLike): boolean {
  if (result.length === 0) {
    return false;
  }

  if (result.length === 1 && result[0]?.xdmKind === 'atomic') {
    const atomic = result[0] as XdmAtomicValue;
    if (atomic.type === 'xs:double') {
      return atomic.value === position;
    }
    if (atomic.type === 'xs:boolean') {
      return atomic.value === true;
    }
  }

  return effectiveBooleanValue(result, span);
}

function requireSingleNumber(items: readonly XdmItem[], span: SpanLike): number {
  const item = items[0];
  if (
    items.length !== 1 ||
    item?.xdmKind !== 'atomic' ||
    (item as XdmAtomicValue).type !== 'xs:double'
  ) {
    throw createXPathError(XPTY0004, 'Expected a single numeric value.', span);
  }
  return (item as XdmAtomicValue).value as number;
}

function requireContextItem(context: DynamicContext, span: SpanLike): XdmItem {
  const items = coerceValueToItems(context.contextItem, span);
  const item = items[0];
  if (item === undefined) {
    throw createXPathError(XPDY0002, 'The XPath expression requires a context item.', span);
  }
  if (items.length !== 1) {
    throw createXPathError(XPTY0004, 'The XPath expression requires a single context item.', span);
  }
  return item;
}

function requireContextNode(context: DynamicContext, span: SpanLike): XdmNode {
  const item = requireContextItem(context, span);
  if (!isXdmNode(item)) {
    throw createXPathError(XPDY0002, 'The XPath expression requires a context node.', span);
  }
  return item;
}

function isXdmNode(value: unknown): value is XdmNode {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'xdmKind' in value &&
    'node' in value &&
    value.xdmKind === 'node'
  );
}

function isXdmAtomicValue(value: unknown): value is XdmAtomicValue {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'xdmKind' in value &&
    value.xdmKind === 'atomic'
  );
}

function isXdmSequence(value: unknown): value is XdmSequence {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'toArray' in value &&
    typeof (value as XdmSequence).toArray === 'function'
  );
}

function getRootNode(item: XdmNode): XdmNode {
  let current = item.node;
  while (current.parentNode !== null) {
    current = current.parentNode;
  }
  return createXdmNode(current);
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

function resolveVariableReference(name: string, context: DynamicContext, span: SpanLike): XdmItem[] {
  const value = context.variables.get(name) ?? context.variables.get(`{}${name}`);
  if (value === undefined) {
    throw createXPathError(XPST0008, `Unknown variable $${name}.`, span);
  }
  return coerceValueToItems(value, span);
}

function coerceValueToItems(value: unknown, span: SpanLike): XdmItem[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (isXdmSequence(value)) {
    return [...materialize(value)];
  }

  if (isXdmNode(value) || isXdmAtomicValue(value)) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => coerceValueToItems(entry, span));
  }

  if (typeof value === 'boolean') {
    return [createXdmBoolean(value)];
  }

  if (typeof value === 'number') {
    return [createXdmNumber(value)];
  }

  if (typeof value === 'string') {
    return [createXdmString(value)];
  }

  throw createXPathError(XPTY0004, 'Unsupported external value in the dynamic context.', span);
}

function effectiveBooleanValue(items: readonly XdmItem[], span: SpanLike): boolean {
  if (items.length === 0) {
    return false;
  }

  if (items.every((item) => item.xdmKind === 'node')) {
    return true;
  }

  if (items.length !== 1 || items[0]?.xdmKind !== 'atomic') {
    throw createXPathError(XPTY0004, 'Expected an effective boolean value.', span);
  }

  const atomic = items[0] as XdmAtomicValue;
  if (atomic.type === 'xs:boolean') {
    return atomic.value as boolean;
  }
  if (atomic.type === 'xs:double') {
    return (atomic.value as number) !== 0 && !Number.isNaN(atomic.value as number);
  }
  return (atomic.value as string).length > 0;
}

function compareGeneral(
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=',
  leftItems: readonly XdmItem[],
  rightItems: readonly XdmItem[],
  span: SpanLike,
): boolean {
  const leftValues = atomizeItems(leftItems);
  const rightValues = atomizeItems(rightItems);

  for (const left of leftValues) {
    for (const right of rightValues) {
      if (compareAtomicValues(operator, left, right, span)) {
        return true;
      }
    }
  }

  return false;
}

function atomizeItems(items: readonly XdmItem[]): readonly (boolean | number | string)[] {
  return items.map((item) => {
    if (item.xdmKind === 'node') {
      return (item as XdmNode).node.textContent ?? '';
    }

    return (item as XdmAtomicValue).value;
  });
}

function compareAtomicValues(
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=',
  left: boolean | number | string,
  right: boolean | number | string,
  span: SpanLike,
): boolean {
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    if (typeof left !== 'boolean' || typeof right !== 'boolean') {
      throw createXPathError(XPTY0004, 'Boolean comparisons require boolean operands.', span);
    }

    switch (operator) {
      case '=':
        return left === right;
      case '!=':
        return left !== right;
      default:
        throw createXPathError(XPTY0004, 'Relational comparison is not defined for booleans in this slice.', span);
    }
  }

  const numericLeft = coerceNumericValue(left);
  const numericRight = coerceNumericValue(right);
  if (numericLeft !== undefined && numericRight !== undefined) {
    return compareScalars(operator, numericLeft, numericRight);
  }

  return compareScalars(operator, String(left), String(right));
}

function coerceNumericValue(value: number | string): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function compareScalars<T extends number | string>(
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=',
  left: T,
  right: T,
): boolean {
  switch (operator) {
    case '=':
      return left === right;
    case '!=':
      return left !== right;
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '>':
      return left > right;
    case '>=':
      return left >= right;
  }
}

function createXPathError(code: string, message: string, span: SpanLike): XPathError {
  return new XPathError(code, message, {
    source: '<xpath>',
    line: span.line,
    column: span.column,
    offset: span.start,
    endLine: span.endLine,
    endColumn: span.endColumn,
    endOffset: span.end,
  });
}
