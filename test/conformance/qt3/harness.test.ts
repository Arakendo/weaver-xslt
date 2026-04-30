import { describe, expect, it } from 'vitest';

import type { Qt3SliceCase } from './harness.js';
import {
  getQt3CaseExclusion,
  isPotentiallySupportedXPathCase,
  loadQt3CatalogSetFiles,
  loadQt3SliceCases,
  runQt3Slice,
} from './harness.js';

function createCase(
  dependencies: Qt3SliceCase['dependencies'],
  expression = '1',
  assertion: Qt3SliceCase['assertion'] = { kind: 'assert-true' },
): Qt3SliceCase {
  return {
    setFile: 'prod/Predicate.xml',
    setName: 'prod-Predicate',
    caseName: 'synthetic',
    expression,
    assertion,
    dependencies,
    hasUnsupportedEnvironment: false,
  };
}

describe('QT3 harness dependency filtering', () => {
  it('enumerates test-set files from the QT3 catalog', () => {
    const setFiles = loadQt3CatalogSetFiles();

    expect(setFiles).toContain('fn/abs.xml');
    expect(setFiles).toContain('prod/Predicate.xml');
    expect(setFiles.length).toBeGreaterThan(100);
  });

  it('excludes spec dependencies that do not apply to XPath 3.1', () => {
    expect(isPotentiallySupportedXPathCase(createCase([
      { type: 'spec', value: 'XP20 XP30 XQ10 XQ30' },
    ]))).toBe(false);
  });

  it('includes spec dependencies that explicitly allow XPath 3.1', () => {
    expect(isPotentiallySupportedXPathCase(createCase([
      { type: 'spec', value: 'XP20+ XQ10+' },
    ]))).toBe(true);
    expect(isPotentiallySupportedXPathCase(createCase([
      { type: 'spec', value: 'XP31+ XQ31+' },
    ]))).toBe(true);
  });

  it('excludes pure XQuery spec dependencies', () => {
    expect(isPotentiallySupportedXPathCase(createCase([
      { type: 'spec', value: 'XQ10+ XQ30+' },
    ]))).toBe(false);
  });

  it('excludes XML 1.1 dependent cases from the current slice', () => {
    expect(isPotentiallySupportedXPathCase(createCase([
      { type: 'xml-version', value: '1.1' },
    ]))).toBe(false);
  });

  it('excludes function calls outside the MVP+2 roadmap surface', () => {
    expect(isPotentiallySupportedXPathCase(createCase([], 'function-lookup(xs:QName("fn:count"), 1)'))).toBe(false);
    expect(isPotentiallySupportedXPathCase(createCase([], 'format-number(12.5, "0.0")'))).toBe(false);
  });

  it('tracks structured exclusion reasons for filtered cases', () => {
    expect(getQt3CaseExclusion(createCase([
      { type: 'feature', value: 'higherOrderFunctions' },
    ]))).toEqual({
      reason: 'unsupported-feature',
      detail: 'higherOrderFunctions',
    });

    expect(getQt3CaseExclusion(createCase([], 'xs:date("2024-01-01")'))).toEqual({
      reason: 'unsupported-schema-constructor',
      detail: 'schema constructor functions',
    });

    expect(getQt3CaseExclusion(createCase([], 'format-number(12.5, "0.0")'))).toEqual({
      reason: 'unsupported-function',
      detail: 'format-number',
    });

    expect(getQt3CaseExclusion(createCase([], '1', {
      kind: 'assert-eq',
      expectedExpression: 'format-number(12.5, "0.0")',
    }))).toEqual({
      reason: 'unsupported-function',
      detail: 'assert-eq expected expression: format-number',
    });
  });

  it('keeps supported MVP+2 function calls in scope', () => {
    expect(isPotentiallySupportedXPathCase(createCase([], 'count((1, 2, 3))'))).toBe(true);
    expect(isPotentiallySupportedXPathCase(createCase([], '/root/item[text()]'))).toBe(true);
    expect(isPotentiallySupportedXPathCase(createCase([], '1', { kind: 'assert-eq', expectedExpression: 'string(count((1, 2)))' }))).toBe(true);
    expect(isPotentiallySupportedXPathCase(createCase([], 'exactly-one((1))'))).toBe(true);
    expect(isPotentiallySupportedXPathCase(createCase([], 'replace("a(b)", "a", "x")'))).toBe(true);
  });

  it('matches QName function casing against the runtime surface', () => {
    expect(getQt3CaseExclusion(createCase([], 'QName("", "name")'))).toBeUndefined();
    expect(getQt3CaseExclusion(createCase([], 'fn:QName("", "name")'))).toBeUndefined();
    expect(getQt3CaseExclusion(createCase([], 'qname("", "name")'))).toEqual({
      reason: 'unsupported-function',
      detail: 'qname',
    });
    expect(getQt3CaseExclusion(createCase([], 'fn:qname("", "name")'))).toEqual({
      reason: 'unsupported-function',
      detail: 'fn:qname',
    });
  });

  it('documents the intentional curated exclusions from the tightened MVP+2 gate', () => {
    const intentionallyExcludedExpressions = [
      'for $file (//Folder)[1]/File return $file/FileName',
      `(1, 2, 3)[root()[generate-id() != '***']]`,
      'sub-string("a string")',
      'sub-string("a string", 1, 2, "wrong param")',
    ] as const;

    for (const expression of intentionallyExcludedExpressions) {
      expect(isPotentiallySupportedXPathCase(createCase([], expression))).toBe(false);
    }
  });

  it('loads inline anonymous test-case environments', () => {
    const testCases = loadQt3SliceCases(['fn/normalize-space.xml']).filter((testCase) => testCase.caseName === 'fn-normalize-space0args-1');

    expect(testCases).toHaveLength(1);
    expect(testCases[0]?.environment?.sources).toHaveLength(1);
    expect(testCases[0]?.environment?.sources[0]).toMatchObject({ role: '.' });
    expect(testCases[0]?.environment?.sources[0]?.file).toMatch(/fn[\\/]normalize-space[\\/]textWithSpaces\.xml$/);
    expect(runQt3Slice(testCases).failed).toBe(0);
  });

  it('emits optional heartbeats during long QT3 runs', () => {
    const logged: string[] = [];
    let currentTime = 0;
    const testCases = [
      createCase([], 'true()'),
      createCase([], 'true()'),
      createCase([], 'true()'),
    ];

    const report = runQt3Slice(testCases, {
      heartbeat: {
        label: 'synthetic QT3 run',
        everyMs: 15,
        logger: (message) => logged.push(message),
        now: () => {
          currentTime += 10;
          return currentTime;
        },
      },
    });

    expect(report.failed).toBe(0);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toContain('synthetic QT3 run');
    expect(logged[0]).toContain('2/3 cases');
  });
});