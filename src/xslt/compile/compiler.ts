/**
 * Stylesheet compiler: DOM → StylesheetIR.
 *
 * Current MVP+3 slice: root and simple name-matching templates with literal
 * result elements, xsl:text, xsl:value-of, and xsl:apply-templates.
 */

import type { Attr, Element, Node } from '@xmldom/xmldom';

import { XPST0081, XTSE0010, XTSE0090, XTSE0165, XTSE0500, XTSE0580, XTSE0620, XTSE0630, XTSE0650, XTSE0660, XTSE0670, XTSE0680, XTSE0690 } from '../../errors/codes.js';
import { XdmError, XsltError, type ErrorContext, type ErrorFrame, type ErrorSuggestion, type RelatedLocation } from '../../errors/index.js';
import type { PathExpression, StepExpression, XPathAst } from '../../xpath/parse/ast.js';
import { parseXPath } from '../../xpath/parse/parser.js';
import { getAttributeValueSourceLocation, getElementNameSourceLocation, getNodeSourceLocation, parseXml } from '../../xml/parse.js';
import type { AttributeInstruction, ChooseWhenBranch, GlobalBinding, GlobalParam, GlobalVariable, Instruction, StylesheetIR, TemplateParam, TemplateRule, WithParam } from './ir.js';

const XSLT_NAMESPACE = 'http://www.w3.org/1999/XSL/Transform';
const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';
const STYLESHEET_SOURCE_NAME = '<stylesheet>';
const SUPPORTED_XSLT_INSTRUCTION_NAMES = ['apply-templates', 'call-template', 'choose', 'comment', 'for-each', 'if', 'otherwise', 'text', 'value-of', 'variable', 'when'] as const;
const SUPPORTED_XSLT_STYLESHEET_ATTRIBUTES = ['exclude-result-prefixes', 'version', 'xpath-default-namespace'] as const;
const KNOWN_LATER_XSLT_STYLESHEET_ATTRIBUTES = [
  'default-collation',
  'default-mode',
  'default-validation',
  'expand-text',
  'extension-element-prefixes',
  'id',
  'input-type-annotations',
  'use-when',
] as const;
const SUPPORTED_XSLT_OUTPUT_ATTRIBUTES = ['method'] as const;
const SUPPORTED_XSLT_OUTPUT_METHODS = ['xml'] as const;
const KNOWN_LATER_XSLT_OUTPUT_METHODS = ['html', 'json', 'text'] as const;
const KNOWN_LATER_XSLT_OUTPUT_ATTRIBUTES = [
  'byte-order-mark',
  'cdata-section-elements',
  'doctype-public',
  'doctype-system',
  'encoding',
  'escape-uri-attributes',
  'html-version',
  'include-content-type',
  'indent',
  'item-separator',
  'media-type',
  'name',
  'normalization-form',
  'omit-xml-declaration',
  'parameter-document',
  'standalone',
  'suppress-indentation',
  'undeclare-prefixes',
  'use-character-maps',
  'version',
] as const;

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

  validateStylesheetRootAttributes(root, stylesheetXml);

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

  assertNoDuplicateNamedTemplates(root, stylesheetXml);
  assertNoDuplicateGlobalBindings(root, stylesheetXml);
  assertNoUnknownCalledTemplates(root, stylesheetXml);
  assertNoInvalidCallTemplateParams(root, stylesheetXml);

  const templates: TemplateRule[] = [];
  const globalBindings: GlobalBinding[] = [];
  for (const child of childElements(root)) {
    const declaration = compileTopLevelDeclaration(child, stylesheetXml);
    if (declaration === undefined) {
      continue;
    }

    if ('body' in declaration && 'modes' in declaration) {
      templates.push(declaration);
      continue;
    }

    globalBindings.push(declaration);
  }
  const { namespaces, defaultElementNamespace } = collectStylesheetStaticContext(root);

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
    namespaces,
    defaultElementNamespace,
    globalBindings,
    templates,
  };
}

function collectStylesheetStaticContext(root: Element): Pick<StylesheetIR, 'namespaces' | 'defaultElementNamespace'> {
  const namespaces: Record<string, string> = {};

  for (let index = 0; index < root.attributes.length; index += 1) {
    const attribute = root.attributes.item(index) as Attr | null;
    if (attribute === null) {
      continue;
    }

    if (attribute.prefix === 'xmlns' && attribute.localName !== null && attribute.localName.length > 0) {
      namespaces[attribute.localName] = attribute.value;
    }
  }

  return {
    namespaces,
    defaultElementNamespace: root.getAttribute('xpath-default-namespace') ?? '',
  };
}

function assertNoDuplicateNamedTemplates(root: Element, stylesheetXml: string): void {
  const namedTemplates = new Map<string, Element>();

  for (const child of childElements(root)) {
    if (!isXsltElement(child, 'template')) {
      continue;
    }

    const rawName = child.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      continue;
    }

    const name = normalizeXsltQName(rawName, child, stylesheetXml, 'name', 'xsl:template');
    if (!namedTemplates.has(name)) {
      namedTemplates.set(name, child);
      continue;
    }

    throw createXsltStaticError(
      `Stylesheet cannot declare duplicate named xsl:template ${name}.`,
      getAttributeValueSourceLocation(stylesheetXml, child, 'name', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
      {
        templateName: name,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: `rename or remove one of the duplicate named templates for ${name}`,
          confidence: 1,
        }],
      },
      XTSE0660,
    );
  }
}

