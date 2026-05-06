import { describe, expect, it } from 'vitest';

import { assertValidDiagnostic, formatDiagnostic } from '../../src/diagnostics/index.js';
import { compileStylesheetArtifacts } from '../../src/compile.js';

describe('analyze template priority conflicts', () => {
  it('reports a warning when two overlapping templates have the same effective priority', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="item">',
      '    <one/>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <two/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'priority-conflict.xsl' });
    const [report] = artifacts.diagnostics;

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(report).toBeDefined();
    assertValidDiagnostic(report!);
    expect(report).toMatchObject({
      code: 'WEAVER_ANALYZE_PRIORITY_CONFLICT',
      phase: 'compile',
      severity: 'warning',
      category: 'analysis',
      message: 'Template match "item" has the same effective priority 0 as an earlier overlapping template; declaration order decides which one wins.',
    });
    expect(formatDiagnostic(report!, stylesheet)).toBe([
      'warning[WEAVER_ANALYZE_PRIORITY_CONFLICT]: Template match "item" has the same effective priority 0 as an earlier overlapping template; declaration order decides which one wins.',
      '--> priority-conflict.xsl:5:24',
      '5 |   <xsl:template match="item">',
      '  |                        ^^^^',
      '  in template item (priority-conflict.xsl:5:24)',
      'related:',
      '  earlier overlapping template match="item" (priority-conflict.xsl:2:24)',
      '  = matchPattern: item',
      '  = priority: 0',
      '  = earlierMatchPattern: item',
      '  = earlierPriority: 0',
      '  hint: set an explicit priority or narrow one of the overlapping match patterns',
    ].join('\n'));
  });

  it('does not report a warning when the later overlapping template has a higher explicit priority', () => {
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

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'priority-no-conflict.xsl' });

    expect(artifacts.diagnostics).toEqual([]);
  });

  it('reports a warning for overlapping supported patterns with equal explicit priority', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="*" priority="1">',
      '    <one/>',
      '  </xsl:template>',
      '  <xsl:template match="item" priority="1">',
      '    <two/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'priority-overlap-conflict.xsl' });

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(artifacts.diagnostics[0]).toMatchObject({
      code: 'WEAVER_ANALYZE_PRIORITY_CONFLICT',
      message: 'Template match "item" has the same effective priority 1 as an earlier overlapping template; declaration order decides which one wins.',
    });
  });
});