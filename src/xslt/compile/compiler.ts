/**
 * Stylesheet compiler: DOM → StylesheetIR.
 *
 * Current MVP+3 slice: root and simple name-matching templates with literal
 * result elements, xsl:text, xsl:value-of, and xsl:apply-templates.
 */

import type { Element } from '@xmldom/xmldom';

import { XTSE0500 } from '../../errors/codes.js';
import { getAttributeValueSourceLocation, getNodeSourceLocation, parseXml } from '../../xml/parse.js';
import { STYLESHEET_IR_VERSION } from './ir.js';
import {
  assertAllowedXsltAttributes,
  assertNoDuplicateWithParam,
  assertNoSelectAndContent,
  childElements,
  createAttributeSuggestion,
  createInstructionSuggestion,
  createXsltStaticError,
  hasMeaningfulTemplateContent,
  isSupportedTemplateMatch,
  isXsltElement,
  normalizeXsltQName,
  parseRequiredAttribute,
  parseXPathInContext,
  STYLESHEET_SOURCE_NAME,
  XMLNS_NAMESPACE,
  XSLT_NAMESPACE,
} from './compilerSupport.js';
import { createInstructionEntrypoints, type InstructionEntrypointHelpers } from './instructionEntrypoints.js';
import type { GlobalBinding, GlobalParam, GlobalVariable, StylesheetIR, TemplateRule } from './ir.js';
import {
  assertNoDuplicateGlobalBindings,
  assertNoDuplicateNamedTemplates,
  assertNoInvalidCallTemplateParams,
  assertNoUnknownCalledTemplates,
  collectStylesheetStaticContext,
  compileTopLevelDeclaration,
  validateStylesheetRootAttributes,
  type StylesheetCompilerHelpers,
} from './stylesheetCompilers.js';
import {
  compileTemplateRuleDeclaration,
  compileTopLevelParamDeclaration,
  compileTopLevelVariableDeclaration,
  type TopLevelCompilerHelpers,
} from './topLevelCompilers.js';

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

  validateStylesheetRootAttributes(root, stylesheetXml, STYLESHEET_COMPILER_HELPERS);

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

  assertNoDuplicateNamedTemplates(root, stylesheetXml, STYLESHEET_COMPILER_HELPERS);
  assertNoDuplicateGlobalBindings(root, stylesheetXml, STYLESHEET_COMPILER_HELPERS);
  assertNoUnknownCalledTemplates(root, stylesheetXml, STYLESHEET_COMPILER_HELPERS);
  assertNoInvalidCallTemplateParams(root, stylesheetXml, STYLESHEET_COMPILER_HELPERS);

  const templates: TemplateRule[] = [];
  const globalBindings: GlobalBinding[] = [];
  const location = getNodeSourceLocation(stylesheetXml, root, STYLESHEET_SOURCE_NAME);
  for (const child of childElements(root)) {
    const declaration = compileTopLevelDeclaration(child, stylesheetXml, STYLESHEET_COMPILER_HELPERS);
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
    version: STYLESHEET_IR_VERSION,
    xsltVersion: '3.0',
    ...(location === undefined ? {} : { location }),
    namespaces,
    defaultElementNamespace,
    globalBindings,
    templates,
  };
}

function compileTopLevelVariable(element: Element, stylesheetXml: string): GlobalVariable {
  return compileTopLevelVariableDeclaration(element, stylesheetXml, TOP_LEVEL_COMPILER_HELPERS);
}

function compileTopLevelParam(element: Element, stylesheetXml: string): GlobalParam {
  return compileTopLevelParamDeclaration(element, stylesheetXml, TOP_LEVEL_COMPILER_HELPERS);
}

function compileTemplateRule(templateElement: Element, stylesheetXml: string): TemplateRule {
  return compileTemplateRuleDeclaration(templateElement, stylesheetXml, TOP_LEVEL_COMPILER_HELPERS);
}

const BASE_COMPILER_HELPERS = {
  stylesheetSourceName: STYLESHEET_SOURCE_NAME,
  isXsltElement,
  assertAllowedXsltAttributes,
  createXsltStaticError,
  parseXPathInContext,
  normalizeXsltQName,
  assertNoSelectAndContent,
  hasMeaningfulTemplateContent,
};

const INSTRUCTION_ENTRYPOINT_HELPERS: InstructionEntrypointHelpers = {
  ...BASE_COMPILER_HELPERS,
  xsltNamespace: XSLT_NAMESPACE,
  childElements,
  assertNoDuplicateWithParam,
  createInstructionSuggestion,
};

const { compileInstructions, compileInstruction } = createInstructionEntrypoints(INSTRUCTION_ENTRYPOINT_HELPERS);

const TOP_LEVEL_COMPILER_HELPERS: TopLevelCompilerHelpers = {
  ...BASE_COMPILER_HELPERS,
  compileInstructions,
  compileInstruction,
  isSupportedTemplateMatch,
  parseRequiredAttribute,
};

const STYLESHEET_COMPILER_HELPERS: StylesheetCompilerHelpers = {
  ...BASE_COMPILER_HELPERS,
  xsltNamespace: XSLT_NAMESPACE,
  xmlnsNamespace: XMLNS_NAMESPACE,
  createAttributeSuggestion,
  childElements,
  compileTemplateRule,
  compileTopLevelParam,
  compileTopLevelVariable,
};
