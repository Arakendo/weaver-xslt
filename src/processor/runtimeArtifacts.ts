import { sortDiagnostics, type DiagnosticReport } from '../diagnostics/index.js';
import type { ExtensionFunctionCatalog } from '../xslt/compile/extensionFunctions.js';
import { analyzeStylesheet } from '../xslt/compile/analyze.js';
import {
  compileStylesheet,
  type CompileIrExpressionTiming,
  type CompileIrPhaseTiming,
  type CompileIrStats,
  type CompileIrOperationTiming,
  type CompileIrStatsRecorder,
  type CompileIrTemplateAggregate,
  type CompileIrTemplateMetrics,
  type CompileIrTemplateTiming,
} from '../xslt/compile/compiler.js';
import { emitStylesheetDeclarationModule, emitStylesheetModule } from '../xslt/codegen/emit.js';

export type { CompileIrStats } from '../xslt/compile/compiler.js';

export interface CompileMemoryUsageSnapshot {
  readonly rss: number;
  readonly heapTotal: number;
  readonly heapUsed: number;
  readonly external: number;
  readonly arrayBuffers: number;
}

export interface CompilePerformancePhase {
  readonly key:
    | 'compose'
    | 'compileIr'
    | 'emitModule'
    | 'analyzeDiagnostics'
    | 'emitDeclaration'
    | 'emitSourceMap';
  readonly label: string;
  readonly elapsedMs: number;
  readonly memoryBefore?: CompileMemoryUsageSnapshot;
  readonly memoryAfter?: CompileMemoryUsageSnapshot;
}

export interface CompilePerformanceProfile {
  readonly totalElapsedMs: number;
  readonly phases: readonly CompilePerformancePhase[];
}

export interface CompileStylesheetRuntimeArtifactsOptions {
  readonly path?: string;
  readonly filePath?: string;
  readonly sourceName?: string;
  readonly runtimeModuleSpecifier?: string;
  readonly sampleDocument?: string;
  readonly extensionFunctions?: ExtensionFunctionCatalog;
  readonly onProgress?: (message: string) => void;
  readonly captureProfile?: boolean;
  readonly captureIrStats?: boolean;
}

export interface CompileStylesheetArtifacts {
  readonly module: string;
  readonly declaration: string;
  readonly digest: string;
  readonly sourceMap: string;
  readonly diagnostics: readonly DiagnosticReport[];
  readonly profile?: CompilePerformanceProfile;
  readonly irStats?: CompileIrStats;
}

export interface CompileStylesheetRuntimeArtifacts extends CompileStylesheetArtifacts {
  readonly ir: ReturnType<typeof compileStylesheet>;
}

