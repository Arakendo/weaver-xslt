import type { Attr, Element } from '@xmldom/xmldom';

import {
  XTSE0090,
  XTSE0165,
  XTSE0630,
  XTSE0650,
  XTSE0660,
  XTSE0680,
  XTSE0690,
} from '../../errors/codes.js';
import type { ErrorContext, ErrorSuggestion } from '../../errors/index.js';
import { computeLevenshteinDistance } from '../diagnostics.js';
import {
  getAttributeValueSourceLocation,
  getElementNameSourceLocation,
  getNodeSourceLocation,
} from '../../xml/parse.js';
import type {
  GlobalBinding,
  GlobalParam,
  GlobalVariable,
  StylesheetIR,
  TemplateRule,
} from './ir.js';
import {
  descendantElements,
  isTunnelParamElement,
  leadingTemplateParamElements,
  parseRequiredAttribute,
} from './xsltElementHelpers.js';

const SUPPORTED_XSLT_STYLESHEET_ATTRIBUTES = [
  'exclude-result-prefixes',
  'version',
  'xpath-default-namespace',
] as const;
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
const SUPPORTED_XSLT_OUTPUT_METHODS = ['xml', 'html'] as const;
const KNOWN_LATER_XSLT_OUTPUT_METHODS = ['json', 'text'] as const;
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

type StaticErrorFactory = (
  message: string,
  location?: TemplateRule['location'],
  detailsOrContext?: Readonly<Record<string, string | number | boolean>> | ErrorContext,
  contextOrCode?: ErrorContext | string,
  maybeCode?: string,
) => Error;

type NamedTemplateSignature = {
  readonly nonTunnelParams: ReadonlySet<string>;
  readonly nonTunnelParamDisplayNames: ReadonlyMap<string, string>;
  readonly requiredNonTunnelParams: ReadonlyArray<{ readonly name: string }>;
};

export type StylesheetCompilerHelpers = {
  readonly stylesheetSourceName: string;
  readonly xsltNamespace: string;
  readonly xmlnsNamespace: string;
  isXsltElement(element: Element, localName: string): boolean;
  normalizeXsltQName(
    name: string,
    element: Element,
    stylesheetXml: string,
    attributeName: string,
    ownerName: string,
  ): string;
  createXsltStaticError: StaticErrorFactory;
  createAttributeSuggestion(
    rawName: string,
    allowedAttributeNames: readonly string[],
  ): ErrorSuggestion | undefined;
  childElements(element: Element): Element[];
  hasMeaningfulTemplateContent(element: Element): boolean;
  compileTemplateRule(element: Element, stylesheetXml: string): TemplateRule;
  compileTopLevelParam(element: Element, stylesheetXml: string): GlobalParam;
  compileTopLevelVariable(element: Element, stylesheetXml: string): GlobalVariable;
};

export function collectStylesheetStaticContext(
  root: Element,
): Pick<StylesheetIR, 'namespaces' | 'defaultElementNamespace'> {
  const namespaces: Record<string, string> = {};

  for (let index = 0; index < root.attributes.length; index += 1) {
    const attribute = root.attributes.item(index) as Attr | null;
    if (attribute === null) {
      continue;
    }

    if (
      attribute.prefix === 'xmlns' &&
      attribute.localName !== null &&
      attribute.localName.length > 0
    ) {
      namespaces[attribute.localName] = attribute.value;
    }
  }

  return {
    namespaces,
    defaultElementNamespace: root.getAttribute('xpath-default-namespace') ?? '',
  };
}

