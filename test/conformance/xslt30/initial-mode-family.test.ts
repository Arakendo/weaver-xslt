import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { summarizeVerificationLedger } from '../ledger.js';
import { hasXslt30Catalog, runXslt30Case } from './harness.js';
import { loadXslt30FamilyCaseNames } from './metadataInventory.js';
import { loadXslt30Overlay } from './overlay.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const overlay = loadXslt30Overlay(
  join(REPO_ROOT, 'corpus', 'overlays', 'xslt30', 'weaver-initial-mode-family-v1.json'),
);

describe('W3C conformance — complete initial-mode family', () => {
  if (!hasXslt30Catalog()) {
    it.skip('suite not present — run: git submodule update --init', () => {});
    return;
  }

  it('inventories every upstream family member exactly once', () => {
    expect(overlay.cases.map((testCase) => testCase.caseName)).toEqual([
      ...loadXslt30FamilyCaseNames(REPO_ROOT, overlay.cases[0]!.setFile),
    ]);
    expect(overlay.cases).toHaveLength(5);
  });

  it('conserves the decomposed harness and engine gaps', () => {
    const ledger = summarizeVerificationLedger(
      overlay.cases.map((testCase) => ({
        suite: overlay.suite,
        suiteRevision: overlay.suiteRevision,
        setFile: testCase.setFile,
        caseName: testCase.caseName,
        selection: testCase.selection,
      })),
      [],
      overlay.requiredBackends,
    );

    expect(ledger.selection).toMatchObject({
      inventoried: 5,
      selected: 0,
      'harness-unsupported': 1,
      'engine-unsupported': 4,
    });
    expect(ledger.executionByBackend.interpreter).toMatchObject({
      selected: 0,
      passed: 0,
      incomplete: 0,
    });
  });

  it('preserves the initial mode in execution probes', () => {
    const engineCases = overlay.cases.filter(
      (testCase) => testCase.selection === 'engine-unsupported',
    );
    expect(
      engineCases.map((testCase) =>
        runXslt30Case({ ...testCase, selection: 'selected' }),
      ),
    ).toEqual([
      {
        execution: 'engine-failure',
        detail:
          'expected XML result but received XTDE0040: [XTDE0040] Initial modes are not yet implemented in the current MVP+3 slice.',
      },
      {
        execution: 'diagnostic-mismatch',
        detail:
          'expected error XTDE0045 but received XTSE0090: [XTSE0090] xsl:output attribute indent is not yet implemented in the current MVP+3 slice.',
      },
      {
        execution: 'diagnostic-mismatch',
        detail:
          'expected error XTDE0050 but received XTSE0090: [XTSE0090] xsl:output attribute indent is not yet implemented in the current MVP+3 slice.',
      },
      {
        execution: 'engine-failure',
        detail:
          'expected XML result but received XTDE0040: [XTDE0040] Initial modes are not yet implemented in the current MVP+3 slice.',
      },
    ]);
  });
});
