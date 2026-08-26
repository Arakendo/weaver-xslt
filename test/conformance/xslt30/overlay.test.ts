import { describe, expect, it } from 'vitest';

import { loadXslt30Overlay, XSLT30_REVISION, XSLT30_SUITE } from './overlay.js';

describe('XSLT30 profile overlay', () => {
  it('preserves the established MVP+3 selection and pinned suite identity', () => {
    const overlay = loadXslt30Overlay();

    expect(overlay).toMatchObject({
      schemaVersion: 1,
      suite: XSLT30_SUITE,
      suiteRevision: XSLT30_REVISION,
      profile: 'weaver-mvp3-v1',
      requiredBackends: ['interpreter'],
    });
    expect(overlay.cases).toHaveLength(73);
    expect(overlay.cases.every((testCase) => testCase.selection === 'selected')).toBe(true);
  });
});