export function compileStylesheetRuntimeArtifacts(
  stylesheetSource: string,
  options: CompileStylesheetRuntimeArtifactsOptions = {},
): CompileStylesheetRuntimeArtifacts {
  const totalStartTime = performance.now();
  const digest = createStylesheetDigest(stylesheetSource);
  const sourcePath = options.filePath ?? options.path ?? '<stylesheet>';
  const phaseCollector = options.captureProfile ? new CompileProfileCollector() : undefined;
  const irStatsCollector = options.captureIrStats ? new CompileIrStatsCollector() : undefined;
  const reportProgress = (message: string): void => {
    options.onProgress?.(message);
  };

  reportProgress(`Compiling stylesheet IR for ${sourcePath}`);
  const ir = measureCompilePhase(phaseCollector, 'compileIr', 'Compiling stylesheet IR', () =>
    compileStylesheet(stylesheetSource, {
      ...(options.sourceName === undefined && options.path === undefined
        ? {}
        : { sourceName: options.sourceName ?? options.path }),
      ...(options.extensionFunctions === undefined
        ? {}
        : { extensionFunctions: options.extensionFunctions }),
      ...(irStatsCollector === undefined ? {} : { irStats: irStatsCollector }),
    }),
  );
  const emitOptions = {
    digest,
    ...(options.filePath === undefined
      ? options.path === undefined
        ? {}
        : { path: options.path }
      : { filePath: options.filePath }),
    ...(options.runtimeModuleSpecifier === undefined
      ? {}
      : { runtimeModuleSpecifier: options.runtimeModuleSpecifier }),
  };
  reportProgress(`Emitting stylesheet module for ${sourcePath}`);
  const emittedModule = measureCompilePhase(
    phaseCollector,
    'emitModule',
    'Emitting stylesheet module',
    () => emitStylesheetModule(ir, emitOptions),
  );
  const sourceBaseName = fileBasename(sourcePath);
  const module = appendSourceMappingUrl(emittedModule, `${sourceBaseName}.map`);
  reportProgress(`Analyzing stylesheet diagnostics for ${sourcePath}`);
  const diagnostics = measureCompilePhase(
    phaseCollector,
    'analyzeDiagnostics',
    'Analyzing stylesheet diagnostics',
    () =>
      sortDiagnostics(
        analyzeStylesheet(ir, {
          ...(options.sampleDocument === undefined
            ? {}
            : { sampleDocument: options.sampleDocument }),
        }),
      ),
  );
  reportProgress(`Generating stylesheet declaration and source map for ${sourcePath}`);
  const declaration = measureCompilePhase(
    phaseCollector,
    'emitDeclaration',
    'Generating stylesheet declaration',
    () => emitStylesheetDeclarationModule(ir, emitOptions),
  );
  const sourceMap = measureCompilePhase(
    phaseCollector,
    'emitSourceMap',
    'Generating stylesheet source map',
    () => createStylesheetSourceMap(module, stylesheetSource, sourceBaseName),
  );

  return {
    ir,
    module,
    declaration,
    digest,
    sourceMap,
    diagnostics,
    ...(phaseCollector === undefined
      ? {}
      : { profile: phaseCollector.finish(performance.now() - totalStartTime) }),
    ...(irStatsCollector === undefined ? {} : { irStats: irStatsCollector.snapshot() }),
  };
}

class CompileIrStatsCollector implements CompileIrStatsRecorder {
  private xpathParseCount = 0;
  private xpathParseElapsedMs = 0;
  private readonly uniqueXPathExpressions = new Set<string>();
  private matchPatternParseCount = 0;
  private matchPatternParseElapsedMs = 0;
  private readonly uniqueMatchPatternExpressions = new Set<string>();
  private qnameResolutionCount = 0;
  private qnameResolutionElapsedMs = 0;
  private templateRuleCount = 0;
  private globalBindingCount = 0;
  private readonly instructionKindCounts = new Map<string, number>();
  private readonly compilePhases = new Map<
    CompileIrPhaseTiming['key'],
    { key: CompileIrPhaseTiming['key']; label: string; elapsedMs: number; invocationCount: number }
  >();
  private readonly templateTimingStack: Array<{
    name: string | undefined;
    matchText: string | undefined;
    childNodeCount: number;
    startXPathParseCount: number;
  }> = [];
  private readonly templateTimings: CompileIrTemplateTiming[] = [];
  private readonly xpathTimings = new Map<string, { count: number; totalElapsedMs: number }>();
  private readonly matchPatternTimings = new Map<
    string,
    { count: number; totalElapsedMs: number }
  >();
  private readonly qnameTimings = new Map<
    string,
    { count: number; totalElapsedMs: number; site: string }
  >();

  recordXPathParse(
    expressionText: string,
    ownerName: string,
    attributeName: string,
    _frameKind?: string,
    elapsedMs?: number,
  ): void {
    this.xpathParseCount += 1;
    this.uniqueXPathExpressions.add(expressionText);
    if (elapsedMs !== undefined) {
      this.xpathParseElapsedMs += elapsedMs;
      this.accumulateTiming(this.xpathTimings, expressionText, elapsedMs);
    }
    if (ownerName === 'xsl:template' && attributeName === 'match') {
      this.matchPatternParseCount += 1;
      this.uniqueMatchPatternExpressions.add(expressionText);
      if (elapsedMs !== undefined) {
        this.matchPatternParseElapsedMs += elapsedMs;
        this.accumulateTiming(this.matchPatternTimings, expressionText, elapsedMs);
      }
    }
  }