function assertNoDuplicateGlobalBindings(root: Element, stylesheetXml: string): void {
  const globalBindings = new Map<string, Element>();

  for (const child of childElements(root)) {
    if (!isXsltElement(child, 'param') && !isXsltElement(child, 'variable')) {
      continue;
    }

    const rawName = child.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      continue;
    }

    const name = normalizeXsltQName(rawName, child, stylesheetXml, 'name', child.localName === 'param' ? 'xsl:param' : 'xsl:variable');
    if (!globalBindings.has(name)) {
      globalBindings.set(name, child);
      continue;
    }

    throw createXsltStaticError(
      `Stylesheet cannot declare duplicate global binding ${name}.`,
      getAttributeValueSourceLocation(stylesheetXml, child, 'name', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
      {
        bindingName: name,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: `rename or remove one of the duplicate global bindings for ${name}`,
          confidence: 1,
        }],
      },
      XTSE0630,
    );
  }
}

function assertNoUnknownCalledTemplates(root: Element, stylesheetXml: string): void {
  const namedTemplates = collectNamedTemplateDisplayNames(root, stylesheetXml);

  for (const child of childElements(root)) {
    if (!isXsltElement(child, 'template') && !isXsltElement(child, 'param') && !isXsltElement(child, 'variable')) {
      continue;
    }

    for (const element of descendantElements(child)) {
      if (!isXsltElement(element, 'call-template')) {
        continue;
      }

      const rawName = element.getAttribute('name');
      if (rawName === null || rawName.length === 0) {
        continue;
      }

      const name = normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:call-template');
      if (namedTemplates.has(name)) {
        continue;
      }

      const suggestion = createNamedTemplateReferenceSuggestion(rawName, namedTemplates);

      throw createXsltStaticError(
        `xsl:call-template cannot target undeclared template ${name}.`,
        getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          templateName: name,
        },
        suggestion === undefined
          ? {
              suggestions: [{
                kind: 'fix',
                label: `declare xsl:template name="${rawName}" or update xsl:call-template`,
                confidence: 1,
              }],
            }
          : { suggestions: [suggestion] },
        XTSE0650,
      );
    }
  }
}

function assertNoInvalidCallTemplateParams(root: Element, stylesheetXml: string): void {
  const namedTemplates = collectNamedTemplateSignatures(root, stylesheetXml);

  for (const child of childElements(root)) {
    if (!isXsltElement(child, 'template') && !isXsltElement(child, 'param') && !isXsltElement(child, 'variable')) {
      continue;
    }

    for (const element of descendantElements(child)) {
      if (!isXsltElement(element, 'call-template')) {
        continue;
      }

      const rawName = element.getAttribute('name');
      if (rawName === null || rawName.length === 0) {
        continue;
      }

      if (!childElements(element).every((entry) => isXsltElement(entry, 'with-param'))) {
        continue;
      }

      if (!childElements(element).every((entry) => canValidateCallTemplateWithParam(entry))) {
        continue;
      }

      const targetName = normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:call-template');
      const signature = namedTemplates.get(targetName);
      if (signature === undefined) {
        continue;
      }

      const suppliedParams = new Set<string>();
      for (const withParamElement of childElements(element)) {
        const withParamName = withParamElement.getAttribute('name');
        if (withParamName === null || withParamName.length === 0 || isTunnelParamElement(withParamElement)) {
          continue;
        }

        const normalizedWithParamName = normalizeXsltQName(withParamName, withParamElement, stylesheetXml, 'name', 'xsl:with-param');
        suppliedParams.add(normalizedWithParamName);
        if (signature.nonTunnelParams.has(normalizedWithParamName)) {
          continue;
        }

        const suggestion = createCallTemplateParamSuggestion(withParamName, signature.nonTunnelParamDisplayNames);

        throw createXsltStaticError(
          `xsl:call-template cannot pass undeclared parameter ${normalizedWithParamName} to template ${targetName}.`,
          getAttributeValueSourceLocation(stylesheetXml, withParamElement, 'name', STYLESHEET_SOURCE_NAME)
            ?? getNodeSourceLocation(stylesheetXml, withParamElement, STYLESHEET_SOURCE_NAME),
          {
            parameterName: normalizedWithParamName,
            templateName: targetName,
          },
          suggestion === undefined
            ? {
                suggestions: [{
                  kind: 'fix',
                  label: `declare xsl:param name="${withParamName}" on template ${rawName} or remove the xsl:with-param`,
                  confidence: 1,
                }],
              }
            : { suggestions: [suggestion] },
          XTSE0680,
        );
      }

      for (const requiredParam of signature.requiredNonTunnelParams) {
        if (suppliedParams.has(requiredParam.name)) {
          continue;
        }

        throw createXsltStaticError(
          `xsl:call-template must supply required parameter ${requiredParam.name} to template ${targetName}.`,
          getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
            ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
          {
            parameterName: requiredParam.name,
            templateName: targetName,
          },
          {
            suggestions: [{
              kind: 'fix',
              label: `add xsl:with-param name="${stripClarkNotation(requiredParam.name)}" to xsl:call-template or make the parameter optional`,
              confidence: 1,
            }],
          },
          XTSE0690,
        );
      }
    }
  }
}

