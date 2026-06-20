import { FOER0000, XPST0017, XPTY0004 } from '../../errors/codes.js';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DynamicContext } from './context.js';
import {
  createXdmBoolean,
  createXdmNode,
  createXdmMap,
  createXdmQName,
  createXdmString,
  type XdmAtomicValue,
  type XdmItem,
} from '../../xdm/types.js';
import type { XPathAst } from '../parse/ast.js';
import { parseXml } from '../../xml/parse.js';
import { createBuiltinFunctionSupport } from './builtinFunctionSupport.js';
import { createFunctionNameSuggestion } from './arityValidation.js';
import { createBuiltinNodeFunctionEvaluator } from './builtinNodeFunctions.js';
import { createBuiltinNumericFunctionEvaluator } from './builtinNumericFunctions.js';
import { createBuiltinSequenceFunctionEvaluator } from './builtinSequenceFunctions.js';
import { createBuiltinStringFunctionEvaluator } from './builtinStringFunctions.js';
import { getLocalNameFromQName } from './names.js';

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
    context?: {
      readonly suggestions?: readonly {
        readonly kind: 'fix' | 'hint' | 'alternative';
        readonly label: string;
        readonly replacement?: string;
        readonly confidence?: number;
      }[];
    },
  ): Error;
  describeItemsType(items: readonly XdmItem[]): string;
  describeItemType(item: XdmItem): string;
  effectiveBooleanValue(items: readonly XdmItem[], span: SpanLike): boolean;
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
  deepEqualSequences(leftItems: readonly XdmItem[], rightItems: readonly XdmItem[]): boolean;
  compareComparableValues(
    left: boolean | number | string,
    right: boolean | number | string,
  ): number;
};