  recordQNameResolution(
    name: string,
    ownerName: string,
    attributeName: string,
    elapsedMs?: number,
  ): void {
    this.qnameResolutionCount += 1;
    if (elapsedMs === undefined) {
      return;
    }

    this.qnameResolutionElapsedMs += elapsedMs;
    const site = `${ownerName} ${attributeName}`;
    this.accumulateQNameTiming(this.qnameTimings, name, elapsedMs, site);
  }

  recordCompilePhase(key: CompileIrPhaseTiming['key'], label: string, elapsedMs: number): void {
    const existing = this.compilePhases.get(key);
    if (existing === undefined) {
      this.compilePhases.set(key, { key, label, elapsedMs, invocationCount: 1 });
      return;
    }

    existing.elapsedMs += elapsedMs;
    existing.invocationCount += 1;
  }

  beginTemplateLowering(
    name: string | undefined,
    matchText: string | undefined,
    childNodeCount: number,
  ): void {
    this.templateTimingStack.push({
      name,
      matchText,
      childNodeCount,
      startXPathParseCount: this.xpathParseCount,
    });
  }

  endTemplateLowering(metrics: CompileIrTemplateMetrics, elapsedMs: number): void {
    const template = this.templateTimingStack.pop();
    if (template === undefined) {
      return;
    }

    this.templateTimings.push({
      key: template.name ?? template.matchText ?? '<anonymous template>',
      ...(template.name === undefined ? {} : { name: template.name }),
      ...(template.matchText === undefined ? {} : { matchText: template.matchText }),
      elapsedMs,
      instructionCount: metrics.instructionCount,
      xpathCount: this.xpathParseCount - template.startXPathParseCount,
      childNodeCount: template.childNodeCount,
      callTemplateCount: metrics.callTemplateCount,
      applyTemplatesCount: metrics.applyTemplatesCount,
      chooseCount: metrics.chooseCount,
      variableCount: metrics.variableCount,
      literalResultCount: metrics.literalResultCount,
      calledTemplateNames: metrics.calledTemplateNames,
      applyTemplateModes: metrics.applyTemplateModes,
    });
  }

  recordTemplateRule(): void {
    this.templateRuleCount += 1;
  }

  recordGlobalBinding(kind: 'param' | 'variable'): void {
    this.globalBindingCount += 1;
    this.recordInstruction(kind === 'param' ? 'globalParam' : 'globalVariable');
  }

  recordInstruction(kind: string): void {
    this.instructionKindCounts.set(kind, (this.instructionKindCounts.get(kind) ?? 0) + 1);
  }

  snapshot(): CompileIrStats {
    return {
      xpathParseCount: this.xpathParseCount,
      xpathParseElapsedMs: this.xpathParseElapsedMs,
      uniqueXPathExpressionCount: this.uniqueXPathExpressions.size,
      matchPatternParseCount: this.matchPatternParseCount,
      matchPatternParseElapsedMs: this.matchPatternParseElapsedMs,
      uniqueMatchPatternExpressionCount: this.uniqueMatchPatternExpressions.size,
      qnameResolutionCount: this.qnameResolutionCount,
      qnameResolutionElapsedMs: this.qnameResolutionElapsedMs,
      templateRuleCount: this.templateRuleCount,
      globalBindingCount: this.globalBindingCount,
      instructionKindCounts: Object.fromEntries(this.instructionKindCounts),
      compilePhases: [...this.compilePhases.values()],
      slowestTemplates: this.collectTopTemplateTimings(this.templateTimings),
      hottestTemplateKeys: this.collectTopTemplateAggregates(this.templateTimings),
      slowestXPathExpressions: this.collectTopExpressionTimings(this.xpathTimings),
      slowestMatchPatternExpressions: this.collectTopExpressionTimings(this.matchPatternTimings),
      slowestQNameResolutions: this.collectTopQNameTimings(this.qnameTimings),
    };
  }

  private collectTopTemplateTimings(
    timings: readonly CompileIrTemplateTiming[],
  ): readonly CompileIrTemplateTiming[] {
    return [...timings].sort((left, right) => right.elapsedMs - left.elapsedMs).slice(0, 20);
  }

