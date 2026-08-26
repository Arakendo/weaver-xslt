import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { XMLSerializer, type Element } from '@xmldom/xmldom';

import {
  XsltProcessor,
  type XmlTraceEvent,
  type TransformCoverageWarning,
  type TransformOptions,
} from '../src/index.js';
import { composeStylesheetSourceFromFile } from '../src/processor/compile.js';
import { parseXml } from '../src/xml/parse.js';

interface AuditTarget {
  readonly fileName: string;
  readonly category: 'fallback-stub' | 'small-publication' | 'slowoutlier';
  readonly note: string;
}

interface ExecutionSummary {
  readonly ok: true;
  readonly elapsedMs: number;
  readonly outputLength: number;
  readonly outputMatchesExistingHtml: boolean | null;
  readonly execution?: unknown;
  readonly coverageWarnings: readonly TransformCoverageWarning[];
  readonly traceSummary?: TraceSummary;
}

interface ExecutionFailureSummary {
  readonly ok: false;
  readonly elapsedMs: number;
  readonly error: string;
  readonly traceSummary?: TraceSummary;
}

type ExecutionResultSummary = ExecutionSummary | ExecutionFailureSummary;

interface TargetReport {
  readonly fileName: string;
  readonly xmlPath: string;
  readonly existingHtmlPath: string | null;
  readonly category: AuditTarget['category'];
  readonly note: string;
  readonly interpreter: ExecutionResultSummary;
  readonly native: ExecutionResultSummary;
  readonly bundle: ExecutionResultSummary;
}

interface BundleModule {
  readonly source?: { readonly path?: string };
  readonly transform: (
    xml: string,
    ctx?: TransformOptions,
  ) => {
    readonly output: string;
    readonly execution?: unknown;
    readonly coverageWarnings?: readonly TransformCoverageWarning[];
  };
}

interface WorkerExecutionRequest {
  readonly xmlPath: string;
  readonly existingHtmlPath: string | null;
  readonly mode: 'interpreter' | 'native' | 'bundle';
  readonly traceSummaryPath?: string;
  readonly captureTraceSummary?: boolean;
  readonly refsLimit?: number;
  readonly brLimit?: number;
}

interface ChildExecutionPayload {
  readonly request: WorkerExecutionRequest;
  readonly result: ExecutionResultSummary;
}

interface TraceSummaryEntry {
  readonly key: string;
  readonly count: number;
}

