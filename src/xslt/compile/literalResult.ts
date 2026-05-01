import type { Attr, Element, Node } from '@xmldom/xmldom';

import { getNodeSourceLocation } from '../../xml/parse.js';
import type { AttributeInstruction, Instruction } from './ir.js';

type NodeListLike = {
  readonly length: number;
  item(index: number): Node | null;
};

export type ExcludedNamespaceState = {
  readonly excludedNamespaceNames: ReadonlySet<string>;
  readonly excludeAllNamespaces: boolean;
};

export function compileLiteralResultElement(
  element: Element,
  stylesheetXml: string,
  compileInstructions: (nodes: NodeListLike, stylesheetXml: string) => Instruction[],
  xsltNamespace: string,
  stylesheetSourceName: string,
): Extract<Instruction, { readonly kind: 'literalElement' }> {
  const location = getNodeSourceLocation(stylesheetXml, element, stylesheetSourceName);

  return {
    kind: 'literalElement',
    name: element.tagName,
    attributes: compileLiteralResultAttributes(element, stylesheetXml, xsltNamespace, stylesheetSourceName),
    body: compileInstructions(element.childNodes, stylesheetXml),
    ...(location === undefined ? {} : { location }),
  };
}

export function compileLiteralResultAttribute(
  attribute: Attr,
  stylesheetXml: string,
  excludedNamespaces: ExcludedNamespaceState,
  xsltNamespace: string,
  stylesheetSourceName: string,
): AttributeInstruction | undefined {
  if (isExcludeResultPrefixesAttribute(attribute)) {
    return undefined;
  }

  if (isNamespaceDeclaration(attribute)) {
    if (attribute.value === xsltNamespace) {
      return undefined;
    }

    if (excludedNamespaces.excludeAllNamespaces || excludedNamespaces.excludedNamespaceNames.has(attribute.name)) {
      return undefined;
    }
  }

  const location = getNodeSourceLocation(stylesheetXml, attribute, stylesheetSourceName);
  return {
    name: attribute.name,
    value: attribute.value,
    ...(location === undefined ? {} : { location }),
  };
}

export function collectInheritedNamespaceAttributes(
  element: Element,
  stylesheetXml: string,
  excludedNamespaces: ExcludedNamespaceState,
  xsltNamespace: string,
  stylesheetSourceName: string,
): AttributeInstruction[] {
  const namespaceAttributes = new Map<string, string>();
  const ancestors: Element[] = [];

  let current: Node | null = element.parentNode;
  while (current !== null) {
    if (current.nodeType === current.ELEMENT_NODE) {
      ancestors.unshift(current as Element);
    }
    current = current.parentNode;
  }

  for (const ancestor of ancestors) {
    for (let index = 0; index < ancestor.attributes.length; index += 1) {
      const attribute = ancestor.attributes.item(index) as Attr | null;
      if (attribute === null || !isNamespaceDeclaration(attribute) || attribute.value === xsltNamespace) {
        continue;
      }

      if (excludedNamespaces.excludeAllNamespaces || excludedNamespaces.excludedNamespaceNames.has(attribute.name)) {
        continue;
      }

      if (!namespaceAttributes.has(attribute.name)) {
        namespaceAttributes.set(attribute.name, attribute.value);
      }
    }
  }

  const attributes: AttributeInstruction[] = [];

  for (const [name, value] of namespaceAttributes) {
    if (element.hasAttribute(name)) {
      continue;
    }

    const sourceAttribute = ancestors
      .flatMap((ancestor) => Array.from(ancestor.attributes))
      .find((attribute) => attribute.name === name && attribute.value === value);
    const location = sourceAttribute === undefined
      ? undefined
      : getNodeSourceLocation(stylesheetXml, sourceAttribute, stylesheetSourceName);

    attributes.push({
      name,
      value,
      ...(location === undefined ? {} : { location }),
    });
  }

  return attributes;
}

export function collectExcludedNamespaceState(element: Element): ExcludedNamespaceState {
  const excludedNamespaceNames = new Set<string>();
  let excludeAllNamespaces = false;

  let current: Node | null = element;
  while (current !== null) {
    if (current.nodeType === current.ELEMENT_NODE) {
      const excludedPrefixes = (current as Element).getAttribute('exclude-result-prefixes');
      if (excludedPrefixes !== null) {
        for (const prefix of excludedPrefixes.trim().split(/\s+/)) {
          if (prefix.length === 0) {
            continue;
          }

          if (prefix === '#all') {
            excludeAllNamespaces = true;
            excludedNamespaceNames.clear();
            continue;
          }

          excludedNamespaceNames.add(prefix === '#default' ? 'xmlns' : `xmlns:${prefix}`);
        }
      }
    }

    current = current.parentNode;
  }

  return {
    excludedNamespaceNames,
    excludeAllNamespaces,
  };
}

function compileLiteralResultAttributes(
  element: Element,
  stylesheetXml: string,
  xsltNamespace: string,
  stylesheetSourceName: string,
): AttributeInstruction[] {
  const excludedNamespaces = collectExcludedNamespaceState(element);
  const attributes = collectInheritedNamespaceAttributes(
    element,
    stylesheetXml,
    excludedNamespaces,
    xsltNamespace,
    stylesheetSourceName,
  );

  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index) as Attr | null;
    if (attribute === null) {
      continue;
    }

    const compiledAttribute = compileLiteralResultAttribute(
      attribute,
      stylesheetXml,
      excludedNamespaces,
      xsltNamespace,
      stylesheetSourceName,
    );
    if (compiledAttribute !== undefined) {
      attributes.push(compiledAttribute);
    }
  }

  return attributes;
}

function isExcludeResultPrefixesAttribute(attribute: Attr): boolean {
  return (attribute.namespaceURI === null || attribute.namespaceURI.length === 0)
    && attribute.name === 'exclude-result-prefixes';
}

function isNamespaceDeclaration(attribute: Attr): boolean {
  return attribute.name === 'xmlns' || attribute.prefix === 'xmlns';
}