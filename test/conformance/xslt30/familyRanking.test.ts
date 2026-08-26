import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createXslt30FamilyRanking } from './familyRanking.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const REPORT_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v1.json');
const REPORT_V2_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v2.json');
const REPORT_V3_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v3.json');
const REPORT_V4_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v4.json');
const REPORT_V5_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v5.json');
const REPORT_V6_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v6.json');
const REPORT_V7_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v7.json');
const REPORT_V8_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v8.json');
const REPORT_V9_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v9.json');
const REPORT_V10_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v10.json');

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

  it('preserves the retained empty-arithmetic ranking delta', () => {
    const retained = JSON.parse(readFileSync(REPORT_V3_PATH, 'utf8')) as {
      readonly changes: ReadonlyArray<{
        readonly name: string;
        readonly backendPassed: Readonly<Record<string, number>>;
        readonly outcomeDigest: string;
      }>;
    };
    expect(retained.changes).toHaveLength(1);
    expect(retained.changes[0]).toMatchObject({
      name: 'for',
      backendPassed: { interpreter: 3, 'native-direct': 0, 'native-emitted': 0 },
      outcomeDigest: 'ca62d8e0b868c390d8b27f37651b7d04760d4d64438c3fd931e65eaeed2e566f',
    });
  });

  it('reproduces the retained completed-family ranking delta', () => {
    const retained = JSON.parse(readFileSync(REPORT_V4_PATH, 'utf8')) as {
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
    expect(retained.changes[0]).toMatchObject({
      name: 'for',
      backendPassed: current!.backendPassed,
      outcomeDigest: current!.outcomeDigest,
    });
  });

  it('preserves the retained root output-declaration ranking delta', () => {
    const retained = JSON.parse(readFileSync(REPORT_V5_PATH, 'utf8')) as {
      readonly changes: ReadonlyArray<{
        readonly name: string;
        readonly backendPassed: Readonly<Record<string, number>>;
        readonly outcomeDigest: string;
      }>;
    };
    expect(retained.changes[0]).toMatchObject({
      name: 'root',
      backendPassed: { interpreter: 5, 'native-direct': 0, 'native-emitted': 0 },
      outcomeDigest: '4d12f6bb9eab61d7e9742e7da6415c931034ded3a7d4e15144593d8f510c1209',
    });
  });

  it('preserves the retained root XDM-semantics ranking delta', () => {
    const retained = JSON.parse(readFileSync(REPORT_V6_PATH, 'utf8')) as {
      readonly changes: ReadonlyArray<{
        readonly name: string;
        readonly backendPassed: Readonly<Record<string, number>>;
        readonly outcomeDigest: string;
      }>;
    };
    expect(retained.changes[0]).toMatchObject({
      name: 'root',
      backendPassed: { interpreter: 8, 'native-direct': 0, 'native-emitted': 0 },
      outcomeDigest: '3d4e0dd2ecbe5eaee9271c61afaa23e62fb1da1016444bdd9191a6dffa9cf1a1',
    });
  });

  it('preserves the retained document-node ranking delta', () => {
    const retained = JSON.parse(readFileSync(REPORT_V7_PATH, 'utf8')) as {
      readonly changes: ReadonlyArray<{
        readonly name: string;
        readonly backendPassed: Readonly<Record<string, number>>;
        readonly outcomeDigest: string;
      }>;
    };
    expect(retained.changes[0]).toMatchObject({
      name: 'root',
      backendPassed: { interpreter: 9, 'native-direct': 0, 'native-emitted': 0 },
      outcomeDigest: '6c0a375ffe7add75fe782971b3cc726a7464d9f4bff2806f999771052bf9fa89',
    });
  });

  it('reproduces the retained completed root-family ranking delta', () => {
    const retained = JSON.parse(readFileSync(REPORT_V8_PATH, 'utf8')) as {
      readonly changes: ReadonlyArray<{
        readonly name: string;
        readonly backendPassed: Readonly<Record<string, number>>;
        readonly outcomeDigest: string;
      }>;
    };
    const current = createXslt30FamilyRanking(REPO_ROOT).candidates.find(
      (candidate) => candidate.name === 'root',
    );

    expect(current).toBeDefined();
    expect(retained.changes[0]).toMatchObject({
      name: 'root',
      backendPassed: current!.backendPassed,
      outcomeDigest: current!.outcomeDigest,
    });
  });

  it('preserves the retained conditional-content ranking delta', () => {
    const retained = JSON.parse(readFileSync(REPORT_V9_PATH, 'utf8')) as {
      readonly changes: ReadonlyArray<{
        readonly name: string;
        readonly backendPassed: Readonly<Record<string, number>>;
        readonly outcomeDigest: string;
      }>;
    };
    expect(retained.changes[0]).toMatchObject({
      name: 'on-non-empty',
      backendPassed: { interpreter: 13, 'native-direct': 1, 'native-emitted': 1 },
      outcomeDigest: '0a44243e8ef3a7893595c957ebd57d436f2ad3d4affcaa9d1edc9f960aed8b9b',
    });
  });

  it('reproduces the retained completed conditional-content family delta', () => {
    const retained = JSON.parse(readFileSync(REPORT_V10_PATH, 'utf8')) as {
      readonly changes: ReadonlyArray<{
        readonly name: string;
        readonly backendPassed: Readonly<Record<string, number>>;
        readonly outcomeDigest: string;
      }>;
    };
    const current = createXslt30FamilyRanking(REPO_ROOT).candidates.find(
      (candidate) => candidate.name === 'on-non-empty',
    );

    expect(current).toBeDefined();
    expect(retained.changes[0]).toMatchObject({
      name: 'on-non-empty',
      backendPassed: current!.backendPassed,
      outcomeDigest: current!.outcomeDigest,
    });
  });
});
