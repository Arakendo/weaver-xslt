import type { Node } from '@xmldom/xmldom';

import type { XdmNode } from '../../xdm/types.js';
import type { DynamicContext } from './context.js';

const PREDEFINED_NAMESPACE_PREFIXES = new Map<string, string>([
  ['array', 'http://www.w3.org/2005/xpath-functions/array'],
  ['fn', 'http://www.w3.org/2005/xpath-functions'],
  ['map', 'http://www.w3.org/2005/xpath-functions/map'],
  ['math', 'http://www.w3.org/2005/xpath-functions/math'],
  ['xml', 'http://www.w3.org/XML/1998/namespace'],
  ['xs', 'http://www.w3.org/2001/XMLSchema'],
]);

type StaticContext = DynamicContext['staticContext'];

export function resolveStaticallyKnownNamespaceUri(staticContext: StaticContext, prefix: string): string | undefined {
  return staticContext.namespaces.get(prefix) ?? PREDEFINED_NAMESPACE_PREFIXES.get(prefix);
}

export function matchesQualifiedNodeName(
  name: string,
  node: Node,
  staticContext: StaticContext,
  isAttributeAxis: boolean,
): boolean {
  const separator = name.indexOf(':');
  const localName = getNodeLocalName(node);

  if (separator >= 0) {
    const prefix = name.slice(0, separator);
    const namespaceUri = resolveStaticallyKnownNamespaceUri(staticContext, prefix);
    if (namespaceUri === undefined) {
      return false;
    }

    return localName === name.slice(separator + 1) && (node.namespaceURI ?? '') === namespaceUri;
  }

  const expectedNamespace = isAttributeAxis ? '' : staticContext.defaultElementNamespace;
  return localName === name && (node.namespaceURI ?? '') === expectedNamespace;
}

export function getNodeNameValue(node: XdmNode | undefined): string {
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

export function getLocalNameValue(node: XdmNode | undefined): string {
  const name = getNodeNameValue(node);
  return getLocalNameFromQName(name);
}

export function getNamespaceUriValue(node: XdmNode | undefined): string {
  if (node === undefined) {
    return '';
  }

  return node.node.namespaceURI ?? '';
}

export function getLocalNameFromQName(name: string): string {
  if (name.length === 0) {
    return '';
  }

  const separator = name.indexOf(':');
  return separator >= 0 ? name.slice(separator + 1) : name;
}

export function getNodeLocalName(node: Node): string {
  const rawName = node.nodeName;
  if (rawName.startsWith('#')) {
    return '';
  }

  const separator = rawName.indexOf(':');
  return separator >= 0 ? rawName.slice(separator + 1) : rawName;
}

export function getNodePrefix(node: Node): string {
  const rawName = node.nodeName;
  if (rawName.startsWith('#')) {
    return '';
  }

  const separator = rawName.indexOf(':');
  return separator >= 0 ? rawName.slice(0, separator) : '';
}

export function getNamespaceDeclarationPrefix(node: Node): string | undefined {
  if (node.nodeName === 'xmlns') {
    return '';
  }
  if (node.nodeName.startsWith('xmlns:')) {
    return node.nodeName.slice('xmlns:'.length);
  }
  return undefined;
}

export function getNamespaceNodePrefix(node: Node): string {
  return getNamespaceDeclarationPrefix(node) ?? '';
}