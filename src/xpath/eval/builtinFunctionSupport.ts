import type { Node } from '@xmldom/xmldom';

import { FOCH0001, FOCH0002, FOTY0014, XPTY0004 } from '../../errors/codes.js';
import type { DynamicContext } from './context.js';
import {
  createXdmBoolean,
  createXdmInteger,
  createXdmNumber,
  createXdmString,
  getNodeStringValue,
  type XdmAtomicValue,
  type XdmItem,
  type XdmNode,
} from '../../xdm/types.js';
import type { XPathAst } from '../parse/ast.js';

type SpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

type BuiltinFunctionSupportHelpers = {
  evaluateExpression(ast: XPathAst, context: DynamicContext): XdmItem[];
  requireArity(name: string, args: readonly XPathAst[], expected: number, span: SpanLike): void;
  createXPathError(code: string, message: string, span: SpanLike, details?: Readonly<Record<string, unknown>>): Error;
  describeItemsType(items: readonly XdmItem[]): string;
  describeItemType(item: XdmItem): string;
  requireContextItem(context: DynamicContext, span: SpanLike): XdmItem;
};

const GENERATED_NODE_IDS = new WeakMap<Node, string>();
let nextGeneratedNodeId = 1;

export function createBuiltinFunctionSupport(helpers: BuiltinFunctionSupportHelpers): {
  evaluateOptionalSingletonItemArg(name: string, args: readonly XPathAst[], context: DynamicContext, span: SpanLike): XdmItem | undefined;
  evaluateOptionalSingletonNodeArg(name: string, args: readonly XPathAst[], context: DynamicContext, span: SpanLike): XdmNode | undefined;
  evaluateSingletonStringishArg(arg: XPathAst, context: DynamicContext, span: SpanLike, name: string): XdmItem | undefined;
  itemToStringValue(item: XdmItem | undefined, span?: SpanLike): string;
  xpathTokenize(input: string, regex: RegExp): string[];
  xpathTokenizeOnWhitespace(input: string): string[];
  xpathSubstring(source: string, roundedStart: number, roundedLength?: number): string;
  xpathRound(value: number): number;
  roundToPrecision(value: number, precision: number): number;
  validateSupportedCollationArg(functionName: string, arg: XPathAst | undefined, context: DynamicContext, span: SpanLike): void;
  codepointsToString(items: readonly XdmItem[], span: SpanLike): string;
  stringToCodepoints(item: XdmItem | undefined, span: SpanLike): XdmAtomicValue[];
  itemToNumberValue(item: XdmItem | undefined): number;
  createAtomicValueFromAtomized(value: boolean | number | string): XdmAtomicValue;
  normalizeSpace(value: string): string;
  xpathTranslate(input: string, mapFrom: string, mapTo: string): string;
  getGeneratedNodeId(node: XdmNode | undefined): string;
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
      return getNodeStringValue((item as XdmNode).node);
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

  function itemToNumberValue(item: XdmItem | undefined): number {
    if (item === undefined) {
      return Number.NaN;
    }

    if (item.xdmKind === 'node') {
      return Number(getNodeStringValue((item as XdmNode).node));
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

  return {
    evaluateOptionalSingletonItemArg,
    evaluateOptionalSingletonNodeArg,
    evaluateSingletonStringishArg,
    itemToStringValue,
    xpathTokenize,
    xpathTokenizeOnWhitespace,
    xpathSubstring,
    xpathRound,
    roundToPrecision,
    validateSupportedCollationArg,
    codepointsToString,
    stringToCodepoints,
    itemToNumberValue,
    createAtomicValueFromAtomized,
    normalizeSpace,
    xpathTranslate,
    getGeneratedNodeId,
  };
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

function isValidXmlCodepoint(codepoint: number): boolean {
  return codepoint === 0x9
    || codepoint === 0xA
    || codepoint === 0xD
    || (codepoint >= 0x20 && codepoint <= 0xD7FF)
    || (codepoint >= 0xE000 && codepoint <= 0xFFFD)
    || (codepoint >= 0x10000 && codepoint <= 0x10FFFF);
}