export function assertNoDuplicateNamedTemplates(
  root: Element,
  stylesheetXml: string,
  helpers: StylesheetCompilerHelpers,
): void {
  const namedTemplates = new Map<string, Element>();

  for (const child of helpers.childElements(root)) {
    if (!helpers.isXsltElement(child, 'template')) {
      continue;
    }

    const rawName = child.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      continue;
    }

    const name = helpers.normalizeXsltQName(rawName, child, stylesheetXml, 'name', 'xsl:template');
    if (!namedTemplates.has(name)) {
      namedTemplates.set(name, child);
      continue;
    }

    throw helpers.createXsltStaticError(
      `Stylesheet cannot declare duplicate named xsl:template ${name}.`,
      getAttributeValueSourceLocation(stylesheetXml, child, 'name', helpers.stylesheetSourceName) ??
        getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
      {
        templateName: name,
      },
      {
        suggestions: [
          {
            kind: 'fix',
            label: `rename or remove one of the duplicate named templates for ${name}`,
            confidence: 1,
          },
        ],
      },
      XTSE0660,
    );
  }
}

export function assertNoDuplicateGlobalBindings(
  root: Element,
  stylesheetXml: string,
  helpers: StylesheetCompilerHelpers,
): void {
  const globalBindings = new Map<string, Element>();

  for (const child of helpers.childElements(root)) {
    if (!helpers.isXsltElement(child, 'param') && !helpers.isXsltElement(child, 'variable')) {
      continue;
    }

    const rawName = child.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      continue;
    }

    const name = helpers.normalizeXsltQName(
      rawName,
      child,
      stylesheetXml,
      'name',
      child.localName === 'param' ? 'xsl:param' : 'xsl:variable',
    );
    if (!globalBindings.has(name)) {
      globalBindings.set(name, child);
      continue;
    }

    throw helpers.createXsltStaticError(
      `Stylesheet cannot declare duplicate global binding ${name}.`,
      getAttributeValueSourceLocation(stylesheetXml, child, 'name', helpers.stylesheetSourceName) ??
        getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
      {
        bindingName: name,
      },
      {
        suggestions: [
          {
            kind: 'fix',
            label: `rename or remove one of the duplicate global bindings for ${name}`,
            confidence: 1,
          },
        ],
      },
      XTSE0630,
    );
  }
}

