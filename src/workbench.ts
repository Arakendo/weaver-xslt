import {
  diagnosticReportFromError,
  sortDiagnostics,
  type DiagnosticReport,
  type SourceSpan,
} from './diagnostics/index.js';
import {
  compileStylesheetRuntimeArtifacts,
  type CompilePerformanceProfile,
} from './processor/runtimeArtifacts.js';
import { XsltProcessor } from './processor/XsltProcessor.js';
import type {
  TransformExecutionInfo,
  TransformExecutionFallbackReason,
  TransformOptions,
  XmlNodeHandle,
  XmlTracePause,
} from './processor/types.js';
import {
  createCompiledDocument,
  resolveXmlNodeHandle as resolveRuntimeXmlNodeHandle,
  resolveXmlNodeHandleAtOffset as resolveRuntimeXmlNodeHandleAtOffset,
  resolveXmlNodeHandleInRange as resolveRuntimeXmlNodeHandleInRange,
} from './runtime/index.js';

export interface SourceDocument {
  readonly uri: string;
  readonly text: string;
}

export interface WorkbenchNoticeDetail {
  readonly key: string;
  readonly value: string;
}

export interface WorkbenchNoticeSuggestion {
  readonly kind: 'fix' | 'hint' | 'alternative';
  readonly label: string;
  readonly confidence?: number;
  readonly replacement?: string;
}

export interface WorkbenchNotice {
  readonly severity: 'warning';
  readonly code: 'native_fallback';
  readonly message: string;
  readonly details: readonly WorkbenchNoticeDetail[];
  readonly suggestions?: readonly WorkbenchNoticeSuggestion[];
}

export interface CompileRequest {
  readonly stylesheet: SourceDocument;
  readonly options?: {
    readonly emitGeneratedTs?: boolean;
    readonly emitSourceMap?: boolean;
    readonly sampleDocument?: SourceDocument;
    readonly onProgress?: (message: string) => void;
    readonly captureProfile?: boolean;
  };
}

export interface CompileSuccessResult {
  readonly ok: true;
  readonly diagnostics: readonly DiagnosticReport[];
  readonly stylesheet: CompiledStylesheet;
  readonly generatedTs?: string;
  readonly sourceMap?: WeaverSourceMap;
  readonly profile?: CompilePerformanceProfile;
}

export interface CompileFailureResult {
  readonly ok: false;
  readonly diagnostics: readonly DiagnosticReport[];
}

export type CompileResult = CompileSuccessResult | CompileFailureResult;

export interface TransformRequest {
  readonly stylesheet: CompiledStylesheet;
  readonly sourceXml: SourceDocument;
  readonly options?: TransformOptions;
}

export interface TransformSuccessResult {
  readonly ok: true;
  readonly diagnostics: readonly DiagnosticReport[];
  readonly output: string;
  readonly pause?: XmlTracePause;
  readonly execution?: TransformExecutionInfo;
  readonly notices?: readonly WorkbenchNotice[];
}

export interface TransformFailureResult {
  readonly ok: false;
  readonly diagnostics: readonly DiagnosticReport[];
}

export type TransformResult = TransformSuccessResult | TransformFailureResult;

export interface ResolveSourceXmlNodeHandleRequest {
  readonly sourceXml: SourceDocument;
  readonly path: string;
}

export interface ResolveSourceXmlNodeHandleAtOffsetRequest {
  readonly sourceXml: SourceDocument;
  readonly offset: number;
}

export interface ResolveSourceXmlNodeHandleInRangeRequest {
  readonly sourceXml: SourceDocument;
  readonly offsetStart: number;
  readonly offsetEnd: number;
}

export interface ResolveSourceXmlNodeHandleSuccessResult {
  readonly ok: true;
  readonly diagnostics: readonly DiagnosticReport[];
  readonly handle?: XmlNodeHandle;
}

export interface ResolveSourceXmlNodeHandleFailureResult {
  readonly ok: false;
  readonly diagnostics: readonly DiagnosticReport[];
}

export type ResolveSourceXmlNodeHandleResult =
  | ResolveSourceXmlNodeHandleSuccessResult
  | ResolveSourceXmlNodeHandleFailureResult;

export type ResolveSourceXmlNodeHandleAtOffsetResult = ResolveSourceXmlNodeHandleResult;

export type ResolveSourceXmlNodeHandleInRangeResult = ResolveSourceXmlNodeHandleResult;