export function createBuiltinFunctionEvaluator(helpers: BuiltinFunctionHelpers): {
  evaluateFunctionCall(
    callee: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem[];
} {
  const support = createBuiltinFunctionSupport(helpers);
  const { evaluateOptionalSingletonItemArg, evaluateSingletonStringishArg, itemToStringValue } =
    support;

  const { evaluateStringBuiltinFunction } = createBuiltinStringFunctionEvaluator(helpers, support);
  const { evaluateSequenceBuiltinFunction } = createBuiltinSequenceFunctionEvaluator(
    helpers,
    support,
  );
  const { evaluateNodeBuiltinFunction } = createBuiltinNodeFunctionEvaluator(support);
  const { evaluateNumericBuiltinFunction } = createBuiltinNumericFunctionEvaluator(
    helpers,
    support,
  );

  function evaluateFunctionCall(
    callee: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem[] {
    const normalized = callee.includes(':') ? callee : `fn:${callee}`;

    const stringResult = evaluateStringBuiltinFunction(normalized, args, context, span);
    if (stringResult !== undefined) {
      return stringResult;
    }

    const sequenceResult = evaluateSequenceBuiltinFunction(normalized, args, context, span);
    if (sequenceResult !== undefined) {
      return sequenceResult;
    }

    const nodeResult = evaluateNodeBuiltinFunction(normalized, args, context, span);
    if (nodeResult !== undefined) {
      return nodeResult;
    }

    const numericResult = evaluateNumericBuiltinFunction(normalized, args, context, span);
    if (numericResult !== undefined) {
      return numericResult;
    }

    switch (normalized) {
      case 'fn:current':
        helpers.requireArity(normalized, args, 0, span);
        if (context.contextItem === null || context.contextItem === undefined) {
          return [];
        }
        return [context.contextItem as XdmItem];
      case 'fn:document': {
        helpers.requireArity(normalized, args, 1, span);
        const uriItems = helpers.evaluateExpression(args[0]!, context);
        if (uriItems.length !== 1 || uriItems[0]?.xdmKind !== 'atomic') {
          throw helpers.createXPathError(
            XPTY0004,
            `Function ${normalized} requires a singleton URI argument.`,
            span,
            {
              functionName: normalized,
              expectedType: 'singleton URI',
              actualType: helpers.describeItemsType(uriItems),
            },
          );
        }

        const uri = String((uriItems[0] as XdmAtomicValue).value);
        const resolvedPath = resolveDocumentPath(uri, context.staticContext.baseUri);
        const document = parseXml(readFileSync(resolvedPath, 'utf8'), {
          role: 'source-document',
          sourceName: resolvedPath,
        });
        return [createXdmNode(document)];
      }
      case 'fn:deep-equal':
        helpers.requireArity(normalized, args, 2, span);
        return [
          createXdmBoolean(
            helpers.deepEqualSequences(
              helpers.evaluateExpression(args[0]!, context),
              helpers.evaluateExpression(args[1]!, context),
            ),
          ),
        ];
      case 'fn:QName':
        helpers.requireArity(normalized, args, 2, span);
        evaluateSingletonStringishArg(args[0]!, context, span, normalized);
        return [
          createXdmQName(
            itemToStringValue(evaluateSingletonStringishArg(args[1]!, context, span, normalized)),
          ),
        ];
      case 'map:entry': {
        helpers.requireArity(normalized, args, 2, span);
        const keyItems = helpers.evaluateExpression(args[0]!, context);
        if (keyItems.length !== 1 || keyItems[0]?.xdmKind !== 'atomic') {
          throw helpers.createXPathError(
            XPTY0004,
            `Function ${normalized} requires a singleton atomic key argument.`,
            span,
            {
              functionName: normalized,
              expectedType: 'singleton atomic key',
              actualType: helpers.describeItemsType(keyItems),
            },
          );
        }
        return [
          createXdmMap([
            {
              key: keyItems[0] as XdmAtomicValue,
              value: helpers.evaluateExpression(args[1]!, context),
            },
          ]),
        ];
      }
      case 'fn:local-name-from-QName': {
        helpers.requireArity(normalized, args, 1, span);
        const item = evaluateOptionalSingletonItemArg(normalized, args, context, span);
        if (item === undefined) {
          return [];
        }
        const atomic = item.xdmKind === 'atomic' ? (item as XdmAtomicValue) : undefined;
        if (atomic === undefined || atomic.type !== 'xs:QName') {
          throw helpers.createXPathError(
            XPTY0004,
            `Function ${normalized} requires an xs:QName argument.`,
            span,
            {
              functionName: normalized,
              expectedType: 'xs:QName?',
              actualType: helpers.describeItemType(item),
            },
          );
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
        return [
          createXdmBoolean(
            helpers.effectiveBooleanValue(helpers.evaluateExpression(args[0]!, context), span),
          ),
        ];
      case 'fn:not':
        helpers.requireArity(normalized, args, 1, span);
        return [
          createXdmBoolean(
            !helpers.effectiveBooleanValue(helpers.evaluateExpression(args[0]!, context), span),
          ),
        ];
      case 'fn:true':
        helpers.requireArity(normalized, args, 0, span);
        return [createXdmBoolean(true)];
      case 'fn:false':
        helpers.requireArity(normalized, args, 0, span);
        return [createXdmBoolean(false)];
      case 'msxsl:node-set':
        helpers.requireArity(normalized, args, 1, span);
        return helpers.evaluateExpression(args[0]!, context);
      default: {
        const suggestion = createFunctionNameSuggestion(callee);
        throw helpers.createXPathError(
          XPST0017,
          `Unknown function ${callee} with arity ${args.length}.`,
          span,
          {
            functionName: callee,
            actualArity: args.length,
          },
          suggestion === undefined ? undefined : { suggestions: [suggestion] },
        );
      }
    }
  }

  return {
    evaluateFunctionCall,
  };
}

function resolveDocumentPath(uri: string, baseUri?: string): string {
  if (uri.startsWith('file:')) {
    return fileURLToPath(uri);
  }

  if (baseUri === undefined) {
    return resolvePath(uri);
  }

  if (baseUri.startsWith('file:')) {
    return resolvePath(dirname(fileURLToPath(baseUri)), uri);
  }

  return isAbsolute(uri) ? uri : resolvePath(dirname(baseUri), uri);
}
