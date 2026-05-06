import { describe, expect, it } from 'vitest';

import { assertValidDiagnostic, formatDiagnostic } from '../../src/diagnostics/index.js';
import { compileStylesheetArtifacts } from '../../src/compile.js';

describe('analyze unused global bindings', () => {
  it('reports a warning for an unused stylesheet variable', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:variable name="unused" select="\'value\'"/>',
      '  <xsl:template match="/">',
      '    <out>ok</out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'unused-global-variable.xsl' });
    const [report] = artifacts.diagnostics;

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(report).toBeDefined();
    assertValidDiagnostic(report!);
    expect(report).toMatchObject({
      code: 'WEAVER_ANALYZE_UNUSED_GLOBAL_VARIABLE',
      phase: 'compile',
      severity: 'warning',
      category: 'analysis',
      message: 'Stylesheet variable unused is never referenced from any reachable template or global binding.',
    });
    expect(formatDiagnostic(report!, stylesheet)).toBe([
      'warning[WEAVER_ANALYZE_UNUSED_GLOBAL_VARIABLE]: Stylesheet variable unused is never referenced from any reachable template or global binding.',
      '--> unused-global-variable.xsl:2:23',
      '2 |   <xsl:variable name="unused" select="\'value\'"/>',
      '  |                       ^^^^^^',
      '  in instruction xsl:variable name="unused" (unused-global-variable.xsl:2:23)',
      '  = variableName: unused',
      '  hint: remove the stylesheet variable or reference $unused from a reachable template or global binding',
    ].join('\n'));
  });

  it('does not report a warning for a stylesheet variable used transitively through another global binding', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:variable name="base" select="\'value\'"/>',
      '  <xsl:variable name="derived" select="$base"/>',
      '  <xsl:template match="/">',
      '    <xsl:value-of select="$derived"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'used-global-variable.xsl' });

    expect(artifacts.diagnostics).toEqual([]);
  });

  it('reports a warning for an unused stylesheet parameter even when a template parameter shadows the name', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="shared"/>',
      '  <xsl:template match="/">',
      '    <xsl:param name="shared"/>',
      '    <xsl:value-of select="$shared"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'unused-global-param.xsl' });

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(artifacts.diagnostics[0]).toMatchObject({
      code: 'WEAVER_ANALYZE_UNUSED_GLOBAL_PARAM',
      message: 'Stylesheet parameter shared is never referenced from any reachable template or global binding.',
    });
  });

  it('does not report a warning for a stylesheet parameter used from a matched template', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="used"/>',
      '  <xsl:template match="/">',
      '    <xsl:value-of select="$used"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'used-global-param.xsl' });

    expect(artifacts.diagnostics).toEqual([]);
  });
});