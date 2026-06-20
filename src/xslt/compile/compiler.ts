/**
 * Stylesheet compiler: DOM → StylesheetIR.
 *
 * Current MVP+3 slice: root and simple name-matching templates with literal
 * result elements, xsl:text, xsl:value-of, and xsl:apply-templates.
 */

import type { Element } from '@xmldom/xmldom';

import { XTSE0500 } from '../../errors/codes.js';
import {
  getAttributeValueSourceLocation,
  getNodeSourceLocation,
  parseXml,
} from '../../xml/parse.js';
import { STYLESHEET_IR_VERSION } from './ir.js';
import type { ExtensionFunctionCatalog } from './extensionFunctions.js';
import { validateXPathFunctionCalls } from './extensionFunctions.js';
import {
  assertAllowedXsltAttributes,
  assertNoDuplicateWithParam,
  assertNoSelectAndContent,
  createAttributeSuggestion,
  createInstructionSuggestion,
  createXsltStaticError,
  STYLESHEET_SOURCE_NAME,
  XMLNS_NAMESPACE,
} from './compilerSupport.js';
import {
  createInstructionEntrypoints,
  type InstructionEntrypointHelpers,
} from './instructionEntrypoints.js';
import type {
  GlobalBinding,
  GlobalParam,
  GlobalVariable,
  StylesheetIR,
  TemplateRule,
} from './ir.js';
import {
  childElements,
  hasMeaningfulTemplateContent,
  isXsltElement,
  parseRequiredAttribute,
  XSLT_NAMESPACE,
} from './xsltElementHelpers.js';
import {
  isSupportedTemplateMatch,
  normalizeXsltQName,
  parseXPathInContext,
} from './xsltNameResolution.js';
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

export interface CompileStylesheetOptions {
  readonly sourceName?: string;
  readonly extensionFunctions?: ExtensionFunctionCatalog;
}

