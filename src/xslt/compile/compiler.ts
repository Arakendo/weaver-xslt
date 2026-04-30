/**
 * Stylesheet compiler: DOM → StylesheetIR.
 *
 * Current MVP+3 slice: root and simple name-matching templates with literal
 * result elements, xsl:text, xsl:value-of, and xsl:apply-templates.
 */

import type { Attr, Element, Node } from '@xmldom/xmldom';

import { XTSE0010 } from '../../errors/codes.js';
import { XsltError } from '../../errors/index.js';
import type { PathExpression, StepExpression, XPathAst } from '../../xpath/parse/ast.js';
import { parseXPath } from '../../xpath/parse/parser.js';
import { getAttributeValueSourceLocation, getNodeSourceLocation, parseXml } from '../../xml/parse.js';
import type { AttributeInstruction, Instruction, StylesheetIR, TemplateRule } from './ir.js';

const XSLT_NAMESPACE = 'http://www.w3.org/1999/XSL/Transform';
const STYLESHEET_SOURCE_NAME = '<stylesheet>';

type NodeListLike = {
  readonly length: number;
  item(index: number): Node | null;
};

export function compileStylesheet(stylesheetXml: string): StylesheetIR {
  const stylesheetDocument = parseXml(stylesheetXml);
  const root = stylesheetDocument.documentElement;

  if (root === null) {
    throw createXsltStaticError('Stylesheet has no document element.');
  }

  if (!isXsltElement(root, 'stylesheet') && !isXsltElement(root, 'transform')) {
    throw createXsltStaticError(
      'Stylesheet document element must be xsl:stylesheet or xsl:transform.',
      getNodeSourceLocation(stylesheetXml, root, STYLESHEET_SOURCE_NAME),
    );
  }

  const templates = childElements(root)
    .filter((child) => isXsltElement(child, 'template'))
    .map((template) => compileTemplateRule(template, stylesheetXml));

  if (templates.length === 0) {
    throw createXsltStaticError(
      'Stylesheet must declare at least one xsl:template.',
      getNodeSourceLocation(stylesheetXml, root, STYLESHEET_SOURCE_NAME),
    );
  }

  return {
    version: '3.0',
    templates,
  };
}

function compileTemplateRule(templateElement: Element, stylesheetXml: string): TemplateRule {
  const matchText = templateElement.getAttribute('match') ?? undefined;
  const name = templateElement.getAttribute('name') ?? undefined;
  const priorityText = templateElement.getAttribute('priority');
  const priority = priorityText === null ? undefined : Number(priorityText);

  if (matchText === undefined && name === undefined) {
    throw createXsltStaticError(
      'xsl:template must declare either match or name.',
      getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME),
    );
  }

  const match = matchText === undefined ? undefined : parseXPath(matchText);
  if (match !== undefined && !isSupportedTemplateMatch(match)) {
    throw createXsltStaticError(
      `Unsupported template match pattern ${JSON.stringify(matchText)} in current MVP+3 slice.`,
      getAttributeValueSourceLocation(stylesheetXml, templateElement, 'match', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME),
    );
  }

  const location = matchText !== undefined
    ? getAttributeValueSourceLocation(stylesheetXml, templateElement, 'match', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME)
    : name !== undefined
      ? getAttributeValueSourceLocation(stylesheetXml, templateElement, 'name', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME)
      : getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME);
  const body = compileInstructions(templateElement.childNodes, stylesheetXml);

  return {
    ...(match === undefined ? {} : { match }),
    ...(matchText === undefined ? {} : { matchText }),
    ...(location === undefined ? {} : { location }),
    ...(name === undefined ? {} : { name }),
    modes: [],
    ...(priority === undefined || Number.isNaN(priority) ? {} : { priority }),
    body,
  };
}

function compileInstructions(nodes: NodeListLike, stylesheetXml: string): Instruction[] {
  const instructions: Instruction[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes.item(index);
    if (node === null) {
      continue;
    }

    const instruction = compileInstruction(node, stylesheetXml);
    if (instruction !== undefined) {
      instructions.push(instruction);
    }
  }

  return instructions;
}

