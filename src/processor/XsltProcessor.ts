import type {
  TransformExecutionFallbackReason,
  TransformExecutionInfo,
  TransformOptions,
  TransformResult,
} from './types.js';
import { WEAVER_XSLT_NATIVE_UNSUPPORTED, XTSE0010 } from '../errors/codes.js';
import { XsltError } from '../errors/index.js';
import { compileStylesheet } from '../xslt/compile/compiler.js';
import {
  tryCreateNativeTransformPlan,
  type NativeTransformPlan,
} from '../xslt/codegen/emitInstructions.js';
import {
  createInitialTemplateSuggestion,
  findNamedTemplate,
  normalizeTemplateName,
} from '../xslt/eval/templateDispatch.js';
import {
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  createTemporaryTreeNode,
  escapeAttribute,
  escapeText,
  localNameOfNode,
  matchesTemplatePath,
  selectDescendantElementTextByName,
  nameOfNode,
  selectDescendantElementsByName,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodesByStepPlan,
  selectSimplePathNodes,
  selectSimplePathText,
  stringValueOfNativeValue,
  stringValueOfNode,
  getRecordedTracePause,
  resetRecordedTracePause,
  traceFocusEnter,
  traceSelectedNodes,
  traceStringValueOfNode,
  traceTemplateEnter,
  prependNativeGlobalBindingError,
  prependNativeInitialTemplateError,
  throwCircularNativeGlobalBinding,
  throwMissingNativeStylesheetParameter,
  throwMissingNativeTemplateParameter,
  throwUnsupportedNativeInitialMode,
} from '../runtime/index.js';
import { runTransform } from '../xslt/eval/transform.js';

export interface XsltProcessorOptions {
  readonly sourceName?: string;
}

type CompiledStylesheetState = {
  readonly ir: ReturnType<typeof compileStylesheet>;
  readonly nativePlan: NativeTransformPlan | undefined;
};

/**
 * Top-level XSLT 3.0 processor.
 *
 * This is a scaffold. The compilation pipeline, XPath 3.1 evaluator, and
 * instruction library will be wired in here as they are implemented.
 */
export class XsltProcessor {
  private readonly stylesheetSource: string;
  private readonly stylesheetSourceName: string | undefined;
  private compiledStylesheet: CompiledStylesheetState | undefined;

  constructor(stylesheetSource: string, options: XsltProcessorOptions = {}) {
    this.stylesheetSource = stylesheetSource;
    this.stylesheetSourceName = options.sourceName;
  }

  static fromIr(
    stylesheetSource: string,
    ir: ReturnType<typeof compileStylesheet>,
    options: XsltProcessorOptions = {},
  ): XsltProcessor {
    const processor = new XsltProcessor(stylesheetSource, options);
    processor.compiledStylesheet = {
      ir,
      nativePlan: tryCreateNativeTransformPlan(ir, options.sourceName),
    };
    return processor;
  }

  /**
   * Transform an XML source document using the compiled stylesheet.
   *
   * @param _sourceXml - Serialized XML source document.
   * @param _options - Optional transform parameters.
   */
  transform(_sourceXml: string, _options: TransformOptions = {}): TransformResult {
    const compiledStylesheet = this.getCompiledStylesheet();
    const options =
      _options.baseUri === undefined && this.stylesheetSourceName !== undefined
        ? {
            ..._options,
            baseUri: this.stylesheetSourceName,
          }
        : _options;

    validateInitialModeOption(options);
    validateInitialTemplateOption(options, compiledStylesheet.ir);

    const executionInfo = this.resolveExecution(
      options,
      compiledStylesheet.nativePlan,
      compiledStylesheet.ir,
    );
    const result =
      executionInfo?.resolved === 'native' && compiledStylesheet.nativePlan !== undefined
        ? executeNativeTransformPlan(compiledStylesheet.nativePlan, _sourceXml, options)
        : runTransform(compiledStylesheet.ir, _sourceXml, options);

    return executionInfo === undefined
      ? result
      : {
          ...result,
          execution: executionInfo,
        };
  }

  private getCompiledStylesheet(): CompiledStylesheetState {
    if (this.compiledStylesheet !== undefined) {
      return this.compiledStylesheet;
    }

    if (this.stylesheetSource.length === 0) {
      throw new XsltError(XTSE0010, 'Stylesheet source is empty.', undefined, undefined, {
        suggestions: [
          {
            kind: 'fix',
            label:
              'provide an xsl:stylesheet or xsl:transform document before running the transform',
            confidence: 1,
          },
        ],
      });
    }

    const ir = compileStylesheet(
      this.stylesheetSource,
      this.stylesheetSourceName === undefined
        ? undefined
        : { sourceName: this.stylesheetSourceName },
    );
    this.compiledStylesheet = {
      ir,
      nativePlan: tryCreateNativeTransformPlan(ir, this.stylesheetSourceName),
    };

    return this.compiledStylesheet;
  }

