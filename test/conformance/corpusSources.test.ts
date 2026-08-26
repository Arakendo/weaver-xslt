import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ConformanceSourceDefinition } from './corpusSources.js';
import { inventoryConformanceSources } from './corpusSources.js';

function createSource(
  root: string,
  catalog: string,
  testSets: Readonly<Record<string, string>>,
): void {
  const sourceRoot = join(root, 'vendor', 'suite');
  mkdirSync(sourceRoot, { recursive: true });
  writeFileSync(join(sourceRoot, 'catalog.xml'), catalog);
  for (const [name, content] of Object.entries(testSets)) {
    const path = join(sourceRoot, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

function definition(
  expectedTestSets: number,
  expectedTestCases: number,
): ConformanceSourceDefinition {
  return {
    name: 'Synthetic',
    relativePath: 'vendor/suite',
    revision: 'revision',
    expectedTestSets,
    expectedTestCases,
  };
}

describe('conformance source inventory', () => {
  it('counts distinct referenced sets and cases', () => {
    const root = mkdtempSync(join(tmpdir(), 'weaver-corpus-'));
    createSource(
      root,
      '<catalog><test-set file="one.xml"/><test-set file="nested/two.xml"/></catalog>',
      {
        'one.xml': '<test-set><test-case name="one"/></test-set>',
        'nested/two.xml': '<test-set><test-case name="two"/><test-case name="three"/></test-set>',
      },
    );

    expect(inventoryConformanceSources(root, [definition(2, 3)])[0]).toMatchObject({
      testSetReferences: 2,
      distinctTestSets: 2,
      testCases: 3,
    });
  });

  it('rejects duplicate, missing, escaping, and changed-count references', () => {
    const duplicateRoot = mkdtempSync(join(tmpdir(), 'weaver-corpus-duplicate-'));
    createSource(
      duplicateRoot,
      '<catalog><test-set file="one.xml"/><test-set file="one.xml"/></catalog>',
      { 'one.xml': '<test-set/>' },
    );
    expect(() => inventoryConformanceSources(duplicateRoot, [definition(1, 0)])).toThrow(
      /duplicate test-set references/,
    );

    const missingRoot = mkdtempSync(join(tmpdir(), 'weaver-corpus-missing-'));
    createSource(missingRoot, '<catalog><test-set file="missing.xml"/></catalog>', {});
    expect(() => inventoryConformanceSources(missingRoot, [definition(1, 0)])).toThrow(
      /missing test set/,
    );

    const escapingRoot = mkdtempSync(join(tmpdir(), 'weaver-corpus-escaping-'));
    createSource(escapingRoot, '<catalog><test-set file="../outside.xml"/></catalog>', {});
    expect(() => inventoryConformanceSources(escapingRoot, [definition(1, 0)])).toThrow(
      /escapes the pinned suite root/,
    );

    const countRoot = mkdtempSync(join(tmpdir(), 'weaver-corpus-count-'));
    createSource(countRoot, '<catalog><test-set file="one.xml"/></catalog>', {
      'one.xml': '<test-set><test-case name="one"/></test-set>',
    });
    expect(() => inventoryConformanceSources(countRoot, [definition(1, 2)])).toThrow(
      /has 1 cases; expected 2/,
    );
  });
});
