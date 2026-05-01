/**
 * Stylesheet compiler: DOM → StylesheetIR.
 *
 * Current MVP+3 slice: root and simple name-matching templates with literal
 * result elements, xsl:text, xsl:value-of, and xsl:apply-templates.
 */

import type { Attr, Element, Node } from '@xmldom/xmldom';

import { XTSE0010, XTSE0165, XTSE0500 } from '../../errors/codes.js';
import { XsltError, type ErrorContext, type ErrorSuggestion } from '../../errors/index.js';
import type { PathExpression, StepExpression, XPathAst } from '../../xpath/parse/ast.js';
import { parseXPath } from '../../xpath/parse/parser.js';
import { getAttributeValueSourceLocation, getElementNameSourceLocation, getNodeSourceLocation, parseXml } from '../../xml/parse.js';
import type { AttributeInstruction, Instruction, StylesheetIR, TemplateRule } from './ir.js';

const XSLT_NAMESPACE = 'http://www.w3.org/1999/XSL/Transform';
const STYLESHEET_SOURCE_NAME = '<stylesheet>';
const SUPPORTED_XSLT_INSTRUCTION_NAMES = ['apply-templates', 'text', 'value-of'] as const;

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
      {
        suggestions: [{
          kind: 'fix',
          label: 'wrap the stylesheet in an xsl:stylesheet or xsl:transform document element',
          confidence: 1,
        }],
      },
    );
  }

  const version = root.getAttribute('version');
  if (version === null || version.length === 0) {
    throw createXsltStaticError(
      'Stylesheet module must declare a version attribute.',
      getAttributeValueSourceLocation(stylesheetXml, root, 'version', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, root, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add version="3.0" to the stylesheet document element',
          replacement: 'version="3.0"',
          confidence: 1,
        }],
      },
      XTSE0500,
    );
  }

  const templates = childElements(root)
    .map((child) => compileTopLevelDeclaration(child, stylesheetXml))
    .filter((template): template is TemplateRule => template !== undefined);

  if (templates.length === 0) {
    throw createXsltStaticError(
      'Stylesheet must declare at least one xsl:template.',
      getNodeSourceLocation(stylesheetXml, root, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add at least one xsl:template to the stylesheet',
          confidence: 1,
        }],
      },
    );
  }

  return {
    version: '3.0',
    templates,
  };
}

function compileTopLevelDeclaration(element: Element, stylesheetXml: string): TemplateRule | undefined {
  if (isXsltElement(element, 'template')) {
    return compileTemplateRule(element, stylesheetXml);
  }

  if (isXsltElement(element, 'include') || isXsltElement(element, 'import')) {
    const href = element.getAttribute('href') ?? '';
    throw createXsltStaticError(
      `Stylesheet ${element.localName ?? element.nodeName} declarations are not yet implemented in the current MVP+3 slice.`,
      getAttributeValueSourceLocation(stylesheetXml, element, 'href', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        href,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: `inline or remove xsl:${element.localName ?? element.nodeName} in the current MVP+3 slice`,
          confidence: 1,
        }],
      },
      XTSE0165,
    );
  }

  if (element.namespaceURI === XSLT_NAMESPACE) {
    throw createXsltStaticError(
      `Unsupported top-level XSLT declaration ${element.nodeName} in current MVP+3 slice.`,
      getElementNameSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        declarationName: element.nodeName,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: `remove unsupported top-level declaration ${element.nodeName} in the current MVP+3 slice`,
          confidence: 1,
        }],
      },
    );
  }

  throw createXsltStaticError(
    `Unsupported top-level stylesheet element ${element.nodeName} in current MVP+3 slice.`,
    getElementNameSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
    {
      elementName: element.nodeName,
    },
    {
      suggestions: [{
        kind: 'fix',
        label: 'move result elements inside xsl:template bodies in the current MVP+3 slice',
        confidence: 1,
      }],
    },
  );
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
      {
        suggestions: [{
          kind: 'fix',
          label: 'add match="..." or name="..." to xsl:template',
          confidence: 1,
        }],
      },
    );
  }

  if (matchText === undefined && name !== undefined) {
    throw createXsltStaticError(
      'Named templates are not yet implemented in the current MVP+3 slice.',
      getAttributeValueSourceLocation(stylesheetXml, templateElement, 'name', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'use match="/" or another supported match pattern instead of a named-only template',
          confidence: 1,
        }],
      },
    );
  }

  const match = matchText === undefined ? undefined : parseXPath(matchText);
  if (match !== undefined && !isSupportedTemplateMatch(match)) {
    throw createXsltStaticError(
      `Unsupported template match pattern ${JSON.stringify(matchText)} in current MVP+3 slice.`,
      getAttributeValueSourceLocation(stylesheetXml, templateElement, 'match', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'use one of the currently supported simple match patterns: /, /name, name, *, node(), or text()',
          confidence: 1,
        }],
      },
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
        {
          suggestions: [{
            kind: 'fix',
            label: 'remove mode="..." and use the default mode in the current MVP+3 slice',
            replacement: 'mode',
            confidence: 1,
          }],
        },
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
        {
          suggestions: [{
            kind: 'fix',
            label: 'add a select="..." attribute to xsl:value-of',
            replacement: 'select="..."',
            confidence: 1,
          }],
        },
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
    const suggestion = createInstructionSuggestion(element);
    throw createXsltStaticError(
      `Unsupported XSLT instruction ${element.nodeName} in current MVP+3 slice.`,
      getElementNameSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        instructionName: element.nodeName,
      },
      suggestion === undefined ? undefined : { suggestions: [suggestion] },
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

  if (path.steps.length !== 1) {
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

function createInstructionSuggestion(element: Element): ErrorSuggestion | undefined {
  const localName = element.localName ?? element.nodeName;
  const nearest = SUPPORTED_XSLT_INSTRUCTION_NAMES
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(localName, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean xsl:${nearest.candidate}?`,
    replacement: `xsl:${nearest.candidate}`,
    confidence: nearest.distance === 0 ? 1 : 1 - (nearest.distance / nearest.candidate.length),
  };
}

function computeLevenshteinDistance(left: string, right: string): number {
  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0] ?? 0;
    previousRow[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const temp = previousRow[rightIndex] ?? 0;
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previousRow[rightIndex] = Math.min(
        (previousRow[rightIndex] ?? 0) + 1,
        (previousRow[rightIndex - 1] ?? 0) + 1,
        previousDiagonal + substitutionCost,
      );
      previousDiagonal = temp;
    }
  }

  return previousRow[right.length] ?? right.length;
}

function createXsltStaticError(
  message: string,
  location?: TemplateRule['location'],
  detailsOrContext?: Readonly<Record<string, string | number | boolean>> | ErrorContext,
  contextOrCode?: ErrorContext | string,
  maybeCode?: string,
): XsltError {
  const details = isErrorContext(detailsOrContext) ? undefined : detailsOrContext;
  const context = isErrorContext(detailsOrContext)
    ? detailsOrContext
    : isErrorContext(contextOrCode)
      ? contextOrCode
      : undefined;
  const code = typeof contextOrCode === 'string'
    ? contextOrCode
    : maybeCode ?? XTSE0010;

  return new XsltError(code, message, location, details, context);
}

function isErrorContext(value: unknown): value is ErrorContext {
  return typeof value === 'object' && value !== null && (
    'related' in value
    || 'frames' in value
    || 'suggestions' in value
    || 'causes' in value
  );
}
