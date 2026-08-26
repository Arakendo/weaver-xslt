import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { summarizeVerificationLedger } from '../ledger.js';
import { hasXslt30Catalog, runXslt30Case } from './harness.js';
import { loadXslt30FamilyCaseNames } from './metadataInventory.js';
import { loadXslt30Overlay } from './overlay.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const overlay = loadXslt30Overlay(
  join(REPO_ROOT, 'corpus', 'overlays', 'xslt30', 'weaver-sf-fold-right-family-v1.json'),
);

describe('W3C conformance — complete streaming fold-right family', () => {
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

  it('conserves the initial engine gap and family denominator', () => {
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
      inventoried: 1,
      selected: 0,
      'engine-unsupported': 1,
    });
    expect(ledger.executionByBackend.interpreter).toMatchObject({
      selected: 0,
      passed: 0,
      incomplete: 0,
    });
  });

  it('exposes the first compiler boundary without admitting the case', () => {
    const result = runXslt30Case({ ...overlay.cases[0]!, selection: 'selected' });

    expect(result).toEqual({
      execution: 'engine-failure',
      detail:
        'expected XML result but received XTSE0010: [XTSE0010] Unsupported top-level XSLT declaration xsl:function in current MVP+3 slice.',
    });
  });
});
