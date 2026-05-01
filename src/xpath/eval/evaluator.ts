/**
 * XPath evaluator.
 *
 * Walks a parsed XPath AST and produces an XDM sequence given a dynamic
 * context.
 */

import type { Node } from '@xmldom/xmldom';

import { FOAR0001, FOCH0001, FOCH0002, FOER0000, FORG0001, FORG0005, FORG0006, FOTY0014, XPDY0002, XPST0008, XPST0017, XPST0081, XPTY0004, XPTY0019 } from '../../errors/codes.js';
import { XPathError } from '../../errors/XPathError.js';
import type { ErrorDetails } from '../../errors/XdmError.js';
import { createSequence, materialize } from '../../xdm/sequence.js';
import {
  createXdmArray,
  createXdmBoolean,
  createXdmInteger,
  createXdmMap,
  createXdmNode,
  createXdmNumber,
  createXdmQName,
  createXdmString,
  type XdmArray,
  type XdmAtomicValue,
  type XdmItem,
  type XdmNode,
  type XdmSequence,
} from '../../xdm/types.js';
import type { DynamicContext } from './context.js';
import { compileRegex, compileRegexRejectingZeroLengthMatches, translateReplacementString } from './regex.js';
import type { FilterExpression, PathExpression, PathSegment, StepExpression, XPathAst, XPathBinaryOperator } from '../parse/ast.js';

type SpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

const PREDEFINED_NAMESPACE_PREFIXES = new Map<string, string>([
  ['array', 'http://www.w3.org/2005/xpath-functions/array'],
  ['fn', 'http://www.w3.org/2005/xpath-functions'],
  ['map', 'http://www.w3.org/2005/xpath-functions/map'],
  ['math', 'http://www.w3.org/2005/xpath-functions/math'],
  ['xml', 'http://www.w3.org/XML/1998/namespace'],
  ['xs', 'http://www.w3.org/2001/XMLSchema'],
]);

export function evaluate(ast: XPathAst, context: DynamicContext): XdmSequence {
  return createSequence(evaluateExpression(ast, context));
}

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

