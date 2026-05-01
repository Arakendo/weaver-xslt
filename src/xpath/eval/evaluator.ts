/**
 * XPath evaluator.
 *
 * Walks a parsed XPath AST and produces an XDM sequence given a dynamic
 * context.
 */

import type { Node } from '@xmldom/xmldom';

import { FOAR0001, FORG0006, FOTY0014, XPST0017, XPTY0004, XPTY0019 } from '../../errors/codes.js';
import { XPathError } from '../../errors/XPathError.js';
import type { ErrorDetails } from '../../errors/XdmError.js';
import { createSequence } from '../../xdm/sequence.js';
import {
  createXdmArray,
  createXdmBoolean,
  createXdmNumber,
  createXdmString,
  type XdmAtomicValue,
  type XdmItem,
  type XdmNode,
  type XdmSequence,
} from '../../xdm/types.js';
import { createComparisonHelpers } from './comparisonHelpers.js';
import { createContextHelpers } from './contextHelpers.js';
import type { DynamicContext } from './context.js';
import { compareNodeOrder, getRootNode, normalizeNodeSequence, selectAxis } from './navigation.js';
import {
  getNamespaceDeclarationPrefix,
  getNamespaceNodePrefix,
  getNodeLocalName,
  getNodePrefix,
  matchesQualifiedNodeName,
} from './names.js';
import { createBuiltinFunctionEvaluator } from './builtinFunctions.js';
import type { FilterExpression, PathExpression, PathSegment, StepExpression, XPathAst, XPathBinaryOperator } from '../parse/ast.js';

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

export function evaluateEffectiveBooleanValue(ast: XPathAst, context: DynamicContext): boolean {
  return effectiveBooleanValue(evaluateExpression(ast, context), ast.span);
}

const {
  requireContextItem,
  requireContextNode,
  isXdmNode,
  resolveVariableReference,
} = createContextHelpers({
  createXPathError,
  describeItemsType,
});