  private collectTopTemplateAggregates(
    timings: readonly CompileIrTemplateTiming[],
  ): readonly CompileIrTemplateAggregate[] {
    const aggregates = new Map<
      string,
      { key: string; invocationCount: number; totalElapsedMs: number; maxElapsedMs: number }
    >();

    for (const timing of timings) {
      const existing = aggregates.get(timing.key);
      if (existing === undefined) {
        aggregates.set(timing.key, {
          key: timing.key,
          invocationCount: 1,
          totalElapsedMs: timing.elapsedMs,
          maxElapsedMs: timing.elapsedMs,
        });
        continue;
      }

      existing.invocationCount += 1;
      existing.totalElapsedMs += timing.elapsedMs;
      if (timing.elapsedMs > existing.maxElapsedMs) {
        existing.maxElapsedMs = timing.elapsedMs;
      }
    }

    return [...aggregates.values()]
      .map((aggregate) => ({
        ...aggregate,
        averageElapsedMs: aggregate.totalElapsedMs / aggregate.invocationCount,
      }))
      .sort((left, right) => right.totalElapsedMs - left.totalElapsedMs)
      .slice(0, 20);
  }

  private accumulateTiming(
    timings: Map<string, { count: number; totalElapsedMs: number }>,
    key: string,
    elapsedMs: number,
  ): void {
    const existing = timings.get(key);
    if (existing === undefined) {
      timings.set(key, { count: 1, totalElapsedMs: elapsedMs });
      return;
    }

    existing.count += 1;
    existing.totalElapsedMs += elapsedMs;
  }

  private accumulateQNameTiming(
    timings: Map<string, { count: number; totalElapsedMs: number; site: string }>,
    key: string,
    elapsedMs: number,
    site: string,
  ): void {
    const existing = timings.get(key);
    if (existing === undefined) {
      timings.set(key, { count: 1, totalElapsedMs: elapsedMs, site });
      return;
    }

    existing.count += 1;
    existing.totalElapsedMs += elapsedMs;
  }

  private collectTopExpressionTimings(
    timings: Map<string, { count: number; totalElapsedMs: number }>,
  ): readonly CompileIrExpressionTiming[] {
    return [...timings.entries()]
      .map(([key, timing]) => ({
        key,
        count: timing.count,
        totalElapsedMs: timing.totalElapsedMs,
        averageElapsedMs: timing.totalElapsedMs / timing.count,
      }))
      .sort((left, right) => right.totalElapsedMs - left.totalElapsedMs)
      .slice(0, 20);
  }

  private collectTopQNameTimings(
    timings: Map<string, { count: number; totalElapsedMs: number; site: string }>,
  ): readonly CompileIrOperationTiming[] {
    return [...timings.entries()]
      .map(([key, timing]) => ({
        key,
        site: timing.site,
        count: timing.count,
        totalElapsedMs: timing.totalElapsedMs,
        averageElapsedMs: timing.totalElapsedMs / timing.count,
      }))
      .sort((left, right) => right.totalElapsedMs - left.totalElapsedMs)
      .slice(0, 20);
  }
}

class CompileProfileCollector {
  private readonly phases: CompilePerformancePhase[] = [];

  record<T>(key: CompilePerformancePhase['key'], label: string, operation: () => T): T {
    const memoryBefore = sampleMemoryUsage();
    const startTime = performance.now();
    try {
      return operation();
    } finally {
      const elapsedMs = performance.now() - startTime;
      const memoryAfter = sampleMemoryUsage();
      this.phases.push({
        key,
        label,
        elapsedMs,
        ...(memoryBefore === undefined ? {} : { memoryBefore }),
        ...(memoryAfter === undefined ? {} : { memoryAfter }),
      });
    }
  }

  finish(totalElapsedMs: number): CompilePerformanceProfile {
    return {
      totalElapsedMs,
      phases: this.phases,
    };
  }
}

function measureCompilePhase<T>(
  collector: CompileProfileCollector | undefined,
  key: CompilePerformancePhase['key'],
  label: string,
  operation: () => T,
): T {
  if (collector === undefined) {
    return operation();
  }

  return collector.record(key, label, operation);
}

