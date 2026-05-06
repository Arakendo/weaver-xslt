import type { TransformExecutionFallbackReason, TransformExecutionInfo, TransformOptions, TransformResult } from './types.js';
import { WEAVER_XSLT_NATIVE_UNSUPPORTED, XTSE0010 } from '../errors/codes.js';
import { XsltError } from '../errors/index.js';
import { compileStylesheet } from '../xslt/compile/compiler.js';
import { tryCreateNativeTransformPlan, type NativeTransformPlan } from '../xslt/codegen/emitInstructions.js';
import {
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  escapeText,
  localNameOfNode,
  nameOfNode,
  selectDescendantElementsByName,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodes,
  selectSimplePathText,
  stringValueOfNode,
  prependNativeGlobalBindingError,
  throwCircularNativeGlobalBinding,
} from '../runtime/index.js';
import { runTransform } from '../xslt/eval/transform.js';

export interface XsltProcessorOptions {
  readonly sourceName?: string;
}

/**
 * Top-level XSLT 3.0 processor.
 *
 * This is a scaffold. The compilation pipeline, XPath 3.1 evaluator, and
 * instruction library will be wired in here as they are implemented.
 */
export class XsltProcessor {
  private readonly stylesheetSource: string;
  private readonly stylesheetSourceName: string | undefined;

  constructor(stylesheetSource: string, options: XsltProcessorOptions = {}) {
    this.stylesheetSource = stylesheetSource;
    this.stylesheetSourceName = options.sourceName;
  }

  /**
   * Transform an XML source document using the compiled stylesheet.
   *
   * @param _sourceXml - Serialized XML source document.
   * @param _options - Optional transform parameters.
   */
  transform(_sourceXml: string, _options: TransformOptions = {}): TransformResult {
    if (this.stylesheetSource.length === 0) {
      throw new XsltError(
        XTSE0010,
        'Stylesheet source is empty.',
        undefined,
        undefined,
        {
          suggestions: [{
            kind: 'fix',
            label: 'provide an xsl:stylesheet or xsl:transform document before running the transform',
            confidence: 1,
          }],
        },
      );
    }

    const ir = compileStylesheet(
      this.stylesheetSource,
      this.stylesheetSourceName === undefined ? undefined : { sourceName: this.stylesheetSourceName },
    );

    const nativePlan = tryCreateNativeTransformPlan(ir, this.stylesheetSourceName);
    const executionInfo = this.resolveExecution(_options, nativePlan);
    const result = executionInfo?.resolved === 'native' && nativePlan !== undefined
      ? executeNativeTransformPlan(nativePlan, _sourceXml, _options)
      : runTransform(ir, _sourceXml, _options);

    return executionInfo === undefined
      ? result
      : {
          ...result,
          execution: executionInfo,
        };
  }

  private resolveExecution(options: TransformOptions, nativePlan: NativeTransformPlan | undefined): TransformExecutionInfo | undefined {
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

    if (nativePlan !== undefined) {
      return {
        requested,
        resolved: 'native',
      };
    }

    const fallbackReason = createExecutionFallbackReason(
      'unsupported_stylesheet',
      'The current stylesheet is outside the native-supported slice for M6.25.',
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
              label: 'use execution="auto" to allow interpreter fallback while the native surface is still landing',
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
}

function executeNativeTransformPlan(
  plan: NativeTransformPlan,
  sourceXml: string,
  context: TransformOptions,
): TransformResult {
  const helperBindings = plan.runtimeHelpers.length === 0
    ? ''
    : `const { ${plan.runtimeHelpers.join(', ')} } = helpers;`;
  const executeNative = new Function(
    'sourceXml',
    'ctx',
    'helpers',
    [
      '"use strict";',
      helperBindings,
      ...(plan.setupStatements.length === 0 ? ['void ctx;'] : []),
      'const document = createCompiledDocument(sourceXml);',
      ...plan.setupStatements,
      ...(plan.needsCurrentNodeBinding
        ? [`const currentNode = ${plan.currentNodeExpression.code};`]
        : []),
      ...(plan.currentNodeMayBeNull
        ? [
            'if (currentNode === null) {',
            '  return { output: "" };',
            '}',
          ]
        : []),
      'return {',
      `  output: ${plan.outputExpression.code},`,
      '};',
    ].filter((statement) => statement.length > 0).join('\n'),
  ) as (
    sourceXml: string,
    context: TransformOptions,
    helpers: typeof NATIVE_RUNTIME_HELPERS,
  ) => TransformResult;

  return executeNative(sourceXml, context, NATIVE_RUNTIME_HELPERS);
}

function createExecutionFallbackReason(
  code: TransformExecutionFallbackReason['code'],
  message: string,
): TransformExecutionFallbackReason {
  return { code, message };
}

const NATIVE_RUNTIME_HELPERS = {
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  escapeText,
  localNameOfNode,
  nameOfNode,
  selectDescendantElementsByName,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodes,
  selectSimplePathText,
  stringValueOfNode,
  prependNativeGlobalBindingError,
  throwCircularNativeGlobalBinding,
} as const;
