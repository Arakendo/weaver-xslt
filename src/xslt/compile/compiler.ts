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

export interface CompileIrStats {
  readonly xpathParseCount: number;
  readonly xpathParseElapsedMs: number;
  readonly uniqueXPathExpressionCount: number;
  readonly matchPatternParseCount: number;
  readonly matchPatternParseElapsedMs: number;
  readonly uniqueMatchPatternExpressionCount: number;
  readonly qnameResolutionCount: number;
  readonly qnameResolutionElapsedMs: number;
  readonly templateRuleCount: number;
  readonly globalBindingCount: number;
  readonly instructionKindCounts: Readonly<Record<string, number>>;
  readonly compilePhases: readonly CompileIrPhaseTiming[];
  readonly slowestTemplates: readonly CompileIrTemplateTiming[];
  readonly hottestTemplateKeys: readonly CompileIrTemplateAggregate[];
  readonly slowestXPathExpressions: readonly CompileIrExpressionTiming[];
  readonly slowestMatchPatternExpressions: readonly CompileIrExpressionTiming[];
  readonly slowestQNameResolutions: readonly CompileIrOperationTiming[];
}

export interface CompileIrTemplateAggregate {
  readonly key: string;
  readonly invocationCount: number;
  readonly totalElapsedMs: number;
  readonly averageElapsedMs: number;
  readonly maxElapsedMs: number;
}

export interface CompileIrPhaseTiming {
  readonly key:
    | 'parseXml'
    | 'collectStaticContext'
    | 'validateRootAttributes'
    | 'validateNamedTemplates'
    | 'validateGlobalBindings'
    | 'validateUnknownCallTemplates'
    | 'validateCallTemplateParams'
    | 'lowerTopLevelDeclarations'
    | 'lowerTemplateDeclarations'
    | 'lowerGlobalParamDeclarations'
    | 'lowerGlobalVariableDeclarations'
    | 'validateStripSpaceDeclarations'
    | 'validateOutputDeclarations'
    | 'rejectIncludeImportDeclarations'
    | 'rejectUnsupportedTopLevelDeclarations'
    | 'rejectUnsupportedTopLevelElements';
  readonly label: string;
  readonly elapsedMs: number;
  readonly invocationCount: number;
}

export interface CompileIrTemplateTiming {
  readonly key: string;
  readonly name?: string;
  readonly matchText?: string;
  readonly elapsedMs: number;
  readonly instructionCount: number;
  readonly xpathCount: number;
  readonly childNodeCount: number;
  readonly callTemplateCount: number;
  readonly applyTemplatesCount: number;
  readonly chooseCount: number;
  readonly variableCount: number;
  readonly literalResultCount: number;
  readonly calledTemplateNames: readonly string[];
  readonly applyTemplateModes: readonly string[];
}

export interface CompileIrTemplateMetrics {
  readonly instructionCount: number;
  readonly callTemplateCount: number;
  readonly applyTemplatesCount: number;
  readonly chooseCount: number;
  readonly variableCount: number;
  readonly literalResultCount: number;
  readonly calledTemplateNames: readonly string[];
  readonly applyTemplateModes: readonly string[];
}

export interface CompileIrExpressionTiming {
  readonly key: string;
  readonly count: number;
  readonly totalElapsedMs: number;
  readonly averageElapsedMs: number;
}

export interface CompileIrOperationTiming extends CompileIrExpressionTiming {
  readonly site: string;
}

export interface CompileIrStatsRecorder {
  recordXPathParse(
    expressionText: string,
    ownerName: string,
    attributeName: string,
    frameKind?: string,
    elapsedMs?: number,
  ): void;
  recordQNameResolution(
    name: string,
    ownerName: string,
    attributeName: string,
    elapsedMs?: number,
  ): void;
  recordCompilePhase(key: CompileIrPhaseTiming['key'], label: string, elapsedMs: number): void;
  beginTemplateLowering(
    name: string | undefined,
    matchText: string | undefined,
    childNodeCount: number,
  ): void;
  endTemplateLowering(metrics: CompileIrTemplateMetrics, elapsedMs: number): void;
  recordTemplateRule(): void;
  recordGlobalBinding(kind: 'param' | 'variable'): void;
  recordInstruction(kind: string): void;
  snapshot(): CompileIrStats;
}