export interface CompileAndTransformRequest {
  readonly stylesheet: SourceDocument;
  readonly sourceXml: SourceDocument;
  readonly options?: TransformOptions & {
    readonly emitGeneratedTs?: boolean;
    readonly emitSourceMap?: boolean;
    readonly sampleDocument?: SourceDocument;
    readonly onProgress?: (message: string) => void;
    readonly captureProfile?: boolean;
  };
}

export interface CompileAndTransformSuccessResult {
  readonly ok: true;
  readonly diagnostics: readonly DiagnosticReport[];
  readonly output: string;
  readonly stylesheet: CompiledStylesheet;
  readonly generatedTs?: string;
  readonly sourceMap?: WeaverSourceMap;
  readonly profile?: CompilePerformanceProfile;
  readonly pause?: XmlTracePause;
  readonly execution?: TransformExecutionInfo;
  readonly notices?: readonly WorkbenchNotice[];
}

export interface CompileAndTransformFailureResult {
  readonly ok: false;
  readonly diagnostics: readonly DiagnosticReport[];
  readonly generatedTs?: string;
  readonly sourceMap?: WeaverSourceMap;
}

export type CompileAndTransformResult =
  | CompileAndTransformSuccessResult
  | CompileAndTransformFailureResult;

export type GeneratedSpan = SourceSpan;

export interface WeaverSourceMap {
  readonly raw: string;
  readonly sourceUri: string;
  readonly generatedUri: string;
  mapSourceToGenerated(span: SourceSpan): readonly GeneratedSpan[];
  mapGeneratedToSource(span: GeneratedSpan): readonly SourceSpan[];
}

export class CompiledStylesheet {
  readonly stylesheet: SourceDocument;
  readonly diagnostics: readonly DiagnosticReport[];
  readonly generatedTs?: string;
  readonly sourceMap?: WeaverSourceMap;
  private readonly processor: XsltProcessor;

  private constructor(
    stylesheet: SourceDocument,
    diagnostics: readonly DiagnosticReport[],
    processor: XsltProcessor,
    generatedTs?: string,
    sourceMap?: WeaverSourceMap,
  ) {
    this.stylesheet = stylesheet;
    this.diagnostics = diagnostics;
    this.processor = processor;
    if (generatedTs !== undefined) {
      this.generatedTs = generatedTs;
    }
    if (sourceMap !== undefined) {
      this.sourceMap = sourceMap;
    }
  }

  static create(
    stylesheet: SourceDocument,
    diagnostics: readonly DiagnosticReport[],
    processor: XsltProcessor,
    generatedTs?: string,
    sourceMap?: WeaverSourceMap,
  ): CompiledStylesheet {
    return new CompiledStylesheet(stylesheet, diagnostics, processor, generatedTs, sourceMap);
  }

  transform(sourceXml: SourceDocument, options?: TransformOptions): TransformResult {
    try {
      const result = this.processor.transform(sourceXml.text, options ?? {});
      const notices = createFallbackNotices(result.execution);

      return {
        ok: true,
        diagnostics: this.diagnostics,
        output: result.output,
        ...(result.pause === undefined ? {} : { pause: result.pause }),
        ...(result.execution === undefined ? {} : { execution: result.execution }),
        ...(notices.length === 0 ? {} : { notices }),
      };
    } catch (error) {
      return {
        ok: false,
        diagnostics: sortDiagnostics([...this.diagnostics, diagnosticReportFromError(error)]),
      };
    }
  }
}

export function compile(request: CompileRequest): CompileResult {
  try {
    const artifacts = compileStylesheetRuntimeArtifacts(request.stylesheet.text, {
      path: request.stylesheet.uri,
      ...(request.options?.sampleDocument === undefined
        ? {}
        : { sampleDocument: request.options.sampleDocument.text }),
      ...(request.options?.onProgress === undefined
        ? {}
        : { onProgress: request.options.onProgress }),
      ...(request.options?.captureProfile === undefined
        ? {}
        : { captureProfile: request.options.captureProfile }),
    });
    const processor = XsltProcessor.fromIr(request.stylesheet.text, artifacts.ir, {
      sourceName: request.stylesheet.uri,
    });
    const sourceMap =
      request.options?.emitSourceMap === false
        ? undefined
        : StructuredWeaverSourceMap.create(
            request.stylesheet,
            artifacts.module,
            artifacts.sourceMap,
          );

    return {
      ok: true,
      diagnostics: artifacts.diagnostics,
      stylesheet: CompiledStylesheet.create(
        request.stylesheet,
        artifacts.diagnostics,
        processor,
        request.options?.emitGeneratedTs === false ? undefined : artifacts.module,
        sourceMap,
      ),
      ...(request.options?.emitGeneratedTs === false ? {} : { generatedTs: artifacts.module }),
      ...(sourceMap === undefined ? {} : { sourceMap }),
      ...(artifacts.profile === undefined ? {} : { profile: artifacts.profile }),
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [diagnosticReportFromError(error)],
    };
  }
}

