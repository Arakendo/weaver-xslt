import { assertValidDiagnostic, type DiagnosticReport } from './report.js';

export function sortDiagnostics(reports: readonly DiagnosticReport[]): DiagnosticReport[] {
  for (const report of reports) {
    assertValidDiagnostic(report);
  }

  return [...reports].sort(compareDiagnostics);
}

export function compareDiagnostics(left: DiagnosticReport, right: DiagnosticReport): number {
  const leftPrimary = left.primary;
  const rightPrimary = right.primary;

  if (leftPrimary !== undefined && rightPrimary !== undefined) {
    const byUri = (leftPrimary.uri ?? '').localeCompare(rightPrimary.uri ?? '');
    if (byUri !== 0) {
      return byUri;
    }

    const byOffsetStart = leftPrimary.offsetStart - rightPrimary.offsetStart;
    if (byOffsetStart !== 0) {
      return byOffsetStart;
    }

    const byOffsetEnd = leftPrimary.offsetEnd - rightPrimary.offsetEnd;
    if (byOffsetEnd !== 0) {
      return byOffsetEnd;
    }
  } else if (leftPrimary !== undefined) {
    return -1;
  } else if (rightPrimary !== undefined) {
    return 1;
  }

  const byCode = left.code.localeCompare(right.code);
  if (byCode !== 0) {
    return byCode;
  }

  return left.message.localeCompare(right.message);
}