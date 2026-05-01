import type { Attr, Element, Node } from '@xmldom/xmldom';

import { XPST0081, XTSE0010, XTSE0090, XTSE0620, XTSE0670 } from '../../errors/codes.js';
import { XsltError, type ErrorContext, type ErrorFrame, type ErrorSuggestion } from '../../errors/index.js';
import type { PathExpression, StepExpression, XPathAst } from '../../xpath/parse/ast.js';
import { parseXPath } from '../../xpath/parse/parser.js';
import { getAttributeValueSourceLocation, getNodeSourceLocation } from '../../xml/parse.js';
import { computeLevenshteinDistance, prependXsltErrorFrame as withPrependedCompileFrame } from '../diagnostics.js';
import type { TemplateRule, WithParam } from './ir.js';

export const XSLT_NAMESPACE = 'http://www.w3.org/1999/XSL/Transform';
export const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';
export const STYLESHEET_SOURCE_NAME = '<stylesheet>';

const SUPPORTED_XSLT_INSTRUCTION_NAMES = ['apply-templates', 'call-template', 'choose', 'comment', 'for-each', 'if', 'otherwise', 'text', 'value-of', 'variable', 'when'] as const;

export function hasMeaningfulTemplateContent(element: Element): boolean {
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes.item(index);
    if (node === null) {
      continue;
    }

    if (node.nodeType === node.ELEMENT_NODE) {
      return true;
    }

    if ((node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE) && (node.nodeValue ?? '').trim().length > 0) {
      return true;
    }
  }

  return false;
}

export function assertNoSelectAndContent(
  element: Element,
  stylesheetXml: string,
  select: string | undefined,
  ownerName: 'xsl:param' | 'xsl:variable' | 'xsl:with-param',
  detailKey: 'paramName' | 'variableName',
  bindingName: string,
): void {
  if (select === undefined || !hasMeaningfulTemplateContent(element)) {
    return;
  }

  throw createXsltStaticError(
    `${ownerName} cannot specify both a select attribute and a sequence constructor.`,
    getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
    {
      [detailKey]: bindingName,
    },
    {
      suggestions: [{
        kind: 'fix',
        label: `remove select="..." or remove ${ownerName} content`,
        confidence: 1,
      }],
    },
    XTSE0620,
  );
}

export function assertAllowedXsltAttributes(
  element: Element,
  stylesheetXml: string,
  instructionName: string,
  allowedAttributeNames: readonly string[],
): void {
  const allowed = new Set(allowedAttributeNames);

  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index) as Attr | null;
    if (attribute === null) {
      continue;
    }

    if (attribute.prefix === 'xmlns' || attribute.nodeName === 'xmlns' || attribute.namespaceURI === XMLNS_NAMESPACE) {
      continue;
    }

    const attributeName = attribute.nodeName;
    const localName = attribute.localName ?? attributeName;
    if (attribute.namespaceURI === XSLT_NAMESPACE) {
      throw createXsltStaticError(
        `${instructionName} cannot use an attribute in the XSLT namespace: ${attributeName}.`,
        getAttributeValueSourceLocation(stylesheetXml, element, attributeName, STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, attribute, STYLESHEET_SOURCE_NAME),
        {
          attributeName,
          instructionName,
        },
        {
          suggestions: [{
            kind: 'fix',
            label: `remove ${attributeName} from ${instructionName}`,
            confidence: 1,
          }],
        },
        XTSE0090,
      );
    }

    if ((attribute.namespaceURI === null || attribute.namespaceURI.length === 0) && !allowed.has(localName)) {
      const suggestion = createAttributeSuggestion(localName, allowedAttributeNames);
      throw createXsltStaticError(
        `${instructionName} has an unsupported attribute ${attributeName}.`,
        getAttributeValueSourceLocation(stylesheetXml, element, attributeName, STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, attribute, STYLESHEET_SOURCE_NAME),
        {
          attributeName,
          instructionName,
        },
        suggestion === undefined
          ? {
              suggestions: [{
                kind: 'fix',
                label: `remove ${attributeName} from ${instructionName}`,
                confidence: 1,
              }],
            }
          : { suggestions: [suggestion] },
        XTSE0090,
      );
    }
  }
}

export function createAttributeSuggestion(
  rawName: string,
  allowedAttributeNames: readonly string[],
): ErrorSuggestion | undefined {
  const nearest = allowedAttributeNames
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(rawName, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean ${nearest.candidate}="..."?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - (nearest.distance / nearest.candidate.length),
  };
}

