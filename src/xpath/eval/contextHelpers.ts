import { XPDY0002, XPST0008, XPST0081, XPTY0004 } from '../../errors/codes.js';
import { materialize } from '../../xdm/sequence.js';
import {
  createXdmBoolean,
  createXdmNumber,
  createXdmString,
  type XdmAtomicValue,
  type XdmItem,
  type XdmNode,
  type XdmSequence,
} from '../../xdm/types.js';
import { resolveStaticallyKnownNamespaceUri } from './names.js';
import type { DynamicContext } from './context.js';

type SpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

type ContextHelperDependencies = {
  createXPathError(code: string, message: string, span: SpanLike, details?: Readonly<Record<string, unknown>>): Error;
  describeItemsType(items: readonly XdmItem[]): string;
};

export function createContextHelpers(dependencies: ContextHelperDependencies): {
  requireContextItem(context: DynamicContext, span: SpanLike): XdmItem;
  requireContextNode(context: DynamicContext, span: SpanLike): XdmNode;
  isXdmNode(value: unknown): value is XdmNode;
  resolveVariableReference(name: string, context: DynamicContext, span: SpanLike): XdmItem[];
  coerceValueToItems(value: unknown, span: SpanLike): XdmItem[];
} {
  function requireContextItem(context: DynamicContext, span: SpanLike): XdmItem {
    const items = coerceValueToItems(context.contextItem, span);
    const item = items[0];
    if (item === undefined) {
      throw dependencies.createXPathError(XPDY0002, 'The XPath expression requires a context item.', span);
    }
    if (items.length !== 1) {
      throw dependencies.createXPathError(XPTY0004, 'The XPath expression requires a single context item.', span, {
        expectedType: 'singleton item()',
        actualType: dependencies.describeItemsType(items),
      });
    }
    return item;
  }

  function requireContextNode(context: DynamicContext, span: SpanLike): XdmNode {
    const item = requireContextItem(context, span);
    if (!isXdmNode(item)) {
      throw dependencies.createXPathError(XPDY0002, 'The XPath expression requires a context node.', span);
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
      (value as XdmNode).xdmKind === 'node'
    );
  }

  function isXdmAtomicValue(value: unknown): value is XdmAtomicValue {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      'xdmKind' in value &&
      (value as XdmAtomicValue).xdmKind === 'atomic'
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

  function resolveVariableReference(name: string, context: DynamicContext, span: SpanLike): XdmItem[] {
    const separator = name.indexOf(':');
    const value = separator >= 0
      ? resolvePrefixedVariableReference(name, separator, context, span)
      : context.variables.get(name) ?? context.variables.get(`{}${name}`);
    if (value === undefined) {
      throw dependencies.createXPathError(XPST0008, `Unknown variable $${name}.`, span);
    }
    return coerceValueToItems(resolveDeferredVariableValue(value), span);
  }

  function resolvePrefixedVariableReference(
    name: string,
    separator: number,
    context: DynamicContext,
    span: SpanLike,
  ): unknown {
    const prefix = name.slice(0, separator);
    const localName = name.slice(separator + 1);
    const namespaceUri = resolveStaticallyKnownNamespaceUri(context.staticContext, prefix);

    if (namespaceUri === undefined) {
      throw dependencies.createXPathError(XPST0081, `Unknown namespace prefix ${JSON.stringify(prefix)} in variable reference.`, span, {
        namespacePrefix: prefix,
        variableName: name,
      });
    }

    return context.variables.get(`{${namespaceUri}}${localName}`) ?? context.variables.get(name);
  }

  function resolveDeferredVariableValue(value: unknown): unknown {
    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const evaluate = (value as { evaluate?: unknown }).evaluate;
    return typeof evaluate === 'function'
      ? (evaluate as () => unknown)()
      : value;
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

    throw dependencies.createXPathError(XPTY0004, 'Unsupported external value in the dynamic context.', span, {
      expectedType: 'supported XDM value',
      actualType: describeExternalValueType(value),
    });
  }

  return {
    requireContextItem,
    requireContextNode,
    isXdmNode,
    resolveVariableReference,
    coerceValueToItems,
  };
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