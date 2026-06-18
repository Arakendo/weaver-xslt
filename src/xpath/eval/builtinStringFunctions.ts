import {
  createXdmBoolean,
  createXdmInteger,
  createXdmString,
  type XdmAtomicValue,
  type XdmItem,
} from '../../xdm/types.js';
import { XPTY0004 } from '../../errors/codes.js';
import {
  compileRegex,
  compileRegexRejectingZeroLengthMatches,
  translateReplacementString,
} from './regex.js';
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

type BuiltinStringFunctionHelpers = {
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
  requireSingleNumber(items: readonly XdmItem[], span: SpanLike): number;
};

type BuiltinStringSupport = {
  evaluateOptionalSingletonItemArg(
    name: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem | undefined;
  evaluateSingletonStringishArg(
    arg: XPathAst,
    context: DynamicContext,
    span: SpanLike,
    name: string,
  ): XdmItem | undefined;
  itemToStringValue(item: XdmItem | undefined, span?: SpanLike): string;
  xpathTokenize(input: string, regex: RegExp): string[];
  xpathTokenizeOnWhitespace(input: string): string[];
  xpathSubstring(source: string, roundedStart: number, roundedLength?: number): string;
  xpathRound(value: number): number;
  codepointsToString(items: readonly XdmItem[], span: SpanLike): string;
  stringToCodepoints(item: XdmItem | undefined, span: SpanLike): XdmAtomicValue[];
  normalizeSpace(value: string): string;
  xpathTranslate(input: string, mapFrom: string, mapTo: string): string;
};

export function createBuiltinStringFunctionEvaluator(
  helpers: BuiltinStringFunctionHelpers,
  support: BuiltinStringSupport,
): {
  evaluateStringBuiltinFunction(
    normalized: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem[] | undefined;
} {
  function evaluateStringBuiltinFunction(
    normalized: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem[] | undefined {
    switch (normalized) {
      case 'fn:string': {
        const item = support.evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmString(support.itemToStringValue(item, span))];
      }
      case 'fn:string-length': {
        const item = support.evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmInteger(Array.from(support.itemToStringValue(item, span)).length)];
      }
      case 'fn:substring': {
        if (args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, '2..3', span);
        }
        const source = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
          span,
        );
        const start = support.xpathRound(
          helpers.requireSingleNumber(helpers.evaluateExpression(args[1]!, context), span),
        );
        if (args.length === 2) {
          return [createXdmString(support.xpathSubstring(source, start))];
        }
        const length = support.xpathRound(
          helpers.requireSingleNumber(helpers.evaluateExpression(args[2]!, context), span),
        );
        return [createXdmString(support.xpathSubstring(source, start, length))];
      }
      case 'fn:substring-before': {
        helpers.requireArity(normalized, args, 2, span);
        const source = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
          span,
        );
        const search = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[1]!, context, span, normalized),
          span,
        );
        const index = source.indexOf(search);
        return [createXdmString(index < 0 ? '' : source.slice(0, index))];
      }
      case 'fn:substring-after': {
        helpers.requireArity(normalized, args, 2, span);
        const source = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
          span,
        );
        const search = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[1]!, context, span, normalized),
          span,
        );
        const index = source.indexOf(search);
        return [createXdmString(index < 0 ? '' : source.slice(index + search.length))];
      }
      case 'fn:codepoints-to-string': {
        helpers.requireArity(normalized, args, 1, span);
        return [
          createXdmString(
            support.codepointsToString(helpers.evaluateExpression(args[0]!, context), span),
          ),
        ];
      }
      case 'fn:string-to-codepoints': {
        helpers.requireArity(normalized, args, 1, span);
        return support.stringToCodepoints(
          support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
          span,
        );
      }
      case 'fn:concat': {
        if (args.length < 2) {
          helpers.throwArityError(normalized, args.length, '>=2', span);
        }
        return [
          createXdmString(
            args
              .map((arg) =>
                support.itemToStringValue(
                  support.evaluateSingletonStringishArg(arg, context, span, normalized),
                  span,
                ),
              )
              .join(''),
          ),
        ];
      }
      case 'fn:string-join': {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, '1..2', span);
        }
        const items = helpers.evaluateExpression(args[0]!, context);
        let separator = '';
        if (args.length === 2) {
          const separatorItems = helpers.evaluateExpression(args[1]!, context);
          if (separatorItems.length !== 1) {
            throw helpers.createXPathError(
              XPTY0004,
              `Function ${normalized} requires a singleton separator argument.`,
              span,
              {
                functionName: normalized,
                expectedType: 'singleton item() as separator',
                actualType: helpers.describeItemsType(separatorItems),
              },
            );
          }
          separator = support.itemToStringValue(separatorItems[0]!, span);
        }
        return [
          createXdmString(
            items.map((item) => support.itemToStringValue(item, span)).join(separator),
          ),
        ];
      }
      case 'fn:matches': {
        if (args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, '2..3', span);
        }
        const input = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
          span,
        );
        const patternItems = helpers.evaluateExpression(args[1]!, context);
        if (patternItems.length !== 1) {
          throw helpers.createXPathError(
            XPTY0004,
            `Function ${normalized} requires a singleton pattern argument.`,
            span,
            {
              functionName: normalized,
              expectedType: 'singleton item() as pattern',
              actualType: helpers.describeItemsType(patternItems),
            },
          );
        }
        const pattern = support.itemToStringValue(patternItems[0]!, span);
        let flags = '';
        if (args.length === 3) {
          const flagItems = helpers.evaluateExpression(args[2]!, context);
          if (flagItems.length !== 1) {
            throw helpers.createXPathError(
              XPTY0004,
              `Function ${normalized} requires a singleton flags argument.`,
              span,
              {
                functionName: normalized,
                expectedType: 'singleton item() as flags',
                actualType: helpers.describeItemsType(flagItems),
              },
            );
          }
          flags = support.itemToStringValue(flagItems[0]!, span);
        }
        return [createXdmBoolean(compileRegex(pattern, flags, span).test(input))];
      }
      case 'fn:replace': {
        if (args.length !== 3 && args.length !== 4) {
          helpers.throwArityError(normalized, args.length, '3..4', span);
        }
        const input = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
          span,
        );
        const patternItems = helpers.evaluateExpression(args[1]!, context);
        if (patternItems.length !== 1) {
          throw helpers.createXPathError(
            XPTY0004,
            `Function ${normalized} requires a singleton pattern argument.`,
            span,
            {
              functionName: normalized,
              expectedType: 'singleton item() as pattern',
              actualType: helpers.describeItemsType(patternItems),
            },
          );
        }
        const pattern = support.itemToStringValue(patternItems[0]!, span);
        const flags =
          args.length === 4
            ? support.itemToStringValue(
                support.evaluateSingletonStringishArg(args[3]!, context, span, normalized),
                span,
              )
            : '';
        const replacementItems = helpers.evaluateExpression(args[2]!, context);
        if (replacementItems.length !== 1) {
          throw helpers.createXPathError(
            XPTY0004,
            `Function ${normalized} requires a singleton replacement argument.`,
            span,
            {
              functionName: normalized,
              expectedType: 'singleton item() as replacement',
              actualType: helpers.describeItemsType(replacementItems),
            },
          );
        }
        const replacement = support.itemToStringValue(replacementItems[0]!, span);
        return [
          createXdmString(
            input.replace(
              compileRegexRejectingZeroLengthMatches(pattern, flags, span),
              flags.includes('q')
                ? replacement.replace(/\$/g, '$$$$')
                : translateReplacementString(replacement, span),
            ),
          ),
        ];
      }
      case 'fn:tokenize': {
        if (args.length !== 1 && args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, '1..3', span);
        }
        const input = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
          span,
        );
        if (args.length === 1) {
          return support.xpathTokenizeOnWhitespace(input).map(createXdmString);
        }
        const patternItems = helpers.evaluateExpression(args[1]!, context);
        if (patternItems.length !== 1) {
          throw helpers.createXPathError(
            XPTY0004,
            `Function ${normalized} requires a singleton pattern argument.`,
            span,
            {
              functionName: normalized,
              expectedType: 'singleton item() as pattern',
              actualType: helpers.describeItemsType(patternItems),
            },
          );
        }
        const pattern = support.itemToStringValue(patternItems[0]!, span);
        const flags =
          args.length === 3
            ? support.itemToStringValue(
                support.evaluateSingletonStringishArg(args[2]!, context, span, normalized),
                span,
              )
            : '';
        return support
          .xpathTokenize(input, compileRegexRejectingZeroLengthMatches(pattern, flags, span))
          .map(createXdmString);
      }
      case 'fn:normalize-space': {
        const item = support.evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmString(support.normalizeSpace(support.itemToStringValue(item, span)))];
      }
      case 'fn:translate': {
        helpers.requireArity(normalized, args, 3, span);
        const input = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
          span,
        );
        const mapFrom = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[1]!, context, span, normalized),
          span,
        );
        const mapTo = support.itemToStringValue(
          support.evaluateSingletonStringishArg(args[2]!, context, span, normalized),
          span,
        );
        return [createXdmString(support.xpathTranslate(input, mapFrom, mapTo))];
      }
      case 'fn:contains':
        helpers.requireArity(normalized, args, 2, span);
        return [
          createXdmBoolean(
            support
              .itemToStringValue(
                support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
                span,
              )
              .includes(
                support.itemToStringValue(
                  support.evaluateSingletonStringishArg(args[1]!, context, span, normalized),
                  span,
                ),
              ),
          ),
        ];
      case 'fn:starts-with':
        helpers.requireArity(normalized, args, 2, span);
        return [
          createXdmBoolean(
            support
              .itemToStringValue(
                support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
                span,
              )
              .startsWith(
                support.itemToStringValue(
                  support.evaluateSingletonStringishArg(args[1]!, context, span, normalized),
                  span,
                ),
              ),
          ),
        ];
      case 'fn:ends-with':
        helpers.requireArity(normalized, args, 2, span);
        return [
          createXdmBoolean(
            support
              .itemToStringValue(
                support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
                span,
              )
              .endsWith(
                support.itemToStringValue(
                  support.evaluateSingletonStringishArg(args[1]!, context, span, normalized),
                  span,
                ),
              ),
          ),
        ];
      case 'fn:upper-case': {
        helpers.requireArity(normalized, args, 1, span);
        return [
          createXdmString(
            support
              .itemToStringValue(
                support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
                span,
              )
              .toUpperCase(),
          ),
        ];
      }
      case 'fn:lower-case': {
        helpers.requireArity(normalized, args, 1, span);
        return [
          createXdmString(
            support
              .itemToStringValue(
                support.evaluateSingletonStringishArg(args[0]!, context, span, normalized),
                span,
              )
              .toLowerCase(),
          ),
        ];
      }
      default:
        return undefined;
    }
  }

  return {
    evaluateStringBuiltinFunction,
  };
}
