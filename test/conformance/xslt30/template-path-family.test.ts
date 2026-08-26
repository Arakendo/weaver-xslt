import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Element } from '@xmldom/xmldom';
import { describe, expect, it } from 'vitest';

import { parseXml } from '../../../src/xml/parse.js';
import type { VerificationObservation } from '../ledger.js';
import { summarizeVerificationLedger } from '../ledger.js';
import { hasXslt30Catalog, runXslt30Case } from './harness.js';
import { loadXslt30Overlay } from './overlay.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const OVERLAY_PATH = join(
  REPO_ROOT,
  'corpus',
  'overlays',
  'xslt30',
  'weaver-template-path-family-v1.json',
);
const overlay = loadXslt30Overlay(OVERLAY_PATH);
const selectedCases = overlay.cases.filter((testCase) => testCase.selection === 'selected');

describe('W3C conformance — complete template and path families', () => {
  if (!hasXslt30Catalog()) {
    it.skip('suite not present — run: git submodule update --init', () => {});
    return;
  }

  it('inventories every upstream family member exactly once', () => {
    const upstreamCaseNames = overlay.cases.flatMap((testCase, index, cases) =>
      index === cases.findIndex((candidate) => candidate.setFile === testCase.setFile)
        ? readCaseNames(testCase.setFile)
        : [],
    );

    expect(overlay.cases.map((testCase) => testCase.caseName).sort()).toEqual(
      upstreamCaseNames.sort(),
    );
    expect(overlay.cases).toHaveLength(16);
  });

  it('executes every selected case and conserves explicit exclusions', () => {
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

    console.log(
      `  XSLT 3.0 template/path families: ${ledger.executionByBackend.interpreter?.passed ?? 0}/${selectedCases.length} selected cases passed; ${ledger.selection['engine-unsupported']} engine gaps`,
    );
    expect(ledger.selection).toMatchObject({
      inventoried: 16,
      selected: 13,
      'engine-unsupported': 3,
    });
    expect(ledger.executionByBackend.interpreter).toMatchObject({
      selected: 13,
      passed: 13,
      incomplete: 0,
    });
  });
});

function readCaseNames(setFile: string): string[] {
  const document = parseXml(
    readFileSync(join(REPO_ROOT, 'vendor', 'xslt30-test', setFile), 'utf8'),
  );

  return Array.from(document.getElementsByTagName('test-case'))
    .map((node) => (node as Element).getAttribute('name'))
    .filter((name): name is string => name !== null);
}