function collectNamedTemplateDisplayNames(root: Element, stylesheetXml: string): ReadonlyMap<string, string> {
  const namedTemplates = new Map<string, string>();

  for (const child of childElements(root)) {
    if (!isXsltElement(child, 'template')) {
      continue;
    }

    const rawName = child.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      continue;
    }

    namedTemplates.set(normalizeXsltQName(rawName, child, stylesheetXml, 'name', 'xsl:template'), rawName);
  }

  return namedTemplates;
}

function collectNamedTemplateSignatures(root: Element, stylesheetXml: string): ReadonlyMap<string, {
  readonly nonTunnelParams: ReadonlySet<string>;
  readonly nonTunnelParamDisplayNames: ReadonlyMap<string, string>;
  readonly requiredNonTunnelParams: ReadonlyArray<{ readonly name: string }>;
}> {
  const signatures = new Map<string, {
    readonly nonTunnelParams: ReadonlySet<string>;
    readonly nonTunnelParamDisplayNames: ReadonlyMap<string, string>;
    readonly requiredNonTunnelParams: ReadonlyArray<{ readonly name: string }>;
  }>();

  for (const child of childElements(root)) {
    if (!isXsltElement(child, 'template')) {
      continue;
    }

    const rawName = child.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      continue;
    }

    const normalizedName = normalizeXsltQName(rawName, child, stylesheetXml, 'name', 'xsl:template');
    const nonTunnelParams = new Set<string>();
    const nonTunnelParamDisplayNames = new Map<string, string>();
    const requiredNonTunnelParams: Array<{ readonly name: string }> = [];

    for (const paramElement of leadingTemplateParamElements(child)) {
      if (isTunnelParamElement(paramElement)) {
        continue;
      }

      const paramRawName = paramElement.getAttribute('name');
      if (paramRawName === null || paramRawName.length === 0) {
        continue;
      }

      const normalizedParamName = normalizeXsltQName(paramRawName, paramElement, stylesheetXml, 'name', 'xsl:param');
      nonTunnelParams.add(normalizedParamName);
      nonTunnelParamDisplayNames.set(normalizedParamName, paramRawName);
      if (parseRequiredAttribute(paramElement)) {
        requiredNonTunnelParams.push({ name: normalizedParamName });
      }
    }

    signatures.set(normalizedName, {
      nonTunnelParams,
      nonTunnelParamDisplayNames,
      requiredNonTunnelParams,
    });
  }

  return signatures;
}

