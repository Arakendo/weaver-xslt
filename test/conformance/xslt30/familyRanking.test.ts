import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createXslt30FamilyRanking } from './familyRanking.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const REPORT_PATH = join(REPO_ROOT, 'corpus', 'reports', 'xslt30-family-ranking-v1.json');

describe('XSLT30 complete-family execution ranking', () => {
  it('reproduces the retained ranking and per-family outcome digests', () => {
    const retained: unknown = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));

    expect(createXslt30FamilyRanking(REPO_ROOT)).toEqual(retained);
  });
});
