import { assertValidDiagnostic, type DiagnosticReport } from './report.js';

export type JsonDiagnosticReport = DiagnosticReport;

export function projectDiagnosticReport(report: DiagnosticReport): JsonDiagnosticReport {
  assertValidDiagnostic(report);

  return {
    code: report.code,
    phase: report.phase,
    severity: report.severity,
    category: report.category,
    message: report.message,
    ...(report.primary === undefined ? {} : { primary: { ...report.primary } }),
    related: report.related.map((related) => ({
      label: related.label,
      span: { ...related.span },
    })),
    frames: report.frames.map((frame) => ({
      kind: frame.kind,
      label: frame.label,
      ...(frame.span === undefined ? {} : { span: { ...frame.span } }),
    })),
    details: report.details.map((detail) => ({ ...detail })),
    suggestions: report.suggestions.map((suggestion) => ({ ...suggestion })),
    causes: report.causes.map((cause) => projectDiagnosticReport(cause)),
  };
}

export function projectDiagnosticReports(reports: readonly DiagnosticReport[]): JsonDiagnosticReport[] {
  return reports.map((report) => projectDiagnosticReport(report));
}