export function transform(request: TransformRequest): TransformResult {
  return request.stylesheet.transform(request.sourceXml, request.options);
}

export function resolveSourceXmlNodeHandle(
  request: ResolveSourceXmlNodeHandleRequest,
): ResolveSourceXmlNodeHandleResult {
  try {
    const document = createCompiledDocument(request.sourceXml.text);
    const handle = resolveRuntimeXmlNodeHandle(document, request.sourceXml.uri, request.path);

    return {
      ok: true,
      diagnostics: [],
      ...(handle === undefined ? {} : { handle }),
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [diagnosticReportFromError(error)],
    };
  }
}

export function resolveSourceXmlNodeHandleAtOffset(
  request: ResolveSourceXmlNodeHandleAtOffsetRequest,
): ResolveSourceXmlNodeHandleAtOffsetResult {
  try {
    const document = createCompiledDocument(request.sourceXml.text);
    const handle = resolveRuntimeXmlNodeHandleAtOffset(
      document,
      request.sourceXml.uri,
      request.sourceXml.text,
      request.offset,
    );

    return {
      ok: true,
      diagnostics: [],
      ...(handle === undefined ? {} : { handle }),
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [diagnosticReportFromError(error)],
    };
  }
}

export function resolveSourceXmlNodeHandleInRange(
  request: ResolveSourceXmlNodeHandleInRangeRequest,
): ResolveSourceXmlNodeHandleInRangeResult {
  try {
    const document = createCompiledDocument(request.sourceXml.text);
    const handle = resolveRuntimeXmlNodeHandleInRange(
      document,
      request.sourceXml.uri,
      request.sourceXml.text,
      request.offsetStart,
      request.offsetEnd,
    );

    return {
      ok: true,
      diagnostics: [],
      ...(handle === undefined ? {} : { handle }),
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [diagnosticReportFromError(error)],
    };
  }
}

export function compileAndTransform(
  request: CompileAndTransformRequest,
): CompileAndTransformResult {
  const compileResult = compile({
    stylesheet: request.stylesheet,
    options: {
      ...(request.options?.emitGeneratedTs === undefined
        ? {}
        : { emitGeneratedTs: request.options.emitGeneratedTs }),
      ...(request.options?.emitSourceMap === undefined
        ? {}
        : { emitSourceMap: request.options.emitSourceMap }),
      ...(request.options?.sampleDocument === undefined
        ? {}
        : { sampleDocument: request.options.sampleDocument }),
      ...(request.options?.onProgress === undefined
        ? {}
        : { onProgress: request.options.onProgress }),
    },
  });
  if (!compileResult.ok) {
    return compileResult;
  }

  const transformResult = transform({
    stylesheet: compileResult.stylesheet,
    sourceXml: request.sourceXml,
    options: getTransformOptions(request.options),
  });
  if (!transformResult.ok) {
    return {
      ...transformResult,
      ...(compileResult.generatedTs === undefined
        ? {}
        : { generatedTs: compileResult.generatedTs }),
      ...(compileResult.sourceMap === undefined ? {} : { sourceMap: compileResult.sourceMap }),
    };
  }

  return {
    ...transformResult,
    stylesheet: compileResult.stylesheet,
    ...(compileResult.generatedTs === undefined ? {} : { generatedTs: compileResult.generatedTs }),
    ...(compileResult.sourceMap === undefined ? {} : { sourceMap: compileResult.sourceMap }),
  };
}

function getTransformOptions(options: CompileAndTransformRequest['options']): TransformOptions {
  if (options === undefined) {
    return {};
  }

  return {
    ...(options.initialTemplate === undefined ? {} : { initialTemplate: options.initialTemplate }),
    ...(options.initialMode === undefined ? {} : { initialMode: options.initialMode }),
    ...(options.execution === undefined ? {} : { execution: options.execution }),
    ...(options.parameters === undefined ? {} : { parameters: options.parameters }),
    ...(options.baseUri === undefined ? {} : { baseUri: options.baseUri }),
    ...(options.trace === undefined ? {} : { trace: options.trace }),
  };
}

