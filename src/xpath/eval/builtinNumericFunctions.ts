import { FODF1310 } from '../../errors/codes.js';
import {
  createXdmNumber,
  createXdmString,
  type XdmAtomicValue,
  type XdmItem,
} from '../../xdm/types.js';
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

type BuiltinNumericFunctionHelpers = {
  evaluateExpression(ast: XPathAst, context: DynamicContext): XdmItem[];
  requireArity(name: string, args: readonly XPathAst[], expected: number, span: SpanLike): void;
  throwArityError(
    name: string,
    actualArity: number,
    arityRequirement: string,
    span: SpanLike,
  ): never;
  createXPathError(
    code: string,
    message: string,
    span: SpanLike,
    details?: Readonly<Record<string, unknown>>,
  ): Error;
  describeItemsType(items: readonly XdmItem[]): string;
  requireContextItem(context: DynamicContext, span: SpanLike): XdmItem;
  requireSingleNumber(items: readonly XdmItem[], span: SpanLike): number;
  requireSingleInteger(items: readonly XdmItem[], span: SpanLike, description: string): number;
  atomizedNumericValues(items: readonly XdmItem[], span: SpanLike, functionName: string): number[];
  atomizedComparableValues(
    items: readonly XdmItem[],
    span: SpanLike,
    functionName: string,
  ): readonly (boolean | number | string)[];
  atomizeItems(items: readonly XdmItem[]): readonly (boolean | number | string)[];
  compareComparableValues(
    left: boolean | number | string,
    right: boolean | number | string,
  ): number;
};