export function assertNoUnknownCalledTemplates(
  root: Element,
  stylesheetXml: string,
  helpers: StylesheetCompilerHelpers,
): void {
  const namedTemplates = collectNamedTemplateDisplayNames(root, stylesheetXml, helpers);

  for (const child of helpers.childElements(root)) {
    if (
      !helpers.isXsltElement(child, 'template') &&
      !helpers.isXsltElement(child, 'param') &&
      !helpers.isXsltElement(child, 'variable')
    ) {
      continue;
    }

    for (const element of descendantElements(child)) {
      if (!helpers.isXsltElement(element, 'call-template')) {
        continue;
      }

      const rawName = element.getAttribute('name');
      if (rawName === null || rawName.length === 0) {
        continue;
      }

      const name = helpers.normalizeXsltQName(
        rawName,
        element,
        stylesheetXml,
        'name',
        'xsl:call-template',
      );
      if (namedTemplates.has(name)) {
        continue;
      }

      const suggestion = createNamedTemplateReferenceSuggestion(rawName, namedTemplates);

      throw helpers.createXsltStaticError(
        `xsl:call-template cannot target undeclared template ${name}.`,
        getAttributeValueSourceLocation(
          stylesheetXml,
          element,
          'name',
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
        {
          templateName: name,
        },
        suggestion === undefined
          ? {
              suggestions: [
                {
                  kind: 'fix',
                  label: `declare xsl:template name="${rawName}" or update xsl:call-template`,
                  confidence: 1,
                },
              ],
            }
          : { suggestions: [suggestion] },
        XTSE0650,
      );
    }
  }
}

export function assertNoInvalidCallTemplateParams(
  root: Element,
  stylesheetXml: string,
  helpers: StylesheetCompilerHelpers,
): void {
  const namedTemplates = collectNamedTemplateSignatures(root, stylesheetXml, helpers);

  for (const child of helpers.childElements(root)) {
    if (
      !helpers.isXsltElement(child, 'template') &&
      !helpers.isXsltElement(child, 'param') &&
      !helpers.isXsltElement(child, 'variable')
    ) {
      continue;
    }

    for (const element of descendantElements(child)) {
      if (!helpers.isXsltElement(element, 'call-template')) {
        continue;
      }

      const rawName = element.getAttribute('name');
      if (rawName === null || rawName.length === 0) {
        continue;
      }

      if (
        !helpers.childElements(element).every((entry) => helpers.isXsltElement(entry, 'with-param'))
      ) {
        continue;
      }

      if (
        !helpers
          .childElements(element)
          .every((entry) => canValidateCallTemplateWithParam(entry, helpers))
      ) {
        continue;
      }

      const targetName = helpers.normalizeXsltQName(
        rawName,
        element,
        stylesheetXml,
        'name',
        'xsl:call-template',
      );
      const signature = namedTemplates.get(targetName);
      if (signature === undefined) {
        continue;
      }

      const suppliedParams = new Set<string>();
      for (const withParamElement of helpers.childElements(element)) {
        const withParamName = withParamElement.getAttribute('name');
        if (
          withParamName === null ||
          withParamName.length === 0 ||
          isTunnelParamElement(withParamElement)
        ) {
          continue;
        }

        const normalizedWithParamName = helpers.normalizeXsltQName(
          withParamName,
          withParamElement,
          stylesheetXml,
          'name',
          'xsl:with-param',
        );
        suppliedParams.add(normalizedWithParamName);
        if (signature.nonTunnelParams.has(normalizedWithParamName)) {
          continue;
        }

        const suggestion = createCallTemplateParamSuggestion(
          withParamName,
          signature.nonTunnelParamDisplayNames,
        );

        throw helpers.createXsltStaticError(
          `xsl:call-template cannot pass undeclared parameter ${normalizedWithParamName} to template ${targetName}.`,
          getAttributeValueSourceLocation(
            stylesheetXml,
            withParamElement,
            'name',
            helpers.stylesheetSourceName,
          ) ?? getNodeSourceLocation(stylesheetXml, withParamElement, helpers.stylesheetSourceName),
          {
            parameterName: normalizedWithParamName,
            templateName: targetName,
          },
          suggestion === undefined
            ? {
                suggestions: [
                  {
                    kind: 'fix',
                    label: `declare xsl:param name="${withParamName}" on template ${rawName} or remove the xsl:with-param`,
                    confidence: 1,
                  },
                ],
              }
            : { suggestions: [suggestion] },
          XTSE0680,
        );
      }

      for (const requiredParam of signature.requiredNonTunnelParams) {
        if (suppliedParams.has(requiredParam.name)) {
          continue;
        }

        throw helpers.createXsltStaticError(
          `xsl:call-template must supply required parameter ${requiredParam.name} to template ${targetName}.`,
          getAttributeValueSourceLocation(
            stylesheetXml,
            element,
            'name',
            helpers.stylesheetSourceName,
          ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
          {
            parameterName: requiredParam.name,
            templateName: targetName,
          },
          {
            suggestions: [
              {
                kind: 'fix',
                label: `add xsl:with-param name="${stripClarkNotation(requiredParam.name)}" to xsl:call-template or make the parameter optional`,
                confidence: 1,
              },
            ],
          },
          XTSE0690,
        );
      }
    }
  }
}

export function compileTopLevelDeclaration(
  element: Element,
  stylesheetXml: string,
  helpers: StylesheetCompilerHelpers,
): TemplateRule | GlobalBinding | undefined {
  if (helpers.isXsltElement(element, 'template')) {
    return helpers.compileTemplateRule(element, stylesheetXml);
  }

  if (helpers.isXsltElement(element, 'param')) {
    return helpers.compileTopLevelParam(element, stylesheetXml);
  }

  if (helpers.isXsltElement(element, 'variable')) {
    return helpers.compileTopLevelVariable(element, stylesheetXml);
  }

  if (helpers.isXsltElement(element, 'strip-space')) {
    validateStripSpaceDeclaration(element, stylesheetXml, helpers);
    return undefined;
  }

  if (helpers.isXsltElement(element, 'output')) {
    validateOutputDeclaration(element, stylesheetXml, helpers);
    return undefined;
  }

  if (helpers.isXsltElement(element, 'include') || helpers.isXsltElement(element, 'import')) {
    const href = element.getAttribute('href') ?? '';
    throw helpers.createXsltStaticError(
      `Stylesheet ${element.localName ?? element.nodeName} declarations are not yet implemented in the current MVP+3 slice.`,
      getAttributeValueSourceLocation(
        stylesheetXml,
        element,
        'href',
        helpers.stylesheetSourceName,
      ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        href,
      },
      {
        suggestions: [
          {
            kind: 'fix',
            label: `inline or remove xsl:${element.localName ?? element.nodeName} in the current MVP+3 slice`,
            confidence: 1,
          },
        ],
      },
      XTSE0165,
    );
  }

  if (element.namespaceURI === helpers.xsltNamespace) {
    throw helpers.createXsltStaticError(
      `Unsupported top-level XSLT declaration ${element.nodeName} in current MVP+3 slice.`,
      getElementNameSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName) ??
        getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        declarationName: element.nodeName,
      },
      {
        suggestions: [
          {
            kind: 'fix',
            label: `remove unsupported top-level declaration ${element.nodeName} in the current MVP+3 slice`,
            confidence: 1,
          },
        ],
      },
    );
  }

  throw helpers.createXsltStaticError(
    `Unsupported top-level stylesheet element ${element.nodeName} in current MVP+3 slice.`,
    getElementNameSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName) ??
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
    {
      elementName: element.nodeName,
    },
    {
      suggestions: [
        {
          kind: 'fix',
          label: 'move result elements inside xsl:template bodies in the current MVP+3 slice',
          confidence: 1,
        },
      ],
    },
  );
}