export interface CompileStylesheetOptions {
  readonly sourceName?: string;
  readonly extensionFunctions?: ExtensionFunctionCatalog;
  readonly irStats?: CompileIrStatsRecorder;
}

export function compileStylesheet(
  stylesheetXml: string,
  options: CompileStylesheetOptions = {},
): StylesheetIR {
  const stylesheetSourceName = options.sourceName ?? STYLESHEET_SOURCE_NAME;
  const root = measureCompileIrPhase(options.irStats, 'parseXml', 'Parsing stylesheet XML', () => {
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

    return root;
  });
  const staticContext = measureCompileIrPhase(
    options.irStats,
    'collectStaticContext',
    'Collecting stylesheet static context',
    () => collectStylesheetStaticContext(root),
  );
  const compilerHelpers = createCompilerHelpers(
    stylesheetSourceName,
    staticContext.namespaces,
    options.extensionFunctions ?? new Map(),
    options.irStats,
  );

  measureCompileIrPhase(
    options.irStats,
    'validateRootAttributes',
    'Validating stylesheet root attributes',
    () => validateStylesheetRootAttributes(root, stylesheetXml, compilerHelpers.stylesheetHelpers),
  );

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

  measureCompileIrPhase(
    options.irStats,
    'validateNamedTemplates',
    'Validating duplicate named templates',
    () => assertNoDuplicateNamedTemplates(root, stylesheetXml, compilerHelpers.stylesheetHelpers),
  );
  measureCompileIrPhase(
    options.irStats,
    'validateGlobalBindings',
    'Validating duplicate global bindings',
    () => assertNoDuplicateGlobalBindings(root, stylesheetXml, compilerHelpers.stylesheetHelpers),
  );
  measureCompileIrPhase(
    options.irStats,
    'validateUnknownCallTemplates',
    'Validating unknown call-template targets',
    () => assertNoUnknownCalledTemplates(root, stylesheetXml, compilerHelpers.stylesheetHelpers),
  );
  measureCompileIrPhase(
    options.irStats,
    'validateCallTemplateParams',
    'Validating call-template parameters',
    () => assertNoInvalidCallTemplateParams(root, stylesheetXml, compilerHelpers.stylesheetHelpers),
  );

  const templates: TemplateRule[] = [];
  const globalBindings: GlobalBinding[] = [];
  const location = getNodeSourceLocation(stylesheetXml, root, stylesheetSourceName);
  measureCompileIrPhase(
    options.irStats,
    'lowerTopLevelDeclarations',
    'Lowering top-level declarations',
    () => {
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
    },
  );
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
    namespaces: staticContext.namespaces,
    defaultElementNamespace: staticContext.defaultElementNamespace,
    globalBindings,
    templates,
  };
}

function measureCompileIrPhase<T>(
  recorder: CompileIrStatsRecorder | undefined,
  key: CompileIrPhaseTiming['key'],
  label: string,
  operation: () => T,
): T {
  const startTime = recorder === undefined ? 0 : performance.now();
  try {
    return operation();
  } finally {
    if (recorder !== undefined) {
      recorder.recordCompilePhase(key, label, performance.now() - startTime);
    }
  }
}

function createCompilerHelpers(
  stylesheetSourceName: string,
  namespaces: Readonly<Record<string, string>>,
  extensionFunctions: ExtensionFunctionCatalog,
  irStats?: CompileIrStatsRecorder,
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
    const startTime = irStats === undefined ? 0 : performance.now();
    const ast = parseXPathInContext(expression, location, ownerName, attributeName, frameKind);
    irStats?.recordXPathParse(
      expression,
      ownerName,
      attributeName,
      frameKind,
      irStats === undefined ? undefined : performance.now() - startTime,
    );
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
    normalizeXsltQName: (
      name: string,
      element: Element,
      stylesheetXml: string,
      attributeName: string,
      ownerName: string,
    ): string => {
      const startTime = irStats === undefined ? 0 : performance.now();
      const normalized = normalizeXsltQName(name, element, stylesheetXml, attributeName, ownerName);
      irStats?.recordQNameResolution(
        name,
        ownerName,
        attributeName,
        irStats === undefined ? undefined : performance.now() - startTime,
      );
      return normalized;
    },
    assertNoSelectAndContent,
    hasMeaningfulTemplateContent,
    ...(irStats === undefined ? {} : { irStats }),
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