function createFallbackNotices(
  execution: TransformExecutionInfo | undefined,
): readonly WorkbenchNotice[] {
  const fallbackReason = execution?.fallbackReason;
  if (execution === undefined || fallbackReason === undefined) {
    return [];
  }

  return [createFallbackNotice(execution, fallbackReason)];
}

function createFallbackNotice(
  execution: TransformExecutionInfo,
  fallbackReason: TransformExecutionFallbackReason,
): WorkbenchNotice {
  return {
    severity: 'warning',
    code: 'native_fallback',
    message: fallbackReason.message,
    details: [
      { key: 'requestedExecution', value: execution.requested },
      { key: 'resolvedExecution', value: execution.resolved },
      { key: 'fallbackCode', value: fallbackReason.code },
    ],
    ...(fallbackReason.suggestions === undefined
      ? {}
      : {
          suggestions: fallbackReason.suggestions.map((suggestion) => ({
            kind: suggestion.kind,
            label: suggestion.label,
            ...(suggestion.confidence === undefined ? {} : { confidence: suggestion.confidence }),
            ...(suggestion.replacement === undefined
              ? {}
              : { replacement: suggestion.replacement }),
          })),
        }),
  };
}

interface SourceMapPayload {
  readonly file?: string;
  readonly mappings?: string;
}

interface LineInfo {
  readonly lineNumber: number;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly length: number;
}

interface LineMapping {
  readonly generatedLine: number;
  readonly sourceLine: number;
}

class StructuredWeaverSourceMap implements WeaverSourceMap {
  readonly raw: string;
  readonly sourceUri: string;
  readonly generatedUri: string;

  private readonly sourceLineInfos: readonly LineInfo[];
  private readonly generatedLineInfos: readonly LineInfo[];
  private readonly mappings: readonly LineMapping[];

  private constructor(
    raw: string,
    sourceUri: string,
    generatedUri: string,
    sourceLineInfos: readonly LineInfo[],
    generatedLineInfos: readonly LineInfo[],
    mappings: readonly LineMapping[],
  ) {
    this.raw = raw;
    this.sourceUri = sourceUri;
    this.generatedUri = generatedUri;
    this.sourceLineInfos = sourceLineInfos;
    this.generatedLineInfos = generatedLineInfos;
    this.mappings = mappings;
  }

  static create(stylesheet: SourceDocument, generatedTs: string, raw: string): WeaverSourceMap {
    const payload = JSON.parse(raw) as SourceMapPayload;
    return new StructuredWeaverSourceMap(
      raw,
      stylesheet.uri,
      buildGeneratedUri(stylesheet.uri, payload.file),
      createLineInfos(stylesheet.text),
      createLineInfos(generatedTs),
      parseLineMappings(payload.mappings ?? ''),
    );
  }

  mapSourceToGenerated(span: SourceSpan): readonly GeneratedSpan[] {
    if (span.uri !== undefined && span.uri !== this.sourceUri) {
      return [];
    }

    const matchedLines = this.mappings
      .filter((mapping) =>
        overlapsLineRange(span.lineStart, span.lineEnd, mapping.sourceLine, mapping.sourceLine),
      )
      .map((mapping) => mapping.generatedLine);

    return createMergedLineSpans(this.generatedUri, this.generatedLineInfos, matchedLines);
  }

  mapGeneratedToSource(span: GeneratedSpan): readonly SourceSpan[] {
    if (span.uri !== undefined && span.uri !== this.generatedUri) {
      return [];
    }

    const matchedLines = this.mappings
      .filter((mapping) =>
        overlapsLineRange(
          span.lineStart,
          span.lineEnd,
          mapping.generatedLine,
          mapping.generatedLine,
        ),
      )
      .map((mapping) => mapping.sourceLine);

    return createMergedLineSpans(this.sourceUri, this.sourceLineInfos, matchedLines);
  }
}