interface TraceSummary {
  readonly totalEvents: number;
  readonly eventCounts: Readonly<Record<string, number>>;
  readonly topNodes: readonly TraceSummaryEntry[];
  readonly topTemplates: readonly TraceSummaryEntry[];
  readonly topInstructions: readonly TraceSummaryEntry[];
  readonly lastEvent?: string;
}

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TSX_CLI_PATH = resolve(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const STYLESHEET_PATH = resolve(
  REPO_ROOT,
  '.workbench',
  'vision xslts',
  'S1000D',
  'S1000D_main.xslt',
);
const BUNDLE_PATH = `${STYLESHEET_PATH}.bundle.js`;
const VALID_XML_ROOT = resolve(REPO_ROOT, '.workbench', 'S1000D', 'ValidXml', 'S1000D Issue 5.0');
const EXISTING_HTML_ROOT = resolve(REPO_ROOT, '.workbench', 'S1000D', 'bundle-output-full');

const SEEDED_TARGETS: readonly AuditTarget[] = [
  {
    fileName: 'DDN-S1000DBIKE-B6865-B6865-2019-00001.XML',
    category: 'fallback-stub',
    note: 'Audit candidate: unsupported DDN fallback shell.',
  },
  {
    fileName: 'DML-S1000DBIKE-B6865-S-2019-00001_001-00.XML',
    category: 'fallback-stub',
    note: 'Audit candidate: unsupported DML fallback shell.',
  },
  {
    fileName: 'PMC-S1000DBIKE-B6865-EPWG1-00_004-00_SX-US.XML',
    category: 'small-publication',
    note: 'Audit candidate: publication output is structurally valid but suspiciously small.',
  },
  {
    fileName: 'PMC-S1000DBIKE-B6865-LOAP1-00_004-00_SX-US.XML',
    category: 'small-publication',
    note: 'Audit candidate: publication shell may be missing expected sections.',
  },
  {
    fileName: 'DMC-S1000DBIKE-AAA-D00-00-00-00AA-024A-D_002-00_EN-US.XML',
    category: 'slowoutlier',
    note: 'Audit candidate: BREX transform exceeded the prior bundle timeout.',
  },
];

const args = process.argv.slice(2);
let format: 'json' | 'summary' = 'summary';
let filterCaseName: string | undefined;
let timeoutMs = 30_000;
let captureTraceSummary = false;
let refsLimit: number | undefined;
let brLimit: number | undefined;
let childMode = false;
let childXmlPath: string | undefined;
let childExistingHtmlPath: string | null = null;
let childExecutionMode: WorkerExecutionRequest['mode'] | undefined;
let childTraceSummaryPath: string | undefined;
let childCaptureTraceSummary = false;

for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === '--json') {
    format = 'json';
    continue;
  }

  if (argument === '--case') {
    filterCaseName = args[index + 1];
    index += 1;
    continue;
  }

  if (argument === '--timeout-ms') {
    timeoutMs = parseTimeoutArgument(args[index + 1]);
    index += 1;
    continue;
  }

  if (argument === '--trace-summary') {
    captureTraceSummary = true;
    continue;
  }

  if (argument === '--refs-limit') {
    refsLimit = parseLimitArgument(args[index + 1], '--refs-limit');
    index += 1;
    continue;
  }

  if (argument === '--br-limit') {
    brLimit = parseLimitArgument(args[index + 1], '--br-limit');
    index += 1;
    continue;
  }

  if (argument === '--child-mode') {
    childMode = true;
    continue;
  }

  if (argument === '--child-xml-path') {
    childXmlPath = args[index + 1];
    index += 1;
    continue;
  }

  if (argument === '--child-existing-html-path') {
    childExistingHtmlPath = args[index + 1] ?? null;
    index += 1;
    continue;
  }

  if (argument === '--child-mode-name') {
    const value = args[index + 1];
    if (value !== 'interpreter' && value !== 'native' && value !== 'bundle') {
      throw new Error(`Unsupported child mode ${JSON.stringify(value)}.`);
    }
    childExecutionMode = value;
    index += 1;
    continue;
  }

  if (argument === '--child-trace-summary-path') {
    childTraceSummaryPath = args[index + 1];
    index += 1;
    continue;
  }

  if (argument === '--child-trace-summary') {
    childCaptureTraceSummary = true;
    continue;
  }

  throw new Error(`Unknown argument: ${argument}`);
}

if (childMode) {
  if (childXmlPath === undefined || childExecutionMode === undefined) {
    throw new Error('Child mode requires --child-xml-path and --child-mode-name.');
  }

  await runChildMode({
    xmlPath: childXmlPath,
    existingHtmlPath: childExistingHtmlPath,
    mode: childExecutionMode,
    ...(childTraceSummaryPath === undefined ? {} : { traceSummaryPath: childTraceSummaryPath }),
    captureTraceSummary: childCaptureTraceSummary,
    ...(refsLimit === undefined ? {} : { refsLimit }),
    ...(brLimit === undefined ? {} : { brLimit }),
  });
  process.exit(0);
}

assertRequiredFile(STYLESHEET_PATH, 'stylesheet');
assertRequiredFile(BUNDLE_PATH, 'bundle');
assertRequiredFile(TSX_CLI_PATH, 'tsx cli');

const stylesheetXml = composeStylesheetSourceFromFile(STYLESHEET_PATH);
const processor = new XsltProcessor(stylesheetXml, { sourceName: STYLESHEET_PATH });
const bundleModule = (await import(pathToFileURL(BUNDLE_PATH).href)) as BundleModule;
const bundleBaseUri = bundleModule.source?.path ?? STYLESHEET_PATH;

