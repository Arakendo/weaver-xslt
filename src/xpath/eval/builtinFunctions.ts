import type { Node } from '@xmldom/xmldom';

import { FOCH0001, FOCH0002, FOER0000, FORG0005, FOTY0014, XPST0017, XPTY0004 } from '../../errors/codes.js';
import type { DynamicContext } from './context.js';
import {
  createXdmBoolean,
  createXdmInteger,
  createXdmMap,
  createXdmNumber,
  createXdmQName,
  createXdmString,
  type XdmAtomicValue,
  type XdmItem,
  type XdmNode,
} from '../../xdm/types.js';
import { compileRegex, compileRegexRejectingZeroLengthMatches, translateReplacementString } from './regex.js';
import type { XPathAst } from '../parse/ast.js';
import { getRootNode } from './navigation.js';
import {
  getLocalNameFromQName,
  getLocalNameValue,
  getNamespaceUriValue,
  getNodeNameValue,
} from './names.js';

type SpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

type BuiltinFunctionHelpers = {
  evaluateExpression(ast: XPathAst, context: DynamicContext): XdmItem[];
  requireArity(name: string, args: readonly XPathAst[], expected: number, span: SpanLike): void;
  throwArityError(name: string, actualArity: number, arityRequirement: string, span: SpanLike): never;
  createXPathError(code: string, message: string, span: SpanLike, details?: Readonly<Record<string, unknown>>): Error;
  describeItemsType(items: readonly XdmItem[]): string;
  describeItemType(item: XdmItem): string;
  effectiveBooleanValue(items: readonly XdmItem[], span: SpanLike): boolean;
  requireContextItem(context: DynamicContext, span: SpanLike): XdmItem;
  requireSingleNumber(items: readonly XdmItem[], span: SpanLike): number;
  requireSingleInteger(items: readonly XdmItem[], span: SpanLike, description: string): number;
  atomizedNumericValues(items: readonly XdmItem[], span: SpanLike, functionName: string): number[];
  atomizedComparableValues(items: readonly XdmItem[], span: SpanLike, functionName: string): readonly (boolean | number | string)[];
  atomizeItems(items: readonly XdmItem[]): readonly (boolean | number | string)[];
  deepEqualSequences(leftItems: readonly XdmItem[], rightItems: readonly XdmItem[]): boolean;
  compareComparableValues(left: boolean | number | string, right: boolean | number | string): number;
};

const GENERATED_NODE_IDS = new WeakMap<Node, string>();
let nextGeneratedNodeId = 1;