function buildGeneratedUri(sourceUri: string, sourceMapFileName: string | undefined): string {
  if (sourceMapFileName !== undefined && sourceMapFileName.length > 0) {
    const slashIndex = Math.max(sourceUri.lastIndexOf('/'), sourceUri.lastIndexOf('\\'));
    if (slashIndex >= 0) {
      return `${sourceUri.slice(0, slashIndex + 1)}${sourceMapFileName}`;
    }
  }

  return `${sourceUri}.ts`;
}

function createLineInfos(text: string): readonly LineInfo[] {
  const lines = splitMappedLines(text);
  const infos: LineInfo[] = [];
  let startOffset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    infos.push({
      lineNumber: index + 1,
      startOffset,
      endOffset: startOffset + line.length,
      length: line.length,
    });
    startOffset += line.length + 1;
  }

  return infos;
}

function splitMappedLines(text: string): readonly string[] {
  if (text.length === 0) {
    return [''];
  }

  return text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
}

function parseLineMappings(mappingsText: string): readonly LineMapping[] {
  if (mappingsText.length === 0) {
    return [];
  }

  const mappings: LineMapping[] = [];
  let previousSourceIndex = 0;
  let previousSourceLine = 0;

  const generatedLines = mappingsText.split(';');
  for (
    let generatedLineIndex = 0;
    generatedLineIndex < generatedLines.length;
    generatedLineIndex += 1
  ) {
    const generatedLine = generatedLines[generatedLineIndex] ?? '';
    if (generatedLine.length === 0) {
      continue;
    }

    for (const segment of generatedLine.split(',')) {
      if (segment.length === 0) {
        continue;
      }

      const decoded = decodeVlqSegment(segment);
      if (decoded.length < 4) {
        continue;
      }

      previousSourceIndex += decoded[1] ?? 0;
      previousSourceLine += decoded[2] ?? 0;

      if (previousSourceIndex !== 0) {
        continue;
      }

      mappings.push({
        generatedLine: generatedLineIndex + 1,
        sourceLine: previousSourceLine + 1,
      });
    }
  }

  return mappings;
}

function decodeVlqSegment(segment: string): readonly number[] {
  const values: number[] = [];
  let value = 0;
  let shift = 0;

  for (const character of segment) {
    const digit = BASE64_VLQ_DIGITS.indexOf(character);
    if (digit < 0) {
      continue;
    }

    const continuation = (digit & 32) !== 0;
    value += (digit & 31) << shift;
    if (continuation) {
      shift += 5;
      continue;
    }

    const isNegative = (value & 1) === 1;
    values.push(isNegative ? -((value - 1) >> 1) : value >> 1);
    value = 0;
    shift = 0;
  }

  return values;
}

function overlapsLineRange(
  lineStart: number,
  lineEnd: number,
  candidateStart: number,
  candidateEnd: number,
): boolean {
  return lineStart <= candidateEnd && candidateStart <= lineEnd;
}

function createMergedLineSpans(
  uri: string,
  lineInfos: readonly LineInfo[],
  lineNumbers: readonly number[],
): readonly SourceSpan[] {
  const uniqueSortedLineNumbers = [...new Set(lineNumbers)]
    .filter((lineNumber) => lineNumber >= 1 && lineNumber <= lineInfos.length)
    .sort((left, right) => left - right);

  if (uniqueSortedLineNumbers.length === 0) {
    return [];
  }

  const spans: SourceSpan[] = [];
  let rangeStart = uniqueSortedLineNumbers[0]!;
  let previousLine = rangeStart;

  for (let index = 1; index < uniqueSortedLineNumbers.length; index += 1) {
    const lineNumber = uniqueSortedLineNumbers[index]!;
    if (lineNumber === previousLine + 1) {
      previousLine = lineNumber;
      continue;
    }

    spans.push(createLineRangeSpan(uri, lineInfos, rangeStart, previousLine));
    rangeStart = lineNumber;
    previousLine = lineNumber;
  }

  spans.push(createLineRangeSpan(uri, lineInfos, rangeStart, previousLine));
  return spans;
}

function createLineRangeSpan(
  uri: string,
  lineInfos: readonly LineInfo[],
  lineStart: number,
  lineEnd: number,
): SourceSpan {
  const start = lineInfos[lineStart - 1]!;
  const end = lineInfos[lineEnd - 1]!;

  return {
    uri,
    offsetStart: start.startOffset,
    offsetEnd: end.endOffset,
    lineStart,
    columnStart: 1,
    lineEnd,
    columnEnd: end.length + 1,
  };
}

const BASE64_VLQ_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