const selectedTargets = SEEDED_TARGETS.filter((target) =>
  filterCaseName === undefined ? true : target.fileName === filterCaseName,
);

if (selectedTargets.length === 0) {
  throw new Error(`No seeded S1000D triage case matched ${JSON.stringify(filterCaseName)}.`);
}

const reports: TargetReport[] = [];
for (const target of selectedTargets) {
  reports.push(await createTargetReport(target));
}

if (format === 'json') {
  console.log(
    JSON.stringify(
      {
        stylesheetPath: STYLESHEET_PATH,
        bundlePath: BUNDLE_PATH,
        reports,
      },
      null,
      2,
    ),
  );
} else {
  console.log(formatSummary(reports));
}

async function createTargetReport(target: AuditTarget): Promise<TargetReport> {
  const xmlPath = resolve(VALID_XML_ROOT, target.fileName);
  assertRequiredFile(xmlPath, 'source XML');

  const existingHtmlPath = resolve(EXISTING_HTML_ROOT, `${basename(target.fileName, '.XML')}.html`);
  const existingHtml = existsSync(existingHtmlPath) ? readFileSync(existingHtmlPath, 'utf8') : null;
  const interpreter = await executeModeWithTimeout({
    xmlPath,
    existingHtmlPath: existingHtml === null ? null : existingHtmlPath,
    mode: 'interpreter',
    captureTraceSummary,
    ...(refsLimit === undefined ? {} : { refsLimit }),
    ...(brLimit === undefined ? {} : { brLimit }),
  });
  const native = await executeModeWithTimeout({
    xmlPath,
    existingHtmlPath: existingHtml === null ? null : existingHtmlPath,
    mode: 'native',
    captureTraceSummary,
    ...(refsLimit === undefined ? {} : { refsLimit }),
    ...(brLimit === undefined ? {} : { brLimit }),
  });
  const bundle = await executeModeWithTimeout({
    xmlPath,
    existingHtmlPath: existingHtml === null ? null : existingHtmlPath,
    mode: 'bundle',
    captureTraceSummary,
    ...(refsLimit === undefined ? {} : { refsLimit }),
    ...(brLimit === undefined ? {} : { brLimit }),
  });

  return {
    fileName: target.fileName,
    xmlPath,
    existingHtmlPath: existingHtml === null ? null : existingHtmlPath,
    category: target.category,
    note: target.note,
    interpreter,
    native,
    bundle,
  };
}

async function executeModeWithTimeout(
  request: WorkerExecutionRequest,
): Promise<ExecutionResultSummary> {
  const traceSummaryDir =
    request.captureTraceSummary === true
      ? mkdtempSync(join(tmpdir(), 'weaver-s1000d-'))
      : undefined;
  const traceSummaryPath =
    traceSummaryDir === undefined
      ? undefined
      : join(traceSummaryDir, `${request.mode}.trace-summary.json`);

  try {
    const stdout = execFileSync(
      process.execPath,
      createChildCommandArgs({
        ...request,
        ...(traceSummaryPath === undefined ? {} : { traceSummaryPath }),
      }),
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeoutMs,
      },
    );
    const payload = JSON.parse(stdout) as ChildExecutionPayload;
    return mergeTraceSummary(payload.result, readTraceSummary(traceSummaryPath));
  } catch (error) {
    return mergeTraceSummary(
      createTimedExecutionFailure(error, timeoutMs),
      readTraceSummary(traceSummaryPath),
    );
  } finally {
    if (traceSummaryDir !== undefined) {
      rmSync(traceSummaryDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 25 });
    }
  }
}

