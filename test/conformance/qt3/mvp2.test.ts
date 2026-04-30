import { describe, expect, it } from 'vitest';

import type { Qt3CaseExclusion, Qt3SliceCase } from './harness.js';
import {
  getQt3CaseExclusion,
  isPotentiallySupportedXPathCase,
  loadQt3CatalogSetFiles,
  loadQt3SliceCases,
  runQt3Slice,
} from './harness.js';

const MVP2_QT3_SET_FILES = [
  'prod/AxisStep.abbr.xml',
  'prod/AxisStep.ancestor-or-self.xml',
  'prod/AxisStep.ancestor.xml',
  'prod/AxisStep.following-sibling.xml',
  'prod/AxisStep.following.xml',
  'prod/AxisStep.preceding-sibling.xml',
  'prod/AxisStep.preceding.xml',
  'prod/ForClause.xml',
  'prod/GeneralComp.eq.xml',
  'prod/GeneralComp.ge.xml',
  'prod/GeneralComp.gt.xml',
  'prod/GeneralComp.le.xml',
  'prod/GeneralComp.lt.xml',
  'prod/GeneralComp.ne.xml',
  'prod/IfExpr.xml',
  'prod/LetClause.xml',
  'prod/Literal.xml',
  'prod/OrExpr.xml',
  'prod/ParenthesizedExpr.xml',
  'prod/Predicate.xml',
  'prod/QuantifiedExpr.xml',
  'prod/ValueComp.xml',
  'fn/abs.xml',
  'fn/avg.xml',
  'fn/boolean.xml',
  'fn/ceiling.xml',
  'fn/concat.xml',
  'fn/contains.xml',
  'fn/count.xml',
  'fn/data.xml',
  'fn/distinct-values.xml',
  'fn/empty.xml',
  'fn/ends-with.xml',
  'fn/exists.xml',
  'fn/false.xml',
  'fn/floor.xml',
  'fn/head.xml',
  'fn/last.xml',
  'fn/local-name.xml',
  'fn/lower-case.xml',
  'fn/matches.re.xml',
  'fn/matches.xml',
  'fn/max.xml',
  'fn/min.xml',
  'fn/name.xml',
  'fn/node-name.xml',
  'fn/normalize-space.xml',
  'fn/not.xml',
  'fn/number.xml',
  'fn/position.xml',
  'fn/replace.xml',
  'fn/reverse.xml',
  'fn/root.xml',
  'fn/round.xml',
  'fn/starts-with.xml',
  'fn/string-join.xml',
  'fn/string-length.xml',
  'fn/string.xml',
  'fn/subsequence.xml',
  'fn/substring.xml',
  'fn/sum.xml',
  'fn/tail.xml',
  'fn/tokenize.xml',
  'fn/true.xml',
  'fn/upper-case.xml',
] as const;

const maybeRunBroaderBaseline = process.env.QT3_BROAD_BASELINE === '1' ? it : it.skip;
const shouldLogQt3Exclusions = process.env.QT3_EXCLUSION_DEBUG === '1';

type Qt3ExcludedCase = {
  readonly testCase: Qt3SliceCase;
  readonly exclusion: Qt3CaseExclusion;
};

function getQt3HeartbeatIntervalMs(): number {
  const rawSeconds = Number(process.env.QT3_HEARTBEAT_SECONDS ?? '30');
  if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) {
    return 30_000;
  }

  return rawSeconds * 1000;
}

function partitionQt3CasesBySupport(testCases: readonly Qt3SliceCase[]): {
  readonly runnableCases: Qt3SliceCase[];
  readonly excludedCases: Qt3ExcludedCase[];
} {
  const runnableCases: Qt3SliceCase[] = [];
  const excludedCases: Qt3ExcludedCase[] = [];

  for (const testCase of testCases) {
    const exclusion = getQt3CaseExclusion(testCase);
    if (exclusion === undefined) {
      runnableCases.push(testCase);
      continue;
    }

    excludedCases.push({ testCase, exclusion });
  }

  return { runnableCases, excludedCases };
}

