import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createXslt30FamilyRanking } from './familyRanking.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const REPORT_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v1.json');
const REPORT_V2_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v2.json');
const REPORT_V3_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v3.json');

describe('XSLT30 complete-family execution ranking', () => {
  it('preserves the original discovery ranking as immutable evidence', () => {
    const retained = JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as {
      readonly inventory: { readonly testCases: number };
      readonly candidates: ReadonlyArray<{
        readonly name: string;
        readonly backendPassed: { readonly interpreter: number };
      }>;
    };

    expect(retained.inventory.testCases).toBe(14_600);
    expect(retained.candidates).toHaveLength(16);
    expect(
      retained.candidates.find((candidate) => candidate.name === 'for')?.backendPassed,
    ).toMatchObject({ interpreter: 1 });
  });

  it('preserves the retained xsl:sequence ranking delta', () => {
    const retained = JSON.parse(readFileSync(REPORT_V2_PATH, 'utf8')) as {
      readonly changes: ReadonlyArray<{
        readonly name: string;
        readonly backendPassed: Readonly<Record<string, number>>;
        readonly outcomeDigest: string;
      }>;
    };
    expect(retained.changes).toHaveLength(1);
    expect(retained.changes[0]).toMatchObject({
      name: 'for',
      backendPassed: { interpreter: 2, 'native-direct': 0, 'native-emitted': 0 },
      outcomeDigest: 'a186d3e63fa3c60305c44c4a731896307bbb02212d6086b70d87a26be3995fb3',
    });
  });

  it('reproduces the retained empty-arithmetic ranking delta', () => {
    const retained = JSON.parse(readFileSync(REPORT_V3_PATH, 'utf8')) as {
      readonly changes: ReadonlyArray<{
        readonly name: string;
        readonly backendPassed: Readonly<Record<string, number>>;
        readonly outcomeDigest: string;
      }>;
    };
    const current = createXslt30FamilyRanking(REPO_ROOT).candidates.find(
      (candidate) => candidate.name === 'for',
    );

    expect(current).toBeDefined();
    expect(retained.changes).toHaveLength(1);
    expect(retained.changes[0]).toMatchObject({
      name: 'for',
      backendPassed: current!.backendPassed,
      outcomeDigest: current!.outcomeDigest,
    });
  });
});