function compileTopLevelDeclaration(element: Element, stylesheetXml: string): TemplateRule | GlobalBinding | undefined {
  if (isXsltElement(element, 'template')) {
    return compileTemplateRule(element, stylesheetXml);
  }

  if (isXsltElement(element, 'param')) {
    return compileTopLevelParam(element, stylesheetXml);
  }

  if (isXsltElement(element, 'variable')) {
    return compileTopLevelVariable(element, stylesheetXml);
  }

  if (isXsltElement(element, 'strip-space')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:strip-space', ['elements']);
    return undefined;
  }

  if (isXsltElement(element, 'output')) {
    validateOutputDeclaration(element, stylesheetXml);
    return undefined;
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

function validateStylesheetRootAttributes(root: Element, stylesheetXml: string): void {
  const supported = new Set<string>(SUPPORTED_XSLT_STYLESHEET_ATTRIBUTES);
  const knownLater = new Set<string>(KNOWN_LATER_XSLT_STYLESHEET_ATTRIBUTES);
  const candidateAttributes = [
    ...SUPPORTED_XSLT_STYLESHEET_ATTRIBUTES,
    ...KNOWN_LATER_XSLT_STYLESHEET_ATTRIBUTES,
  ];
  const instructionName = root.nodeName;

  for (let index = 0; index < root.attributes.length; index += 1) {
    const attribute = root.attributes.item(index) as Attr | null;
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
        getAttributeValueSourceLocation(stylesheetXml, root, attributeName, STYLESHEET_SOURCE_NAME)
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

    if (attribute.namespaceURI !== null && attribute.namespaceURI.length > 0) {
      continue;
    }

    if (supported.has(localName)) {
      continue;
    }

    if (knownLater.has(localName)) {
      throw createXsltStaticError(
        `${instructionName} attribute ${attributeName} is not yet implemented in the current MVP+3 slice.`,
        getAttributeValueSourceLocation(stylesheetXml, root, attributeName, STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, attribute, STYLESHEET_SOURCE_NAME),
        {
          attributeName,
          instructionName,
        },
        {
          suggestions: [{
            kind: 'fix',
            label: `remove ${attributeName} from ${instructionName} in the current MVP+3 slice`,
            confidence: 1,
          }],
        },
        XTSE0090,
      );
    }

    const suggestion = createAttributeSuggestion(localName, candidateAttributes);
    throw createXsltStaticError(
      `${instructionName} has an unsupported attribute ${attributeName}.`,
      getAttributeValueSourceLocation(stylesheetXml, root, attributeName, STYLESHEET_SOURCE_NAME)
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

function validateOutputDeclaration(element: Element, stylesheetXml: string): void {
  const supported = new Set<string>(SUPPORTED_XSLT_OUTPUT_ATTRIBUTES);
  const knownLater = new Set<string>(KNOWN_LATER_XSLT_OUTPUT_ATTRIBUTES);
  const candidateAttributes = [
    ...SUPPORTED_XSLT_OUTPUT_ATTRIBUTES,
    ...KNOWN_LATER_XSLT_OUTPUT_ATTRIBUTES,
  ];

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
        `xsl:output cannot use an attribute in the XSLT namespace: ${attributeName}.`,
        getAttributeValueSourceLocation(stylesheetXml, element, attributeName, STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, attribute, STYLESHEET_SOURCE_NAME),
        {
          attributeName,
          instructionName: 'xsl:output',
        },
        {
          suggestions: [{
            kind: 'fix',
            label: `remove ${attributeName} from xsl:output`,
            confidence: 1,
          }],
        },
        XTSE0090,
      );
    }

    if (attribute.namespaceURI !== null && attribute.namespaceURI.length > 0) {
      continue;
    }

    if (supported.has(localName)) {
      continue;
    }

    if (knownLater.has(localName)) {
      throw createXsltStaticError(
        `xsl:output attribute ${attributeName} is not yet implemented in the current MVP+3 slice.`,
        getAttributeValueSourceLocation(stylesheetXml, element, attributeName, STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, attribute, STYLESHEET_SOURCE_NAME),
        {
          attributeName,
          instructionName: 'xsl:output',
        },
        {
          suggestions: [{
            kind: 'fix',
            label: `remove ${attributeName} from xsl:output or omit xsl:output in the current MVP+3 slice`,
            confidence: 1,
          }],
        },
        XTSE0090,
      );
    }

    const suggestion = createAttributeSuggestion(localName, candidateAttributes);
    throw createXsltStaticError(
      `xsl:output has an unsupported attribute ${attributeName}.`,
      getAttributeValueSourceLocation(stylesheetXml, element, attributeName, STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, attribute, STYLESHEET_SOURCE_NAME),
      {
        attributeName,
        instructionName: 'xsl:output',
      },
      suggestion === undefined
        ? {
            suggestions: [{
              kind: 'fix',
              label: `remove ${attributeName} from xsl:output`,
              confidence: 1,
            }],
          }
        : { suggestions: [suggestion] },
      XTSE0090,
    );
  }

  const method = element.getAttribute('method');
  if (method === null) {
    return;
  }

  if ((SUPPORTED_XSLT_OUTPUT_METHODS as readonly string[]).includes(method)) {
    return;
  }

  if ((KNOWN_LATER_XSLT_OUTPUT_METHODS as readonly string[]).includes(method)) {
    throw createXsltStaticError(
      `xsl:output method ${JSON.stringify(method)} is not yet implemented in the current MVP+3 slice.`,
      getAttributeValueSourceLocation(stylesheetXml, element, 'method', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        method,
        instructionName: 'xsl:output',
      },
      {
        suggestions: [{
          kind: 'fix',
          label: 'use method="xml" or omit xsl:output in the current MVP+3 slice',
          confidence: 1,
        }],
      },
      XTSE0090,
    );
  }

  throw createXsltStaticError(
    `xsl:output has an unsupported method ${JSON.stringify(method)}.`,
    getAttributeValueSourceLocation(stylesheetXml, element, 'method', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
    {
      method,
      instructionName: 'xsl:output',
    },
    createOutputMethodSuggestion(method) === undefined
      ? {
          suggestions: [{
            kind: 'fix',
            label: 'use method="xml" or omit xsl:output in the current MVP+3 slice',
            confidence: 1,
          }],
        }
      : { suggestions: [createOutputMethodSuggestion(method)!] },
    XTSE0090,
  );
}

function compileTopLevelVariable(element: Element, stylesheetXml: string): GlobalVariable {
  assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:variable', ['as', 'name', 'select']);

  const rawName = element.getAttribute('name');
  if (rawName === null || rawName.length === 0) {
    throw createXsltStaticError(
      'xsl:variable requires a name attribute.',
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add a name="..." attribute to xsl:variable',
          replacement: 'name="..."',
          confidence: 1,
        }],
      },
    );
  }

  const select = element.getAttribute('select') ?? undefined;
  assertNoSelectAndContent(
    element,
    stylesheetXml,
    select,
    'xsl:variable',
    'variableName',
    rawName,
  );
  const body = select === undefined && hasMeaningfulTemplateContent(element)
    ? compileInstructions(element.childNodes, stylesheetXml)
    : undefined;
  const selectLocation = select === undefined
    ? undefined
    : getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

  const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
    ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);
  const name = normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:variable');

  return {
    kind: 'variable',
    name,
    ...(select === undefined ? {} : { select: parseXPathInContext(select, selectLocation, 'xsl:variable', 'select') }),
    ...(select === undefined ? {} : { selectText: select }),
    ...(body === undefined ? {} : { body }),
    ...(location === undefined ? {} : { location }),
  };
}