export function assertNoDuplicateWithParam(
  existingParams: readonly WithParam[],
  withParam: WithParam,
  stylesheetXml: string,
  element: Element,
  parentInstructionName: 'xsl:apply-templates' | 'xsl:call-template',
): void {
  if (!existingParams.some((existing) => existing.name === withParam.name)) {
    return;
  }

  throw createXsltStaticError(
    `${parentInstructionName} cannot declare duplicate xsl:with-param name ${withParam.name}.`,
    withParam.location
      ?? getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
    {
      paramName: withParam.name,
    },
    {
      suggestions: [{
        kind: 'fix',
        label: `rename or remove one of the duplicate xsl:with-param declarations for ${withParam.name}`,
        confidence: 1,
      }],
    },
    XTSE0670,
  );
}

export function childElements(element: Element): Element[] {
  const children: Element[] = [];

  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes.item(index);
    if (child !== null && child.nodeType === child.ELEMENT_NODE) {
      children.push(child as Element);
    }
  }

  return children;
}

export function parseRequiredAttribute(element: Element): boolean {
  const required = element.getAttribute('required');
  if (required === null) {
    return false;
  }

  const normalized = required.trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
}

export function normalizeXsltQName(
  name: string,
  element: Element,
  stylesheetXml: string,
  attributeName: string,
  ownerName: string,
): string {
  const eqName = tryNormalizeEqName(name);
  if (eqName !== undefined) {
    return eqName;
  }

  const separator = name.indexOf(':');
  if (separator < 0) {
    return name;
  }

  const prefix = name.slice(0, separator);
  const localName = name.slice(separator + 1);
  const namespaceUri = lookupNamespaceUri(element, prefix);
  if (namespaceUri === undefined) {
    throw createXsltStaticError(
      `Unknown namespace prefix ${JSON.stringify(prefix)} in ${ownerName} ${attributeName}.`,
      getAttributeValueSourceLocation(stylesheetXml, element, attributeName, STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        namespacePrefix: prefix,
        qName: name,
      },
      XPST0081,
    );
  }

  return `{${namespaceUri}}${localName}`;
}

export function parseXPathInContext(
  expression: string,
  location: TemplateRule['location'],
  ownerName: string,
  attributeName: string,
  frameKind: ErrorFrame['kind'] = 'instruction',
): XPathAst {
  try {
    return parseXPath(expression);
  } catch (error) {
    const frameLabel = frameKind === 'template'
      ? `${attributeName}="${expression}"`
      : `${ownerName} ${attributeName}="${expression}"`;
    throw withPrependedCompileFrame(
      error,
      {
        kind: frameKind,
        label: frameLabel,
        ...(location === undefined ? {} : { location }),
      },
      location === undefined
        ? undefined
        : {
            label: frameKind === 'template' ? 'containing template' : 'containing instruction',
            location,
          },
    );
  }
}

export function isXsltElement(element: Element, localName: string): boolean {
  return element.namespaceURI === XSLT_NAMESPACE && (element.localName ?? element.nodeName) === localName;
}

export function isSupportedTemplateMatch(ast: XPathAst): boolean {
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

export function createInstructionSuggestion(element: Element): ErrorSuggestion | undefined {
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

export function createXsltStaticError(
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

function tryNormalizeEqName(name: string): string | undefined {
  if (!name.startsWith('Q{')) {
    return undefined;
  }

  const endBrace = name.indexOf('}');
  if (endBrace < 0) {
    return undefined;
  }

  const namespaceUri = name.slice(2, endBrace);
  const localName = name.slice(endBrace + 1);
  if (localName.length === 0) {
    return undefined;
  }

  return namespaceUri.length === 0 ? localName : `{${namespaceUri}}${localName}`;
}

function lookupNamespaceUri(element: Element, prefix: string): string | undefined {
  for (let current: Node | null = element; current !== null; current = current.parentNode) {
    if (current.nodeType !== current.ELEMENT_NODE) {
      continue;
    }

    const currentElement = current as Element;
    for (let index = 0; index < currentElement.attributes.length; index += 1) {
      const attribute = currentElement.attributes.item(index) as Attr | null;
      if (attribute?.prefix === 'xmlns' && attribute.localName === prefix) {
        return attribute.value;
      }
    }
  }

  return undefined;
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

function isErrorContext(value: unknown): value is ErrorContext {
  return typeof value === 'object' && value !== null && (
    'related' in value
    || 'frames' in value
    || 'suggestions' in value
    || 'causes' in value
  );
}