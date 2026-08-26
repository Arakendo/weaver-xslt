import { describe, expect, it } from 'vitest';

import type { VerificationObservation } from '../ledger.js';
import { summarizeVerificationLedger } from '../ledger.js';
import { hasXslt30Catalog, runXslt30Case } from './harness.js';
import { loadXslt30Overlay } from './overlay.js';

const MVP3_XSLT30_OVERLAY = loadXslt30Overlay();
const MVP3_XSLT30_CASES = MVP3_XSLT30_OVERLAY.cases.filter(
  (testCase) => testCase.selection === 'selected',
);

describe('W3C conformance — XSLT 3.0 MVP+3 slice', () => {
  if (!hasXslt30Catalog()) {
    it.skip('suite not present — run: git submodule update --init', () => {});
    return;
  }

  it('executes the overlay-selected XSLT 3.0 slice and conserves its ledger', () => {
    const observations: VerificationObservation[] = [];

    for (const testCase of MVP3_XSLT30_CASES) {
      const result = runXslt30Case(testCase);
      if (result.execution !== 'passed') {
        throw new Error(
          `XSLT 3.0 case ${testCase.caseName} failed as ${result.execution}: ${result.detail}`,
        );
      }

      observations.push({
        suite: MVP3_XSLT30_OVERLAY.suite,
        suiteRevision: MVP3_XSLT30_OVERLAY.suiteRevision,
        setFile: testCase.setFile,
        caseName: testCase.caseName,
        backend: 'interpreter',
        execution: result.execution,
      });
    }

    const ledger = summarizeVerificationLedger(
      MVP3_XSLT30_OVERLAY.cases.map((testCase) => ({
        suite: MVP3_XSLT30_OVERLAY.suite,
        suiteRevision: MVP3_XSLT30_OVERLAY.suiteRevision,
        setFile: testCase.setFile,
        caseName: testCase.caseName,
        selection: testCase.selection,
      })),
      observations,
      MVP3_XSLT30_OVERLAY.requiredBackends,
    );

    console.log(
      `  XSLT 3.0 MVP+3 slice: ${ledger.executionByBackend.interpreter?.passed ?? 0}/${MVP3_XSLT30_CASES.length} passed`,
    );
    expect(ledger.selection.inventoried).toBe(MVP3_XSLT30_OVERLAY.cases.length);
    expect(ledger.executionByBackend.interpreter).toMatchObject({
      selected: MVP3_XSLT30_CASES.length,
      passed: MVP3_XSLT30_CASES.length,
      incomplete: 0,
    });
  });
});