export function compileStylesheet(
  stylesheetXml: string,
  options: CompileStylesheetOptions = {},
): StylesheetIR {
  const stylesheetSourceName = options.sourceName ?? STYLESHEET_SOURCE_NAME;
  const stylesheetDocument = parseXml(stylesheetXml, {
    role: 'stylesheet',
    sourceName: stylesheetSourceName,
  });
  const root = stylesheetDocument.documentElement;

  if (root === null) {
    throw createXsltStaticError('Stylesheet has no document element.');
  }

  if (!isXsltElement(root, 'stylesheet') && !isXsltElement(root, 'transform')) {
    throw createXsltStaticError(
      'Stylesheet document element must be xsl:stylesheet or xsl:transform.',
      getNodeSourceLocation(stylesheetXml, root, stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'wrap the stylesheet in an xsl:stylesheet or xsl:transform document element',
            confidence: 1,
          },
        ],
      },
    );
  }

  const { namespaces, defaultElementNamespace } = collectStylesheetStaticContext(root);
  const compilerHelpers = createCompilerHelpers(
    stylesheetSourceName,
    namespaces,
    options.extensionFunctions ?? new Map(),
  );

  validateStylesheetRootAttributes(root, stylesheetXml, compilerHelpers.stylesheetHelpers);

  const version = root.getAttribute('version');
  if (version === null || version.length === 0) {
    throw createXsltStaticError(
      'Stylesheet module must declare a version attribute.',
      getAttributeValueSourceLocation(stylesheetXml, root, 'version', stylesheetSourceName) ??
        getNodeSourceLocation(stylesheetXml, root, stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add version="3.0" to the stylesheet document element',
            replacement: 'version="3.0"',
            confidence: 1,
          },
        ],
      },
      XTSE0500,
    );
  }

  assertNoDuplicateNamedTemplates(root, stylesheetXml, compilerHelpers.stylesheetHelpers);
  assertNoDuplicateGlobalBindings(root, stylesheetXml, compilerHelpers.stylesheetHelpers);
  assertNoUnknownCalledTemplates(root, stylesheetXml, compilerHelpers.stylesheetHelpers);
  assertNoInvalidCallTemplateParams(root, stylesheetXml, compilerHelpers.stylesheetHelpers);

  const templates: TemplateRule[] = [];
  const globalBindings: GlobalBinding[] = [];
  const location = getNodeSourceLocation(stylesheetXml, root, stylesheetSourceName);
  for (const child of childElements(root)) {
    const declaration = compileTopLevelDeclaration(
      child,
      stylesheetXml,
      compilerHelpers.stylesheetHelpers,
    );
    if (declaration === undefined) {
      continue;
    }

    if ('body' in declaration && 'modes' in declaration) {
      templates.push(declaration);
      continue;
    }

    globalBindings.push(declaration);
  }
  if (templates.length === 0 && globalBindings.length === 0) {
    throw createXsltStaticError(
      'Stylesheet must declare at least one xsl:template.',
      getNodeSourceLocation(stylesheetXml, root, stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add at least one xsl:template to the stylesheet',
            confidence: 1,
          },
        ],
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

function createCompilerHelpers(
  stylesheetSourceName: string,
  namespaces: Readonly<Record<string, string>>,
  extensionFunctions: ExtensionFunctionCatalog,
): {
  readonly topLevelHelpers: TopLevelCompilerHelpers;
  readonly stylesheetHelpers: StylesheetCompilerHelpers;
} {
  const parseXPathInCompileContext: TopLevelCompilerHelpers['parseXPathInContext'] = (
    expression,
    location,
    ownerName,
    attributeName,
    frameKind,
  ) => {
    const ast = parseXPathInContext(expression, location, ownerName, attributeName, frameKind);
    validateXPathFunctionCalls(ast, {
      expressionText: expression,
      ownerName,
      attributeName,
      namespaces,
      extensionFunctions,
      ...(location === undefined ? {} : { expressionLocation: location }),
      ...(frameKind === undefined ? {} : { frameKind }),
    });
    return ast;
  };

  const baseCompilerHelpers = {
    stylesheetSourceName,
    isXsltElement,
    assertAllowedXsltAttributes,
    createXsltStaticError,
    parseXPathInContext: parseXPathInCompileContext,
    normalizeXsltQName,
    assertNoSelectAndContent,
    hasMeaningfulTemplateContent,
  };

  const instructionEntrypointHelpers: InstructionEntrypointHelpers = {
    ...baseCompilerHelpers,
    xsltNamespace: XSLT_NAMESPACE,
    childElements,
    assertNoDuplicateWithParam,
    createInstructionSuggestion,
  };

  const { compileInstructions, compileInstruction } = createInstructionEntrypoints(
    instructionEntrypointHelpers,
  );

  const topLevelHelpers: TopLevelCompilerHelpers = {
    ...baseCompilerHelpers,
    compileInstructions,
    compileInstruction,
    isSupportedTemplateMatch,
    parseRequiredAttribute,
  };

  function compileTopLevelVariable(element: Element, localStylesheetXml: string): GlobalVariable {
    return compileTopLevelVariableDeclaration(element, localStylesheetXml, topLevelHelpers);
  }

  function compileTopLevelParam(element: Element, localStylesheetXml: string): GlobalParam {
    return compileTopLevelParamDeclaration(element, localStylesheetXml, topLevelHelpers);
  }

  function compileTemplateRule(templateElement: Element, localStylesheetXml: string): TemplateRule {
    return compileTemplateRuleDeclaration(templateElement, localStylesheetXml, topLevelHelpers);
  }

  const stylesheetHelpers: StylesheetCompilerHelpers = {
    ...baseCompilerHelpers,
    xsltNamespace: XSLT_NAMESPACE,
    xmlnsNamespace: XMLNS_NAMESPACE,
    createAttributeSuggestion,
    childElements,
    compileTemplateRule,
    compileTopLevelParam,
    compileTopLevelVariable,
  };

  return {
    topLevelHelpers,
    stylesheetHelpers,
  };
}
