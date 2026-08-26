import { FOTY0014, XPTY0004 } from '../../errors/codes.js';
import { createXdmNumber, getNodeStringValue, type XdmAtomicValue, type XdmItem, type XdmNode } from '../../xdm/types.js';
import type { DynamicContext } from './context.js';
import type { XPathAst } from '../parse/ast.js';

type SpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

type ScalarHelperDependencies = {
  evaluateExpression(ast: XPathAst, context: DynamicContext): XdmItem[];
  createXPathError(code: string, message: string, span: SpanLike, details?: Readonly<Record<string, unknown>>): Error;
  describeItemsType(items: readonly XdmItem[]): string;
  describeItemType(item: XdmItem): string;
};

export function createScalarHelpers(dependencies: ScalarHelperDependencies): {
  evaluateConcatOperandString(ast: XPathAst, context: DynamicContext, span: SpanLike): string;
  requireSingleNumber(items: readonly XdmItem[], span: SpanLike): number;
  requireSingleInteger(items: readonly XdmItem[], span: SpanLike, description: string): number;
  createNumberLiteralValue(value: number, lexeme: string): XdmAtomicValue;
  normalizeSignedDecimalLiteralLexeme(operator: '+' | '-', lexeme: string): string;
} {
  function evaluateConcatOperandString(ast: XPathAst, context: DynamicContext, span: SpanLike): string {
    const items = dependencies.evaluateExpression(ast, context);
    if (items.length === 0) {
      return '';
    }

    if (items.length !== 1) {
      throw dependencies.createXPathError(XPTY0004, 'Operator || requires empty-sequence() or a singleton item operand.', span, {
        expectedType: 'empty-sequence() or singleton item()',
        actualType: dependencies.describeItemsType(items),
      });
    }

    return coerceItemToStringValue(items[0]!, span);
  }

  function coerceItemToStringValue(item: XdmItem, span: SpanLike): string {
    if (item.xdmKind === 'node') {
      return getNodeStringValue((item as XdmNode).node);
    }

    if (item.xdmKind !== 'atomic') {
      throw dependencies.createXPathError(FOTY0014, 'The string value is not defined for this item kind.', span, {
        expectedType: 'node() or atomic value',
        actualType: dependencies.describeItemType(item),
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

  function requireSingleNumber(items: readonly XdmItem[], span: SpanLike): number {
    const item = items[0];
    if (
      items.length !== 1 ||
      item?.xdmKind !== 'atomic' ||
      ((item as XdmAtomicValue).type !== 'xs:double' && (item as XdmAtomicValue).type !== 'xs:integer')
    ) {
      throw dependencies.createXPathError(XPTY0004, 'Expected a single numeric value.', span, {
        expectedType: 'xs:double or xs:integer',
        actualType: dependencies.describeItemsType(items),
      });
    }
    return (item as XdmAtomicValue).value as number;
  }

  function requireSingleInteger(items: readonly XdmItem[], span: SpanLike, description: string): number {
    const value = requireSingleNumber(items, span);
    if (!Number.isInteger(value)) {
      throw dependencies.createXPathError(XPTY0004, `${description} must be an integer in this slice.`, span, {
        expectedType: 'xs:integer',
        actualType: 'xs:double',
      });
    }
    return value;
  }

  function createNumberLiteralValue(value: number, lexeme: string): XdmAtomicValue {
    if (isDecimalLiteralLexeme(lexeme)) {
      return createXdmNumber(value, normalizeUnsignedDecimalLiteralLexeme(lexeme));
    }

    return createXdmNumber(value);
  }

  function normalizeSignedDecimalLiteralLexeme(operator: '+' | '-', lexeme: string): string {
    const normalized = normalizeUnsignedDecimalLiteralLexeme(lexeme);
    return operator === '-' ? `-${normalized}` : normalized;
  }

  return {
    evaluateConcatOperandString,
    requireSingleNumber,
    requireSingleInteger,
    createNumberLiteralValue,
    normalizeSignedDecimalLiteralLexeme,
  };
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