  private resolveExecution(
    options: TransformOptions,
    nativePlan: NativeTransformPlan | undefined,
    ir: Parameters<typeof compileStylesheet>[0] extends never
      ? never
      : ReturnType<typeof compileStylesheet>,
  ): TransformExecutionInfo | undefined {
    const requested = options.execution;
    if (requested === undefined) {
      return undefined;
    }

    if (requested === 'interpreter') {
      return {
        requested,
        resolved: 'interpreter',
      };
    }

    if (nativePlan !== undefined && this.supportsNativeExecution(options, nativePlan, ir)) {
      return {
        requested,
        resolved: 'native',
      };
    }

    const fallbackReason = createExecutionFallbackReason(
      'unsupported_stylesheet',
      'The current stylesheet is outside the native-supported slice for M6.25.',
      [
        {
          kind: 'fix',
          label:
            'retry with execution="native" to get a hard unsupported-native error while simplifying the stylesheet',
          confidence: 1,
        },
        {
          kind: 'hint',
          label:
            'simplify the select/match shape toward the documented native slice if you want to stay on the native path',
          confidence: 0.9,
        },
      ],
    );

    if (requested === 'native') {
      throw new XsltError(
        WEAVER_XSLT_NATIVE_UNSUPPORTED,
        'Requested native execution is not available for this transform.',
        undefined,
        {
          requestedExecution: requested,
          fallbackCode: fallbackReason.code,
        },
        {
          suggestions: [
            {
              kind: 'fix',
              label:
                'use execution="auto" to allow interpreter fallback while the native surface is still landing',
              confidence: 1,
            },
            {
              kind: 'fix',
              label: 'use execution="interpreter" to stay on the stable runtime path',
              confidence: 0.9,
            },
          ],
        },
      );
    }

    return {
      requested,
      resolved: 'interpreter',
      fallbackReason,
    };
  }

  private supportsNativeExecution(
    options: TransformOptions,
    nativePlan: NativeTransformPlan,
    ir: ReturnType<typeof compileStylesheet>,
  ): boolean {
    if (options.initialMode !== undefined) {
      return false;
    }

    if (nativePlan.initialTemplateName === undefined) {
      return options.initialTemplate === undefined;
    }

    if (options.initialTemplate === undefined) {
      return nativePlan.initialTemplateEntryTemplate !== undefined;
    }

    const normalizedInitialTemplate = normalizeTemplateName(options.initialTemplate, {
      namespaces: new Map(Object.entries(ir.namespaces)),
      defaultElementNamespace: ir.defaultElementNamespace,
      ...(options.baseUri === undefined ? {} : { baseUri: options.baseUri }),
    });

    return normalizedInitialTemplate === nativePlan.initialTemplateName;
  }
}

function validateInitialTemplateOption(
  options: TransformOptions,
  ir: ReturnType<typeof compileStylesheet>,
): void {
  if (options.initialTemplate === undefined) {
    return;
  }

  const normalizedName = normalizeTemplateName(options.initialTemplate, {
    namespaces: new Map(Object.entries(ir.namespaces)),
    defaultElementNamespace: ir.defaultElementNamespace,
    ...(options.baseUri === undefined ? {} : { baseUri: options.baseUri }),
  });
  const template = findNamedTemplate(normalizedName, ir.templates);
  if (template !== undefined) {
    return;
  }

  const suggestion = createInitialTemplateSuggestion(options.initialTemplate, ir.templates);
  throw new XsltError(
    XTSE0010,
    `Initial template ${options.initialTemplate} is not declared in the current stylesheet.`,
    undefined,
    { initialTemplate: options.initialTemplate },
    suggestion === undefined
      ? {
          suggestions: [
            {
              kind: 'fix',
              label: `declare xsl:template name="${options.initialTemplate}" or omit initialTemplate`,
              confidence: 1,
            },
          ],
        }
      : { suggestions: [suggestion] },
  );
}

function validateInitialModeOption(options: TransformOptions): void {
  if (options.initialMode === undefined) {
    return;
  }

  throwUnsupportedNativeInitialMode(options.initialMode);
}

