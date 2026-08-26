import type { DiagnosticReport } from '../../diagnostics/index.js';

import type { StylesheetIR } from './ir.js';
import { analyzeTemplateReachability } from './templateReachabilityAnalysis.js';
import { collectSampleDocumentNameDiagnostics } from './sampleDocumentAnalysis.js';
import { collectTemplatePriorityConflictDiagnostics } from './templateMatchAnalysis.js';

export { getComparableTemplateMatchPattern } from './templateMatchAnalysis.js';

export interface AnalyzeStylesheetOptions {
  readonly sampleDocument?: string;
}

export function analyzeStylesheet(
  ir: StylesheetIR,
  options: AnalyzeStylesheetOptions = {},
): readonly DiagnosticReport[] {
  const reachability = analyzeTemplateReachability(ir);

  return [
    ...reachability.globalBindingReports,
    ...collectTemplatePriorityConflictDiagnostics(ir),
    ...collectSampleDocumentNameDiagnostics(ir, options.sampleDocument),
    ...reachability.templateReports,
  ];
}
