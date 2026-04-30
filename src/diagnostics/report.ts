import { XdmError, type ErrorSuggestion, type RelatedLocation, type SourceLocation } from '../errors/XdmError.js';

export type DiagnosticPhase = 'compile' | 'runtime' | 'serialization' | 'codegen' | 'internal';

export type DiagnosticSeverity = 'error' | 'warning' | 'note';

export type DiagnosticCategory =
  | 'syntax'
  | 'type'
  | 'resolution'
  | 'analysis'
  | 'execution'
  | 'serialization'
  | 'internal';

export interface SourceSpan {
  readonly uri?: string;
  readonly offsetStart: number;
  readonly offsetEnd: number;
  readonly lineStart: number;
  readonly columnStart: number;
  readonly lineEnd: number;
  readonly columnEnd: number;
}

export interface RelatedSpan {
  readonly label: string;
  readonly span: SourceSpan;
}

export interface DiagnosticFrame {
  readonly kind: 'template' | 'instruction' | 'xpath' | 'function' | 'mode';
  readonly label: string;
  readonly span?: SourceSpan;
}

export interface DiagnosticDetail {
  readonly key: string;
  readonly value: string | number | boolean;
}

export interface DiagnosticSuggestion {
  readonly kind: 'fix' | 'hint' | 'alternative';
  readonly label: string;
  readonly replacement?: string;
  readonly confidence?: number;
}

export interface DiagnosticReport {
  readonly code: string;
  readonly phase: DiagnosticPhase;
  readonly severity: DiagnosticSeverity;
  readonly category: DiagnosticCategory;
  readonly message: string;
  readonly primary?: SourceSpan;
  readonly related: readonly RelatedSpan[];
  readonly frames: readonly DiagnosticFrame[];
  readonly details: readonly DiagnosticDetail[];
  readonly suggestions: readonly DiagnosticSuggestion[];
  readonly causes: readonly DiagnosticReport[];
}

export function diagnosticReportFromError(error: unknown): DiagnosticReport {
  if (!(error instanceof XdmError)) {
    const report: DiagnosticReport = {
      code: 'WEAVER_INTERNAL_UNKNOWN',
      phase: 'internal',
      severity: 'error',
      category: 'internal',
      message: error instanceof Error ? error.message : String(error),
      related: [],
      frames: [],
      details: [],
      suggestions: [],
      causes: [],
    };
    return report;
  }

  const primary = toSourceSpan(error.location);
  const report: DiagnosticReport = {
    code: error.code,
    phase: classifyPhase(error.code),
    severity: 'error',
    category: classifyCategory(error.code),
    message: error.detailMessage,
    related: toRelatedSpans(error.related, error.frames),
    frames: error.frames.map((frame) => toDiagnosticFrame(frame)),
    details: toDiagnosticDetails(error.details),
    suggestions: toDiagnosticSuggestions(error.suggestions),
    causes: error.causes.map((cause) => diagnosticReportFromError(cause)),
  };

  if (primary !== undefined) {
    return { ...report, primary };
  }

  return report;
}

export function assertValidDiagnostic(report: DiagnosticReport): void {
  if (report.code.length === 0) {
    throw new Error('Diagnostic code must be non-empty.');
  }

  const detailKeys = new Set<string>();
  for (const detail of report.details) {
    if (detail.key.length === 0) {
      throw new Error('Diagnostic detail keys must be non-empty.');
    }
    if (detailKeys.has(detail.key)) {
      throw new Error(`Duplicate diagnostic detail key ${detail.key}.`);
    }
    detailKeys.add(detail.key);
  }

  assertRequiredDetails(report, detailKeys);

  if (report.primary !== undefined) {
    assertValidSpan(report.primary);
  }

  for (const related of report.related) {
    assertValidSpan(related.span);
  }

  for (const frame of report.frames) {
    if (frame.span !== undefined) {
      assertValidSpan(frame.span);
    }
  }

  for (const cause of report.causes) {
    assertValidDiagnostic(cause);
  }
}

const REQUIRED_DETAIL_KEYS: Readonly<Record<string, readonly string[]>> = {
  XPST0017: ['functionName', 'actualArity'],
  XPTY0004: ['expectedType', 'actualType'],
};

