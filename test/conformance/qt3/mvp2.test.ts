import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { VerificationObservation } from '../ledger.js';
import { summarizeVerificationLedger } from '../ledger.js';
import type { Qt3CaseExclusion, Qt3SliceCase } from './harness.js';
import {
  getQt3CaseExclusion,
  loadQt3CatalogSetFiles,
  loadQt3SliceCases,
  runQt3Slice,
} from './harness.js';
import {
  buildQt3ProfileInventory,
  createQt3ProfileOutcomeDigest,
  loadQt3ProfileOverlay,
  type Qt3ProfileInventoryEntry,
} from './profile.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const QT3_ROOT = join(REPO_ROOT, 'vendor', 'qt3tests');

const MVP2_QT3_PROFILE = loadQt3ProfileOverlay();
const MVP2_QT3_INVENTORY = buildQt3ProfileInventory(MVP2_QT3_PROFILE);
const MVP2_QT3_SELECTED = MVP2_QT3_INVENTORY.filter(
  (entry): entry is Qt3ProfileInventoryEntry & { readonly testCase: Qt3SliceCase } =>
    entry.selection === 'selected' && entry.testCase !== undefined,
);

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

  console.log(`  QT3 exclusions: ${excludedCases.length} cases filtered by the MVP+2 gate`);

  for (const [reason, count] of [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )) {
    console.log(`    ${reason}: ${count}`);
  }

  for (const { testCase, exclusion } of excludedCases.slice(0, 20)) {
    const detail = exclusion.detail === undefined ? '' : ` (${exclusion.detail})`;
    console.log(
      `    excluded: ${testCase.setFile} :: ${testCase.caseName} -> ${exclusion.reason}${detail}`,
    );
  }
}

describe('W3C conformance — QT3 MVP+2 slice', () => {
  if (!existsSync(join(QT3_ROOT, 'catalog.xml'))) {
    it.skip('suite not present — run: git submodule update --init', () => {});
    return;
  }

  it('executes a broader filtered QT3 slice and reports the top failing clusters', () => {
    const report = runQt3Slice(MVP2_QT3_SELECTED.map((entry) => entry.testCase));
    const passRate = report.included === 0 ? 0 : (report.passed / report.included) * 100;
    const failureKeys = new Set(
      report.failures.map((failure) => JSON.stringify([failure.setFile, failure.caseName])),
    );
    const observations: VerificationObservation[] = MVP2_QT3_SELECTED.map((entry) => ({
      suite: entry.suite,
      suiteRevision: entry.suiteRevision,
      setFile: entry.setFile,
      caseName: entry.caseName,
      backend: 'interpreter',
      execution: failureKeys.has(JSON.stringify([entry.setFile, entry.caseName]))
        ? 'semantic-mismatch'
        : 'passed',
    }));
    const ledger = summarizeVerificationLedger(
      MVP2_QT3_INVENTORY,
      observations,
      MVP2_QT3_PROFILE.requiredBackends,
    );

    console.log(
      `  QT3 MVP+2 slice: ${report.passed}/${report.included} selected cases passed (${passRate.toFixed(1)}%) from ${ledger.selection.inventoried} inventoried cases`,
    );

    for (const cluster of report.clusters.slice(0, 5)) {
      console.log(
        `    ${cluster.setFile}: ${cluster.failures}/${cluster.total} failed; sample ${cluster.sampleCase} — ${cluster.sampleMessage}`,
      );
    }

    expect(createQt3ProfileOutcomeDigest(MVP2_QT3_INVENTORY)).toBe(
      MVP2_QT3_PROFILE.expected.outcomeDigest,
    );
    expect(ledger.selection).toMatchObject({
      inventoried: MVP2_QT3_PROFILE.expected.inventoried,
      ...MVP2_QT3_PROFILE.expected.selectionTotals,
    });
    expect(report.included).toBe(MVP2_QT3_PROFILE.expected.selectionTotals.selected);
    expect(report.passed + report.failed).toBe(report.included);
    expect(ledger.executionByBackend.interpreter).toMatchObject({
      selected: MVP2_QT3_PROFILE.expected.selectionTotals.selected,
      passed: MVP2_QT3_PROFILE.expected.selectionTotals.selected,
      incomplete: 0,
    });
  });

  maybeRunBroaderBaseline(
    'measures a broader QT3 baseline through the current MVP+2 support gate',
    () => {
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

      console.log(
        `  QT3 MVP+2 broader baseline: ${report.passed}/${report.included} passed (${passRate.toFixed(1)}%) from ${discoveredCases.length} discovered supported-assertion cases across ${includedSetFiles.size} included test sets`,
      );

      for (const cluster of report.clusters.slice(0, 10)) {
        console.log(
          `    ${cluster.setFile}: ${cluster.failures}/${cluster.total} failed; sample ${cluster.sampleCase} — ${cluster.sampleMessage}`,
        );
      }

      expect(includedSetFiles.size).toBeGreaterThan(MVP2_QT3_PROFILE.setFiles.length);
      expect(report.included).toBeGreaterThan(0);
      expect(report.passed + report.failed).toBe(report.included);
      expect(report.passed).toBeGreaterThan(0);
      expect(passRate).toBeGreaterThanOrEqual(20);
    },
  );
});
