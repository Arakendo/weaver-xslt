import type { DiagnosticReport } from './report.js';

export function formatDiagnostic(report: DiagnosticReport, sourceText?: string): string {
  const header = `${report.severity}[${report.code}]: ${report.message}`;
  if (report.primary === undefined || sourceText === undefined) {
    return [header, ...formatDetails(report)].join('\n');
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
    ...formatDetails(report),
  ].join('\n');
}

function formatDetails(report: DiagnosticReport): string[] {
  return report.details.map((detail) => `  = ${detail.key}: ${String(detail.value)}`);
}