type BuiltinNumericSupport = {
  evaluateOptionalSingletonItemArg(
    name: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem | undefined;
  roundToPrecision(value: number, precision: number): number;
  validateSupportedCollationArg(
    name: string,
    arg: XPathAst | undefined,
    context: DynamicContext,
    span: SpanLike,
  ): void;
  itemToNumberValue(item: XdmItem | undefined): number;
  createAtomicValueFromAtomized(value: boolean | number | string): XdmAtomicValue;
  itemToStringValue(item: XdmItem): string;
};

export function createBuiltinNumericFunctionEvaluator(
  helpers: BuiltinNumericFunctionHelpers,
  support: BuiltinNumericSupport,
): {
  evaluateNumericBuiltinFunction(
    normalized: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem[] | undefined;
} {
  function evaluateNumericBuiltinFunction(
    normalized: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem[] | undefined {
    switch (normalized) {
      case 'fn:number': {
        const item = support.evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmNumber(support.itemToNumberValue(item))];
      }
      case 'fn:format-number': {
        helpers.requireArity(normalized, args, 2, span);
        const numberItems = helpers.evaluateExpression(args[0]!, context);
        if (numberItems.length === 0) {
          return [createXdmString('')];
        }
        const pictureItems = helpers.evaluateExpression(args[1]!, context);
        if (pictureItems.length !== 1 || pictureItems[0]?.xdmKind !== 'atomic') {
          throw helpers.createXPathError(
            'XPTY0004',
            'Function fn:format-number requires a singleton picture string.',
            span,
            {
              functionName: normalized,
              expectedType: 'xs:string',
              actualType: helpers.describeItemsType(pictureItems),
            },
          );
        }
        return [
          createXdmString(
            formatNumberWithBasicPicture(
              helpers.requireSingleNumber(numberItems, span),
              support.itemToStringValue(pictureItems[0]),
              span,
              helpers,
            ),
          ),
        ];
      }
      case 'fn:sum': {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, '1..2', span);
        }
        const values = helpers.atomizedNumericValues(
          helpers.evaluateExpression(args[0]!, context),
          span,
          normalized,
        );
        if (values.length === 0) {
          if (args.length === 1) {
            return [createXdmNumber(0)];
          }
          return helpers.evaluateExpression(args[1]!, context);
        }
        return [createXdmNumber(values.reduce((total, value) => total + value, 0))];
      }
      case 'fn:min': {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, '1..2', span);
        }
        support.validateSupportedCollationArg(normalized, args[1], context, span);
        const values = helpers.atomizedComparableValues(
          helpers.evaluateExpression(args[0]!, context),
          span,
          normalized,
        );
        return values.length === 0
          ? []
          : [
              support.createAtomicValueFromAtomized(
                values.reduce((current, candidate) =>
                  helpers.compareComparableValues(candidate, current) < 0 ? candidate : current,
                ),
              ),
            ];
      }
      case 'fn:max': {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, '1..2', span);
        }
        support.validateSupportedCollationArg(normalized, args[1], context, span);
        const values = helpers.atomizedComparableValues(
          helpers.evaluateExpression(args[0]!, context),
          span,
          normalized,
        );
        return values.length === 0
          ? []
          : [
              support.createAtomicValueFromAtomized(
                values.reduce((current, candidate) =>
                  helpers.compareComparableValues(candidate, current) > 0 ? candidate : current,
                ),
              ),
            ];
      }
      case 'fn:avg': {
        helpers.requireArity(normalized, args, 1, span);
        const values = helpers.atomizedNumericValues(
          helpers.evaluateExpression(args[0]!, context),
          span,
          normalized,
        );
        return values.length === 0
          ? []
          : [createXdmNumber(values.reduce((total, value) => total + value, 0) / values.length)];
      }
      case 'fn:distinct-values': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.atomizeItems(helpers.evaluateExpression(args[0]!, context));
        const distinct = new Set<string>();
        const results: XdmAtomicValue[] = [];
        for (const item of items) {
          const key = `${typeof item}:${String(item)}`;
          if (distinct.has(key)) {
            continue;
          }
          distinct.add(key);
          results.push(support.createAtomicValueFromAtomized(item));
        }
        return results;
      }
      case 'fn:data': {
        if (args.length === 0) {
          const item = helpers.requireContextItem(context, span);
          return helpers.atomizeItems([item]).map(support.createAtomicValueFromAtomized);
        }
        helpers.requireArity(normalized, args, 1, span);
        return helpers
          .atomizeItems(helpers.evaluateExpression(args[0]!, context))
          .map(support.createAtomicValueFromAtomized);
      }
      case 'fn:abs': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        return items.length === 0
          ? []
          : [createXdmNumber(Math.abs(helpers.requireSingleNumber(items, span)))];
      }
      case 'fn:floor': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        return items.length === 0
          ? []
          : [createXdmNumber(Math.floor(helpers.requireSingleNumber(items, span)))];
      }
      case 'fn:ceiling': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        return items.length === 0
          ? []
          : [createXdmNumber(Math.ceil(helpers.requireSingleNumber(items, span)))];
      }
      case 'fn:round': {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, '1..2', span);
        }
        const roundedItems = helpers.evaluateExpression(args[0]!, context);
        if (roundedItems.length === 0) {
          return [];
        }
        return [
          createXdmNumber(
            support.roundToPrecision(
              helpers.requireSingleNumber(roundedItems, span),
              args.length === 2
                ? helpers.requireSingleInteger(
                    helpers.evaluateExpression(args[1]!, context),
                    span,
                    'Round precision',
                  )
                : 0,
            ),
          ),
        ];
      }
      default:
        return undefined;
    }
  }

  return {
    evaluateNumericBuiltinFunction,
  };
}

function formatNumberWithBasicPicture(
  value: number,
  picture: string,
  span: SpanLike,
  helpers: Pick<BuiltinNumericFunctionHelpers, 'createXPathError'>,
): string {
  const match = /^(#,##0|0+)(?:\.([0#]+))?$/.exec(picture);
  if (match === null) {
    throw helpers.createXPathError(
      FODF1310,
      `Unsupported fn:format-number picture ${JSON.stringify(picture)}.`,
      span,
      { functionName: 'fn:format-number', picture },
    );
  }

  const integerPicture = match[1]!;
  const fractionPicture = match[2] ?? '';
  const minimumFractionDigits = [...fractionPicture].filter((token) => token === '0').length;
  const maximumFractionDigits = fractionPicture.length;
  const absolute = Math.abs(value);
  let [integerPart, fractionPart = ''] = absolute.toFixed(maximumFractionDigits).split('.');
  if (integerPicture.includes(',')) {
    integerPart = integerPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  while (fractionPart.length > minimumFractionDigits && fractionPart.endsWith('0')) {
    fractionPart = fractionPart.slice(0, -1);
  }

  const sign = value < 0 ? '-' : '';
  return `${sign}${integerPart}${fractionPart.length === 0 ? '' : `.${fractionPart}`}`;
}