function evaluateFunctionCall(
  callee: string,
  args: readonly XPathAst[],
  context: DynamicContext,
  span: SpanLike,
): XdmItem[] {
  const normalized = callee.includes(':') ? callee : `fn:${callee}`;

  switch (normalized) {
    case 'fn:position':
      requireArity(normalized, args, 0, span);
      requireContextItem(context, span);
      return [createXdmInteger(context.contextPosition)];
    case 'fn:last':
      requireArity(normalized, args, 0, span);
      requireContextItem(context, span);
      return [createXdmInteger(context.contextSize)];
    case 'fn:count':
      requireArity(normalized, args, 1, span);
      return [createXdmInteger(evaluateExpression(args[0]!, context).length)];
    case 'fn:exists':
      requireArity(normalized, args, 1, span);
      return [createXdmBoolean(evaluateExpression(args[0]!, context).length > 0)];
    case 'fn:empty':
      requireArity(normalized, args, 1, span);
      return [createXdmBoolean(evaluateExpression(args[0]!, context).length === 0)];
    case 'fn:exactly-one': {
      requireArity(normalized, args, 1, span);
      const items = evaluateExpression(args[0]!, context);
      if (items.length !== 1) {
        throw createXPathError(FORG0005, 'Function fn:exactly-one requires exactly one item.', span, {
          functionName: normalized,
          expectedType: 'exactly one item()',
          actualType: describeItemsType(items),
        });
      }
      return [items[0]!];
    }
    case 'fn:one-or-more': {
      requireArity(normalized, args, 1, span);
      const items = evaluateExpression(args[0]!, context);
      if (items.length === 0) {
        throw createXPathError(FORG0005, 'Function fn:one-or-more requires at least one item.', span, {
          functionName: normalized,
          expectedType: 'one or more item()',
          actualType: describeItemsType(items),
        });
      }
      return items;
    }
    case 'fn:zero-or-one': {
      requireArity(normalized, args, 1, span);
      const items = evaluateExpression(args[0]!, context);
      if (items.length > 1) {
        throw createXPathError(FORG0005, 'Function fn:zero-or-one requires zero or one item.', span, {
          functionName: normalized,
          expectedType: 'zero or one item()',
          actualType: describeItemsType(items),
        });
      }
      return items;
    }
    case 'fn:deep-equal':
      requireArity(normalized, args, 2, span);
      return [createXdmBoolean(deepEqualSequences(
        evaluateExpression(args[0]!, context),
        evaluateExpression(args[1]!, context),
      ))];
    case 'fn:QName':
      requireArity(normalized, args, 2, span);
      evaluateSingletonStringishArg(args[0]!, context, span, normalized);
      return [createXdmQName(itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized)))];
    case 'map:entry': {
      requireArity(normalized, args, 2, span);
      const keyItems = evaluateExpression(args[0]!, context);
      if (keyItems.length !== 1 || keyItems[0]?.xdmKind !== 'atomic') {
        throw createXPathError(XPTY0004, `Function ${normalized} requires a singleton atomic key argument.`, span, {
          functionName: normalized,
          expectedType: 'singleton atomic key',
          actualType: describeItemsType(keyItems),
        });
      }
      return [createXdmMap([{ key: keyItems[0] as XdmAtomicValue, value: evaluateExpression(args[1]!, context) }])];
    }
    case 'fn:local-name-from-QName': {
      requireArity(normalized, args, 1, span);
      const item = evaluateOptionalSingletonItemArg(normalized, args, context, span);
      if (item === undefined) {
        return [];
      }
      const atomic = item.xdmKind === 'atomic' ? item as XdmAtomicValue : undefined;
      if (atomic === undefined || atomic.type !== 'xs:QName') {
        throw createXPathError(XPTY0004, `Function ${normalized} requires an xs:QName argument.`, span, {
          functionName: normalized,
          expectedType: 'xs:QName?',
          actualType: describeItemType(item),
        });
      }
      return [createXdmString(getLocalNameFromQName(atomic.value as string))];
    }
    case 'fn:error':
      requireArity(normalized, args, 0, span);
      throw createXPathError(FOER0000, 'fn:error() was invoked.', span, {
        functionName: normalized,
      });
    case 'fn:trace':
      requireArity(normalized, args, 2, span);
      evaluateSingletonStringishArg(args[1]!, context, span, normalized);
      return evaluateExpression(args[0]!, context);
    case 'fn:boolean':
      requireArity(normalized, args, 1, span);
      return [createXdmBoolean(effectiveBooleanValue(evaluateExpression(args[0]!, context), span))];
    case 'fn:not':
      requireArity(normalized, args, 1, span);
      return [createXdmBoolean(!effectiveBooleanValue(evaluateExpression(args[0]!, context), span))];
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
        throwArityError(normalized, args.length, '2..3', span);
      }
      const source = itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
      const start = xpathRound(requireSingleNumber(evaluateExpression(args[1]!, context), span));
      if (args.length === 2) {
        return [createXdmString(xpathSubstring(source, start))];
      }
      const length = xpathRound(requireSingleNumber(evaluateExpression(args[2]!, context), span));
      return [createXdmString(xpathSubstring(source, start, length))];
    }
    case 'fn:codepoints-to-string': {
      requireArity(normalized, args, 1, span);
      return [createXdmString(codepointsToString(evaluateExpression(args[0]!, context), span))];
    }
    case 'fn:string-to-codepoints': {
      requireArity(normalized, args, 1, span);
      return stringToCodepoints(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
    }
    case 'fn:concat': {
      if (args.length < 2) {
        throwArityError(normalized, args.length, '>=2', span);
      }
      return [createXdmString(args.map((arg) => itemToStringValue(evaluateSingletonStringishArg(arg, context, span, normalized), span)).join(''))];
    }
    case 'fn:string-join': {
      if (args.length !== 1 && args.length !== 2) {
        throwArityError(normalized, args.length, '1..2', span);
      }
      const items = evaluateExpression(args[0]!, context);
      let separator = '';
      if (args.length === 2) {
        const separatorItems = evaluateExpression(args[1]!, context);
        if (separatorItems.length !== 1) {
          throw createXPathError(XPTY0004, `Function ${normalized} requires a singleton separator argument.`, span, {
            functionName: normalized,
            expectedType: 'singleton item() as separator',
            actualType: describeItemsType(separatorItems),
          });
        }
        separator = itemToStringValue(separatorItems[0]!, span);
      }
      return [createXdmString(items.map((item) => itemToStringValue(item, span)).join(separator))];
    }
    case 'fn:matches': {
      if (args.length !== 2 && args.length !== 3) {
        throwArityError(normalized, args.length, '2..3', span);
      }
      const input = itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
      const patternItems = evaluateExpression(args[1]!, context);
      if (patternItems.length !== 1) {
        throw createXPathError(XPTY0004, `Function ${normalized} requires a singleton pattern argument.`, span, {
          functionName: normalized,
          expectedType: 'singleton item() as pattern',
          actualType: describeItemsType(patternItems),
        });
      }
      const pattern = itemToStringValue(patternItems[0]!, span);
      let flags = '';
      if (args.length === 3) {
        const flagItems = evaluateExpression(args[2]!, context);
        if (flagItems.length !== 1) {
          throw createXPathError(XPTY0004, `Function ${normalized} requires a singleton flags argument.`, span, {
            functionName: normalized,
            expectedType: 'singleton item() as flags',
            actualType: describeItemsType(flagItems),
          });
        }
        flags = itemToStringValue(flagItems[0]!, span);
      }
      return [createXdmBoolean(compileRegex(pattern, flags, span).test(input))];
    }
    case 'fn:replace': {
      if (args.length !== 3 && args.length !== 4) {
        throwArityError(normalized, args.length, '3..4', span);
      }
      const input = itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
      const patternItems = evaluateExpression(args[1]!, context);
      if (patternItems.length !== 1) {
        throw createXPathError(XPTY0004, `Function ${normalized} requires a singleton pattern argument.`, span, {
          functionName: normalized,
          expectedType: 'singleton item() as pattern',
          actualType: describeItemsType(patternItems),
        });
      }
      const pattern = itemToStringValue(patternItems[0]!, span);
      const flags = args.length === 4
        ? itemToStringValue(evaluateSingletonStringishArg(args[3]!, context, span, normalized), span)
        : '';
      const replacementItems = evaluateExpression(args[2]!, context);
      if (replacementItems.length !== 1) {
        throw createXPathError(XPTY0004, `Function ${normalized} requires a singleton replacement argument.`, span, {
          functionName: normalized,
          expectedType: 'singleton item() as replacement',
          actualType: describeItemsType(replacementItems),
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
        throwArityError(normalized, args.length, '1..3', span);
      }
      const input = itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
      if (args.length === 1) {
        return xpathTokenizeOnWhitespace(input).map(createXdmString);
      }
      const patternItems = evaluateExpression(args[1]!, context);
      if (patternItems.length !== 1) {
        throw createXPathError(XPTY0004, `Function ${normalized} requires a singleton pattern argument.`, span, {
          functionName: normalized,
          expectedType: 'singleton item() as pattern',
          actualType: describeItemsType(patternItems),
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
      requireArity(normalized, args, 3, span);
      const input = itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span);
      const mapFrom = itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized), span);
      const mapTo = itemToStringValue(evaluateSingletonStringishArg(args[2]!, context, span, normalized), span);
      return [createXdmString(xpathTranslate(input, mapFrom, mapTo))];
    }
    case 'fn:contains':
      requireArity(normalized, args, 2, span);
      return [
        createXdmBoolean(
          itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span).includes(
            itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized), span),
          ),
        ),
      ];
    case 'fn:starts-with':
      requireArity(normalized, args, 2, span);
      return [
        createXdmBoolean(
          itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span).startsWith(
            itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized), span),
          ),
        ),
      ];
    case 'fn:ends-with':
      requireArity(normalized, args, 2, span);
      return [
        createXdmBoolean(
          itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span).endsWith(
            itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized), span),
          ),
        ),
      ];
    case 'fn:upper-case': {
      requireArity(normalized, args, 1, span);
      return [createXdmString(itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span).toUpperCase())];
    }
    case 'fn:lower-case': {
      requireArity(normalized, args, 1, span);
      return [createXdmString(itemToStringValue(evaluateSingletonStringishArg(args[0]!, context, span, normalized), span).toLowerCase())];
    }
    case 'fn:number': {
      const item = evaluateOptionalSingletonItemArg(normalized, args, context, span);
      return [createXdmNumber(itemToNumberValue(item))];
    }
    case 'fn:sum': {
      if (args.length !== 1 && args.length !== 2) {
        throwArityError(normalized, args.length, '1..2', span);
      }
      const values = atomizedNumericValues(evaluateExpression(args[0]!, context), span, normalized);
      if (values.length === 0) {
        if (args.length === 1) {
          return [createXdmNumber(0)];
        }
        return evaluateExpression(args[1]!, context);
      }
      return [createXdmNumber(values.reduce((total, value) => total + value, 0))];
    }
    case 'fn:min': {
      if (args.length !== 1 && args.length !== 2) {
        throwArityError(normalized, args.length, '1..2', span);
      }
      validateSupportedCollationArg(normalized, args[1], context, span);
      const values = atomizedComparableValues(evaluateExpression(args[0]!, context), span, normalized);
      return values.length === 0 ? [] : [createAtomicValueFromAtomized(values.reduce((current, candidate) =>
        compareComparableValues(candidate, current) < 0 ? candidate : current,
      ))];
    }
    case 'fn:max': {
      if (args.length !== 1 && args.length !== 2) {
        throwArityError(normalized, args.length, '1..2', span);
      }
      validateSupportedCollationArg(normalized, args[1], context, span);
      const values = atomizedComparableValues(evaluateExpression(args[0]!, context), span, normalized);
      return values.length === 0 ? [] : [createAtomicValueFromAtomized(values.reduce((current, candidate) =>
        compareComparableValues(candidate, current) > 0 ? candidate : current,
      ))];
    }
    case 'fn:avg': {
      requireArity(normalized, args, 1, span);
      const values = atomizedNumericValues(evaluateExpression(args[0]!, context), span, normalized);
      return values.length === 0
        ? []
        : [createXdmNumber(values.reduce((total, value) => total + value, 0) / values.length)];
    }
    case 'fn:distinct-values': {
      requireArity(normalized, args, 1, span);
      const items = atomizeItems(evaluateExpression(args[0]!, context));
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
        const item = requireContextItem(context, span);
        return atomizeItems([item]).map(createAtomicValueFromAtomized);
      }
      requireArity(normalized, args, 1, span);
      return atomizeItems(evaluateExpression(args[0]!, context)).map(createAtomicValueFromAtomized);
    }
    case 'fn:root': {
      const item = evaluateOptionalSingletonNodeArg(normalized, args, context, span);
      if (item === undefined) {
        return [];
      }
      return [getRootNode(item)];
    }
    case 'fn:reverse':
      requireArity(normalized, args, 1, span);
      return [...evaluateExpression(args[0]!, context)].reverse();
    case 'fn:head': {
      requireArity(normalized, args, 1, span);
      const items = evaluateExpression(args[0]!, context);
      return items.length === 0 ? [] : [items[0]!];
    }
    case 'fn:tail': {
      requireArity(normalized, args, 1, span);
      const items = evaluateExpression(args[0]!, context);
      return items.slice(1);
    }
    case 'fn:remove': {
      requireArity(normalized, args, 2, span);
      const items = evaluateExpression(args[0]!, context);
      const position = Math.trunc(requireSingleNumber(evaluateExpression(args[1]!, context), span));
      if (position < 1 || position > items.length) {
        return items;
      }
      return items.filter((_, index) => index !== position - 1);
    }
    case 'fn:subsequence': {
      if (args.length !== 2 && args.length !== 3) {
        throwArityError(normalized, args.length, '2..3', span);
      }
      const items = evaluateExpression(args[0]!, context);
      const start = xpathRound(requireSingleNumber(evaluateExpression(args[1]!, context), span));
      if (args.length === 2) {
        return items.filter((_, index) => index + 1 >= start);
      }
      const length = xpathRound(requireSingleNumber(evaluateExpression(args[2]!, context), span));
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
    case 'fn:node-name': {
      const item = evaluateOptionalSingletonNodeArg(normalized, args, context, span);
      const name = getNodeNameValue(item);
      return name.length === 0 ? [] : [createXdmQName(name)];
    }
    case 'fn:true':
      requireArity(normalized, args, 0, span);
      return [createXdmBoolean(true)];
    case 'fn:false':
      requireArity(normalized, args, 0, span);
      return [createXdmBoolean(false)];
    case 'fn:abs': {
      requireArity(normalized, args, 1, span);
      const items = evaluateExpression(args[0]!, context);
      return items.length === 0 ? [] : [createXdmNumber(Math.abs(requireSingleNumber(items, span)))];
    }
    case 'fn:floor': {
      requireArity(normalized, args, 1, span);
      const items = evaluateExpression(args[0]!, context);
      return items.length === 0 ? [] : [createXdmNumber(Math.floor(requireSingleNumber(items, span)))];
    }
    case 'fn:ceiling': {
      requireArity(normalized, args, 1, span);
      const items = evaluateExpression(args[0]!, context);
      return items.length === 0 ? [] : [createXdmNumber(Math.ceil(requireSingleNumber(items, span)))];
    }
    case 'fn:round':
      if (args.length !== 1 && args.length !== 2) {
        throwArityError(normalized, args.length, '1..2', span);
      }
      const roundedItems = evaluateExpression(args[0]!, context);
      if (roundedItems.length === 0) {
        return [];
      }
      return [createXdmNumber(roundToPrecision(
        requireSingleNumber(roundedItems, span),
        args.length === 2 ? requireSingleInteger(evaluateExpression(args[1]!, context), span, 'Round precision') : 0,
      ))];
    default:
      throw createXPathError(XPST0017, `Unknown function ${callee} with arity ${args.length}.`, span, {
        functionName: callee,
        actualArity: args.length,
      });
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
      itemToStringValue(evaluateSingletonStringishArg(leftAst, context, span, 'operator ||'), span)
      + itemToStringValue(evaluateSingletonStringishArg(rightAst, context, span, 'operator ||'), span),
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

function selectAxis(step: StepExpression, node: Node): XdmNode[] {
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
  return matchesQualifiedNodeName(step.nodeTest.name, node, context, step.axis === 'attribute');
}

function matchesQualifiedNodeName(name: string, node: Node, context: DynamicContext, isAttributeAxis: boolean): boolean {
  const separator = name.indexOf(':');
  const localName = getNodeLocalName(node);

  if (separator >= 0) {
    const prefix = name.slice(0, separator);
    const namespaceUri = context.staticContext.namespaces.get(prefix) ?? PREDEFINED_NAMESPACE_PREFIXES.get(prefix);
    if (namespaceUri === undefined) {
      return false;
    }

    return localName === name.slice(separator + 1) && (node.namespaceURI ?? '') === namespaceUri;
  }

  const expectedNamespace = isAttributeAxis ? '' : context.staticContext.defaultElementNamespace;
  return localName === name && (node.namespaceURI ?? '') === expectedNamespace;
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

function requireContextItem(context: DynamicContext, span: SpanLike): XdmItem {
  const items = coerceValueToItems(context.contextItem, span);
  const item = items[0];
  if (item === undefined) {
    throw createXPathError(XPDY0002, 'The XPath expression requires a context item.', span);
  }
  if (items.length !== 1) {
    throw createXPathError(XPTY0004, 'The XPath expression requires a single context item.', span, {
      expectedType: 'singleton item()',
      actualType: describeItemsType(items),
    });
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
  let parent = getParentNode(current);
  while (parent !== null) {
    current = parent;
    parent = getParentNode(current);
  }
  return createXdmNode(current);
}

function getParentNode(node: Node): Node | null {
  const ownerElement = (node as Node & { ownerElement?: Node | null }).ownerElement;
  return node.parentNode ?? ownerElement ?? null;
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

function resolveVariableReference(name: string, context: DynamicContext, span: SpanLike): XdmItem[] {
  const separator = name.indexOf(':');
  const value = separator >= 0
    ? resolvePrefixedVariableReference(name, separator, context, span)
    : context.variables.get(name) ?? context.variables.get(`{}${name}`);
  if (value === undefined) {
    throw createXPathError(XPST0008, `Unknown variable $${name}.`, span);
  }
  return coerceValueToItems(value, span);
}

function resolvePrefixedVariableReference(
  name: string,
  separator: number,
  context: DynamicContext,
  span: SpanLike,
): unknown {
  const prefix = name.slice(0, separator);
  const localName = name.slice(separator + 1);
  const namespaceUri = context.staticContext.namespaces.get(prefix) ?? PREDEFINED_NAMESPACE_PREFIXES.get(prefix);

  if (namespaceUri === undefined) {
    throw createXPathError(XPST0081, `Unknown namespace prefix ${JSON.stringify(prefix)} in variable reference.`, span, {
      namespacePrefix: prefix,
      variableName: name,
    });
  }

  return context.variables.get(`{${namespaceUri}}${localName}`) ?? context.variables.get(name);
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

  throw createXPathError(XPTY0004, 'Unsupported external value in the dynamic context.', span, {
    expectedType: 'supported XDM value',
    actualType: describeExternalValueType(value),
  });
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

function evaluateOptionalSingletonItemArg(
  name: string,
  args: readonly XPathAst[],
  context: DynamicContext,
  span: SpanLike,
): XdmItem | undefined {
  if (args.length === 0) {
    return requireContextItem(context, span);
  }

  requireArity(name, args, 1, span);
  const items = evaluateExpression(args[0]!, context);
  if (items.length === 0) {
    return undefined;
  }
  if (items.length !== 1) {
    throw createXPathError(XPTY0004, `Function ${name} requires an empty sequence or singleton item.`, span, {
      functionName: name,
      expectedType: 'empty-sequence() or singleton item()',
      actualType: describeItemsType(items),
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
  if (!isXdmNode(item)) {
    throw createXPathError(XPTY0004, `Function ${name} requires a node argument.`, span, {
      functionName: name,
      expectedType: 'node()',
      actualType: describeItemType(item),
    });
  }
  return item;
}

function evaluateSingletonStringishArg(
  arg: XPathAst,
  context: DynamicContext,
  span: SpanLike,
  name: string,
): XdmItem | undefined {
  const items = evaluateExpression(arg, context);
  if (items.length === 0) {
    return undefined;
  }
  if (items.length !== 1) {
    throw createXPathError(XPTY0004, `Function ${name} requires empty-sequence() or a singleton item argument.`, span, {
      functionName: name,
      expectedType: 'empty-sequence() or singleton item()',
      actualType: describeItemsType(items),
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
    throw createXPathError(FOTY0014, 'The string value is not defined for this item kind.', span ?? {
      line: 1,
      column: 1,
      start: 0,
      endLine: 1,
      endColumn: 1,
      end: 0,
    }, {
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
    throw createXPathError(FOCH0002, `Function ${functionName} received an unsupported collation.`, span, {
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
      throw createXPathError(XPTY0004, 'Function fn:codepoints-to-string requires numeric codepoint arguments.', span, {
        expectedType: 'xs:integer*',
        actualType: describeItemsType([item]),
      });
    }

    const codepoint = (item as XdmAtomicValue).value as number;
    if (!Number.isInteger(codepoint) || !isValidXmlCodepoint(codepoint)) {
      throw createXPathError(FOCH0001, 'Function fn:codepoints-to-string received an invalid XML character codepoint.', span, {
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

function getNodeNameValue(node: XdmNode | undefined): string {
  if (node === undefined) {
    return '';
  }

  const namespacePrefix = getNamespaceDeclarationPrefix(node.node);
  if (namespacePrefix !== undefined) {
    return namespacePrefix;
  }

  const rawName = node.node.nodeName;
  return rawName.startsWith('#') ? '' : rawName;
}

function getLocalNameValue(node: XdmNode | undefined): string {
  const name = getNodeNameValue(node);
  return getLocalNameFromQName(name);
}

function getLocalNameFromQName(name: string): string {
  if (name.length === 0) {
    return '';
  }

  const separator = name.indexOf(':');
  return separator >= 0 ? name.slice(separator + 1) : name;
}

function getNodeLocalName(node: Node): string {
  const rawName = node.nodeName;
  if (rawName.startsWith('#')) {
    return '';
  }

  const separator = rawName.indexOf(':');
  return separator >= 0 ? rawName.slice(separator + 1) : rawName;
}

function getNodePrefix(node: Node): string {
  const rawName = node.nodeName;
  if (rawName.startsWith('#')) {
    return '';
  }

  const separator = rawName.indexOf(':');
  return separator >= 0 ? rawName.slice(0, separator) : '';
}

function getNamespaceDeclarationPrefix(node: Node): string | undefined {
  if (node.nodeName === 'xmlns') {
    return '';
  }
  if (node.nodeName.startsWith('xmlns:')) {
    return node.nodeName.slice('xmlns:'.length);
  }
  return undefined;
}

function getNamespaceNodePrefix(node: Node): string {
  return getNamespaceDeclarationPrefix(node) ?? '';
}

function compareGeneral(
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=',
  leftItems: readonly XdmItem[],
  rightItems: readonly XdmItem[],
  span: SpanLike,
): boolean {
  leftItems = expandArrayItems(leftItems);
  rightItems = expandArrayItems(rightItems);

  if (leftItems.length === 0 || rightItems.length === 0) {
    return false;
  }

  for (const leftItem of leftItems) {
    for (const rightItem of rightItems) {
      if (compareGeneralItems(operator, leftItem, rightItem, span)) {
        return true;
      }
    }
  }

  return false;
}

function compareGeneralItems(
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=',
  leftItem: XdmItem,
  rightItem: XdmItem,
  span: SpanLike,
): boolean {
  const left = atomizeGeneralComparisonOperand(leftItem);
  const right = atomizeGeneralComparisonOperand(rightItem);

  if (left.source === 'qname' || right.source === 'qname') {
    throw createXPathError(XPTY0004, 'General comparison requires comparable type families.', span, {
      expectedType: 'comparable general comparison operands',
      actualType: `${left.source} vs ${right.source}`,
    });
  }

  if (left.source === 'boolean' || right.source === 'boolean') {
    if (left.source === 'boolean' && right.source === 'boolean') {
      return compareScalars(operator, left.value, right.value);
    }

    if (left.source === 'boolean' && right.source === 'node') {
      return compareScalars(operator, left.value, effectiveBooleanValue([rightItem], span));
    }
    if (left.source === 'node' && right.source === 'boolean') {
      return compareScalars(operator, effectiveBooleanValue([leftItem], span), right.value);
    }

    throw createXPathError(XPTY0004, 'General comparison requires comparable type families.', span, {
      expectedType: 'comparable general comparison operands',
      actualType: `${left.source} vs ${right.source}`,
    });
  }

  if (left.source === 'number' || right.source === 'number') {
    const numericLeft = toGeneralComparisonNumber(left, span);
    const numericRight = toGeneralComparisonNumber(right, span);
    return compareScalars(operator, numericLeft, numericRight);
  }

  return compareScalars(operator, left.value as string, right.value as string);
}

function atomizeGeneralComparisonOperand(item: XdmItem): {
  readonly value: boolean | number | string;
  readonly source: 'boolean' | 'number' | 'string' | 'node' | 'qname';
} {
  if (isXdmNode(item)) {
    return {
      value: item.node.textContent ?? '',
      source: 'node',
    };
  }

  const atomic = item as XdmAtomicValue;
  switch (atomic.type) {
    case 'xs:boolean':
      return { value: atomic.value as boolean, source: 'boolean' };
    case 'xs:double':
    case 'xs:integer':
      return { value: atomic.value as number, source: 'number' };
    case 'xs:QName':
      return { value: atomic.value as string, source: 'qname' };
    case 'xs:string':
      return { value: atomic.value as string, source: 'string' };
  }
}

function expandArrayItems(items: readonly XdmItem[]): XdmItem[] {
  const expanded: XdmItem[] = [];

  for (const item of items) {
    if (item.xdmKind === 'array') {
      for (const member of (item as XdmArray).members) {
        expanded.push(...expandArrayItems(member));
      }
      continue;
    }

    expanded.push(item);
  }

  return expanded;
}

function toGeneralComparisonNumber(
  operand: {
    readonly value: boolean | number | string;
    readonly source: 'boolean' | 'number' | 'string' | 'node' | 'qname';
  },
  span: SpanLike,
): number {
  if (operand.source === 'number') {
    return operand.value as number;
  }

  if (operand.source === 'node') {
    const coerced = coerceNumericValue(operand.value as string);
    if (coerced !== undefined) {
      return coerced;
    }
  }

  throw createXPathError(XPTY0004, 'General comparison requires comparable type families.', span, {
    expectedType: 'matching comparable operands',
    actualType: operand.source,
  });
}

function atomizeItems(items: readonly XdmItem[]): readonly (boolean | number | string)[] {
  return expandArrayItems(items).map((item) => {
    if (item.xdmKind === 'node') {
      return (item as XdmNode).node.textContent ?? '';
    }

    return (item as XdmAtomicValue).value;
  });
}

function atomizedNumericValues(items: readonly XdmItem[], span: SpanLike, functionName: string): number[] {
  return expandArrayItems(items).map((item) => {
    if (isXdmNode(item)) {
      const numericValue = coerceNumericValue(item.node.textContent ?? '');
      if (numericValue === undefined) {
        throw createXPathError(FORG0001, `Function ${functionName} could not convert an atomized value to a number.`, span, {
          functionName,
          expectedType: 'numeric lexical value after atomization',
          actualType: 'node()',
        });
      }

      return numericValue;
    }

    const atomic = item as XdmAtomicValue;
    if (atomic.type === 'xs:boolean') {
      throw createXPathError(FORG0006, `Function ${functionName} requires comparable values after atomization.`, span, {
        functionName,
        expectedType: 'numeric or string value after atomization',
        actualType: 'xs:boolean',
      });
    }

    if (atomic.type === 'xs:double' || atomic.type === 'xs:integer') {
      return atomic.value as number;
    }

    throw createXPathError(FORG0006, `Function ${functionName} requires comparable values after atomization.`, span, {
      functionName,
      expectedType: 'numeric value after atomization',
      actualType: atomic.type,
    });
  });
}

function atomizedComparableValues(
  items: readonly XdmItem[],
  span: SpanLike,
  functionName: string,
) : readonly (boolean | number | string)[] {
  const values = expandArrayItems(items).map((item) => atomizeComparableItem(item, span, functionName));
  if (values.length <= 1) {
    const numericValues = values.map((value) => typeof value === 'boolean' ? undefined : typeof value === 'number' ? value : coerceNumericValue(value));
    return numericValues.every((value) => value !== undefined) ? numericValues as number[] : values;
  }

  const numericValues = values.map((value) => typeof value === 'boolean' ? undefined : typeof value === 'number' ? value : coerceNumericValue(value));
  if (numericValues.every((value) => value !== undefined)) {
    return numericValues as number[];
  }

  const sawBoolean = values.some((value) => typeof value === 'boolean');
  if (sawBoolean) {
    if (values.every((value) => typeof value === 'boolean')) {
      return values;
    }
    throw createXPathError(FORG0006, `Function ${functionName} requires values from a comparable type family.`, span, {
      functionName,
      expectedType: 'all numeric, all string-like, or all boolean values',
      actualType: values.map(describeAtomizedValueType).join(', '),
    });
  }

  const sawNumber = values.some((value) => typeof value === 'number');
  const sawString = values.some((value) => typeof value === 'string');
  if (sawNumber && sawString) {
    throw createXPathError(FORG0006, `Function ${functionName} requires values from a comparable type family.`, span, {
      functionName,
      expectedType: 'all numeric or all string-like values',
      actualType: values.map(describeAtomizedValueType).join(', '),
    });
  }

  return values;
}

function atomizeComparableItem(item: XdmItem, span: SpanLike, functionName: string): boolean | number | string {
  if (isXdmNode(item)) {
    return item.node.textContent ?? '';
  }

  const atomic = item as XdmAtomicValue;
  if (atomic.type === 'xs:boolean') {
    return atomic.value as boolean;
  }
  if (atomic.type === 'xs:double' || atomic.type === 'xs:integer') {
    return atomic.value as number;
  }
  if (atomic.type === 'xs:string') {
    return atomic.value as string;
  }

  throw createXPathError(FORG0006, `Function ${functionName} requires comparable values after atomization.`, span, {
    functionName,
    expectedType: 'numeric or string value after atomization',
    actualType: atomic.type,
  });
}

function compareComparableValues(left: boolean | number | string, right: boolean | number | string): number {
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }
  if (typeof left === 'number' && typeof right === 'number') {
    if (Number.isNaN(left) || Number.isNaN(right)) {
      return Number.isNaN(left) && Number.isNaN(right) ? 0 : Number.isNaN(left) ? 1 : -1;
    }
    return left === right ? 0 : left < right ? -1 : 1;
  }

  return left === right ? 0 : left < right ? -1 : 1;
}

function deepEqualSequences(leftItems: readonly XdmItem[], rightItems: readonly XdmItem[]): boolean {
  if (leftItems.length !== rightItems.length) {
    return false;
  }

  for (let index = 0; index < leftItems.length; index += 1) {
    if (!deepEqualItems(leftItems[index]!, rightItems[index]!)) {
      return false;
    }
  }

  return true;
}

function deepEqualItems(left: XdmItem, right: XdmItem): boolean {
  if (left.xdmKind !== right.xdmKind) {
    return false;
  }

  if (isXdmNode(left) && isXdmNode(right)) {
    return deepEqualNodes(left.node, right.node);
  }

  if (isXdmAtomicValue(left) && isXdmAtomicValue(right)) {
    return deepEqualAtomicValues(left, right);
  }

  return left === right;
}

function deepEqualAtomicValues(left: XdmAtomicValue, right: XdmAtomicValue): boolean {
  if (left.type !== right.type) {
    return false;
  }

  if (left.type === 'xs:double' && right.type === 'xs:double') {
    return (Number.isNaN(left.value as number) && Number.isNaN(right.value as number))
      || left.value === right.value;
  }

  return left.value === right.value;
}

function deepEqualNodes(left: Node, right: Node): boolean {
  if (left.nodeType !== right.nodeType) {
    return false;
  }

  if ((left.namespaceURI ?? '') !== (right.namespaceURI ?? '')) {
    return false;
  }

  if ((left.nodeName ?? '') !== (right.nodeName ?? '')) {
    return false;
  }

  if ((left.nodeValue ?? '') !== (right.nodeValue ?? '')) {
    return false;
  }

  if (!deepEqualAttributes(left, right)) {
    return false;
  }

  const leftChildren = [...left.childNodes];
  const rightChildren = [...right.childNodes];
  if (leftChildren.length !== rightChildren.length) {
    return false;
  }

  for (let index = 0; index < leftChildren.length; index += 1) {
    if (!deepEqualNodes(leftChildren[index]!, rightChildren[index]!)) {
      return false;
    }
  }

  return true;
}

function deepEqualAttributes(left: Node, right: Node): boolean {
  const leftAttributes = getNodeAttributes(left);
  const rightAttributes = getNodeAttributes(right);
  const leftCount = leftAttributes?.length ?? 0;
  const rightCount = rightAttributes?.length ?? 0;
  if (leftCount !== rightCount) {
    return false;
  }

  for (let index = 0; index < leftCount; index += 1) {
    const leftAttribute = leftAttributes?.item(index);
    if (leftAttribute === null || leftAttribute === undefined) {
      return false;
    }

    const rightAttribute = leftAttribute.namespaceURI
      ? rightAttributes?.getNamedItemNS(leftAttribute.namespaceURI, leftAttribute.localName ?? leftAttribute.nodeName)
      : rightAttributes?.getNamedItem(leftAttribute.nodeName);
    if (rightAttribute === null || rightAttribute === undefined) {
      return false;
    }

    if ((leftAttribute.value ?? '') !== (rightAttribute.value ?? '')) {
      return false;
    }
  }

  return true;
}

function getNodeAttributes(node: Node): {
  readonly length: number;
  item(index: number): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
  getNamedItem(name: string): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
  getNamedItemNS(namespaceURI: string | null, localName: string): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
} | undefined {
  const candidate = node as unknown as {
    attributes?: {
      readonly length: number;
      item(index: number): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
      getNamedItem(name: string): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
      getNamedItemNS(namespaceURI: string | null, localName: string): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
    } | null;
  };

  return candidate.attributes ?? undefined;
}

function atomizeSingleton(
  items: readonly XdmItem[],
  span: SpanLike,
): boolean | number | string | undefined {
  items = expandArrayItems(items);

  if (items.length === 0) {
    return undefined;
  }

  if (items.length !== 1) {
    throw createXPathError(XPTY0004, 'Value comparisons require singleton operands.', span, {
      expectedType: 'singleton operand',
      actualType: describeItemsType(items),
    });
  }

  const [item] = items;
  if (item?.xdmKind === 'node') {
    return (item as XdmNode).node.textContent ?? '';
  }

  return (item as XdmAtomicValue).value;
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

function compareNodeOrder(left: Node, right: Node): number {
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

function normalizeNodeSequence(items: readonly XdmNode[]): XdmNode[] {
  const uniqueNodes = new Map<Node, XdmNode>();

  for (const item of items) {
    if (!uniqueNodes.has(item.node)) {
      uniqueNodes.set(item.node, item);
    }
  }

  return [...uniqueNodes.values()].sort((left, right) => compareNodeOrder(left.node, right.node));
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

function compareValueOperands(
  operator: 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge',
  left: boolean | number | string,
  right: boolean | number | string,
  span: SpanLike,
): boolean {
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    if (typeof left !== 'boolean' || typeof right !== 'boolean') {
      throw createXPathError(XPTY0004, 'Value comparisons require matching operand types.', span, {
        expectedType: 'matching operand types',
        actualType: `${describeAtomizedValueType(left)} vs ${describeAtomizedValueType(right)}`,
      });
    }

    return compareScalars(operator, left, right);
  }

  if (typeof left === 'number' || typeof right === 'number') {
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw createXPathError(XPTY0004, 'Value comparisons require matching operand types.', span, {
        expectedType: 'matching operand types',
        actualType: `${describeAtomizedValueType(left)} vs ${describeAtomizedValueType(right)}`,
      });
    }

    return compareScalars(operator, left, right);
  }

  return compareScalars(operator, left, right);
}

function coerceNumericValue(value: number | string): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function compareScalars<T extends boolean | number | string>(
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge',
  left: T,
  right: T,
): boolean {
  switch (operator) {
    case '=':
    case 'eq':
      return left === right;
    case '!=':
    case 'ne':
      return left !== right;
    case '<':
    case 'lt':
      return left < right;
    case '<=':
    case 'le':
      return left <= right;
    case '>':
    case 'gt':
      return left > right;
    case '>=':
    case 'ge':
      return left >= right;
  }
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

function describeAtomizedValueType(value: boolean | number | string): string {
  if (typeof value === 'boolean') {
    return 'xs:boolean';
  }

  if (typeof value === 'number') {
    return 'xs:double';
  }

  return 'xs:string';
}

function describeExternalValueType(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (Array.isArray(value)) {
    return 'Array';
  }
  if (typeof value === 'object' && 'constructor' in (value as object)) {
    const constructorName = (value as { constructor?: { name?: string } }).constructor?.name;
    if (constructorName !== undefined && constructorName.length > 0) {
      return constructorName;
    }
  }
  return typeof value;
}