function evaluateExpression(ast: XPathAst, context: DynamicContext): XdmItem[] {
  switch (ast.kind) {
    case 'array':
      return [createXdmArray(ast.members.map((member) => evaluateExpression(member, context)))];
    case 'binary':
      return evaluateBinaryExpression(ast.operator, ast.left, ast.right, context, ast.span);
    case 'contextItem':
      return [requireContextItem(context, ast.span)];
    case 'filter':
      return evaluateFilterExpression(ast, context);
    case 'for':
      return evaluateForExpression(ast.bindings, ast.returnExpr, context);
    case 'functionCall':
      return evaluateFunctionCall(ast.callee, ast.arguments, context, ast.span);
    case 'if':
      return effectiveBooleanValue(evaluateExpression(ast.test, context), ast.test.span)
        ? evaluateExpression(ast.thenBranch, context)
        : evaluateExpression(ast.elseBranch, context);
    case 'quantified':
      return [
        createXdmBoolean(
          evaluateQuantifiedExpression(ast.quantifier, ast.bindings, ast.satisfiesExpr, context),
        ),
      ];
    case 'let':
      return evaluateLetExpression(ast.bindings, ast.returnExpr, context);
    case 'number':
      return [createNumberLiteralValue(ast.value, ast.lexeme)];
    case 'string':
      return [createXdmString(ast.value)];
    case 'sequence':
      return ast.items.flatMap((item) => evaluateExpression(item, context));
    case 'unary': {
      const operand = requireSingleNumber(evaluateExpression(ast.operand, context), ast.operand.span);
      if (ast.operand.kind === 'number' && isDecimalLiteralLexeme(ast.operand.lexeme)) {
        return [createXdmNumber(
          ast.operator === '-' ? -operand : operand,
          normalizeSignedDecimalLiteralLexeme(ast.operator, ast.operand.lexeme),
        )];
      }
      return [createXdmNumber(ast.operator === '-' ? -operand : operand)];
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
  if (operator === '!') {
    const leftItems = evaluateExpression(leftAst, context);
    const size = leftItems.length;
    return leftItems.flatMap((item, index) =>
      evaluateExpression(rightAst, {
        ...context,
        contextItem: item,
        contextPosition: index + 1,
        contextSize: size,
      }));
  }

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

  if (operator === '+' || operator === '-' || operator === '*' || operator === 'div' || operator === 'idiv' || operator === 'mod') {
    const left = requireSingleNumber(evaluateExpression(leftAst, context), leftAst.span);
    const right = requireSingleNumber(evaluateExpression(rightAst, context), rightAst.span);
    if ((operator === 'idiv' || operator === 'mod') && right === 0) {
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
      case 'idiv':
        return [createXdmNumber(Math.trunc(left / right))];
      case 'mod':
        return [createXdmNumber(left % right)];
    }
  }

  if (operator === 'to') {
    return evaluateRangeExpression(leftAst, rightAst, context);
  }

  if (operator === '||') {
    return [createXdmString(
      evaluateConcatOperandString(leftAst, context, span)
      + evaluateConcatOperandString(rightAst, context, span),
    )];
  }

  if (operator === '|') {
    return normalizeNodeSequence([
      ...requireNodeSequence(evaluateExpression(leftAst, context), leftAst.span),
      ...requireNodeSequence(evaluateExpression(rightAst, context), rightAst.span),
    ]);
  }

  if (operator === 'intersect') {
    const left = requireNodeSequence(evaluateExpression(leftAst, context), leftAst.span);
    const right = new Set(requireNodeSequence(evaluateExpression(rightAst, context), rightAst.span).map((item) => item.node));
    return normalizeNodeSequence(left.filter((item) => right.has(item.node)));
  }

  if (operator === 'except') {
    const right = new Set(requireNodeSequence(evaluateExpression(rightAst, context), rightAst.span).map((item) => item.node));
    return normalizeNodeSequence(
      requireNodeSequence(evaluateExpression(leftAst, context), leftAst.span).filter((item) => !right.has(item.node)),
    );
  }

  if (operator === 'eq' || operator === 'ne' || operator === 'lt' || operator === 'le' || operator === 'gt' || operator === 'ge') {
    return compareValue(
      operator,
      evaluateExpression(leftAst, context),
      evaluateExpression(rightAst, context),
      span,
    );
  }

  if (operator === 'is' || operator === '<<' || operator === '>>') {
    return compareNodes(
      operator,
      evaluateExpression(leftAst, context),
      evaluateExpression(rightAst, context),
      span,
    );
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

function evaluateConcatOperandString(ast: XPathAst, context: DynamicContext, span: SpanLike): string {
  const items = evaluateExpression(ast, context);
  if (items.length === 0) {
    return '';
  }

  if (items.length !== 1) {
    throw createXPathError(XPTY0004, 'Operator || requires empty-sequence() or a singleton item operand.', span, {
      expectedType: 'empty-sequence() or singleton item()',
      actualType: describeItemsType(items),
    });
  }

  return coerceItemToStringValue(items[0]!, span);
}

function coerceItemToStringValue(item: XdmItem, span: SpanLike): string {
  if (item.xdmKind === 'node') {
    return (item as XdmNode).node.textContent ?? '';
  }

  if (item.xdmKind !== 'atomic') {
    throw createXPathError(FOTY0014, 'The string value is not defined for this item kind.', span, {
      expectedType: 'node() or atomic value',
      actualType: describeItemType(item),
    });
  }

  const atomic = item as XdmAtomicValue;

  if (atomic.type === 'xs:boolean') {
    return atomic.value === true ? 'true' : 'false';
  }

  if (atomic.type === 'xs:double') {
    if (atomic.lexicalForm !== undefined) {
      return atomic.lexicalForm;
    }

    const value = atomic.value as number;
    if (Number.isNaN(value)) {
      return 'NaN';
    }

    if (value === Number.POSITIVE_INFINITY) {
      return 'INF';
    }

    if (value === Number.NEGATIVE_INFINITY) {
      return '-INF';
    }

    if (Object.is(value, -0) || value === 0) {
      return '0';
    }

    const absolute = Math.abs(value);
    if (absolute >= 1_000_000 || absolute < 0.000001) {
      return value
        .toExponential()
        .replace('e', 'E')
        .replace(/E\+/, 'E')
        .replace(/(\.\d*?)0+E/, '$1E')
        .replace(/\.E/, 'E')
        .replace(/E(-?)0+(\d+)/, 'E$1$2');
    }
  }

  return String(atomic.value);
}

function evaluateRangeExpression(
  leftAst: XPathAst,
  rightAst: XPathAst,
  context: DynamicContext,
): XdmItem[] {
  const start = requireSingleInteger(evaluateExpression(leftAst, context), leftAst.span, 'Range expression start');
  const end = requireSingleInteger(evaluateExpression(rightAst, context), rightAst.span, 'Range expression end');

  if (start > end) {
    return [];
  }

  const items: XdmItem[] = [];
  for (let value = start; value <= end; value += 1) {
    items.push(createXdmNumber(value));
  }
  return items;
}

function evaluateLetExpression(
  bindings: readonly { name: string; value: XPathAst }[],
  returnExpr: XPathAst,
  context: DynamicContext,
): XdmItem[] {
  const variables = new Map(context.variables);

  for (const binding of bindings) {
    variables.set(binding.name, evaluateExpression(binding.value, { ...context, variables }));
  }

  return evaluateExpression(returnExpr, {
    ...context,
    variables,
  });
}

function evaluateForExpression(
  bindings: readonly { name: string; value: XPathAst }[],
  returnExpr: XPathAst,
  context: DynamicContext,
): XdmItem[] {
  return evaluateFlowBindings(bindings, context, (variables) =>
    evaluateExpression(returnExpr, {
      ...context,
      variables,
    }),
  );
}

function evaluateQuantifiedExpression(
  quantifier: 'some' | 'every',
  bindings: readonly { name: string; value: XPathAst }[],
  satisfiesExpr: XPathAst,
  context: DynamicContext,
): boolean {
  if (quantifier === 'some') {
    return evaluateFlowBindings(bindings, context, (variables) => {
      const result = effectiveBooleanValue(
        evaluateExpression(satisfiesExpr, {
          ...context,
          variables,
        }),
        satisfiesExpr.span,
      );
      return result ? [createXdmBoolean(true)] : [];
    }).length > 0;
  }

  let sawBinding = false;
  const failures = evaluateFlowBindings(bindings, context, (variables) => {
    sawBinding = true;
    const result = effectiveBooleanValue(
      evaluateExpression(satisfiesExpr, {
        ...context,
        variables,
      }),
      satisfiesExpr.span,
    );
    return result ? [] : [createXdmBoolean(false)];
  });

  return sawBinding ? failures.length === 0 : true;
}

function evaluateFlowBindings(
  bindings: readonly { name: string; value: XPathAst }[],
  context: DynamicContext,
  project: (variables: ReadonlyMap<string, unknown>) => XdmItem[],
  variables = new Map(context.variables),
  index = 0,
): XdmItem[] {
  if (index >= bindings.length) {
    return project(variables);
  }

  const binding = bindings[index]!;
  const input = evaluateExpression(binding.value, {
    ...context,
    variables,
  });
  const results: XdmItem[] = [];
  for (const item of input) {
    const nextVariables = new Map(variables);
    nextVariables.set(binding.name, [item]);
    results.push(...evaluateFlowBindings(bindings, context, project, nextVariables, index + 1));
  }
  return results;
}

function compareNodes(
  operator: 'is' | '<<' | '>>',
  leftItems: readonly XdmItem[],
  rightItems: readonly XdmItem[],
  span: SpanLike,
): XdmItem[] {
  const left = requireSingletonNode(leftItems, span, 'left');
  const right = requireSingletonNode(rightItems, span, 'right');

  if (left === undefined || right === undefined) {
    return [];
  }

  if (operator === 'is') {
    return [createXdmBoolean(left.node === right.node)];
  }

  const order = compareNodeOrder(left.node, right.node);
  return [createXdmBoolean(operator === '<<' ? order < 0 : order > 0)];
}

function compareValue(
  operator: 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge',
  leftItems: readonly XdmItem[],
  rightItems: readonly XdmItem[],
  span: SpanLike,
): XdmItem[] {
  const leftValue = atomizeSingleton(leftItems, span);
  const rightValue = atomizeSingleton(rightItems, span);

  if (leftValue === undefined || rightValue === undefined) {
    return [];
  }

  return [createXdmBoolean(compareValueOperands(operator, leftValue, rightValue, span))];
}

function evaluateFilterExpression(ast: FilterExpression, context: DynamicContext): XdmItem[] {
  let items = evaluateExpression(ast.base, context);

  for (const predicate of ast.predicates) {
    const size = items.length;
    items = items.filter((item, index) => {
      const predicateResult = evaluateExpression(predicate, {
        ...context,
        contextItem: item,
        contextPosition: index + 1,
        contextSize: size,
      });
      return predicateMatches(predicateResult, index + 1, predicate.span);
    });
  }

  return items;
}

function evaluatePath(ast: PathExpression, context: DynamicContext): XdmItem[] {
  let items: XdmItem[] = ast.absolute
    ? [getRootNode(requireContextNode(context, ast.span))]
    : ast.base === undefined
      ? [requireContextNode(context, ast.span)]
      : evaluateExpression(ast.base, context);

  if (ast.absolute && ast.steps.length === 0) {
    return items;
  }

  for (const step of ast.steps) {
    items = applyPathSegment(step, items, context);
  }

  return items;
}

function applyPathSegment(segment: PathSegment, input: readonly XdmItem[], context: DynamicContext): XdmItem[] {
  if (segment.kind === 'step') {
    return applyStep(segment, requireNodeSequence(input, segment.span), context);
  }

  if (segment.kind === 'functionCall') {
    validateFunctionCallSignature(segment.callee.includes(':') ? segment.callee : `fn:${segment.callee}`, segment.arguments.length, segment.span);
  }
  return applyExpressionPathSegment(segment, requireNodeSequence(input, segment.span), context);
}

function applyExpressionPathSegment(
  segment: XPathAst,
  input: readonly XdmNode[],
  context: DynamicContext,
): XdmItem[] {
  const size = input.length;
  return input.flatMap((item, index) =>
    evaluateExpression(segment, {
      ...context,
      contextItem: item,
      contextPosition: index + 1,
      contextSize: size,
    }),
  );
}

function requireNodeSequence(items: readonly XdmItem[], span: SpanLike): XdmNode[] {
  const nodes: XdmNode[] = [];

  for (const item of items) {
    if (!isXdmNode(item)) {
      throw createXPathError(XPTY0019, 'Path expressions require node inputs.', span, {
        expectedType: 'node()*',
        actualType: describeItemsType(items),
      });
    }
    nodes.push(item);
  }

  return nodes;
}

function applyStep(step: StepExpression, input: readonly XdmNode[], context: DynamicContext): XdmNode[] {
  let selected = input.flatMap((item) => selectAxis(step, item.node));
  selected = selected.filter((item) => matchesNodeTest(step, item.node, context));

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

  return normalizeNodeSequence(selected);
}

function matchesNodeTest(step: StepExpression, node: Node, context: DynamicContext): boolean {
  if (step.nodeTest.kind === 'wildcardTest') {
    if (step.axis === 'namespace') {
      if (step.nodeTest.prefix !== undefined) {
        return false;
      }
      return step.nodeTest.localName === undefined || getNamespaceNodePrefix(node) === step.nodeTest.localName;
    }
    if (!matchesPrincipalNodeKind(step, node)) {
      return false;
    }
    if (step.nodeTest.prefix !== undefined) {
      return getNodePrefix(node) === step.nodeTest.prefix;
    }
    return step.nodeTest.localName === undefined || getNodeLocalName(node) === step.nodeTest.localName;
  }
  if (step.nodeTest.kind === 'kindTest') {
    if (step.nodeTest.name === 'node') {
      return true;
    }
    if (step.nodeTest.name === 'comment') {
      return node.nodeType === 8;
    }
    if (step.nodeTest.name === 'text') {
      return node.nodeType === 3;
    }
    return node.nodeType === 7;
  }
  if (step.axis === 'namespace') {
    return getNamespaceNodePrefix(node) === step.nodeTest.name;
  }
  if (!matchesPrincipalNodeKind(step, node)) {
    return false;
  }
  return matchesQualifiedNodeName(step.nodeTest.name, node, context.staticContext, step.axis === 'attribute');
}

function matchesPrincipalNodeKind(step: StepExpression, node: Node): boolean {
  if (step.axis === 'attribute') {
    return node.nodeType === 2;
  }

  if (step.axis === 'namespace') {
    return getNamespaceDeclarationPrefix(node) !== undefined;
  }

  return node.nodeType === 1;
}

function predicateMatches(result: readonly XdmItem[], position: number, span: SpanLike): boolean {
  if (result.length === 0) {
    return false;
  }

  if (result.length === 1 && result[0]?.xdmKind === 'atomic') {
    const atomic = result[0] as XdmAtomicValue;
    if (atomic.type === 'xs:double' || atomic.type === 'xs:integer') {
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
    ((item as XdmAtomicValue).type !== 'xs:double' && (item as XdmAtomicValue).type !== 'xs:integer')
  ) {
    throw createXPathError(XPTY0004, 'Expected a single numeric value.', span, {
      expectedType: 'xs:double or xs:integer',
      actualType: describeItemsType(items),
    });
  }
  return (item as XdmAtomicValue).value as number;
}

function requireSingleInteger(items: readonly XdmItem[], span: SpanLike, description: string): number {
  const value = requireSingleNumber(items, span);
  if (!Number.isInteger(value)) {
    throw createXPathError(XPTY0004, `${description} must be an integer in this slice.`, span, {
      expectedType: 'xs:integer',
      actualType: 'xs:double',
    });
  }
  return value;
}

function effectiveBooleanValue(items: readonly XdmItem[], span: SpanLike): boolean {
  if (items.length === 0) {
    return false;
  }

  if (items[0]?.xdmKind === 'node') {
    return true;
  }

  if (items.length !== 1 || items[0]?.xdmKind !== 'atomic') {
    throw createXPathError(FORG0006, 'Effective boolean value is not defined for this sequence.', span, {
      expectedType: 'node(), xs:boolean, xs:string, or xs:double',
      actualType: describeItemsType(items),
    });
  }

  const atomic = items[0] as XdmAtomicValue;
  if (atomic.type === 'xs:boolean') {
    return atomic.value as boolean;
  }
  if (atomic.type === 'xs:double' || atomic.type === 'xs:integer') {
    return (atomic.value as number) !== 0 && !Number.isNaN(atomic.value as number);
  }
  if (atomic.type === 'xs:string') {
    return (atomic.value as string).length > 0;
  }

  throw createXPathError(FORG0006, 'Effective boolean value is not defined for this atomic type.', span, {
    expectedType: 'node(), xs:boolean, xs:string, xs:double, or xs:integer',
    actualType: atomic.type,
  });
}

const {
  compareGeneral,
  atomizeItems,
  atomizedNumericValues,
  atomizedComparableValues,
  compareComparableValues,
  deepEqualSequences,
  atomizeSingleton,
  compareValueOperands,
} = createComparisonHelpers({
  createXPathError,
  effectiveBooleanValue,
  describeItemsType,
});

const { evaluateFunctionCall } = createBuiltinFunctionEvaluator({
  evaluateExpression,
  requireArity,
  throwArityError,
  createXPathError,
  describeItemsType,
  describeItemType,
  effectiveBooleanValue,
  requireContextItem,
  requireSingleNumber,
  requireSingleInteger,
  atomizedNumericValues,
  atomizedComparableValues,
  atomizeItems,
  deepEqualSequences,
  compareComparableValues,
});

function createNumberLiteralValue(value: number, lexeme: string): XdmAtomicValue {
  if (isDecimalLiteralLexeme(lexeme)) {
    return createXdmNumber(value, normalizeUnsignedDecimalLiteralLexeme(lexeme));
  }

  return createXdmNumber(value);
}

function isDecimalLiteralLexeme(lexeme: string): boolean {
  return lexeme.includes('.') && !/[eE]/.test(lexeme);
}

function normalizeUnsignedDecimalLiteralLexeme(lexeme: string): string {
  const normalized = lexeme.startsWith('.') ? `0${lexeme}` : lexeme;
  return normalized
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

function normalizeSignedDecimalLiteralLexeme(operator: '+' | '-', lexeme: string): string {
  const normalized = normalizeUnsignedDecimalLiteralLexeme(lexeme);
  return operator === '-' ? `-${normalized}` : normalized;
}

function requireSingletonNode(
  items: readonly XdmItem[],
  span: SpanLike,
  side: 'left' | 'right',
): XdmNode | undefined {
  if (items.length === 0) {
    return undefined;
  }

  if (items.length !== 1 || items[0]?.xdmKind !== 'node') {
    throw createXPathError(XPTY0004, `Node comparisons require a singleton node on the ${side} side.`, span, {
      expectedType: 'singleton node()',
      actualType: describeItemsType(items),
      operandRole: side,
    });
  }

  return items[0] as XdmNode;
}

function createXPathError(code: string, message: string, span: SpanLike, details?: ErrorDetails): XPathError {
  return new XPathError(code, message, {
    source: '<xpath>',
    line: span.line,
    column: span.column,
    offset: span.start,
    endLine: span.endLine,
    endColumn: span.endColumn,
    endOffset: span.end,
  }, details);
}

function requireArity(name: string, args: readonly XPathAst[], expected: number, span: SpanLike): void {
  if (args.length !== expected) {
    throwArityError(name, args.length, String(expected), span);
  }
}

function validateFunctionCallSignature(name: string, actualArity: number, span: SpanLike): void {
  switch (name) {
    case 'fn:position':
    case 'fn:last':
    case 'fn:error':
    case 'fn:true':
    case 'fn:false':
      if (actualArity !== 0) {
        throwArityError(name, actualArity, '0', span);
      }
      return;
    case 'fn:count':
    case 'fn:exists':
    case 'fn:empty':
    case 'fn:exactly-one':
    case 'fn:one-or-more':
    case 'fn:zero-or-one':
    case 'fn:boolean':
    case 'fn:not':
    case 'fn:codepoints-to-string':
    case 'fn:upper-case':
    case 'fn:lower-case':
    case 'fn:min':
    case 'fn:max':
    case 'fn:avg':
    case 'fn:distinct-values':
    case 'fn:data':
    case 'fn:reverse':
    case 'fn:head':
    case 'fn:tail':
      if (actualArity !== 1) {
        throwArityError(name, actualArity, '1', span);
      }
      return;
    case 'fn:deep-equal':
    case 'fn:QName':
    case 'fn:trace':
    case 'map:entry':
    case 'fn:remove':
    case 'fn:contains':
    case 'fn:starts-with':
    case 'fn:ends-with':
      if (actualArity !== 2) {
        throwArityError(name, actualArity, '2', span);
      }
      return;
    case 'fn:concat':
      if (actualArity < 2) {
        throwArityError(name, actualArity, '>=2', span);
      }
      return;
    case 'fn:string':
    case 'fn:string-length':
    case 'fn:normalize-space':
    case 'fn:number':
    case 'fn:name':
    case 'fn:local-name':
    case 'fn:namespace-uri':
    case 'fn:generate-id':
    case 'fn:node-name':
    case 'fn:root':
      if (actualArity !== 0 && actualArity !== 1) {
        throwArityError(name, actualArity, '0..1', span);
      }
      return;
    case 'fn:substring':
    case 'fn:subsequence':
      if (actualArity !== 2 && actualArity !== 3) {
        throwArityError(name, actualArity, '2..3', span);
      }
      return;
    case 'fn:string-join':
    case 'fn:sum':
      if (actualArity !== 1 && actualArity !== 2) {
        throwArityError(name, actualArity, '1..2', span);
      }
      return;
    case 'fn:matches':
      if (actualArity !== 2 && actualArity !== 3) {
        throwArityError(name, actualArity, '2..3', span);
      }
      return;
    case 'fn:translate':
      if (actualArity !== 3) {
        throwArityError(name, actualArity, '3', span);
      }
      return;
    case 'fn:replace':
      if (actualArity !== 3 && actualArity !== 4) {
        throwArityError(name, actualArity, '3..4', span);
      }
      return;
    case 'fn:tokenize':
      if (actualArity !== 1 && actualArity !== 2 && actualArity !== 3) {
        throwArityError(name, actualArity, '1..3', span);
      }
      return;
    default:
      throw createXPathError(XPST0017, `Unknown function ${name}.`, span, {
        functionName: name,
        actualArity,
      });
  }
}

function throwArityError(name: string, actualArity: number, arityRequirement: string, span: SpanLike): never {
  const requirementLabel = arityRequirement.includes('..')
    ? arityRequirement.replace('..', ' or ')
    : arityRequirement === '>=2'
      ? 'at least 2'
      : arityRequirement;
  throw createXPathError(XPST0017, `Function ${name} expects ${requirementLabel} arguments but got ${actualArity}.`, span, {
    functionName: name,
    actualArity,
    arityRequirement,
  });
}

function describeItemsType(items: readonly XdmItem[]): string {
  if (items.length === 0) {
    return 'empty-sequence()';
  }

  if (items.length === 1) {
    return describeItemType(items[0]!);
  }

  const uniqueTypes = [...new Set(items.map((item) => describeItemType(item)))];
  return `sequence(${items.length}) of ${uniqueTypes.join(' | ')}`;
}

function describeItemType(item: XdmItem): string {
  if (item.xdmKind === 'node') {
    return 'node()';
  }

  if (item.xdmKind === 'map') {
    return 'map(*)';
  }

  if (item.xdmKind === 'array') {
    return 'array(*)';
  }

  return (item as XdmAtomicValue).type;
}

