import type { Attr, Element } from '@xmldom/xmldom';

import { XTSE0090 } from '../../errors/codes.js';
import type { ErrorSuggestion } from '../../errors/index.js';
import { getAttributeValueSourceLocation, getNodeSourceLocation } from '../../xml/parse.js';
import { computeLevenshteinDistance } from '../diagnostics.js';
import type { StylesheetCompilerHelpers } from './stylesheetCompilers.js';

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

export function validateStripSpaceDeclaration(
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

export function validateOutputDeclaration(
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