function compileTopLevelParam(element: Element, stylesheetXml: string): GlobalParam {
  const param = compileTemplateParam(element, stylesheetXml);
  return {
    kind: 'param',
    ...param,
  };
}

function compileTemplateRule(templateElement: Element, stylesheetXml: string): TemplateRule {
  assertAllowedXsltAttributes(templateElement, stylesheetXml, 'xsl:template', ['exclude-result-prefixes', 'match', 'mode', 'name', 'priority']);

  const modeText = templateElement.getAttribute('mode');
  if (modeText !== null) {
    throw createXsltStaticError(
      'xsl:template mode is not yet implemented in the current MVP+3 slice.',
      getAttributeValueSourceLocation(stylesheetXml, templateElement, 'mode', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'remove mode="..." and use the default mode in the current MVP+3 slice',
          confidence: 1,
        }],
      },
    );
  }

  const matchText = templateElement.getAttribute('match') ?? undefined;
  const rawName = templateElement.getAttribute('name') ?? undefined;
  const priorityText = templateElement.getAttribute('priority');
  const priority = priorityText === null ? undefined : Number(priorityText);

  if (matchText === undefined && rawName === undefined) {
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

  const matchLocation = matchText === undefined
    ? undefined
    : getAttributeValueSourceLocation(stylesheetXml, templateElement, 'match', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME);
  const match = matchText === undefined
    ? undefined
    : parseXPathInContext(matchText, matchLocation, 'xsl:template', 'match', 'template');
  if (match !== undefined && !isSupportedTemplateMatch(match)) {
    throw createXsltStaticError(
      `Unsupported template match pattern ${JSON.stringify(matchText)} in current MVP+3 slice.`,
      matchLocation,
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
    ? matchLocation
    : rawName !== undefined
      ? getAttributeValueSourceLocation(stylesheetXml, templateElement, 'name', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME)
      : getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME);
  const name = rawName === undefined
    ? undefined
    : normalizeXsltQName(rawName, templateElement, stylesheetXml, 'name', 'xsl:template');
  const { params, body } = compileTemplateContent(templateElement, stylesheetXml);

  return {
    ...(match === undefined ? {} : { match }),
    ...(matchText === undefined ? {} : { matchText }),
    ...(location === undefined ? {} : { location }),
    ...(name === undefined ? {} : { name }),
    modes: [],
    ...(priority === undefined || Number.isNaN(priority) ? {} : { priority }),
    params,
    body,
  };
}

function compileTemplateContent(templateElement: Element, stylesheetXml: string): {
  readonly params: readonly TemplateParam[];
  readonly body: readonly Instruction[];
} {
  const params: TemplateParam[] = [];
  const body: Instruction[] = [];
  let seenBodyInstruction = false;

  for (let index = 0; index < templateElement.childNodes.length; index += 1) {
    const node = templateElement.childNodes.item(index);
    if (node === null) {
      continue;
    }

    if (node.nodeType === node.ELEMENT_NODE) {
      const element = node as Element;
      if (isXsltElement(element, 'param')) {
        if (seenBodyInstruction) {
          throw createXsltStaticError(
            'xsl:param must appear before other template content.',
            getElementNameSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME)
              ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
          );
        }

        const param = compileTemplateParam(element, stylesheetXml);
        if (params.some((existing) => existing.name === param.name)) {
          throw createXsltStaticError(
            `xsl:template cannot declare duplicate xsl:param name ${param.name}.`,
            param.location
              ?? getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
              ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
            {
              paramName: param.name,
            },
            {
              suggestions: [{
                kind: 'fix',
                label: `rename or remove one of the duplicate xsl:param declarations for ${param.name}`,
                confidence: 1,
              }],
            },
            XTSE0580,
          );
        }

        params.push(param);
        continue;
      }
    }

    const instruction = compileInstruction(node, stylesheetXml);
    if (instruction !== undefined) {
      seenBodyInstruction = true;
      body.push(instruction);
    }
  }

  return { params, body };
}

function compileTemplateParam(element: Element, stylesheetXml: string): TemplateParam {
  assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:param', ['as', 'name', 'required', 'select', 'tunnel']);

  const rawName = element.getAttribute('name');
  if (rawName === null || rawName.length === 0) {
    throw createXsltStaticError(
      'xsl:param requires a name attribute.',
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add a name="..." attribute to xsl:param',
          replacement: 'name="..."',
          confidence: 1,
        }],
      },
    );
  }

  const select = element.getAttribute('select') ?? undefined;
  assertNoSelectAndContent(
    element,
    stylesheetXml,
    select,
    'xsl:param',
    'paramName',
    rawName,
  );
  const required = parseRequiredAttribute(element);
  const requiredLocation = getAttributeValueSourceLocation(stylesheetXml, element, 'required', STYLESHEET_SOURCE_NAME)
    ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);
  if (required && select !== undefined) {
    throw createXsltStaticError(
      'xsl:param with required="yes" cannot also specify a select attribute.',
      requiredLocation,
      {
        paramName: rawName,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: 'remove required="yes" or remove select="..." from xsl:param',
          confidence: 1,
        }],
      },
    );
  }

  if (required && hasMeaningfulTemplateContent(element)) {
    throw createXsltStaticError(
      'xsl:param with required="yes" cannot also specify a sequence constructor.',
      requiredLocation,
      {
        paramName: rawName,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: 'remove required="yes" or remove xsl:param content',
          confidence: 1,
        }],
      },
    );
  }

  const body = select === undefined && hasMeaningfulTemplateContent(element)
    ? compileInstructions(element.childNodes, stylesheetXml)
    : undefined;
  const selectLocation = select === undefined
    ? undefined
    : getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

  const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
    ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);
  const name = normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:param');

  return {
    name,
    ...(required ? { required: true } : {}),
    ...(select === undefined ? {} : { select: parseXPathInContext(select, selectLocation, 'xsl:param', 'select') }),
    ...(select === undefined ? {} : { selectText: select }),
    ...(body === undefined ? {} : { body }),
    ...(location === undefined ? {} : { location }),
  };
}