export function validateStylesheetRootAttributes(
  root: Element,
  stylesheetXml: string,
  helpers: StylesheetCompilerHelpers,
): void {
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

    if (
      attribute.prefix === 'xmlns' ||
      attribute.nodeName === 'xmlns' ||
      attribute.namespaceURI === helpers.xmlnsNamespace
    ) {
      continue;
    }

    const attributeName = attribute.nodeName;
    const localName = attribute.localName ?? attributeName;
    if (attribute.namespaceURI === helpers.xsltNamespace) {
      throw helpers.createXsltStaticError(
        `${instructionName} cannot use an attribute in the XSLT namespace: ${attributeName}.`,
        getAttributeValueSourceLocation(
          stylesheetXml,
          root,
          attributeName,
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName,
        },
        {
          suggestions: [
            {
              kind: 'fix',
              label: `remove ${attributeName} from ${instructionName}`,
              confidence: 1,
            },
          ],
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
      throw helpers.createXsltStaticError(
        `${instructionName} attribute ${attributeName} is not yet implemented in the current MVP+3 slice.`,
        getAttributeValueSourceLocation(
          stylesheetXml,
          root,
          attributeName,
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName,
        },
        {
          suggestions: [
            {
              kind: 'fix',
              label: `remove ${attributeName} from ${instructionName} in the current MVP+3 slice`,
              confidence: 1,
            },
          ],
        },
        XTSE0090,
      );
    }

    const suggestion = helpers.createAttributeSuggestion(localName, candidateAttributes);
    throw helpers.createXsltStaticError(
      `${instructionName} has an unsupported attribute ${attributeName}.`,
      getAttributeValueSourceLocation(
        stylesheetXml,
        root,
        attributeName,
        helpers.stylesheetSourceName,
      ) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
      {
        attributeName,
        instructionName,
      },
      suggestion === undefined
        ? {
            suggestions: [
              {
                kind: 'fix',
                label: `remove ${attributeName} from ${instructionName}`,
                confidence: 1,
              },
            ],
          }
        : { suggestions: [suggestion] },
      XTSE0090,
    );
  }
}

function validateStripSpaceDeclaration(
  element: Element,
  stylesheetXml: string,
  helpers: StylesheetCompilerHelpers,
): void {
  const supported = ['elements'];

  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index) as Attr | null;
    if (attribute === null) {
      continue;
    }

    if (
      attribute.prefix === 'xmlns' ||
      attribute.nodeName === 'xmlns' ||
      attribute.namespaceURI === helpers.xmlnsNamespace
    ) {
      continue;
    }

    const attributeName = attribute.nodeName;
    const localName = attribute.localName ?? attributeName;
    if (attribute.namespaceURI === helpers.xsltNamespace) {
      throw helpers.createXsltStaticError(
        `xsl:strip-space cannot use an attribute in the XSLT namespace: ${attributeName}.`,
        getAttributeValueSourceLocation(
          stylesheetXml,
          element,
          attributeName,
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName: 'xsl:strip-space',
        },
        {
          suggestions: [
            {
              kind: 'fix',
              label: `remove ${attributeName} from xsl:strip-space`,
              confidence: 1,
            },
          ],
        },
        XTSE0090,
      );
    }

    if (
      (attribute.namespaceURI === null || attribute.namespaceURI.length === 0) &&
      !supported.includes(localName)
    ) {
      const suggestion = helpers.createAttributeSuggestion(localName, supported);
      throw helpers.createXsltStaticError(
        `xsl:strip-space has an unsupported attribute ${attributeName}.`,
        getAttributeValueSourceLocation(
          stylesheetXml,
          element,
          attributeName,
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName: 'xsl:strip-space',
        },
        suggestion === undefined
          ? {
              suggestions: [
                {
                  kind: 'fix',
                  label: `remove ${attributeName} from xsl:strip-space`,
                  confidence: 1,
                },
              ],
            }
          : { suggestions: [suggestion] },
        XTSE0090,
      );
    }
  }
}