function compileInstruction(node: Node, stylesheetXml: string): Instruction | undefined {
  if (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE) {
    const text = node.nodeValue ?? '';
    return text.trim().length === 0
      ? undefined
      : {
          kind: 'literalText',
          text,
        };
  }

  if (node.nodeType !== node.ELEMENT_NODE) {
    return undefined;
  }

  const element = node as Element;
  if (isXsltElement(element, 'apply-templates')) {
    const select = element.getAttribute('select') ?? undefined;
    const mode = element.getAttribute('mode');
    const location = select === undefined
      ? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME)
      : getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);
    if (mode !== null) {
      throw createXsltStaticError(
        'xsl:apply-templates mode is not yet implemented in the current MVP+3 slice.',
        getAttributeValueSourceLocation(stylesheetXml, element, 'mode', STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      );
    }

    return {
      kind: 'applyTemplates',
      ...(location === undefined ? {} : { location }),
      ...(select === undefined ? {} : { selectText: select }),
      ...(select === undefined ? {} : { select: parseXPath(select) }),
    };
  }

  if (isXsltElement(element, 'value-of')) {
    const select = element.getAttribute('select');
    if (select === null || select.length === 0) {
      throw createXsltStaticError(
        'xsl:value-of requires a select attribute.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      );
    }

    const location = getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    const separator = element.getAttribute('separator') ?? undefined;
    return {
      kind: 'valueOf',
      select: parseXPath(select),
      selectText: select,
      ...(location === undefined ? {} : { location }),
      ...(separator === undefined ? {} : { separator }),
    };
  }

  if (isXsltElement(element, 'text')) {
    return {
      kind: 'literalText',
      text: element.textContent ?? '',
    };
  }

  if (element.namespaceURI === XSLT_NAMESPACE) {
    throw createXsltStaticError(
      `Unsupported XSLT instruction ${element.nodeName} in current MVP+3 slice.`,
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
    );
  }

  return {
    kind: 'literalElement',
    name: element.tagName,
    attributes: compileAttributes(element),
    body: compileInstructions(element.childNodes, stylesheetXml),
  };
}

function compileAttributes(element: Element): AttributeInstruction[] {
  const attributes: AttributeInstruction[] = [];

  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index) as Attr | null;
    if (attribute === null) {
      continue;
    }

    attributes.push({
      name: attribute.name,
      value: attribute.value,
    });
  }

  return attributes;
}

function childElements(element: Element): Element[] {
  const children: Element[] = [];

  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes.item(index);
    if (child !== null && child.nodeType === child.ELEMENT_NODE) {
      children.push(child as Element);
    }
  }

  return children;
}

function isXsltElement(element: Element, localName: string): boolean {
  return element.namespaceURI === XSLT_NAMESPACE && (element.localName ?? element.nodeName) === localName;
}

function isSupportedTemplateMatch(ast: XPathAst): boolean {
  if (ast.kind !== 'path') {
    return false;
  }

  const path = ast as PathExpression;
  if (path.base !== undefined) {
    return false;
  }

  if (path.absolute && path.steps.length === 0) {
    return true;
  }

  if (path.absolute || path.steps.length !== 1) {
    return false;
  }

  const step = path.steps[0];
  if (step?.kind !== 'step') {
    return false;
  }

  return isSupportedTemplateStep(step as StepExpression);
}

function isSupportedTemplateStep(step: StepExpression): boolean {
  if (step.axis !== 'child' || step.predicates.length > 0) {
    return false;
  }

  return step.nodeTest.kind === 'nameTest'
    || step.nodeTest.kind === 'wildcardTest'
    || (step.nodeTest.kind === 'kindTest' && step.nodeTest.name === 'node')
    || (step.nodeTest.kind === 'kindTest' && step.nodeTest.name === 'text');
}

function createXsltStaticError(message: string, location?: TemplateRule['location']): XsltError {
  return new XsltError(XTSE0010, message, location);
}
