import { assertValidDiagnostic, diagnosticReportFromError, type DiagnosticReport } from './report.js';

export function formatDiagnostic(report: DiagnosticReport, sourceText?: string): string {
  assertValidDiagnostic(report);

  const header = `${report.severity}[${report.code}]: ${report.message}`;
  if (report.primary === undefined || sourceText === undefined) {
    return [header, ...formatFrames(report), ...formatRelated(report), ...formatDetails(report), ...formatSuggestions(report)].join('\n');
  }

  const lines = sourceText.split(/\r?\n/);
  const lineText = lines[report.primary.lineStart - 1] ?? '';
  const lineNumber = String(report.primary.lineStart);
  const gutterPadding = ' '.repeat(lineNumber.length);
  const caretPadding = ' '.repeat(Math.max(0, report.primary.columnStart - 1));
  const caretWidth = Math.max(
    1,
    report.primary.lineStart === report.primary.lineEnd
      ? report.primary.columnEnd - report.primary.columnStart
      : 1,
  );
  const location = `${report.primary.uri ?? '<unknown>'}:${report.primary.lineStart}:${report.primary.columnStart}`;

  return [
    header,
    `--> ${location}`,
    `${lineNumber} | ${lineText}`,
    `${gutterPadding} | ${caretPadding}${'^'.repeat(caretWidth)}`,
    ...formatFrames(report),
    ...formatRelated(report),
    ...formatDetails(report),
    ...formatSuggestions(report),
  ].join('\n');
}

export function formatDiagnostics(reports: readonly DiagnosticReport[], sourceText?: string): string {
  if (reports.length === 0) {
    return '';
  }

  return `${reports.map((report) => formatDiagnostic(report, sourceText)).join('\n')}\n`;
}

export function renderDiagnosticError(error: unknown, sourceText?: string): string {
  const report = diagnosticReportFromError(error);
  return sourceText === undefined ? report.message : formatDiagnostic(report, sourceText);
}

function formatFrames(report: DiagnosticReport): string[] {
  return report.frames.map((frame) => {
    if (frame.span === undefined) {
      return `  in ${frame.kind} ${frame.label}`;
    }

    return `  in ${frame.kind} ${frame.label} (${frame.span.uri ?? '<unknown>'}:${frame.span.lineStart}:${frame.span.columnStart})`;
  });
}

function formatRelated(report: DiagnosticReport): string[] {
  if (report.related.length === 0) {
    return [];
  }

  return [
    'related:',
    ...report.related.map((related) => `  ${related.label} (${related.span.uri ?? '<unknown>'}:${related.span.lineStart}:${related.span.columnStart})`),
  ];
}

function formatDetails(report: DiagnosticReport): string[] {
  return report.details.map((detail) => `  = ${detail.key}: ${String(detail.value)}`);
}

function formatSuggestions(report: DiagnosticReport): string[] {
  return report.suggestions.map((suggestion) => {
    const prefix = suggestion.kind === 'fix' ? 'help' : suggestion.kind;
    return `  ${prefix}: ${suggestion.label}`;
  });
}