function sampleMemoryUsage(): CompileMemoryUsageSnapshot | undefined {
  const processValue = (
    globalThis as typeof globalThis & {
      process?: { memoryUsage?: () => NodeJS.MemoryUsage };
    }
  ).process;

  if (typeof processValue?.memoryUsage !== 'function') {
    return undefined;
  }

  const memoryUsage = processValue.memoryUsage();
  return {
    rss: memoryUsage.rss,
    heapTotal: memoryUsage.heapTotal,
    heapUsed: memoryUsage.heapUsed,
    external: memoryUsage.external,
    arrayBuffers: memoryUsage.arrayBuffers,
  };
}

export function createStylesheetDigest(source: string): string {
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function fileBasename(path: string): string {
  const normalizedPath = path.replace(/\\/g, '/');
  const slashIndex = normalizedPath.lastIndexOf('/');
  return slashIndex >= 0 ? normalizedPath.slice(slashIndex + 1) : normalizedPath;
}

function appendSourceMappingUrl(moduleSource: string, sourceMapFileName: string): string {
  const sourceMapFooter = `//# source${'MappingURL='}${sourceMapFileName}`;
  return `${moduleSource.slice(0, -1)}
${sourceMapFooter}
`;
}

function createStylesheetSourceMap(
  moduleSource: string,
  stylesheetSource: string,
  sourcePath: string,
): string {
  const generatedLineCount = countLines(moduleSource);
  const sourceLineCount = Math.max(countLines(stylesheetSource), 1);
  let currentSourceLine: number | undefined;
  let previousSourceLine = 0;
  const mappings: string[] = [];
  const moduleLines = moduleSource.endsWith('\n')
    ? moduleSource.slice(0, -1).split('\n')
    : moduleSource.split('\n');

  for (
    let generatedLineIndex = 0;
    generatedLineIndex < generatedLineCount;
    generatedLineIndex += 1
  ) {
    const moduleLine = moduleLines[generatedLineIndex] ?? '';
    const anchoredSourceLine = readProvenanceLineNumber(moduleLine);
    if (anchoredSourceLine !== undefined) {
      currentSourceLine = Math.min(Math.max(anchoredSourceLine - 1, 0), sourceLineCount - 1);
    }

    if (
      currentSourceLine === undefined ||
      isCommentOnlyGeneratedLine(moduleLine) ||
      isGeneratedOnlyLine(moduleLine)
    ) {
      mappings.push('');
      continue;
    }

    mappings.push(
      `${encodeVlq(0)}${encodeVlq(0)}${encodeVlq(currentSourceLine - previousSourceLine)}${encodeVlq(0)}`,
    );
    previousSourceLine = currentSourceLine;
  }

  return `${JSON.stringify(
    {
      version: 3,
      file: `${sourcePath}.ts`,
      sources: [sourcePath],
      sourcesContent: [stylesheetSource],
      names: [],
      mappings: mappings.join(';'),
    },
    null,
    2,
  )}
`;
}

function countLines(text: string): number {
  if (text.length === 0) {
    return 1;
  }

  return text.endsWith('\n') ? text.slice(0, -1).split('\n').length : text.split('\n').length;
}

function readProvenanceLineNumber(moduleLine: string): number | undefined {
  const match = /:(\d+)\) \*\/$/.exec(moduleLine.trim());
  if (match === null) {
    return undefined;
  }

  return Number.parseInt(match[1] ?? '', 10);
}

function isCommentOnlyGeneratedLine(moduleLine: string): boolean {
  const trimmedLine = moduleLine.trim();
  return trimmedLine.startsWith('/** ') && trimmedLine.endsWith(' */');
}

function isGeneratedOnlyLine(moduleLine: string): boolean {
  const trimmedLine = moduleLine.trim();
  if (trimmedLine.length === 0) {
    return true;
  }

  return (
    trimmedLine.startsWith('import ') ||
    trimmedLine.startsWith('export const source = ') ||
    trimmedLine === 'export default { source, transform };' ||
    trimmedLine.startsWith('//# sourceMappingURL=')
  );
}

function encodeVlq(value: number): string {
  let remaining = value < 0 ? (-value << 1) + 1 : value << 1;
  let encoded = '';

  do {
    let digit = remaining & 31;
    remaining >>>= 5;
    if (remaining > 0) {
      digit |= 32;
    }
    encoded += BASE64_VLQ_DIGITS[digit] ?? '';
  } while (remaining > 0);

  return encoded;
}

const BASE64_VLQ_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
