import { describe, expect, it } from 'vitest';

import { assertValidDiagnostic, formatDiagnostic } from '../../src/diagnostics/index.js';
import { compileStylesheetArtifacts } from '../../src/compile.js';

describe('analyze unused template params', () => {
  it('reports a warning for a template parameter that is never referenced', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:param name="unused"/>',
      '    <out>ok</out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'unused-template-param.xsl' });
    const [report] = artifacts.diagnostics;

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(report).toBeDefined();
    assertValidDiagnostic(report!);
    expect(report).toMatchObject({
      code: 'WEAVER_ANALYZE_UNUSED_TEMPLATE_PARAM',
      phase: 'compile',
      severity: 'warning',
      category: 'analysis',
      message: 'Template parameter unused is never referenced within its template.',
    });
    expect(formatDiagnostic(report!, stylesheet)).toBe([
      'warning[WEAVER_ANALYZE_UNUSED_TEMPLATE_PARAM]: Template parameter unused is never referenced within its template.',
      '--> unused-template-param.xsl:3:22',
      '3 |     <xsl:param name="unused"/>',
      '  |                      ^^^^^^',
      '  in template / (unused-template-param.xsl:3:22)',
      '  = paramName: unused',
      '  hint: remove the parameter or reference $unused from the template body or parameter defaults',
    ].join('\n'));
  });

  it('does not report a warning for a template parameter referenced from the template body', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:param name="used"/>',
      '    <xsl:value-of select="$used"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'used-template-param.xsl' });

    expect(artifacts.diagnostics).toEqual([]);
  });

  it('still reports a warning when a local variable shadows the template parameter', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:param name="name"/>',
      '    <xsl:variable name="name" select="\'local\'"/>',
      '    <xsl:value-of select="$name"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'shadowed-template-param.xsl' });

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(artifacts.diagnostics[0]?.code).toBe('WEAVER_ANALYZE_UNUSED_TEMPLATE_PARAM');
  });
});