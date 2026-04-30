import { describe, expect, it } from 'vitest';

import type { Qt3SliceCase } from './harness.js';
import { isPotentiallySupportedXPathCase, loadQt3CatalogSetFiles, loadQt3SliceCases, runQt3Slice } from './harness.js';

function createCase(dependencies: Qt3SliceCase['dependencies']): Qt3SliceCase {
  return {
    setFile: 'prod/Predicate.xml',
    setName: 'prod-Predicate',
    caseName: 'synthetic',
    expression: '1',
    assertion: { kind: 'assert-true' },
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

  it('loads inline anonymous test-case environments', () => {
    const testCases = loadQt3SliceCases(['fn/normalize-space.xml']).filter((testCase) => testCase.caseName === 'fn-normalize-space0args-1');

    expect(testCases).toHaveLength(1);
    expect(testCases[0]?.environment?.sources).toHaveLength(1);
    expect(testCases[0]?.environment?.sources[0]).toMatchObject({ role: '.' });
    expect(testCases[0]?.environment?.sources[0]?.file).toMatch(/fn[\\/]normalize-space[\\/]textWithSpaces\.xml$/);
    expect(runQt3Slice(testCases).failed).toBe(0);
  });
});