function logQt3Exclusions(excludedCases: readonly Qt3ExcludedCase[]): void {
  if (!shouldLogQt3Exclusions || excludedCases.length === 0) {
    return;
  }

  const counts = new Map<Qt3CaseExclusion['reason'], number>();
  for (const { exclusion } of excludedCases) {
    counts.set(exclusion.reason, (counts.get(exclusion.reason) ?? 0) + 1);
  }

  // eslint-disable-next-line no-console
  console.log(`  QT3 exclusions: ${excludedCases.length} cases filtered by the MVP+2 gate`);

  for (const [reason, count] of [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))) {
    // eslint-disable-next-line no-console
    console.log(`    ${reason}: ${count}`);
  }

  for (const { testCase, exclusion } of excludedCases.slice(0, 20)) {
    const detail = exclusion.detail === undefined ? '' : ` (${exclusion.detail})`;
    // eslint-disable-next-line no-console
    console.log(`    excluded: ${testCase.setFile} :: ${testCase.caseName} -> ${exclusion.reason}${detail}`);
  }
}

describe('W3C conformance — QT3 MVP+2 slice', () => {
  it('executes a broader filtered QT3 slice and reports the top failing clusters', () => {
    const discoveredCases = loadQt3SliceCases(MVP2_QT3_SET_FILES);
    const runnableCases = discoveredCases.filter(isPotentiallySupportedXPathCase);
    const report = runQt3Slice(runnableCases);
    const passRate = report.included === 0 ? 0 : (report.passed / report.included) * 100;

    // eslint-disable-next-line no-console
    console.log(
      `  QT3 MVP+2 slice: ${report.passed}/${report.included} passed (${passRate.toFixed(1)}%) from ${discoveredCases.length} discovered supported-assertion cases`,
    );

    for (const cluster of report.clusters.slice(0, 5)) {
      // eslint-disable-next-line no-console
      console.log(
        `    ${cluster.setFile}: ${cluster.failures}/${cluster.total} failed; sample ${cluster.sampleCase} — ${cluster.sampleMessage}`,
      );
    }

    expect(discoveredCases.length).toBeGreaterThan(0);
    expect(report.included).toBeGreaterThan(0);
    expect(report.passed + report.failed).toBe(report.included);
    expect(report.passed).toBeGreaterThan(0);
  });

  maybeRunBroaderBaseline('measures a broader QT3 baseline through the current MVP+2 support gate', () => {
    const discoveredCases = loadQt3SliceCases(loadQt3CatalogSetFiles());
    const { runnableCases, excludedCases } = partitionQt3CasesBySupport(discoveredCases);
    const report = runQt3Slice(runnableCases, {
      heartbeat: {
        label: 'QT3 MVP+2 broader baseline',
        everyMs: getQt3HeartbeatIntervalMs(),
      },
    });
    const passRate = report.included === 0 ? 0 : (report.passed / report.included) * 100;
    const includedSetFiles = new Set(runnableCases.map((testCase) => testCase.setFile));

    logQt3Exclusions(excludedCases);

    // eslint-disable-next-line no-console
    console.log(
      `  QT3 MVP+2 broader baseline: ${report.passed}/${report.included} passed (${passRate.toFixed(1)}%) from ${discoveredCases.length} discovered supported-assertion cases across ${includedSetFiles.size} included test sets`,
    );

    for (const cluster of report.clusters.slice(0, 10)) {
      // eslint-disable-next-line no-console
      console.log(
        `    ${cluster.setFile}: ${cluster.failures}/${cluster.total} failed; sample ${cluster.sampleCase} — ${cluster.sampleMessage}`,
      );
    }

    expect(includedSetFiles.size).toBeGreaterThan(MVP2_QT3_SET_FILES.length);
    expect(report.included).toBeGreaterThan(0);
    expect(report.passed + report.failed).toBe(report.included);
    expect(report.passed).toBeGreaterThan(0);
    expect(passRate).toBeGreaterThanOrEqual(20);
  });
});