async function runChildMode(request: WorkerExecutionRequest): Promise<void> {
  const sourceXml = limitDocumentIfRequested(
    readFileSync(request.xmlPath, 'utf8'),
    request.refsLimit,
    request.brLimit,
  );
  const existingHtml =
    request.existingHtmlPath !== null && existsSync(request.existingHtmlPath)
      ? readFileSync(request.existingHtmlPath, 'utf8')
      : null;
  const coverageOptions: TransformOptions = {
    coverage: {
      report: true,
      minConfidence: 'high',
    },
  };

  const workerStylesheetXml = composeStylesheetSourceFromFile(STYLESHEET_PATH);
  const workerProcessor = new XsltProcessor(workerStylesheetXml, { sourceName: STYLESHEET_PATH });
  const workerBundleModule = (await import(pathToFileURL(BUNDLE_PATH).href)) as BundleModule;
  const workerBundleBaseUri = workerBundleModule.source?.path ?? STYLESHEET_PATH;
  const traceCollector = request.captureTraceSummary
    ? createTraceCollector(request.traceSummaryPath)
    : undefined;
  const traceOptions =
    traceCollector === undefined
      ? undefined
      : ({
          trace: {
            documentUri: request.xmlPath,
            onEvent: (event: XmlTraceEvent) => {
              traceCollector.record(event);
            },
          },
        } satisfies Pick<TransformOptions, 'trace'>);

  const result = executeMode(() => {
    if (request.mode === 'bundle') {
      return workerBundleModule.transform(sourceXml, {
        ...coverageOptions,
        ...(traceOptions ?? {}),
        baseUri: workerBundleBaseUri,
      });
    }

    return workerProcessor.transform(sourceXml, {
      ...coverageOptions,
      ...(traceOptions ?? {}),
      execution: request.mode,
    });
  }, existingHtml);

  traceCollector?.flush();

  console.log(JSON.stringify({ request, result } satisfies ChildExecutionPayload));
}

function executeMode(
  run: () => {
    readonly output: string;
    readonly execution?: unknown;
    readonly coverageWarnings?: readonly TransformCoverageWarning[];
  },
  existingHtml: string | null,
): ExecutionResultSummary {
  const start = performance.now();

  try {
    const result = run();
    return {
      ok: true,
      elapsedMs: performance.now() - start,
      outputLength: result.output.length,
      outputMatchesExistingHtml: existingHtml === null ? null : result.output === existingHtml,
      ...(result.execution === undefined ? {} : { execution: result.execution }),
      coverageWarnings: result.coverageWarnings ?? [],
    };
  } catch (error) {
    return {
      ok: false,
      elapsedMs: performance.now() - start,
      error: formatError(error),
    };
  }
}

function formatSummary(reports: readonly TargetReport[]): string {
  return reports.map(formatTargetSummary).join('\n\n');
}

function formatTargetSummary(report: TargetReport): string {
  return [
    `${report.fileName} [${report.category}]`,
    `  note: ${report.note}`,
    `  xml: ${report.xmlPath}`,
    `  existing html: ${report.existingHtmlPath ?? 'missing'}`,
    `  interpreter: ${formatExecutionSummary(report.interpreter)}`,
    `  native: ${formatExecutionSummary(report.native)}`,
    `  bundle: ${formatExecutionSummary(report.bundle)}`,
  ].join('\n');
}

function formatExecutionSummary(result: ExecutionResultSummary): string {
  if (!result.ok) {
    return [
      `ERROR in ${formatMilliseconds(result.elapsedMs)} :: ${result.error}`,
      formatTraceSummary(result.traceSummary),
    ]
      .filter((part) => part.length > 0)
      .join(' | ');
  }

  return [
    `${formatMilliseconds(result.elapsedMs)}`,
    `${result.outputLength} chars`,
    `matchesExisting=${formatExistingMatch(result.outputMatchesExistingHtml)}`,
    `coverageWarnings=${result.coverageWarnings.length}`,
    formatTraceSummary(result.traceSummary),
  ]
    .filter((part) => part.length > 0)
    .join(' | ');
}

