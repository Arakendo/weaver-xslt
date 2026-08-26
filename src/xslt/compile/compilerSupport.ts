import type { Attr, Element } from '@xmldom/xmldom';

import { XTSE0010, XTSE0090, XTSE0620, XTSE0670 } from '../../errors/codes.js';
import { XsltError, type ErrorContext, type ErrorSuggestion } from '../../errors/index.js';
import { getAttributeValueSourceLocation, getNodeSourceLocation } from '../../xml/parse.js';
import { computeLevenshteinDistance } from '../diagnostics.js';
import type { TemplateRule, WithParam } from './ir.js';
import { hasMeaningfulTemplateContent, XSLT_NAMESPACE } from './xsltElementHelpers.js';

export const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';
export const STYLESHEET_SOURCE_NAME = '<stylesheet>';

const SUPPORTED_XSLT_INSTRUCTION_NAMES = [
  'apply-templates',
  'call-template',
  'choose',
  'comment',
  'for-each',
  'if',
  'otherwise',
  'sequence',
  'text',
  'value-of',
  'variable',
  'when',
] as const;

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
    getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME) ??
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
    {
      [detailKey]: bindingName,
    },
    {
      suggestions: [
        {
          kind: 'fix',
          label: `remove select="..." or remove ${ownerName} content`,
          confidence: 1,
        },
      ],
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

    if (
      attribute.prefix === 'xmlns' ||
      attribute.nodeName === 'xmlns' ||
      attribute.namespaceURI === XMLNS_NAMESPACE
    ) {
      continue;
    }

    const attributeName = attribute.nodeName;
    const localName = attribute.localName ?? attributeName;
    if (attribute.namespaceURI === XSLT_NAMESPACE) {
      throw createXsltStaticError(
        `${instructionName} cannot use an attribute in the XSLT namespace: ${attributeName}.`,
        getAttributeValueSourceLocation(
          stylesheetXml,
          element,
          attributeName,
          STYLESHEET_SOURCE_NAME,
        ) ?? getNodeSourceLocation(stylesheetXml, attribute, STYLESHEET_SOURCE_NAME),
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

    if (
      (attribute.namespaceURI === null || attribute.namespaceURI.length === 0) &&
      !allowed.has(localName)
    ) {
      const suggestion = createAttributeSuggestion(localName, allowedAttributeNames);
      throw createXsltStaticError(
        `${instructionName} has an unsupported attribute ${attributeName}.`,
        getAttributeValueSourceLocation(
          stylesheetXml,
          element,
          attributeName,
          STYLESHEET_SOURCE_NAME,
        ) ?? getNodeSourceLocation(stylesheetXml, attribute, STYLESHEET_SOURCE_NAME),
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
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length,
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
    withParam.location ??
      getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME) ??
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
    {
      paramName: withParam.name,
    },
    {
      suggestions: [
        {
          kind: 'fix',
          label: `rename or remove one of the duplicate xsl:with-param declarations for ${withParam.name}`,
          confidence: 1,
        },
      ],
    },
    XTSE0670,
  );
}

export function createInstructionSuggestion(element: Element): ErrorSuggestion | undefined {
  const localName = element.localName ?? element.nodeName;
  const nearest = SUPPORTED_XSLT_INSTRUCTION_NAMES.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(localName, candidate),
  })).sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean xsl:${nearest.candidate}?`,
    replacement: `xsl:${nearest.candidate}`,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length,
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
  const code = typeof contextOrCode === 'string' ? contextOrCode : (maybeCode ?? XTSE0010);

  return new XsltError(code, message, location, details, context);
}

function isErrorContext(value: unknown): value is ErrorContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('related' in value || 'frames' in value || 'suggestions' in value || 'causes' in value)
  );
}
