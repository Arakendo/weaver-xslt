import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { VerificationObservation } from '../ledger.js';
import { summarizeVerificationLedger } from '../ledger.js';
import { hasXslt30Catalog, runXslt30Case } from './harness.js';
import { loadXslt30Overlay } from './overlay.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const overlayPath = (name: string) => join(REPO_ROOT, 'corpus', 'overlays', 'xslt30', name);
const familyOverlay = loadXslt30Overlay(overlayPath('weaver-template-path-family-v1.json'));
const parityOverlay = loadXslt30Overlay(overlayPath('weaver-template-path-native-parity-v1.json'));
const selectedCases = parityOverlay.cases.filter((testCase) => testCase.selection === 'selected');

describe('W3C conformance — XSLT30 native parity profile', () => {
  if (!hasXslt30Catalog()) {
    it.skip('suite not present — run: git submodule update --init', () => {});
    return;
  }

  it('preserves the complete template/path family denominator', () => {
    const identities = (cases: typeof parityOverlay.cases) =>
      cases.map((testCase) => JSON.stringify([testCase.setFile, testCase.caseName])).sort();

    expect(identities(parityOverlay.cases)).toEqual(identities(familyOverlay.cases));
    expect(parityOverlay.cases).toHaveLength(16);
    expect(selectedCases.map((testCase) => testCase.caseName)).toEqual(['template-006']);
  });

  it('records independent passing observations for all three required backends', () => {
    const observations: VerificationObservation[] = [];

    for (const testCase of selectedCases) {
      for (const backend of parityOverlay.requiredBackends) {
        const result = runXslt30Case(testCase, backend);
        if (result.execution !== 'passed') {
          throw new Error(
            `XSLT 3.0 case ${testCase.caseName} failed on ${backend} as ${result.execution}: ${result.detail}`,
          );
        }

        observations.push({
          suite: parityOverlay.suite,
          suiteRevision: parityOverlay.suiteRevision,
          setFile: testCase.setFile,
          caseName: testCase.caseName,
          backend,
          execution: result.execution,
        });
      }
    }

    const ledger = summarizeVerificationLedger(
      parityOverlay.cases.map((testCase) => ({
        suite: parityOverlay.suite,
        suiteRevision: parityOverlay.suiteRevision,
        setFile: testCase.setFile,
        caseName: testCase.caseName,
        selection: testCase.selection,
      })),
      observations,
      parityOverlay.requiredBackends,
    );

    expect(ledger.selection).toMatchObject({
      inventoried: 16,
      selected: 1,
      'engine-unsupported': 15,
    });
    for (const backend of parityOverlay.requiredBackends) {
      expect(ledger.executionByBackend[backend]).toMatchObject({
        selected: 1,
        passed: 1,
        incomplete: 0,
      });
    }
  });

  it('does not count generic emitted fallback as native-emitted execution', () => {
    const unsupportedCase = parityOverlay.cases.find(
      (testCase) => testCase.caseName === 'template-001',
    );
    expect(unsupportedCase).toBeDefined();

    expect(runXslt30Case(unsupportedCase!, 'native-emitted')).toMatchObject({
      execution: 'engine-failure',
      detail: expect.stringContaining('generic transformCompiledStylesheet fallback'),
    });
  });
});