function validateOutputDeclaration(
  element: Element,
  stylesheetXml: string,
  helpers: StylesheetCompilerHelpers,
): void {
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

    if (
      attribute.prefix === 'xmlns' ||
      attribute.nodeName === 'xmlns' ||
      attribute.namespaceURI === helpers.xmlnsNamespace
    ) {
      continue;
    }

    const attributeName = attribute.nodeName;
    const localName = attribute.localName ?? attributeName;
    if (attribute.namespaceURI === helpers.xsltNamespace) {
      throw helpers.createXsltStaticError(
        `xsl:output cannot use an attribute in the XSLT namespace: ${attributeName}.`,
        getAttributeValueSourceLocation(
          stylesheetXml,
          element,
          attributeName,
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName: 'xsl:output',
        },
        {
          suggestions: [
            {
              kind: 'fix',
              label: `remove ${attributeName} from xsl:output`,
              confidence: 1,
            },
          ],
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
      throw helpers.createXsltStaticError(
        `xsl:output attribute ${attributeName} is not yet implemented in the current MVP+3 slice.`,
        getAttributeValueSourceLocation(
          stylesheetXml,
          element,
          attributeName,
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName: 'xsl:output',
        },
        {
          suggestions: [
            {
              kind: 'fix',
              label: `remove ${attributeName} from xsl:output or omit xsl:output in the current MVP+3 slice`,
              confidence: 1,
            },
          ],
        },
        XTSE0090,
      );
    }

    const suggestion = helpers.createAttributeSuggestion(localName, candidateAttributes);
    throw helpers.createXsltStaticError(
      `xsl:output has an unsupported attribute ${attributeName}.`,
      getAttributeValueSourceLocation(
        stylesheetXml,
        element,
        attributeName,
        helpers.stylesheetSourceName,
      ) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
      {
        attributeName,
        instructionName: 'xsl:output',
      },
      suggestion === undefined
        ? {
            suggestions: [
              {
                kind: 'fix',
                label: `remove ${attributeName} from xsl:output`,
                confidence: 1,
              },
            ],
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
    throw helpers.createXsltStaticError(
      `xsl:output method ${JSON.stringify(method)} is not yet implemented in the current MVP+3 slice.`,
      getAttributeValueSourceLocation(
        stylesheetXml,
        element,
        'method',
        helpers.stylesheetSourceName,
      ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        method,
        instructionName: 'xsl:output',
      },
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'use method="xml" or omit xsl:output in the current MVP+3 slice',
            confidence: 1,
          },
        ],
      },
      XTSE0090,
    );
  }

  const outputSuggestion = createOutputMethodSuggestion(method);
  throw helpers.createXsltStaticError(
    `xsl:output has an unsupported method ${JSON.stringify(method)}.`,
    getAttributeValueSourceLocation(
      stylesheetXml,
      element,
      'method',
      helpers.stylesheetSourceName,
    ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
    {
      method,
      instructionName: 'xsl:output',
    },
    outputSuggestion === undefined
      ? {
          suggestions: [
            {
              kind: 'fix',
              label: 'use method="xml" or omit xsl:output in the current MVP+3 slice',
              confidence: 1,
            },
          ],
        }
      : { suggestions: [outputSuggestion] },
    XTSE0090,
  );
}

function collectNamedTemplateDisplayNames(
  root: Element,
  stylesheetXml: string,
  helpers: StylesheetCompilerHelpers,
): ReadonlyMap<string, string> {
  const namedTemplates = new Map<string, string>();

  for (const child of helpers.childElements(root)) {
    if (!helpers.isXsltElement(child, 'template')) {
      continue;
    }

    const rawName = child.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      continue;
    }

    namedTemplates.set(
      helpers.normalizeXsltQName(rawName, child, stylesheetXml, 'name', 'xsl:template'),
      rawName,
    );
  }

  return namedTemplates;
}

