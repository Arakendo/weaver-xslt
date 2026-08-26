import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { VerificationObservation } from '../ledger.js';
import { summarizeVerificationLedger } from '../ledger.js';
import { hasXslt30Catalog, runXslt30Case } from './harness.js';
import { loadXslt30FamilyCaseNames } from './metadataInventory.js';
import { loadXslt30Overlay } from './overlay.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const OVERLAY_PATH = join(
  REPO_ROOT,
  'corpus',
  'overlays',
  'xslt30',
  'weaver-deep-equal-family-v1.json',
);
const overlay = loadXslt30Overlay(OVERLAY_PATH);

describe('W3C conformance — complete deep-equal family', () => {
  if (!hasXslt30Catalog()) {
    it.skip('suite not present — run: git submodule update --init', () => {});
    return;
  }

  it('inventories every upstream family member exactly once', () => {
    expect(overlay.cases.map((testCase) => testCase.caseName).sort()).toEqual(
      [...loadXslt30FamilyCaseNames(REPO_ROOT, overlay.cases[0]!.setFile)].sort(),
    );
    expect(overlay.cases).toHaveLength(2);
  });

  it('passes every selected case and conserves the family denominator', () => {
    const observations: VerificationObservation[] = overlay.cases.map((testCase) => {
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

    expect(ledger.selection).toMatchObject({ inventoried: 2, selected: 2 });
    expect(ledger.executionByBackend.interpreter).toMatchObject({
      selected: 2,
      passed: 2,
      incomplete: 0,
    });
  });
});
