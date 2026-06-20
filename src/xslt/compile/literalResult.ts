import type { Attr, Element, Node } from '@xmldom/xmldom';

import { getAttributeValueSourceLocation, getNodeSourceLocation } from '../../xml/parse.js';
import type { XPathAst } from '../../xpath/parse/ast.js';
import type { AttributeInstruction, AttributeValueTemplatePart, Instruction } from './ir.js';
import {
  collectExcludedNamespaceState,
  collectInheritedNamespaceAttributes,
  isExcludeResultPrefixesAttribute,
  isNamespaceDeclaration,
  type ExcludedNamespaceState,
} from './literalResultNamespaces.js';

type NodeListLike = {
  readonly length: number;
  item(index: number): Node | null;
};

type ParseXPathInContext = (
  expression: string,
  location: AttributeInstruction['location'],
  ownerName: string,
  attributeName: string,
) => XPathAst;

export function compileLiteralResultElement(
  element: Element,
  stylesheetXml: string,
  compileInstructions: (nodes: NodeListLike, stylesheetXml: string) => Instruction[],
  xsltNamespace: string,
  stylesheetSourceName: string,
  parseXPathInContext: ParseXPathInContext,
): Extract<Instruction, { readonly kind: 'literalElement' }> {
  const location = getNodeSourceLocation(stylesheetXml, element, stylesheetSourceName);

  return {
    kind: 'literalElement',
    name: element.tagName,
    attributes: compileLiteralResultAttributes(
      element,
      stylesheetXml,
      xsltNamespace,
      stylesheetSourceName,
      parseXPathInContext,
    ),
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
  parseXPathInContext: ParseXPathInContext,
): AttributeInstruction | undefined {
  if (isExcludeResultPrefixesAttribute(attribute)) {
    return undefined;
  }

  if (isNamespaceDeclaration(attribute)) {
    if (attribute.value === xsltNamespace) {
      return undefined;
    }

    if (
      excludedNamespaces.excludeAllNamespaces ||
      excludedNamespaces.excludedNamespaceNames.has(attribute.name)
    ) {
      return undefined;
    }
  }

  const location = getNodeSourceLocation(stylesheetXml, attribute, stylesheetSourceName);
  const valueTemplate = parseAttributeValueTemplate(
    attribute,
    stylesheetXml,
    stylesheetSourceName,
    parseXPathInContext,
  );
  return {
    name: attribute.name,
    value: attribute.value,
    ...(valueTemplate === undefined ? {} : { valueTemplate }),
    ...(location === undefined ? {} : { location }),
  };
}

function compileLiteralResultAttributes(
  element: Element,
  stylesheetXml: string,
  xsltNamespace: string,
  stylesheetSourceName: string,
  parseXPathInContext: ParseXPathInContext,
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
      parseXPathInContext,
    );
    if (compiledAttribute !== undefined) {
      attributes.push(compiledAttribute);
    }
  }

  return attributes;
}

function parseAttributeValueTemplate(
  attribute: Attr,
  stylesheetXml: string,
  stylesheetSourceName: string,
  parseXPathInContext: ParseXPathInContext,
): AttributeValueTemplatePart[] | undefined {
  const value = attribute.value;
  const parts: AttributeValueTemplatePart[] = [];
  let literal = '';
  let sawTemplateSyntax = false;

  for (let index = 0; index < value.length; ) {
    const character = value[index];
    if (character === '{') {
      if (value[index + 1] === '{') {
        literal += '{';
        sawTemplateSyntax = true;
        index += 2;
        continue;
      }

      const closingBrace = findAttributeValueTemplateEnd(value, index + 1);
      if (closingBrace === -1) {
        literal += value.slice(index);
        break;
      }

      if (literal.length > 0) {
        parts.push({ kind: 'text', text: literal });
        literal = '';
      }

      const expressionText = value.slice(index + 1, closingBrace).trim();
      const ownerElement = attribute.ownerElement;
      const location =
        (ownerElement === null
          ? undefined
          : getAttributeValueSourceLocation(
              stylesheetXml,
              ownerElement,
              attribute.name,
              stylesheetSourceName,
            )) ?? getNodeSourceLocation(stylesheetXml, attribute, stylesheetSourceName);
      parts.push({
        kind: 'expression',
        expressionText,
        expression: parseXPathInContext(
          expressionText,
          location,
          'literal result attribute',
          attribute.name,
        ),
      });
      sawTemplateSyntax = true;
      index = closingBrace + 1;
      continue;
    }

    if (character === '}') {
      if (value[index + 1] === '}') {
        literal += '}';
        sawTemplateSyntax = true;
        index += 2;
        continue;
      }
    }

    literal += character;
    index += 1;
  }

  if (literal.length > 0) {
    parts.push({ kind: 'text', text: literal });
  }

  return sawTemplateSyntax ? parts : undefined;
}

function findAttributeValueTemplateEnd(value: string, startIndex: number): number {
  let quote: '"' | "'" | undefined;

  for (let index = startIndex; index < value.length; index += 1) {
    const character = value[index];
    if (quote !== undefined) {
      if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === '}') {
      return index;
    }
  }

  return -1;
}
