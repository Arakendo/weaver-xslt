import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  compileStylesheetArtifactsFromFile,
  summarizeComposedStylesheetFromFile,
} from '../src/compile.js';
import { createSyntheticBenchmarkFixture } from './benchmark-fixtures.js';

type CompileProfile = NonNullable<ReturnType<typeof compileStylesheetArtifactsFromFile>['profile']>;
type CompileIrStats = NonNullable<ReturnType<typeof compileStylesheetArtifactsFromFile>['irStats']>;

interface BenchmarkResult {
  readonly stylesheetPath: string;
  readonly elapsedMs: number;
  readonly moduleBytes: number;
  readonly declarationBytes: number;
  readonly diagnostics: number;
  readonly profile: ReturnType<typeof compileStylesheetArtifactsFromFile>['profile'];
  readonly irStats: ReturnType<typeof compileStylesheetArtifactsFromFile>['irStats'];
}

interface BenchmarkWithCompositionResult extends BenchmarkResult {
  readonly compositionSummary: ReturnType<typeof summarizeComposedStylesheetFromFile>;
}

const args = process.argv.slice(2);
let outputPath: string | undefined;
let includeCompositionSummary = false;
let printSummary = false;
let syntheticFixtureName: string | undefined;
let failIfTotalMs: number | undefined;
let failIfCompileIrMs: number | undefined;
let failIfLowerTemplateMs: number | undefined;
let failIfTemplateRulesOver: number | undefined;
let failIfXPathParsesOver: number | undefined;
let failIfDroppedDuplicatesBelow: number | undefined;
const stylesheetArgs: string[] = [];

for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === '--out') {
    outputPath = args[index + 1];
    index += 1;
    continue;
  }

  if (argument === '--compose-summary') {
    includeCompositionSummary = true;
    continue;
  }

  if (argument === '--summary') {
    printSummary = true;
    continue;
  }

  if (argument === '--synthetic') {
    syntheticFixtureName = args[index + 1];
    index += 1;
    continue;
  }

  if (argument === '--fail-if-total-ms') {
    failIfTotalMs = parseRequiredNumberFlag(argument, args[index + 1]);
    index += 1;
    continue;
  }

  if (argument === '--fail-if-compile-ir-ms') {
    failIfCompileIrMs = parseRequiredNumberFlag(argument, args[index + 1]);
    index += 1;
    continue;
  }

  if (argument === '--fail-if-lower-template-ms') {
    failIfLowerTemplateMs = parseRequiredNumberFlag(argument, args[index + 1]);
    index += 1;
    continue;
  }

  if (argument === '--fail-if-template-rules-over') {
    failIfTemplateRulesOver = parseRequiredNumberFlag(argument, args[index + 1]);
    index += 1;
    continue;
  }

  if (argument === '--fail-if-xpath-parses-over') {
    failIfXPathParsesOver = parseRequiredNumberFlag(argument, args[index + 1]);
    index += 1;
    continue;
  }

  if (argument === '--fail-if-dropped-duplicates-below') {
    failIfDroppedDuplicatesBelow = parseRequiredNumberFlag(argument, args[index + 1]);
    index += 1;
    continue;
  }

  stylesheetArgs.push(argument);
}

if (stylesheetArgs.length === 0 && syntheticFixtureName === undefined) {
  console.error(
    'usage: npx tsx scripts/benchmark-compile.ts [--synthetic name] [--compose-summary] [--summary] [--out report.json] [--fail-if-total-ms N] [--fail-if-compile-ir-ms N] [--fail-if-lower-template-ms N] [--fail-if-template-rules-over N] [--fail-if-xpath-parses-over N] [--fail-if-dropped-duplicates-below N] <stylesheet-path> [more paths...]',
  );
  process.exit(1);
}

const syntheticFixture =
  syntheticFixtureName === undefined
    ? undefined
    : createSyntheticBenchmarkFixture(syntheticFixtureName);
const benchmarkTargets =
  syntheticFixture === undefined ? stylesheetArgs : [...syntheticFixture.stylesheetPaths];

