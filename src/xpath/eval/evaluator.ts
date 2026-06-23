/**
 * XPath evaluator.
 *
 * Walks a parsed XPath AST and produces an XDM sequence given a dynamic
 * context.
 */

import { FOAR0001, FORG0006, XPTY0004, XPTY0019 } from '../../errors/codes.js';
import { XPathError } from '../../errors/XPathError.js';
import type { ErrorContext, ErrorDetails } from '../../errors/XdmError.js';
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
import { createFlowExpressionEvaluator } from './flowExpressions.js';
import { normalizeNodeSequence } from './navigation.js';
import { createComparisonEvaluator } from './comparisonEvaluation.js';
import { createPathEvaluator } from './pathEvaluation.js';
import { createArityValidationHelpers } from './arityValidation.js';
import { createScalarHelpers } from './scalarHelpers.js';
import { createBuiltinFunctionEvaluator } from './builtinFunctions.js';
import type { XPathAst, XPathBinaryOperator } from '../parse/ast.js';

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

const { requireContextItem, requireContextNode, isXdmNode, resolveVariableReference } =
  createContextHelpers({
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
      const operand = requireSingleNumber(
        evaluateExpression(ast.operand, context),
        ast.operand.span,
      );
      if (ast.operand.kind === 'number' && isDecimalLiteralLexeme(ast.operand.lexeme)) {
        return [
          createXdmNumber(
            ast.operator === '-' ? -operand : operand,
            normalizeSignedDecimalLiteralLexeme(ast.operator, ast.operand.lexeme),
          ),
        ];
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
      }),
    );
  }

  if (operator === 'and') {
    const leftValue = effectiveBooleanValue(evaluateExpression(leftAst, context), leftAst.span);
    if (!leftValue) {
      return [createXdmBoolean(false)];
    }
    return [
      createXdmBoolean(effectiveBooleanValue(evaluateExpression(rightAst, context), rightAst.span)),
    ];
  }

  if (operator === 'or') {
    const leftValue = effectiveBooleanValue(evaluateExpression(leftAst, context), leftAst.span);
    if (leftValue) {
      return [createXdmBoolean(true)];
    }
    return [
      createXdmBoolean(effectiveBooleanValue(evaluateExpression(rightAst, context), rightAst.span)),
    ];
  }

  if (
    operator === '+' ||
    operator === '-' ||
    operator === '*' ||
    operator === 'div' ||
    operator === 'idiv' ||
    operator === 'mod'
  ) {
    const left = evaluateNumericOperand(evaluateExpression(leftAst, context), leftAst.span);
    const right = evaluateNumericOperand(evaluateExpression(rightAst, context), rightAst.span);
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
    return [
      createXdmString(
        evaluateConcatOperandString(leftAst, context, span) +
          evaluateConcatOperandString(rightAst, context, span),
      ),
    ];
  }

  if (operator === '|') {
    return normalizeNodeSequence([
      ...requireNodeSequence(evaluateExpression(leftAst, context), leftAst.span),
      ...requireNodeSequence(evaluateExpression(rightAst, context), rightAst.span),
    ]);
  }

  if (operator === 'intersect') {
    const left = requireNodeSequence(evaluateExpression(leftAst, context), leftAst.span);
    const right = new Set(
      requireNodeSequence(evaluateExpression(rightAst, context), rightAst.span).map(
        (item) => item.node,
      ),
    );
    return normalizeNodeSequence(left.filter((item) => right.has(item.node)));
  }

  if (operator === 'except') {
    const right = new Set(
      requireNodeSequence(evaluateExpression(rightAst, context), rightAst.span).map(
        (item) => item.node,
      ),
    );
    return normalizeNodeSequence(
      requireNodeSequence(evaluateExpression(leftAst, context), leftAst.span).filter(
        (item) => !right.has(item.node),
      ),
    );
  }

  if (
    operator === 'eq' ||
    operator === 'ne' ||
    operator === 'lt' ||
    operator === 'le' ||
    operator === 'gt' ||
    operator === 'ge'
  ) {
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

function evaluateNumericOperand(items: readonly XdmItem[], span: SpanLike): number {
  const item = items[0];
  if (
    items.length !== 1 ||
    (item?.xdmKind !== 'atomic' && item?.xdmKind !== 'node') ||
    (item?.xdmKind === 'atomic' &&
      (item as XdmAtomicValue).type !== 'xs:double' &&
      (item as XdmAtomicValue).type !== 'xs:integer')
  ) {
    throw createXPathError(XPTY0004, 'Expected a single numeric value.', span, {
      expectedType: 'xs:double or xs:integer',
      actualType: describeItemsType(items),
    });
  }

  if (item?.xdmKind === 'node') {
    return Number((item as XdmNode).node.textContent ?? '');
  }

  const atomicItem = item as XdmAtomicValue;
  return atomicItem.value as number;
}

function evaluateRangeExpression(
  leftAst: XPathAst,
  rightAst: XPathAst,
  context: DynamicContext,
): XdmItem[] {
  const start = requireSingleInteger(
    evaluateExpression(leftAst, context),
    leftAst.span,
    'Range expression start',
  );
  const end = requireSingleInteger(
    evaluateExpression(rightAst, context),
    rightAst.span,
    'Range expression end',
  );

  if (start > end) {
    return [];
  }

  const items: XdmItem[] = [];
  for (let value = start; value <= end; value += 1) {
    items.push(createXdmNumber(value));
  }
  return items;
}

function isDecimalLiteralLexeme(lexeme: string): boolean {
  return lexeme.includes('.') && !/[eE]/.test(lexeme);
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

function effectiveBooleanValue(items: readonly XdmItem[], span: SpanLike): boolean {
  if (items.length === 0) {
    return false;
  }

  if (items[0]?.xdmKind === 'node') {
    return true;
  }

  if (items.length !== 1 || items[0]?.xdmKind !== 'atomic') {
    throw createXPathError(
      FORG0006,
      'Effective boolean value is not defined for this sequence.',
      span,
      {
        expectedType: 'node(), xs:boolean, xs:string, or xs:double',
        actualType: describeItemsType(items),
      },
    );
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

  throw createXPathError(
    FORG0006,
    'Effective boolean value is not defined for this atomic type.',
    span,
    {
      expectedType: 'node(), xs:boolean, xs:string, xs:double, or xs:integer',
      actualType: atomic.type,
    },
  );
}

const { requireArity, validateFunctionCallSignature, throwArityError } =
  createArityValidationHelpers(createXPathError);

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

const { compareNodes, compareValue } = createComparisonEvaluator({
  createXPathError,
  describeItemsType,
  atomizeSingleton,
  compareValueOperands,
});

const {
  evaluateConcatOperandString,
  requireSingleNumber,
  requireSingleInteger,
  createNumberLiteralValue,
  normalizeSignedDecimalLiteralLexeme,
} = createScalarHelpers({
  evaluateExpression,
  createXPathError,
  describeItemsType,
  describeItemType,
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

const { evaluateFilterExpression, evaluatePath } = createPathEvaluator({
  evaluateExpression,
  effectiveBooleanValue,
  requireContextNode,
  isXdmNode,
  describeItemsType,
  createXPathError,
  validateFunctionCallSignature,
});

const { evaluateLetExpression, evaluateForExpression, evaluateQuantifiedExpression } =
  createFlowExpressionEvaluator({
    evaluateExpression,
    effectiveBooleanValue,
  });

function createXPathError(
  code: string,
  message: string,
  span: SpanLike,
  details?: ErrorDetails,
  context?: ErrorContext,
): XPathError {
  return new XPathError(
    code,
    message,
    {
      source: '<xpath>',
      line: span.line,
      column: span.column,
      offset: span.start,
      endLine: span.endLine,
      endColumn: span.endColumn,
      endOffset: span.end,
    },
    details,
    context,
  );
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
