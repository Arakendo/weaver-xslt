import { describe, expect, it } from 'vitest';

import { transform } from './generated-fixture-debugger.fixture.js';

describe('generated fixture debugger sanity', () => {
  it('runs a checked-in generated module with an inspectable ctx', () => {
    const ctx = {
      parameters: {
        requestedBy: 'debugger-sanity',
      },
      baseUri: 'memory:/generated-fixtures/hello.xml',
    };

    expect(transform('<root><name>world</name></root>', ctx).output).toBe('<hello>world</hello>');
  });
});