try {
  const benchmarkResults: Array<BenchmarkResult | BenchmarkWithCompositionResult> =
    benchmarkTargets.map((stylesheetArg) => {
      const stylesheetPath = resolve(stylesheetArg);
      const compositionSummary = includeCompositionSummary
        ? summarizeComposedStylesheetFromFile(stylesheetPath)
        : undefined;
      const start = performance.now();
      const artifacts = compileStylesheetArtifactsFromFile(stylesheetPath, {
        captureProfile: true,
        captureIrStats: true,
      });
      const elapsedMs = performance.now() - start;

      return {
        stylesheetPath,
        elapsedMs,
        moduleBytes: artifacts.module.length,
        declarationBytes: artifacts.declaration.length,
        diagnostics: artifacts.diagnostics.length,
        profile: artifacts.profile,
        irStats: artifacts.irStats,
        ...(compositionSummary === undefined ? {} : { compositionSummary }),
      };
    });

  const output = JSON.stringify(
    benchmarkResults.length === 1 ? benchmarkResults[0] : benchmarkResults,
    null,
    2,
  );

  if (printSummary) {
    console.log(formatSummary(benchmarkResults));
  } else {
    console.log(output);
  }

  if (outputPath !== undefined) {
    const resolvedOutputPath = resolve(outputPath);
    mkdirSync(dirname(resolvedOutputPath), { recursive: true });
    writeFileSync(resolvedOutputPath, output);
  }

  const failures = collectFailures(benchmarkResults, {
    failIfTotalMs,
    failIfCompileIrMs,
    failIfLowerTemplateMs,
    failIfTemplateRulesOver,
    failIfXPathParsesOver,
    failIfDroppedDuplicatesBelow,
  });

  if (failures.length > 0) {
    console.error('Benchmark thresholds failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  }
} finally {
  for (const cleanupDir of syntheticFixture?.cleanupDirs ?? []) {
    rmSync(cleanupDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

function parseRequiredNumberFlag(flagName: string, value: string | undefined): number {
  if (value === undefined) {
    throw new Error(`${flagName} requires a numeric value.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flagName} requires a finite numeric value, got ${JSON.stringify(value)}.`);
  }

  return parsed;
}

function formatSummary(
  results: readonly Array<BenchmarkResult | BenchmarkWithCompositionResult>,
): string {
  return results.map(formatSingleSummary).join('\n\n');
}

function formatSingleSummary(result: BenchmarkResult | BenchmarkWithCompositionResult): string {
  const profile = result.profile;
  const irStats = result.irStats;
  const compileIrMs = getPhaseElapsedMs(profile, 'compileIr');
  const lowerTemplateMs = getCompileIrPhaseElapsedMs(irStats, 'lowerTemplateDeclarations');
  const hottestTemplate = irStats?.hottestTemplateKeys[0];
  const slowestTemplate = irStats?.slowestTemplates[0];
  const compositionSummary = 'compositionSummary' in result ? result.compositionSummary : undefined;
  const topDuplicate = compositionSummary?.duplicateSummaries[0];

  return [
    `Stylesheet: ${result.stylesheetPath}`,
    `Total: ${formatMilliseconds(result.elapsedMs)} | compileIr: ${formatMilliseconds(compileIrMs)} | lowerTemplates: ${formatMilliseconds(lowerTemplateMs)}`,
    `Templates: ${formatCount(irStats?.templateRuleCount)} | XPath parses: ${formatCount(irStats?.xpathParseCount)} | Diagnostics: ${result.diagnostics}`,
    `Artifacts: module ${formatBytes(result.moduleBytes)} | declaration ${formatBytes(result.declarationBytes)}`,
    hottestTemplate === undefined
      ? 'Hottest template key: n/a'
      : `Hottest template key: ${hottestTemplate.key} (${formatMilliseconds(hottestTemplate.totalElapsedMs)} total across ${hottestTemplate.invocationCount})`,
    slowestTemplate === undefined
      ? 'Slowest template: n/a'
      : `Slowest template: ${slowestTemplate.key} (${formatMilliseconds(slowestTemplate.elapsedMs)})`,
    compositionSummary === undefined
      ? 'Composition summary: not requested'
      : `Composition summary: dropped ${compositionSummary.droppedDuplicateEntries} duplicate entries${topDuplicate === undefined ? '' : `; top duplicate ${topDuplicate.key} (${topDuplicate.occurrencesBeforePrune} -> ${topDuplicate.occurrencesAfterPrune})`}`,
  ].join('\n');
}

function formatMilliseconds(value: number | undefined): string {
  if (value === undefined) {
    return 'n/a';
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }

  return `${value.toFixed(1)}ms`;
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${value} B`;
}

function formatCount(value: number | undefined): string {
  return value === undefined ? 'n/a' : value.toLocaleString('en-US');
}

function getPhaseElapsedMs(profile: CompileProfile | undefined, key: string): number | undefined {
  return profile?.phases.find((phase) => phase.key === key)?.elapsedMs;
}

function getCompileIrPhaseElapsedMs(
  irStats: CompileIrStats | undefined,
  key: string,
): number | undefined {
  return irStats?.compilePhases.find((phase) => phase.key === key)?.elapsedMs;
}

function collectFailures(
  results: readonly Array<BenchmarkResult | BenchmarkWithCompositionResult>,
  thresholds: {
    readonly failIfTotalMs?: number;
    readonly failIfCompileIrMs?: number;
    readonly failIfLowerTemplateMs?: number;
    readonly failIfTemplateRulesOver?: number;
    readonly failIfXPathParsesOver?: number;
    readonly failIfDroppedDuplicatesBelow?: number;
  },
): string[] {
  const failures: string[] = [];

  for (const result of results) {
    const label = result.stylesheetPath;
    const compileIrMs = getPhaseElapsedMs(result.profile, 'compileIr');
    const lowerTemplateMs = getCompileIrPhaseElapsedMs(result.irStats, 'lowerTemplateDeclarations');
    const templateRuleCount = result.irStats?.templateRuleCount;
    const xpathParseCount = result.irStats?.xpathParseCount;
    const droppedDuplicateEntries =
      'compositionSummary' in result
        ? result.compositionSummary.droppedDuplicateEntries
        : undefined;

    maybePushFailure(
      failures,
      thresholds.failIfTotalMs,
      result.elapsedMs,
      `${label}: total ${formatMilliseconds(result.elapsedMs)} exceeded limit ${formatMilliseconds(thresholds.failIfTotalMs)}`,
    );
    maybePushFailure(
      failures,
      thresholds.failIfCompileIrMs,
      compileIrMs,
      `${label}: compileIr ${formatMilliseconds(compileIrMs)} exceeded limit ${formatMilliseconds(thresholds.failIfCompileIrMs)}`,
    );
    maybePushFailure(
      failures,
      thresholds.failIfLowerTemplateMs,
      lowerTemplateMs,
      `${label}: lowerTemplateDeclarations ${formatMilliseconds(lowerTemplateMs)} exceeded limit ${formatMilliseconds(thresholds.failIfLowerTemplateMs)}`,
    );
    maybePushCountFailure(
      failures,
      thresholds.failIfTemplateRulesOver,
      templateRuleCount,
      `${label}: template rules ${formatCount(templateRuleCount)} exceeded limit ${formatCount(thresholds.failIfTemplateRulesOver)}`,
    );
    maybePushCountFailure(
      failures,
      thresholds.failIfXPathParsesOver,
      xpathParseCount,
      `${label}: XPath parses ${formatCount(xpathParseCount)} exceeded limit ${formatCount(thresholds.failIfXPathParsesOver)}`,
    );
    maybePushMinimumCountFailure(
      failures,
      thresholds.failIfDroppedDuplicatesBelow,
      droppedDuplicateEntries,
      `${label}: dropped duplicate entries ${formatCount(droppedDuplicateEntries)} was below required minimum ${formatCount(thresholds.failIfDroppedDuplicatesBelow)}`,
    );
  }

  return failures;
}

function maybePushFailure(
  failures: string[],
  threshold: number | undefined,
  actual: number | undefined,
  message: string,
): void {
  if (threshold !== undefined && actual !== undefined && actual > threshold) {
    failures.push(message);
  }
}

function maybePushCountFailure(
  failures: string[],
  threshold: number | undefined,
  actual: number | undefined,
  message: string,
): void {
  if (threshold === undefined || actual === undefined) {
    return;
  }

  if (actual > threshold) {
    failures.push(message);
  }
}

function maybePushMinimumCountFailure(
  failures: string[],
  threshold: number | undefined,
  actual: number | undefined,
  message: string,
): void {
  if (threshold === undefined || actual === undefined) {
    return;
  }

  if (actual < threshold) {
    failures.push(message);
  }
}