function executeNativeTransformPlan(
  plan: NativeTransformPlan,
  sourceXml: string,
  context: TransformOptions,
): TransformResult {
  resetRecordedTracePause(context.trace);
  const useInitialTemplateEntry =
    context.initialTemplate !== undefined && plan.initialTemplateName !== undefined;
  const activeEntryTemplate =
    useInitialTemplateEntry && plan.initialTemplateEntryTemplate !== undefined
      ? plan.initialTemplateEntryTemplate
      : plan.entryTemplate;
  const activeCurrentNodeExpression =
    useInitialTemplateEntry && plan.initialTemplateCurrentNodeExpression !== undefined
      ? plan.initialTemplateCurrentNodeExpression
      : plan.currentNodeExpression;
  const activeCurrentNodeMayBeNull =
    useInitialTemplateEntry && plan.initialTemplateCurrentNodeMayBeNull !== undefined
      ? plan.initialTemplateCurrentNodeMayBeNull
      : plan.currentNodeMayBeNull;
  const activeNeedsCurrentNodeBinding =
    useInitialTemplateEntry && plan.initialTemplateNeedsCurrentNodeBinding !== undefined
      ? plan.initialTemplateNeedsCurrentNodeBinding
      : plan.needsCurrentNodeBinding;
  const activeSetupStatements =
    useInitialTemplateEntry && plan.initialTemplateSetupStatements !== undefined
      ? plan.initialTemplateSetupStatements
      : plan.setupStatements;
  const activeOutputExpression =
    useInitialTemplateEntry && plan.initialTemplateOutputExpression !== undefined
      ? plan.initialTemplateOutputExpression
      : plan.outputExpression;
  const activeInitialTemplateName = useInitialTemplateEntry ? plan.initialTemplateName : undefined;
  const helperBindings =
    plan.runtimeHelpers.length === 0
      ? ''
      : `const { ${plan.runtimeHelpers.join(', ')} } = helpers;`;
  const isInitialTemplateExecution = activeInitialTemplateName !== undefined;
  const activeCurrentNodeIsDocument = activeCurrentNodeExpression.code === 'document';
  const needsTraceDocumentBinding = !activeNeedsCurrentNodeBinding;
  const activeTraceNodeIdentifier = activeNeedsCurrentNodeBinding ? 'currentNode' : 'document';
  const activeTemplateInfo = JSON.stringify({
    ...(activeEntryTemplate.matchText === undefined
      ? {}
      : { match: activeEntryTemplate.matchText }),
    ...(activeEntryTemplate.name === undefined ? {} : { name: activeEntryTemplate.name }),
    location: activeEntryTemplate.location,
  });
  const nativeBodyStatements = [
    ...(activeSetupStatements.length === 0 ? ['void ctx;'] : []),
    ...(plan.needsDocumentBinding || needsTraceDocumentBinding
      ? ['const document = createCompiledDocument(sourceXml);']
      : ['createCompiledDocument(sourceXml);']),
    ...(!isInitialTemplateExecution &&
    activeTraceNodeIdentifier !== 'document' &&
    !activeCurrentNodeIsDocument
      ? ['helpers.traceFocusEnter(document, ctx);']
      : []),
    ...activeSetupStatements,
    ...(activeNeedsCurrentNodeBinding
      ? [`const currentNode = ${activeCurrentNodeExpression.code};`]
      : []),
    ...(activeCurrentNodeMayBeNull
      ? ['if (currentNode === null) {', '  return { output: "" };', '}']
      : []),
    ...(isInitialTemplateExecution
      ? []
      : [`helpers.traceFocusEnter(${activeTraceNodeIdentifier}, ctx);`]),
    `helpers.traceTemplateEnter(${activeTraceNodeIdentifier}, ctx, ${activeTemplateInfo});`,
    'return {',
    `  output: ${activeOutputExpression.code},`,
    '};',
  ];
  const wrappedBodyStatements =
    activeInitialTemplateName === undefined
      ? nativeBodyStatements
      : [
          'try {',
          ...nativeBodyStatements.map((statement) => `  ${statement}`),
          '} catch (error) {',
          `  throw prependNativeInitialTemplateError(error, ${JSON.stringify(activeInitialTemplateName)}, ${JSON.stringify(activeEntryTemplate.location)});`,
          '}',
        ];
  const executeNative = new Function(
    'sourceXml',
    'ctx',
    'helpers',
    ['"use strict";', helperBindings, ...wrappedBodyStatements]
      .filter((statement) => statement.length > 0)
      .join('\n'),
  ) as (
    sourceXml: string,
    context: TransformOptions,
    helpers: typeof NATIVE_RUNTIME_HELPERS,
  ) => TransformResult;

  const result = executeNative(sourceXml, context, NATIVE_RUNTIME_HELPERS);
  const pause = getRecordedTracePause(context.trace);
  return pause === undefined ? result : { ...result, pause };
}

function createExecutionFallbackReason(
  code: TransformExecutionFallbackReason['code'],
  message: string,
  suggestions?: TransformExecutionFallbackReason['suggestions'],
): TransformExecutionFallbackReason {
  return suggestions === undefined ? { code, message } : { code, message, suggestions };
}

const NATIVE_RUNTIME_HELPERS = {
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  createTemporaryTreeNode,
  escapeAttribute,
  escapeText,
  localNameOfNode,
  matchesTemplatePath,
  selectDescendantElementTextByName,
  nameOfNode,
  selectDescendantElementsByName,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodesByStepPlan,
  selectSimplePathNodes,
  selectSimplePathText,
  stringValueOfNativeValue,
  stringValueOfNode,
  traceFocusEnter,
  traceSelectedNodes,
  traceStringValueOfNode,
  traceTemplateEnter,
  prependNativeGlobalBindingError,
  prependNativeInitialTemplateError,
  throwCircularNativeGlobalBinding,
  throwMissingNativeStylesheetParameter,
  throwMissingNativeTemplateParameter,
} as const;