function classifyPhase(code: string): DiagnosticPhase {
  if (code.startsWith('XPST') || code.startsWith('XTSE')) {
    return 'compile';
  }
  if (code.startsWith('SENR') || code.startsWith('SERE')) {
    return 'serialization';
  }
  if (code.startsWith('WEAVER_CODEGEN')) {
    return 'codegen';
  }
  if (code.startsWith('XPDY') || code.startsWith('XPTY') || code.startsWith('XTDE') || code.startsWith('FO')) {
    return 'runtime';
  }
  return 'internal';
}

function classifyCategory(code: string): DiagnosticCategory {
  if (code === 'XPST0008') {
    return 'resolution';
  }
  if (code.startsWith('XPST')) {
    return 'syntax';
  }
  if (code.startsWith('XPTY')) {
    return 'type';
  }
  if (code.startsWith('XTSE')) {
    return 'analysis';
  }
  if (code.startsWith('SENR') || code.startsWith('SERE')) {
    return 'serialization';
  }
  if (code.startsWith('XPDY') || code.startsWith('XTDE') || code.startsWith('FO')) {
    return 'execution';
  }
  return 'internal';
}

function toSourceSpan(location: SourceLocation | undefined): SourceSpan | undefined {
  if (location?.line === undefined || location.column === undefined || location.offset === undefined) {
    return undefined;
  }

  return {
    ...(location.source !== undefined ? { uri: location.source } : {}),
    offsetStart: location.offset,
    offsetEnd: location.endOffset ?? location.offset + 1,
    lineStart: location.line,
    columnStart: location.column,
    lineEnd: location.endLine ?? location.line,
    columnEnd: location.endColumn ?? location.column + 1,
  };
}

function toDiagnosticDetails(details: XdmError['details']): readonly DiagnosticDetail[] {
  if (details === undefined) {
    return [];
  }

  return Object.entries(details).map(([key, value]) => ({ key, value }));
}

function toRelatedSpans(
  related: readonly RelatedLocation[],
  frames: XdmError['frames'],
): readonly RelatedSpan[] {
  const explicit = related.flatMap((entry) => {
    const span = toSourceSpan(entry.location);
    return span === undefined ? [] : [{ label: entry.label, span }];
  });

  const derived = frames.flatMap((frame) => {
    const span = toSourceSpan(frame.location);
    return span === undefined
      ? []
      : [{
          label: `${frame.kind} ${frame.label}`,
          span,
        }];
  });

  return dedupeRelatedSpans([...explicit, ...derived]);
}

function toDiagnosticSuggestions(suggestions: readonly ErrorSuggestion[]): readonly DiagnosticSuggestion[] {
  return suggestions.map((suggestion) => ({
    kind: suggestion.kind,
    label: suggestion.label,
    ...(suggestion.replacement === undefined ? {} : { replacement: suggestion.replacement }),
    ...(suggestion.confidence === undefined ? {} : { confidence: suggestion.confidence }),
  }));
}

function toDiagnosticFrame(frame: XdmError['frames'][number]): DiagnosticFrame {
  const span = toSourceSpan(frame.location);
  return span === undefined
    ? {
        kind: frame.kind,
        label: frame.label,
      }
    : {
        kind: frame.kind,
        label: frame.label,
        span,
      };
}

function dedupeRelatedSpans(related: readonly RelatedSpan[]): readonly RelatedSpan[] {
  const seen = new Set<string>();
  const deduped: RelatedSpan[] = [];

  for (const entry of related) {
    const key = [
      entry.span.uri ?? '',
      entry.span.offsetStart,
      entry.span.offsetEnd,
      entry.span.lineStart,
      entry.span.columnStart,
    ].join('|');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

function assertRequiredDetails(report: DiagnosticReport, detailKeys: ReadonlySet<string>): void {
  const requiredKeys = REQUIRED_DETAIL_KEYS[report.code];
  if (requiredKeys === undefined) {
    return;
  }

  for (const key of requiredKeys) {
    if (!detailKeys.has(key)) {
      throw new Error(`Diagnostic ${report.code} must include detail ${key}.`);
    }
  }
}

function assertValidSpan(span: SourceSpan): void {
  if (span.offsetEnd < span.offsetStart) {
    throw new Error('Diagnostic span offsetEnd must be >= offsetStart.');
  }
  if (span.lineEnd < span.lineStart) {
    throw new Error('Diagnostic span lineEnd must be >= lineStart.');
  }
  if (span.lineEnd === span.lineStart && span.columnEnd < span.columnStart) {
    throw new Error('Diagnostic span columnEnd must be >= columnStart on a single line.');
  }
}