function compileWithParam(element: Element, stylesheetXml: string): WithParam {
  assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:with-param', ['as', 'name', 'select', 'tunnel']);

  const rawName = element.getAttribute('name');
  if (rawName === null || rawName.length === 0) {
    throw createXsltStaticError(
      'xsl:with-param requires a name attribute.',
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add a name="..." attribute to xsl:with-param',
          replacement: 'name="..."',
          confidence: 1,
        }],
      },
    );
  }

  const select = element.getAttribute('select') ?? undefined;
  assertNoSelectAndContent(
    element,
    stylesheetXml,
    select,
    'xsl:with-param',
    'paramName',
    rawName,
  );
  const body = select === undefined && hasMeaningfulTemplateContent(element)
    ? compileInstructions(element.childNodes, stylesheetXml)
    : undefined;
  const selectLocation = select === undefined
    ? undefined
    : getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

  const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
    ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);
  const name = normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:with-param');

  return {
    name,
    ...(select === undefined ? {} : { select: parseXPathInContext(select, selectLocation, 'xsl:with-param', 'select') }),
    ...(select === undefined ? {} : { selectText: select }),
    ...(body === undefined ? {} : { body }),
    ...(location === undefined ? {} : { location }),
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
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:apply-templates', ['mode', 'select']);

    const select = element.getAttribute('select') ?? undefined;
    const mode = element.getAttribute('mode');
    const withParams: WithParam[] = [];
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

    for (const child of childElements(element)) {
      if (!isXsltElement(child, 'with-param')) {
        throw createXsltStaticError(
          `xsl:apply-templates only supports xsl:with-param children; found ${child.nodeName}.`,
          getElementNameSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME)
            ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
          {
            suggestions: [{
              kind: 'fix',
              label: 'replace the child with xsl:with-param or remove it from xsl:apply-templates',
              confidence: 1,
            }],
          },
        );
      }

      const withParam = compileWithParam(child, stylesheetXml);
      assertNoDuplicateWithParam(withParams, withParam, stylesheetXml, child, 'xsl:apply-templates');
      withParams.push(withParam);
    }

    return {
      kind: 'applyTemplates',
      withParams,
      ...(location === undefined ? {} : { location }),
      ...(select === undefined ? {} : { selectText: select }),
      ...(select === undefined ? {} : { select: parseXPathInContext(select, location, 'xsl:apply-templates', 'select') }),
    };
  }

  if (isXsltElement(element, 'call-template')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:call-template', ['name']);

    const rawName = element.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      throw createXsltStaticError(
        'xsl:call-template requires a name attribute.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          suggestions: [{
            kind: 'fix',
            label: 'add a name="..." attribute to xsl:call-template',
            replacement: 'name="..."',
            confidence: 1,
          }],
        },
      );
    }

    const withParams: WithParam[] = [];
    for (const child of childElements(element)) {
      if (!isXsltElement(child, 'with-param')) {
        throw createXsltStaticError(
          `xsl:call-template only supports xsl:with-param children; found ${child.nodeName}.`,
          getElementNameSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME)
            ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
          {
            suggestions: [{
              kind: 'fix',
              label: 'replace the child with xsl:with-param or remove it from xsl:call-template',
              confidence: 1,
            }],
          },
        );
      }

      const withParam = compileWithParam(child, stylesheetXml);
      assertNoDuplicateWithParam(withParams, withParam, stylesheetXml, child, 'xsl:call-template');
      withParams.push(withParam);
    }

    const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);
    const name = normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:call-template');

    return {
      kind: 'callTemplate',
      name,
      withParams,
      ...(location === undefined ? {} : { location }),
    };
  }

  if (isXsltElement(element, 'variable')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:variable', ['as', 'name', 'select']);

    const rawName = element.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      throw createXsltStaticError(
        'xsl:variable requires a name attribute.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          suggestions: [{
            kind: 'fix',
            label: 'add a name="..." attribute to xsl:variable',
            replacement: 'name="..."',
            confidence: 1,
          }],
        },
      );
    }

    const select = element.getAttribute('select') ?? undefined;
    assertNoSelectAndContent(
      element,
      stylesheetXml,
      select,
      'xsl:variable',
      'variableName',
      rawName,
    );
    const body = select === undefined && hasMeaningfulTemplateContent(element)
      ? compileInstructions(element.childNodes, stylesheetXml)
      : undefined;
    const selectLocation = select === undefined
      ? undefined
      : getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);
    const name = normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:variable');

    return {
      kind: 'variable',
      name,
      ...(select === undefined ? {} : { select: parseXPathInContext(select, selectLocation, 'xsl:variable', 'select') }),
      ...(select === undefined ? {} : { selectText: select }),
      ...(body === undefined ? {} : { body }),
      ...(location === undefined ? {} : { location }),
    };
  }

  if (isXsltElement(element, 'if')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:if', ['test']);

    const test = element.getAttribute('test');
    if (test === null || test.length === 0) {
      throw createXsltStaticError(
        'xsl:if requires a test attribute.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          suggestions: [{
            kind: 'fix',
            label: 'add a test="..." attribute to xsl:if',
            replacement: 'test="..."',
            confidence: 1,
          }],
        },
      );
    }

    const location = getAttributeValueSourceLocation(stylesheetXml, element, 'test', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    return {
      kind: 'if',
      test: parseXPathInContext(test, location, 'xsl:if', 'test'),
      testText: test,
      body: compileInstructions(element.childNodes, stylesheetXml),
      ...(location === undefined ? {} : { location }),
    };
  }

  if (isXsltElement(element, 'comment')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:comment', []);

    return {
      kind: 'comment',
      body: compileInstructions(element.childNodes, stylesheetXml),
    };
  }

  if (isXsltElement(element, 'choose')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:choose', []);

    const whenBranches: ChooseWhenBranch[] = [];
    let otherwiseBody: Instruction[] | undefined;
    let otherwiseLocation: TemplateRule['location'] | undefined;
    let seenOtherwise = false;

    for (const child of childElements(element)) {
      if (isXsltElement(child, 'when')) {
        assertAllowedXsltAttributes(child, stylesheetXml, 'xsl:when', ['test']);

        if (seenOtherwise) {
          throw createXsltStaticError(
            'xsl:when cannot appear after xsl:otherwise within xsl:choose.',
            getElementNameSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME)
              ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
          );
        }

        const test = child.getAttribute('test');
        if (test === null || test.length === 0) {
          throw createXsltStaticError(
            'xsl:when requires a test attribute.',
            getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
            {
              suggestions: [{
                kind: 'fix',
                label: 'add a test="..." attribute to xsl:when',
                replacement: 'test="..."',
                confidence: 1,
              }],
            },
          );
        }

        const location = getAttributeValueSourceLocation(stylesheetXml, child, 'test', STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME);
        whenBranches.push({
          test: parseXPathInContext(test, location, 'xsl:when', 'test'),
          testText: test,
          body: compileInstructions(child.childNodes, stylesheetXml),
          ...(location === undefined ? {} : { location }),
        });
        continue;
      }

      if (isXsltElement(child, 'otherwise')) {
        assertAllowedXsltAttributes(child, stylesheetXml, 'xsl:otherwise', []);

        if (seenOtherwise) {
          throw createXsltStaticError(
            'xsl:choose cannot contain more than one xsl:otherwise.',
            getElementNameSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME)
              ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
          );
        }

        seenOtherwise = true;
        otherwiseBody = compileInstructions(child.childNodes, stylesheetXml);
        otherwiseLocation = getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME);
        continue;
      }

      throw createXsltStaticError(
        `xsl:choose only supports xsl:when and xsl:otherwise children; found ${child.nodeName}.`,
        getElementNameSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
      );
    }

    if (whenBranches.length === 0) {
      throw createXsltStaticError(
        'xsl:choose requires at least one xsl:when child.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      );
    }

    return {
      kind: 'choose',
      whenBranches,
      ...(otherwiseBody === undefined ? {} : { otherwiseBody }),
      ...(otherwiseLocation === undefined ? {} : { otherwiseLocation }),
    };
  }

  if (isXsltElement(element, 'for-each')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:for-each', ['select']);

    const select = element.getAttribute('select');
    if (select === null || select.length === 0) {
      throw createXsltStaticError(
        'xsl:for-each requires a select attribute.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          suggestions: [{
            kind: 'fix',
            label: 'add a select="..." attribute to xsl:for-each',
            replacement: 'select="..."',
            confidence: 1,
          }],
        },
      );
    }

    const location = getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    return {
      kind: 'forEach',
      select: parseXPathInContext(select, location, 'xsl:for-each', 'select'),
      selectText: select,
      body: compileInstructions(element.childNodes, stylesheetXml),
      ...(location === undefined ? {} : { location }),
    };
  }

  if (isXsltElement(element, 'value-of')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:value-of', ['select', 'separator']);

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
      select: parseXPathInContext(select, location, 'xsl:value-of', 'select'),
      selectText: select,
      ...(location === undefined ? {} : { location }),
      ...(separator === undefined ? {} : { separator }),
    };
  }

  if (isXsltElement(element, 'text')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:text', []);

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
  const excludedNamespaces = collectExcludedNamespaceState(element);
  const attributes: AttributeInstruction[] = collectInheritedNamespaceAttributes(element, excludedNamespaces);

  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index) as Attr | null;
    if (attribute === null) {
      continue;
    }

    if (isExcludeResultPrefixesAttribute(attribute)) {
      continue;
    }

    if (isNamespaceDeclaration(attribute)) {
      if (attribute.value === XSLT_NAMESPACE) {
        continue;
      }

      if (excludedNamespaces.excludeAllNamespaces || excludedNamespaces.excludedNamespaceNames.has(attribute.name)) {
        continue;
      }
    }

    attributes.push({
      name: attribute.name,
      value: attribute.value,
    });
  }

  return attributes;
}