function formatTraceSummary(traceSummary: TraceSummary | undefined): string {
  if (traceSummary === undefined) {
    return '';
  }

  const topTemplate = traceSummary.topTemplates[0];
  const topInstruction = traceSummary.topInstructions[0];
  const topNode = traceSummary.topNodes[0];
  return [
    `traceEvents=${traceSummary.totalEvents}`,
    ...(topNode === undefined ? [] : [`hotNode=${JSON.stringify(topNode.key)} x${topNode.count}`]),
    ...(topTemplate === undefined
      ? []
      : [`hotTemplate=${JSON.stringify(topTemplate.key)} x${topTemplate.count}`]),
    ...(topInstruction === undefined
      ? []
      : [`hotInstruction=${JSON.stringify(topInstruction.key)} x${topInstruction.count}`]),
    ...(traceSummary.lastEvent === undefined
      ? []
      : [`lastEvent=${JSON.stringify(traceSummary.lastEvent)}`]),
  ].join(' | ');
}

function formatExistingMatch(value: boolean | null): string {
  if (value === null) {
    return 'n/a';
  }

  return value ? 'yes' : 'no';
}

function formatMilliseconds(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }

  return `${value.toFixed(1)}ms`;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function parseTimeoutArgument(raw: string | undefined): number {
  if (raw === undefined) {
    throw new Error('--timeout-ms requires a numeric value.');
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--timeout-ms requires a positive finite number, got ${JSON.stringify(raw)}.`);
  }

  return Math.floor(value);
}

function parseLimitArgument(raw: string | undefined, flagName: string): number {
  if (raw === undefined) {
    throw new Error(`${flagName} requires a numeric value.`);
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flagName} requires a positive integer, got ${JSON.stringify(raw)}.`);
  }

  return value;
}

function limitDocumentIfRequested(
  sourceXml: string,
  refsLimitValue: number | undefined,
  brLimitValue: number | undefined,
): string {
  if (refsLimitValue === undefined && brLimitValue === undefined) {
    return sourceXml;
  }

  const document = parseXml(sourceXml, { role: 'source-document', sourceName: '<triage-input>' });
  const content = findDirectChildElement(document.documentElement, 'content');
  if (content !== undefined) {
    if (refsLimitValue !== undefined) {
      trimDirectChildElements(content, 'refs', refsLimitValue);
    }

    if (brLimitValue !== undefined) {
      const brDoc = findDirectChildElement(content, 'brDoc');
      const brDocRoot =
        brDoc === undefined ? undefined : findDirectChildElement(brDoc, 'brLevelledPara');
      if (brDocRoot !== undefined) {
        trimDirectChildren(brDocRoot, brLimitValue);
      }
    }
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(document);
}

function trimDirectChildElements(parent: Element, childLocalName: string, limit: number): void {
  const child = findDirectChildElement(parent, childLocalName);
  if (child === undefined) {
    return;
  }

  trimDirectChildren(child, limit);
}

function trimDirectChildren(parent: Element, limit: number): void {
  let kept = 0;
  for (let index = parent.childNodes.length - 1; index >= 0; index -= 1) {
    const child = parent.childNodes.item(index);
    if (child === null || child.nodeType !== 1) {
      continue;
    }

    kept += 1;
    if (kept > limit) {
      parent.removeChild(child);
    }
  }
}

function findDirectChildElement(parent: Element, localName: string): Element | undefined {
  for (let index = 0; index < parent.childNodes.length; index += 1) {
    const child = parent.childNodes.item(index);
    if (child !== null && child.nodeType === 1 && (child as Element).tagName === localName) {
      return child as Element;
    }
  }

  return undefined;
}

function createChildCommandArgs(request: WorkerExecutionRequest): string[] {
  return [
    TSX_CLI_PATH,
    'scripts/s1000d-triage.ts',
    '--child-mode',
    '--child-xml-path',
    request.xmlPath,
    '--child-mode-name',
    request.mode,
    ...(request.existingHtmlPath === null
      ? []
      : ['--child-existing-html-path', request.existingHtmlPath]),
    ...(request.traceSummaryPath === undefined
      ? []
      : ['--child-trace-summary-path', request.traceSummaryPath]),
    ...(request.captureTraceSummary === true ? ['--child-trace-summary'] : []),
    ...(request.refsLimit === undefined ? [] : ['--refs-limit', String(request.refsLimit)]),
    ...(request.brLimit === undefined ? [] : ['--br-limit', String(request.brLimit)]),
  ];
}

function createTimedExecutionFailure(
  error: unknown,
  timeoutMilliseconds: number,
): ExecutionResultSummary {
  if (isExecTimeoutError(error)) {
    return {
      ok: false,
      elapsedMs: timeoutMilliseconds,
      error: `Timeout: exceeded ${timeoutMilliseconds} ms`,
    };
  }

  return {
    ok: false,
    elapsedMs: 0,
    error: formatError(error),
  };
}

function isExecTimeoutError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ((error as NodeJS.ErrnoException).code === 'ETIMEDOUT' ||
      (error as NodeJS.ErrnoException).signal === 'SIGTERM')
  );
}

