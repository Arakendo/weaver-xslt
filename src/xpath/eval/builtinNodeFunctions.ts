import {
  createXdmNode,
  createXdmQName,
  createXdmString,
  type XdmItem,
  type XdmNode,
} from '../../xdm/types.js';
import type { DynamicContext } from './context.js';
import type { XPathAst } from '../parse/ast.js';
import { getRootNode, normalizeNodeSequence } from './navigation.js';
import { getLocalNameValue, getNamespaceUriValue, getNodeNameValue } from './names.js';

type SpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

type BuiltinNodeSupport = {
  evaluateOptionalSingletonNodeArg(
    name: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmNode | undefined;
  getGeneratedNodeId(item: XdmNode | undefined): string;
};

type BuiltinNodeHelpers = {
  evaluateExpression(ast: XPathAst, context: DynamicContext): XdmItem[];
  requireArity(name: string, args: readonly XPathAst[], expected: number, span: SpanLike): void;
  createXPathError(
    code: string,
    message: string,
    span: SpanLike,
    details?: Readonly<Record<string, unknown>>,
  ): Error;
  describeItemsType(items: readonly XdmItem[]): string;
};

export function createBuiltinNodeFunctionEvaluator(
  helpers: BuiltinNodeHelpers,
  support: BuiltinNodeSupport,
): {
  evaluateNodeBuiltinFunction(normalized: string, args: readonly XPathAst[], context: DynamicContext, span: SpanLike): XdmItem[] | undefined;
} {
  function evaluateNodeBuiltinFunction(
    normalized: string,
    args: readonly XPathAst[],
    context: DynamicContext,
    span: SpanLike,
  ): XdmItem[] | undefined {
    switch (normalized) {
      case 'fn:root': {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        if (item === undefined) {
          return [];
        }
        return [getRootNode(item)];
      }
      case 'fn:name': {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(getNodeNameValue(item))];
      }
      case 'fn:local-name': {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(getLocalNameValue(item))];
      }
      case 'fn:namespace-uri': {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(getNamespaceUriValue(item))];
      }
      case 'fn:generate-id': {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(support.getGeneratedNodeId(item))];
      }
      case 'fn:node-name': {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        const name = getNodeNameValue(item);
        return name.length === 0 ? [] : [createXdmQName(name)];
      }
      case 'fn:innermost': {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0]!, context);
        const nodes = requireNodeSequence(normalized, items, span);
        return normalizeNodeSequence(nodes).filter(
          (candidate) => !nodes.some((item) => isAncestor(candidate.node, item.node)),
        );
      }
      case 'fn:snapshot': {
        helpers.requireArity(normalized, args, 1, span);
        return helpers.evaluateExpression(args[0]!, context).map((item) =>
          item.xdmKind === 'node'
            ? createXdmNode((item as XdmNode).node.cloneNode(true))
            : item,
        );
      }
      default:
        return undefined;
    }
  }

  return {
    evaluateNodeBuiltinFunction,
  };

  function requireNodeSequence(
    functionName: string,
    items: readonly XdmItem[],
    span: SpanLike,
  ): XdmNode[] {
    if (items.some((item) => item.xdmKind !== 'node')) {
      throw helpers.createXPathError(
        'XPTY0004',
        `Function ${functionName} requires a node sequence.`,
        span,
        {
          functionName,
          expectedType: 'node()*',
          actualType: helpers.describeItemsType(items),
        },
      );
    }
    return items as XdmNode[];
  }
}

function isAncestor(candidate: XdmNode['node'], node: XdmNode['node']): boolean {
  let current = node.parentNode;
  while (current !== null) {
    if (current === candidate) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}