function collectInheritedNamespaceAttributes(
  element: Element,
  excludedNamespaces: {
    readonly excludedNamespaceNames: ReadonlySet<string>;
    readonly excludeAllNamespaces: boolean;
  },
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
      if (attribute === null || !isNamespaceDeclaration(attribute) || attribute.value === XSLT_NAMESPACE) {
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

    attributes.push({ name, value });
  }

  return attributes;
}

function collectExcludedNamespaceState(element: Element): {
  readonly excludedNamespaceNames: ReadonlySet<string>;
  readonly excludeAllNamespaces: boolean;
} {
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

function isExcludeResultPrefixesAttribute(attribute: Attr): boolean {
  return (attribute.namespaceURI === null || attribute.namespaceURI.length === 0)
    && attribute.name === 'exclude-result-prefixes';
}

function hasMeaningfulTemplateContent(element: Element): boolean {
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

function assertNoSelectAndContent(
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


function assertAllowedXsltAttributes(
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

function createAttributeSuggestion(
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

function createOutputMethodSuggestion(rawMethod: string): ErrorSuggestion | undefined {
  const candidates = [
    ...SUPPORTED_XSLT_OUTPUT_METHODS,
    ...KNOWN_LATER_XSLT_OUTPUT_METHODS,
  ];
  const nearest = candidates
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(rawMethod, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean method="${nearest.candidate}"?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - (nearest.distance / nearest.candidate.length),
  };
}

function assertNoDuplicateWithParam(
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

function isNamespaceDeclaration(attribute: Attr): boolean {
  return attribute.name === 'xmlns' || attribute.prefix === 'xmlns';
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

function descendantElements(element: Element): Element[] {
  const descendants: Element[] = [];

  for (const child of childElements(element)) {
    descendants.push(child);
    descendants.push(...descendantElements(child));
  }

  return descendants;
}

function leadingTemplateParamElements(templateElement: Element): Element[] {
  const params: Element[] = [];

  for (let index = 0; index < templateElement.childNodes.length; index += 1) {
    const node = templateElement.childNodes.item(index);
    if (node === null) {
      continue;
    }

    if (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE) {
      if ((node.nodeValue ?? '').trim().length === 0) {
        continue;
      }

      break;
    }

    if (node.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as Element;
    if (!isXsltElement(element, 'param')) {
      break;
    }

    params.push(element);
  }

  return params;
}

function isTunnelParamElement(element: Element): boolean {
  const tunnel = element.getAttribute('tunnel');
  if (tunnel === null) {
    return false;
  }

  const normalized = tunnel.trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
}

function stripClarkNotation(name: string): string {
  if (!name.startsWith('{')) {
    return name;
  }

  const closingBrace = name.indexOf('}');
  return closingBrace < 0 ? name : name.slice(closingBrace + 1);
}

function canValidateCallTemplateWithParam(element: Element): boolean {
  if (!isXsltElement(element, 'with-param')) {
    return false;
  }

  const name = element.getAttribute('name');
  if (name === null || name.length === 0) {
    return false;
  }

  const select = element.getAttribute('select') ?? undefined;
  return select === undefined || !hasMeaningfulTemplateContent(element);
}

function parseRequiredAttribute(element: Element): boolean {
  const required = element.getAttribute('required');
  if (required === null) {
    return false;
  }

  const normalized = required.trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
}

function normalizeXsltQName(
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

function parseXPathInContext(
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

function withPrependedCompileFrame(error: unknown, frame: ErrorFrame, related?: RelatedLocation): unknown {
  if (!(error instanceof XdmError)) {
    return error;
  }

  return new XsltError(
    error.code,
    error.detailMessage,
    error.location,
    error.details,
    {
      related: related === undefined ? error.related : [related, ...error.related],
      frames: [frame, ...error.frames],
      suggestions: error.suggestions,
      causes: error.causes.length === 0 ? [error] : error.causes,
    },
  );
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

function createNamedTemplateReferenceSuggestion(
  rawName: string,
  namedTemplates: ReadonlyMap<string, string>,
): ErrorSuggestion | undefined {
  const candidates = [...namedTemplates.values()];
  const nearest = candidates
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
    label: `did you mean xsl:call-template name="${nearest.candidate}"?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - (nearest.distance / nearest.candidate.length),
  };
}

function createCallTemplateParamSuggestion(
  rawName: string,
  declaredParams: ReadonlyMap<string, string>,
): ErrorSuggestion | undefined {
  const candidates = [...declaredParams.values()];
  const nearest = candidates
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
    label: `did you mean xsl:with-param name="${nearest.candidate}"?`,
    replacement: nearest.candidate,
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
