import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { VerificationObservation } from '../ledger.js';
import { summarizeVerificationLedger } from '../ledger.js';
import { hasXslt30Catalog, runXslt30Case } from './harness.js';
import { loadXslt30FamilyCaseNames } from './metadataInventory.js';
import { loadXslt30Overlay } from './overlay.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const overlay = loadXslt30Overlay(
  join(REPO_ROOT, 'corpus', 'overlays', 'xslt30', 'weaver-current-family-v1.json'),
);
const selectedCases = overlay.cases.filter((testCase) => testCase.selection === 'selected');

describe('W3C conformance — complete current-function family', () => {
  if (!hasXslt30Catalog()) {
    it.skip('suite not present — run: git submodule update --init', () => {});
    return;
  }

  it('inventories every upstream family member exactly once', () => {
    expect(overlay.cases.map((testCase) => testCase.caseName)).toEqual([
      ...loadXslt30FamilyCaseNames(REPO_ROOT, overlay.cases[0]!.setFile),
    ]);
    expect(overlay.cases).toHaveLength(1);
  });

  it('passes the selected case and conserves the family denominator', () => {
    const observations: VerificationObservation[] = selectedCases.map((testCase) => {
      const result = runXslt30Case(testCase);
      if (result.execution !== 'passed') {
        throw new Error(
          `XSLT 3.0 case ${testCase.caseName} failed as ${result.execution}: ${result.detail}`,
        );
      }
      return {
        suite: overlay.suite,
        suiteRevision: overlay.suiteRevision,
        setFile: testCase.setFile,
        caseName: testCase.caseName,
        backend: 'interpreter',
        execution: result.execution,
      };
    });

    const ledger = summarizeVerificationLedger(
      overlay.cases.map((testCase) => ({
        suite: overlay.suite,
        suiteRevision: overlay.suiteRevision,
        setFile: testCase.setFile,
        caseName: testCase.caseName,
        selection: testCase.selection,
      })),
      observations,
      overlay.requiredBackends,
    );

    expect(ledger.selection).toMatchObject({
      inventoried: 1,
      selected: 1,
      'engine-unsupported': 0,
    });
    expect(ledger.executionByBackend.interpreter).toMatchObject({
      selected: 1,
      passed: 1,
      incomplete: 0,
    });
  });
});
