import type { SourceLocation } from '../../errors/index.js';
import {
  assertValidDiagnostic,
  type DiagnosticFrame,
  type DiagnosticReport,
  type SourceSpan as DiagnosticSourceSpan,
} from '../../diagnostics/index.js';

import type { GlobalBinding, TemplateRule } from './ir.js';

interface AnalysisWarningInit {
  readonly code: string;
  readonly message: string;
  readonly primary: DiagnosticSourceSpan | undefined;
  readonly related?: DiagnosticReport['related'];
  readonly frames: DiagnosticReport['frames'];
  readonly details: DiagnosticReport['details'];
  readonly suggestions: DiagnosticReport['suggestions'];
}

export function createAnalysisWarning(report: AnalysisWarningInit): DiagnosticReport {
  const normalizedReport: DiagnosticReport = {
    code: report.code,
    phase: 'compile',
    severity: 'warning',
    category: 'analysis',
    message: report.message,
    ...(report.primary === undefined ? {} : { primary: report.primary }),
    related: report.related ?? [],
    frames: report.frames,
    details: report.details,
    suggestions: report.suggestions,
    causes: [],
  };

  assertValidDiagnostic(normalizedReport);
  return normalizedReport;
}

export function createTemplateFrame(
  template: TemplateRule,
  primary: DiagnosticSourceSpan | undefined,
): DiagnosticFrame | undefined {
  const label = template.name ?? template.matchText;
  if (label === undefined) {
    return undefined;
  }

  return primary === undefined
    ? { kind: 'template', label }
    : { kind: 'template', label, span: primary };
}

export function createGlobalBindingFrame(
  binding: GlobalBinding,
  primary: DiagnosticSourceSpan | undefined,
): DiagnosticFrame | undefined {
  const label = `xsl:${binding.kind} name="${binding.name}"`;

  return primary === undefined
    ? { kind: 'instruction', label }
    : { kind: 'instruction', label, span: primary };
}

export function createEarlierTemplateRelatedLabel(prefix: string, template: TemplateRule): string {
  return template.matchText === undefined
    ? prefix
    : `${prefix} match=${JSON.stringify(template.matchText)}`;
}

export function toSourceSpan(
  location: SourceLocation | undefined,
): DiagnosticSourceSpan | undefined {
  if (
    location?.line === undefined ||
    location.column === undefined ||
    location.offset === undefined
  ) {
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