function readTraceSummary(traceSummaryPath: string | undefined): TraceSummary | undefined {
  if (traceSummaryPath === undefined || !existsSync(traceSummaryPath)) {
    return undefined;
  }

  return JSON.parse(readFileSync(traceSummaryPath, 'utf8')) as TraceSummary;
}

function mergeTraceSummary(
  result: ExecutionResultSummary,
  traceSummary: TraceSummary | undefined,
): ExecutionResultSummary {
  if (traceSummary === undefined) {
    return result;
  }

  return {
    ...result,
    traceSummary,
  };
}

function createTraceCollector(traceSummaryPath: string | undefined): {
  record(event: XmlTraceEvent): void;
  flush(): void;
} {
  const eventCounts = new Map<string, number>();
  const nodeCounts = new Map<string, number>();
  const templateCounts = new Map<string, number>();
  const instructionCounts = new Map<string, number>();
  let totalEvents = 0;
  let lastEvent: string | undefined;
  let lastFlushTime = performance.now();

  const snapshot = (): TraceSummary => ({
    totalEvents,
    eventCounts: Object.fromEntries(
      [...eventCounts.entries()].sort(([left], [right]) => left.localeCompare(right)),
    ),
    topNodes: topEntries(nodeCounts),
    topTemplates: topEntries(templateCounts),
    topInstructions: topEntries(instructionCounts),
    ...(lastEvent === undefined ? {} : { lastEvent }),
  });

  const writeSnapshot = (): void => {
    if (traceSummaryPath === undefined) {
      return;
    }

    writeFileSync(traceSummaryPath, JSON.stringify(snapshot(), null, 2), 'utf8');
  };

  return {
    record(event: XmlTraceEvent): void {
      totalEvents += 1;
      eventCounts.set(event.kind, (eventCounts.get(event.kind) ?? 0) + 1);
      nodeCounts.set(event.node.path, (nodeCounts.get(event.node.path) ?? 0) + 1);

      if (event.template?.match !== undefined || event.template?.name !== undefined) {
        const templateKey = event.template.match ?? `name:${event.template.name}`;
        templateCounts.set(templateKey, (templateCounts.get(templateKey) ?? 0) + 1);
      }

      if (event.instruction?.kind !== undefined) {
        instructionCounts.set(
          event.instruction.kind,
          (instructionCounts.get(event.instruction.kind) ?? 0) + 1,
        );
      }

      lastEvent = `${event.kind}:${event.node.path}`;
      const now = performance.now();
      if (totalEvents <= 25 || totalEvents % 50 === 0 || now - lastFlushTime >= 250) {
        writeSnapshot();
        lastFlushTime = now;
      }
    },
    flush(): void {
      writeSnapshot();
    },
  };
}

function topEntries(counts: ReadonlyMap<string, number>): readonly TraceSummaryEntry[] {
  return [...counts.entries()]
    .sort((left, right) => {
      if (left[1] !== right[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, 5)
    .map(([key, count]) => ({ key, count }));
}

function assertRequiredFile(filePath: string, label: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${label} at ${filePath}`);
  }
}
