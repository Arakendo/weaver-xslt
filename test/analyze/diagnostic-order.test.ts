import { describe, expect, it } from 'vitest';

import { compileStylesheetArtifacts } from '../../src/compile.js';

describe('compile artifact diagnostic ordering', () => {
  it('returns diagnostics in canonical source order for non-CLI consumers', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="item">',
      '    <xsl:param name="first-unused"/>',
      '    <one/>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <two/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'diagnostic-order.xsl' });

    expect(artifacts.diagnostics.map((report) => report.code)).toEqual([
      'WEAVER_ANALYZE_UNUSED_TEMPLATE_PARAM',
      'WEAVER_ANALYZE_PRIORITY_CONFLICT',
    ]);
    expect(artifacts.diagnostics.map((report) => report.primary?.lineStart)).toEqual([3, 6]);
  });
});