function collectNamedTemplateSignatures(
  root: Element,
  stylesheetXml: string,
  helpers: StylesheetCompilerHelpers,
): ReadonlyMap<string, NamedTemplateSignature> {
  const signatures = new Map<string, NamedTemplateSignature>();

  for (const child of helpers.childElements(root)) {
    if (!helpers.isXsltElement(child, 'template')) {
      continue;
    }

    const rawName = child.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      continue;
    }

    const normalizedName = helpers.normalizeXsltQName(
      rawName,
      child,
      stylesheetXml,
      'name',
      'xsl:template',
    );
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

      const normalizedParamName = helpers.normalizeXsltQName(
        paramRawName,
        paramElement,
        stylesheetXml,
        'name',
        'xsl:param',
      );
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

function stripClarkNotation(name: string): string {
  if (!name.startsWith('{')) {
    return name;
  }

  const closingBrace = name.indexOf('}');
  return closingBrace < 0 ? name : name.slice(closingBrace + 1);
}

function canValidateCallTemplateWithParam(
  element: Element,
  helpers: StylesheetCompilerHelpers,
): boolean {
  if (!helpers.isXsltElement(element, 'with-param')) {
    return false;
  }

  const name = element.getAttribute('name');
  if (name === null || name.length === 0) {
    return false;
  }

  const select = element.getAttribute('select') ?? undefined;
  return select === undefined || !helpers.hasMeaningfulTemplateContent(element);
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
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length,
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
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length,
  };
}

function createOutputMethodSuggestion(rawMethod: string): ErrorSuggestion | undefined {
  const candidates = [...SUPPORTED_XSLT_OUTPUT_METHODS, ...KNOWN_LATER_XSLT_OUTPUT_METHODS];
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
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length,
  };
}
