import { describe, expect, it } from 'vitest';

import { formatDiagnostic, assertValidDiagnostic } from '../../src/diagnostics/index.js';
import { compileStylesheetArtifacts } from '../../src/compile.js';

describe('analyze unused named templates', () => {
  it('reports a warning for a named template that is unreachable from matched templates', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out>ok</out>',
      '  </xsl:template>',
      '  <xsl:template name="tail">',
      '    <tail>unused</tail>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'unused-named-template.xsl' });
    const [report] = artifacts.diagnostics;

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(report).toBeDefined();
    assertValidDiagnostic(report!);
    expect(report).toMatchObject({
      code: 'WEAVER_ANALYZE_UNUSED_TEMPLATE',
      phase: 'compile',
      severity: 'warning',
      category: 'analysis',
      message: 'Named template tail is never called from any matched template.',
    });
    expect(formatDiagnostic(report!, stylesheet)).toBe([
      'warning[WEAVER_ANALYZE_UNUSED_TEMPLATE]: Named template tail is never called from any matched template.',
      '--> unused-named-template.xsl:5:23',
      '5 |   <xsl:template name="tail">',
      '  |                       ^^^^',
      '  in template tail (unused-named-template.xsl:5:23)',
      '  = templateName: tail',
      '  hint: remove the template or add an xsl:call-template that reaches it from a matched template',
    ].join('\n'));
  });

  it('does not report a warning for a named template reachable from a matched template', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="tail"/>',
      '  </xsl:template>',
      '  <xsl:template name="tail">',
      '    <tail>used</tail>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'used-named-template.xsl' });

    expect(artifacts.diagnostics).toEqual([]);
  });
});