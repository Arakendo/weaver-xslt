import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { inventoryXslt30Metadata, rankXslt30CandidateFamilies } from './metadataInventory.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

describe('XSLT30 metadata inventory', () => {
  it('reproduces the complete pinned suite metadata totals', () => {
    const inventory = inventoryXslt30Metadata(REPO_ROOT);

    expect(inventory).toMatchObject({
      revision: '6f8fd9e966ae74a251a2604abef9d904c7bc5c9b',
      testSets: 234,
      testCases: 14_600,
      stylesheetReferences: 9_663,
      distinctStylesheetFiles: 7_646,
      environmentBindings: {
        absent: 1_641,
        inline: 2_161,
        referenced: 10_798,
      },
      metadataShapeCount: 564,
    });
    expect(inventory.families).toHaveLength(234);
  });

  it('ranks only complete small families supported by the current metadata adapter', () => {
    const inventory = inventoryXslt30Metadata(REPO_ROOT);
    const candidates = rankXslt30CandidateFamilies(inventory);

    expect(candidates.length).toBeGreaterThan(0);
    expect(
      candidates.every(
        (family) =>
          family.testCases <= 20 &&
          family.singleStylesheetCases === family.testCases &&
          family.supportedAssertionCases === family.testCases,
      ),
    ).toBe(true);
    expect(candidates.some((family) => family.setFile === 'tests/expr/for/_for-test-set.xml')).toBe(
      true,
    );
  });
});
