import { describe, expect, it } from 'vitest';

import { assertValidDiagnostic, formatDiagnostic } from '../../src/diagnostics/index.js';
import { compileStylesheetArtifacts } from '../../src/compile.js';

describe('analyze unused local variables', () => {
  it('reports a warning for a local variable that is never referenced', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:variable name="unused" select="\'value\'"/>',
      '    <out>ok</out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'unused-local-variable.xsl' });
    const [report] = artifacts.diagnostics;

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(report).toBeDefined();
    assertValidDiagnostic(report!);
    expect(report).toMatchObject({
      code: 'WEAVER_ANALYZE_UNUSED_VARIABLE',
      phase: 'compile',
      severity: 'warning',
      category: 'analysis',
      message: 'Local variable unused is never referenced within its scope.',
    });
    expect(formatDiagnostic(report!, stylesheet)).toBe([
      'warning[WEAVER_ANALYZE_UNUSED_VARIABLE]: Local variable unused is never referenced within its scope.',
      '--> unused-local-variable.xsl:3:25',
      '3 |     <xsl:variable name="unused" select="\'value\'"/>',
      '  |                         ^^^^^^',
      '  in template / (unused-local-variable.xsl:3:25)',
      '  = variableName: unused',
      '  hint: remove the variable or reference $unused later in the same scope',
    ].join('\n'));
  });

  it('does not report a warning for a local variable referenced later in the same scope', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:variable name="used" select="\'value\'"/>',
      '    <xsl:value-of select="$used"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'used-local-variable.xsl' });

    expect(artifacts.diagnostics).toEqual([]);
  });

  it('still reports a warning when an XPath let binding shadows the local variable name', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:variable name="value" select="\'outer\'"/>',
      "    <xsl:value-of select=\"let $value := 'inner' return $value\"/>",
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'shadowed-local-variable.xsl' });

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(artifacts.diagnostics[0]?.code).toBe('WEAVER_ANALYZE_UNUSED_VARIABLE');
  });
});