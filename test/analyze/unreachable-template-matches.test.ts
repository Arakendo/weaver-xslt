import { describe, expect, it } from 'vitest';

import { assertValidDiagnostic, formatDiagnostic } from '../../src/diagnostics/index.js';
import { compileStylesheetArtifacts } from '../../src/compile.js';

describe('analyze unreachable template matches', () => {
  it('reports a warning when an earlier overlapping template has higher priority', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="item" priority="1">',
      '    <one/>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <two/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'unreachable-template-match.xsl' });
    const [report] = artifacts.diagnostics;

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(report).toBeDefined();
    assertValidDiagnostic(report!);
    expect(report).toMatchObject({
      code: 'WEAVER_ANALYZE_UNREACHABLE_TEMPLATE_MATCH',
      phase: 'compile',
      severity: 'warning',
      category: 'analysis',
      message: 'Template match "item" is unreachable because an earlier overlapping template has higher effective priority 1.',
    });
    expect(formatDiagnostic(report!, stylesheet)).toBe([
      'warning[WEAVER_ANALYZE_UNREACHABLE_TEMPLATE_MATCH]: Template match "item" is unreachable because an earlier overlapping template has higher effective priority 1.',
      '--> unreachable-template-match.xsl:5:24',
      '5 |   <xsl:template match="item">',
      '  |                        ^^^^',
      '  in template item (unreachable-template-match.xsl:5:24)',
      'related:',
      '  shadowing template match="item" (unreachable-template-match.xsl:2:24)',
      '  = matchPattern: item',
      '  = priority: 0',
      '  = shadowingMatchPattern: item',
      '  = shadowingPriority: 1',
      '  hint: raise the template priority or narrow the earlier overlapping match pattern',
    ].join('\n'));
  });

  it('does not report a warning when the later overlapping template has equal or higher priority', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="item">',
      '    <one/>',
      '  </xsl:template>',
      '  <xsl:template match="item" priority="1">',
      '    <two/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'reachable-template-match.xsl' });

    expect(artifacts.diagnostics).toEqual([]);
  });

  it('reports a warning when a higher-priority wildcard template shadows a later name test', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="*" priority="1">',
      '    <one/>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <two/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'wildcard-shadowed-item.xsl' });

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(artifacts.diagnostics[0]).toMatchObject({
      code: 'WEAVER_ANALYZE_UNREACHABLE_TEMPLATE_MATCH',
      message: 'Template match "item" is unreachable because an earlier overlapping template has higher effective priority 1.',
    });
  });

  it('does not report a warning when templates overlap but the earlier absolute pattern does not subsume the later one', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/section/item" priority="1">',
      '    <one/>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <two/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'absolute-overlap-not-shadowing.xsl' });

    expect(artifacts.diagnostics).toEqual([]);
  });

  it('reports a warning when an earlier relative pattern subsumes a later more specific pattern', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="item" priority="1">',
      '    <one/>',
      '  </xsl:template>',
      '  <xsl:template match="section/item">',
      '    <two/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'relative-shadowing-specific.xsl' });

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(artifacts.diagnostics[0]).toMatchObject({
      code: 'WEAVER_ANALYZE_UNREACHABLE_TEMPLATE_MATCH',
      message: 'Template match "section/item" is unreachable because an earlier overlapping template has higher effective priority 1.',
    });
  });
});