export function createBuiltinFunctionEvaluator(helpers: BuiltinFunctionHelpers): {
  evaluateFunctionCall(callee: string, args: readonly XPathAst[], context: DynamicContext, span: SpanLike): XdmItem[];
} {
  function evaluateOptionalSingletonItemArg(
    name: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem | undefined {
    if (args.length === 0) {
      return helpers.requireContextItem(context, span);
    }

    helpers.requireArity(name, args, 1, span);
    const items = helpers.evaluateExpression(args[0]!, context);
    if (items.length === 0) {
      return undefined;
    }
    if (items.length !== 1) {
      throw helpers.createXPathError(XPTY0004, `Function ${name} requires an empty sequence or singleton item.`, span, {
        functionName: name,
        expectedType: 'empty-sequence() or singleton item()',
        actualType: helpers.describeItemsType(items),
      });
    }
    return items[0];
  }

  function evaluateOptionalSingletonNodeArg(
    name: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmNode | undefined {
    const item = evaluateOptionalSingletonItemArg(name, args, context, span);
    if (item === undefined) {
      return undefined;
    }
    if (item.xdmKind !== 'node') {
      throw helpers.createXPathError(XPTY0004, `Function ${name} requires a node argument.`, span, {
        functionName: name,
        expectedType: 'node()',
        actualType: helpers.describeItemType(item),
      });
    }
    return item as XdmNode;
  }

  function evaluateSingletonStringishArg(
    arg: XPathAst,
    context: DynamicContext,
    span: SpanLike,
    name: string,
  ): XdmItem | undefined {
    const items = helpers.evaluateExpression(arg, context);
    if (items.length === 0) {
      return undefined;
    }
    if (items.length !== 1) {
      throw helpers.createXPathError(XPTY0004, `Function ${name} requires empty-sequence() or a singleton item argument.`, span, {
        functionName: name,
        expectedType: 'empty-sequence() or singleton item()',
        actualType: helpers.describeItemsType(items),
      });
    }
    return items[0];
  }

  function itemToStringValue(item: XdmItem | undefined, span?: SpanLike): string {
    if (item === undefined) {
      return '';
    }

    if (item.xdmKind === 'node') {
      return (item as XdmNode).node.textContent ?? '';
    }

    if (item.xdmKind !== 'atomic') {
      throw helpers.createXPathError(FOTY0014, 'The string value is not defined for this item kind.', span ?? {
        line: 1,
        column: 1,
        start: 0,
        endLine: 1,
        endColumn: 1,
        end: 0,
      }, {
        expectedType: 'node() or atomic value',
        actualType: helpers.describeItemType(item),
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
      return formatXPathDoubleString(atomic.value as number);
    }

    if (atomic.type === 'xs:integer') {
      return String(atomic.value);
    }

    return String(atomic.value);
  }

  function formatXPathDoubleString(value: number): string {
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

    return String(value);
  }

  function xpathTokenize(input: string, regex: RegExp): string[] {
    if (input.length === 0) {
      return [];
    }

    const tokens: string[] = [];
    regex.lastIndex = 0;

    let nextStart = 0;
    let match = regex.exec(input);
    while (match !== null) {
      tokens.push(input.slice(nextStart, match.index));
      nextStart = match.index + match[0].length;
      match = regex.exec(input);
    }

    tokens.push(input.slice(nextStart));
    return tokens;
  }

  function xpathTokenizeOnWhitespace(input: string): string[] {
    const normalized = normalizeSpace(input);
    return normalized.length === 0 ? [] : normalized.split(' ');
  }

  function xpathSubstring(source: string, roundedStart: number, roundedLength?: number): string {
    if (Number.isNaN(roundedStart) || (roundedLength !== undefined && Number.isNaN(roundedLength))) {
      return '';
    }

    const characters = Array.from(source);
    const endThreshold = roundedLength === undefined ? undefined : roundedStart + roundedLength;
    return characters.filter((_, index) => {
      const position = index + 1;
      return position >= roundedStart && (endThreshold === undefined || position < endThreshold);
    }).join('');
  }

  function xpathRound(value: number): number {
    return Math.round(value);
  }

  function roundToPrecision(value: number, precision: number): number {
    if (!Number.isFinite(value) || Number.isNaN(value) || precision === 0) {
      return xpathRound(value);
    }

    return Number(`${xpathRound(Number(`${value}e${precision}`))}e${-precision}`);
  }

  function validateSupportedCollationArg(
    functionName: string,
    arg: XPathAst | undefined,
    context: DynamicContext,
    span: SpanLike,
  ): void {
    if (arg === undefined) {
      return;
    }

    const collation = itemToStringValue(evaluateSingletonStringishArg(arg, context, span, functionName), span);
    if (
      collation.length > 0
      && collation !== 'http://www.w3.org/2005/xpath-functions/collation/codepoint'
    ) {
      throw helpers.createXPathError(FOCH0002, `Function ${functionName} received an unsupported collation.`, span, {
        functionName,
        collation,
      });
    }
  }

  function codepointsToString(items: readonly XdmItem[], span: SpanLike): string {
    let result = '';

    for (const item of items) {
      if (
        item.xdmKind !== 'atomic'
        || ((item as XdmAtomicValue).type !== 'xs:double' && (item as XdmAtomicValue).type !== 'xs:integer')
      ) {
        throw helpers.createXPathError(XPTY0004, 'Function fn:codepoints-to-string requires numeric codepoint arguments.', span, {
          expectedType: 'xs:integer*',
          actualType: helpers.describeItemsType([item]),
        });
      }

      const codepoint = (item as XdmAtomicValue).value as number;
      if (!Number.isInteger(codepoint) || !isValidXmlCodepoint(codepoint)) {
        throw helpers.createXPathError(FOCH0001, 'Function fn:codepoints-to-string received an invalid XML character codepoint.', span, {
          codepoint,
        });
      }

      result += String.fromCodePoint(codepoint);
    }

    return result;
  }

  function stringToCodepoints(item: XdmItem | undefined, span: SpanLike): XdmAtomicValue[] {
    return Array.from(itemToStringValue(item, span), (character) => createXdmInteger(character.codePointAt(0)!));
  }

  function isValidXmlCodepoint(codepoint: number): boolean {
    return codepoint === 0x9
      || codepoint === 0xA
      || codepoint === 0xD
      || (codepoint >= 0x20 && codepoint <= 0xD7FF)
      || (codepoint >= 0xE000 && codepoint <= 0xFFFD)
      || (codepoint >= 0x10000 && codepoint <= 0x10FFFF);
  }

  function itemToNumberValue(item: XdmItem | undefined): number {
    if (item === undefined) {
      return Number.NaN;
    }

    if (item.xdmKind === 'node') {
      return Number((item as XdmNode).node.textContent ?? '');
    }

    const atomic = item as XdmAtomicValue;
    if (atomic.type === 'xs:boolean') {
      return atomic.value === true ? 1 : 0;
    }

    return Number(atomic.value);
  }

  function createAtomicValueFromAtomized(value: boolean | number | string): XdmAtomicValue {
    if (typeof value === 'boolean') {
      return createXdmBoolean(value);
    }

    if (typeof value === 'number') {
      return createXdmNumber(value);
    }

    return createXdmString(value);
  }

  function normalizeSpace(value: string): string {
    return value
      .replace(/^[\u0009\u000A\u000D\u0020]+|[\u0009\u000A\u000D\u0020]+$/g, '')
      .replace(/[\u0009\u000A\u000D\u0020]+/g, ' ');
  }

  function xpathTranslate(input: string, mapFrom: string, mapTo: string): string {
    const fromChars = Array.from(mapFrom);
    const toChars = Array.from(mapTo);
    const mapping = new Map<string, string | null>();

    for (let index = 0; index < fromChars.length; index += 1) {
      const char = fromChars[index]!;
      if (mapping.has(char)) {
        continue;
      }

      mapping.set(char, index < toChars.length ? toChars[index]! : null);
    }

    let result = '';
    for (const char of Array.from(input)) {
      const replacement = mapping.get(char);
      if (replacement === undefined) {
        result += char;
        continue;
      }

      if (replacement !== null) {
        result += replacement;
      }
    }

    return result;
  }

  function getGeneratedNodeId(node: XdmNode | undefined): string {
    if (node === undefined) {
      return '';
    }

    const existing = GENERATED_NODE_IDS.get(node.node);
    if (existing !== undefined) {
      return existing;
    }

    const generated = `d${nextGeneratedNodeId}`;
    nextGeneratedNodeId += 1;
    GENERATED_NODE_IDS.set(node.node, generated);
    return generated;
  }

  function evaluateFunctionCall(
    callee: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem[] {
    const normalized = callee.includes(':') ? callee : `fn:${callee}`;

    switch (normalized) {
      case 'fn:position':
        helpers.requireArity(normalized, args, 0, span);
        helpers.requireContextItem(context, span);
        return [createXdmInteger(context.contextPosition)];
      case 'fn:last':
        helpers.requireArity(normalized, args, 0, span);
        helpers.requireContextItem(context, span);
        return [createXdmInteger(context.contextSize)];
      case 'fn:count':
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmInteger(helpers.evaluateExpression(args[0]!, context).length)];
      case 'fn:exists':
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmBoolean(helpers.evaluateExpression(args[0]!, context).length > 0)];
      case 'fn:empty':
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmBoolean(helpers.evaluateExpression(args[0]!, context).length === 0)];
      case 'fn:exactly-one': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        if (items.length !== 1) {
          throw helpers.createXPathError(FORG0005, 'Function fn:exactly-one requires exactly one item.', span, {
            functionName: normalized,
            expectedType: 'exactly one item()',
            actualType: helpers.describeItemsType(items),
          });
        }
        return [items[0]!];
      }
      case 'fn:one-or-more': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        if (items.length === 0) {
          throw helpers.createXPathError(FORG0005, 'Function fn:one-or-more requires at least one item.', span, {
            functionName: normalized,
            expectedType: 'one or more item()',
            actualType: helpers.describeItemsType(items),
          });
        }
        return items;
      }
      case 'fn:zero-or-one': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        if (items.length > 1) {
          throw helpers.createXPathError(FORG0005, 'Function fn:zero-or-one requires zero or one item.', span, {
            functionName: normalized,
            expectedType: 'zero or one item()',
            actualType: helpers.describeItemsType(items),
          });
        }
        return items;
      }
      case 'fn:deep-equal':
        helpers.requireArity(normalized, args, 2, span);
        return [createXdmBoolean(helpers.deepEqualSequences(
          helpers.evaluateExpression(args[0]!, context),
          helpers.evaluateExpression(args[1]!, context),
        ))];
      case 'fn:QName':
        helpers.requireArity(normalized, args, 2, span);
        evaluateSingletonStringishArg(args[0]!, context, span, normalized);
        return [createXdmQName(itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized)))];
      case 'map:entry': {
        helpers.requireArity(normalized, args, 2, span);
        const keyItems = helpers.evaluateExpression(args[0]!, context);
        if (keyItems.length !== 1 || keyItems[0]?.xdmKind !== 'atomic') {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton atomic key argument.`, span, {
            functionName: normalized,
            expectedType: 'singleton atomic key',
            actualType: helpers.describeItemsType(keyItems),
          });
        }
        return [createXdmMap([{ key: keyItems[0] as XdmAtomicValue, value: helpers.evaluateExpression(args[1]!, context) }])];
      }
      case 'fn:local-name-from-QName': {
        helpers.requireArity(normalized, args, 1, span);
        const item = evaluateOptionalSingletonItemArg(normalized, args, context, span);
        if (item === undefined) {
          return [];
        }
        const atomic = item.xdmKind === 'atomic' ? item as XdmAtomicValue : undefined;
        if (atomic === undefined || atomic.type !== 'xs:QName') {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires an xs:QName argument.`, span, {
            functionName: normalized,
            expectedType: 'xs:QName?',
            actualType: helpers.describeItemType(item),
          });
        }
        return [createXdmString(getLocalNameFromQName(atomic.value as string))];
      }
      case 'fn:error':
        helpers.requireArity(normalized, args, 0, span);
        throw helpers.createXPathError(FOER0000, 'fn:error() was invoked.', span, {
          functionName: normalized,
        });
      case 'fn:trace':
        helpers.requireArity(normalized, args, 2, span);
        evaluateSingletonStringishArg(args[1]!, context, span, normalized);
        return helpers.evaluateExpression(args[0]!, context);
      case 'fn:boolean':
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmBoolean(helpers.effectiveBooleanValue(helpers.evaluateExpression(args[0]!, context), span))];
      case 'fn:not':
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmBoolean(!helpers.effectiveBooleanValue(helpers.evaluateExpression(args[0]!, context), span))];
      case 'fn:string': {
        const item = evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmString(itemToStringValue(item, span))];
      }
      case 'fn:string-length': {
        const item = evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmInteger(Array.from(itemToStringValue(item, span)).length)];
      }
      case 'fn:substring': {
        if (args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, '2..3', span);
        }
        const source = itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
        const start = xpathRound(helpers.requireSingleNumber(helpers.evaluateExpression(args[1]!, context), span));
        if (args.length === 2) {
          return [createXdmString(xpathSubstring(source, start))];
        }
        const length = xpathRound(helpers.requireSingleNumber(helpers.evaluateExpression(args[2]!, context), span));
        return [createXdmString(xpathSubstring(source, start, length))];
      }
      case 'fn:codepoints-to-string': {
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmString(codepointsToString(helpers.evaluateExpression(args[0]!, context), span))];
      }
      case 'fn:string-to-codepoints': {
        helpers.requireArity(normalized, args, 1, span);
        return stringToCodepoints(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
      }
      case 'fn:concat': {
        if (args.length < 2) {
          helpers.throwArityError(normalized, args.length, '>=2', span);
        }
        return [createXdmString(args.map((arg) => itemToStringValue(evaluateSingletonStringishArg(arg, context, span, normalized), span)).join(''))];
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
            throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton separator argument.`, span, {
              functionName: normalized,
              expectedType: 'singleton item() as separator',
              actualType: helpers.describeItemsType(separatorItems),
            });
          }
          separator = itemToStringValue(separatorItems[0]!, span);
        }
        return [createXdmString(items.map((item) => itemToStringValue(item, span)).join(separator))];
      }
      case 'fn:matches': {
        if (args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, '2..3', span);
        }
        const input = itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
        const patternItems = helpers.evaluateExpression(args[1]!, context);
        if (patternItems.length !== 1) {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton pattern argument.`, span, {
            functionName: normalized,
            expectedType: 'singleton item() as pattern',
            actualType: helpers.describeItemsType(patternItems),
          });
        }
        const pattern = itemToStringValue(patternItems[0]!, span);
        let flags = '';
        if (args.length === 3) {
          const flagItems = helpers.evaluateExpression(args[2]!, context);
          if (flagItems.length !== 1) {
            throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton flags argument.`, span, {
              functionName: normalized,
              expectedType: 'singleton item() as flags',
              actualType: helpers.describeItemsType(flagItems),
            });
          }
          flags = itemToStringValue(flagItems[0]!, span);
        }
        return [createXdmBoolean(compileRegex(pattern, flags, span).test(input))];
      }
      case 'fn:replace': {
        if (args.length !== 3 && args.length !== 4) {
          helpers.throwArityError(normalized, args.length, '3..4', span);
        }
        const input = itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
        const patternItems = helpers.evaluateExpression(args[1]!, context);
        if (patternItems.length !== 1) {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton pattern argument.`, span, {
            functionName: normalized,
            expectedType: 'singleton item() as pattern',
            actualType: helpers.describeItemsType(patternItems),
          });
        }
        const pattern = itemToStringValue(patternItems[0]!, span);
        const flags = args.length === 4
          ? itemToStringValue(evaluateSingletonStringishArg(args[3]!, context, span, normalized), span)
          : '';
        const replacementItems = helpers.evaluateExpression(args[2]!, context);
        if (replacementItems.length !== 1) {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton replacement argument.`, span, {
            functionName: normalized,
            expectedType: 'singleton item() as replacement',
            actualType: helpers.describeItemsType(replacementItems),
          });
        }
        const replacement = itemToStringValue(replacementItems[0]!, span);
        return [createXdmString(
          input.replace(
            compileRegexRejectingZeroLengthMatches(pattern, flags, span),
            flags.includes('q')
              ? replacement.replace(/\$/g, '$$$$')
              : translateReplacementString(replacement, span),
          ),
        )];
      }
      case 'fn:tokenize': {
        if (args.length !== 1 && args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, '1..3', span);
        }
        const input = itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
        if (args.length === 1) {
          return xpathTokenizeOnWhitespace(input).map(createXdmString);
        }
        const patternItems = helpers.evaluateExpression(args[1]!, context);
        if (patternItems.length !== 1) {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton pattern argument.`, span, {
            functionName: normalized,
            expectedType: 'singleton item() as pattern',
            actualType: helpers.describeItemsType(patternItems),
          });
        }
        const pattern = itemToStringValue(patternItems[0]!, span);
        const flags = args.length === 3
          ? itemToStringValue(evaluateSingletonStringishArg(args[2]!, context, span, normalized), span)
          : '';
        return xpathTokenize(input, compileRegexRejectingZeroLengthMatches(pattern, flags, span)).map(createXdmString);
      }
      case 'fn:normalize-space': {
        const item = evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmString(normalizeSpace(itemToStringValue(item, span)))];
      }
      case 'fn:translate': {
        helpers.requireArity(normalized, args, 3, span);
        const input = itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
        const mapFrom = itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized), span);
        const mapTo = itemToStringValue(evaluateSingletonStringishArg(args[2]!, context, span, normalized), span);
        return [createXdmString(xpathTranslate(input, mapFrom, mapTo))];
      }
      case 'fn:contains':
        helpers.requireArity(normalized, args, 2, span);
        return [
          createXdmBoolean(
            itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span).includes(
              itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized), span),
            ),
          ),
        ];
      case 'fn:starts-with':
        helpers.requireArity(normalized, args, 2, span);
        return [
          createXdmBoolean(
            itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span).startsWith(
              itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized), span),
            ),
          ),
        ];
      case 'fn:ends-with':
        helpers.requireArity(normalized, args, 2, span);
        return [
          createXdmBoolean(
            itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span).endsWith(
              itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized), span),
            ),
          ),
        ];
      case 'fn:upper-case': {
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmString(itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span).toUpperCase())];
      }
      case 'fn:lower-case': {
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmString(itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span).toLowerCase())];
      }
      case 'fn:number': {
        const item = evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmNumber(itemToNumberValue(item))];
      }
      case 'fn:sum': {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, '1..2', span);
        }
        const values = helpers.atomizedNumericValues(helpers.evaluateExpression(args[0]!, context), span, normalized);
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
        validateSupportedCollationArg(normalized, args[1], context, span);
        const values = helpers.atomizedComparableValues(helpers.evaluateExpression(args[0]!, context), span, normalized);
        return values.length === 0 ? [] : [createAtomicValueFromAtomized(values.reduce((current, candidate) =>
          helpers.compareComparableValues(candidate, current) < 0 ? candidate : current,
        ))];
      }
      case 'fn:max': {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, '1..2', span);
        }
        validateSupportedCollationArg(normalized, args[1], context, span);
        const values = helpers.atomizedComparableValues(helpers.evaluateExpression(args[0]!, context), span, normalized);
        return values.length === 0 ? [] : [createAtomicValueFromAtomized(values.reduce((current, candidate) =>
          helpers.compareComparableValues(candidate, current) > 0 ? candidate : current,
        ))];
      }
      case 'fn:avg': {
        helpers.requireArity(normalized, args, 1, span);
        const values = helpers.atomizedNumericValues(helpers.evaluateExpression(args[0]!, context), span, normalized);
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
          results.push(createAtomicValueFromAtomized(item));
        }
        return results;
      }
      case 'fn:data': {
        if (args.length === 0) {
          const item = helpers.requireContextItem(context, span);
          return helpers.atomizeItems([item]).map(createAtomicValueFromAtomized);
        }
        helpers.requireArity(normalized, args, 1, span);
        return helpers.atomizeItems(helpers.evaluateExpression(args[0]!, context)).map(createAtomicValueFromAtomized);
      }
      case 'fn:root': {
        const item = evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        if (item === undefined) {
          return [];
        }
        return [getRootNode(item)];
      }
      case 'fn:reverse':
        helpers.requireArity(normalized, args, 1, span);
        return [...helpers.evaluateExpression(args[0]!, context)].reverse();
      case 'fn:head': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        return items.length === 0 ? [] : [items[0]!];
      }
      case 'fn:tail': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        return items.slice(1);
      }
      case 'fn:remove': {
        helpers.requireArity(normalized, args, 2, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        const position = Math.trunc(helpers.requireSingleNumber(helpers.evaluateExpression(args[1]!, context), span));
        if (position < 1 || position > items.length) {
          return items;
        }
        return items.filter((_, index) => index !== position - 1);
      }
      case 'fn:subsequence': {
        if (args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, '2..3', span);
        }
        const items = helpers.evaluateExpression(args[0]!, context);
        const start = xpathRound(helpers.requireSingleNumber(helpers.evaluateExpression(args[1]!, context), span));
        if (args.length === 2) {
          return items.filter((_, index) => index + 1 >= start);
        }
        const length = xpathRound(helpers.requireSingleNumber(helpers.evaluateExpression(args[2]!, context), span));
        const end = start + length;
        return items.filter((_, index) => {
          const position = index + 1;
          return position >= start && position < end;
        });
      }
      case 'fn:name': {
        const item = evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(getNodeNameValue(item))];
      }
      case 'fn:local-name': {
        const item = evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(getLocalNameValue(item))];
      }
      case 'fn:namespace-uri': {
        const item = evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(getNamespaceUriValue(item))];
      }
      case 'fn:generate-id': {
        const item = evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(getGeneratedNodeId(item))];
      }
      case 'fn:node-name': {
        const item = evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        const name = getNodeNameValue(item);
        return name.length === 0 ? [] : [createXdmQName(name)];
      }
      case 'fn:true':
        helpers.requireArity(normalized, args, 0, span);
        return [createXdmBoolean(true)];
      case 'fn:false':
        helpers.requireArity(normalized, args, 0, span);
        return [createXdmBoolean(false)];
      case 'fn:abs': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        return items.length === 0 ? [] : [createXdmNumber(Math.abs(helpers.requireSingleNumber(items, span)))];
      }
      case 'fn:floor': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        return items.length === 0 ? [] : [createXdmNumber(Math.floor(helpers.requireSingleNumber(items, span)))];
      }
      case 'fn:ceiling': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        return items.length === 0 ? [] : [createXdmNumber(Math.ceil(helpers.requireSingleNumber(items, span)))];
      }
      case 'fn:round':
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, '1..2', span);
        }
        const roundedItems = helpers.evaluateExpression(args[0]!, context);
        if (roundedItems.length === 0) {
          return [];
        }
        return [createXdmNumber(roundToPrecision(
          helpers.requireSingleNumber(roundedItems, span),
          args.length === 2 ? helpers.requireSingleInteger(helpers.evaluateExpression(args[1]!, context), span, 'Round precision') : 0,
        ))];
      default:
        throw helpers.createXPathError(XPST0017, `Unknown function ${callee} with arity ${args.length}.`, span, {
          functionName: callee,
          actualArity: args.length,
        });
    }
  }

  return {
    evaluateFunctionCall,
  };
}