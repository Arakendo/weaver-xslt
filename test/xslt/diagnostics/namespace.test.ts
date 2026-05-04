import { describe, expect, it } from 'vitest';

import { diagnosticReportFromError, formatDiagnostic, assertValidDiagnostic } from '../../../src/diagnostics/index.js';
import { XsltProcessor } from '../../../src/index.js';
import { captureError } from './helpers.js';

describe('XSLT diagnostics', () => {
  it('suggests the closest stylesheet root attribute name for typos', () => {
    const stylesheet = '<xsl:stylesheet verison="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:stylesheet has an unsupported attribute verison.',
      details: [
        { key: 'attributeName', value: 'verison' },
        { key: 'instructionName', value: 'xsl:stylesheet' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'did you mean version="..."?',
        replacement: 'version',
      }],
    });
    expect(report.suggestions[0]?.confidence).toBeCloseTo(5 / 7);
  });

  it('converts known-later stylesheet root attributes into XTSE0090 diagnostics', () => {
    const stylesheet = '<xsl:stylesheet version="3.0" default-mode="special" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:stylesheet attribute default-mode is not yet implemented in the current MVP+3 slice.',
      details: [
        { key: 'attributeName', value: 'default-mode' },
        { key: 'instructionName', value: 'xsl:stylesheet' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove default-mode from xsl:stylesheet in the current MVP+3 slice',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on the stylesheet root', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test" ext:trace="on">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;

    expect(output).toContain('<out');
    expect(output).toContain('xmlns:ext="urn:test"');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on the stylesheet root into XTSE0090 diagnostics', () => {
    const stylesheet = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xsl:version="3.0"></xsl:stylesheet>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:stylesheet cannot use an attribute in the XSLT namespace: xsl:version.',
      details: [
        { key: 'attributeName', value: 'xsl:version' },
        { key: 'instructionName', value: 'xsl:stylesheet' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:version from xsl:stylesheet',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:template declarations', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/" ext:trace="on">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('<out');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:template into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/" xsl:mode="special">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:template cannot use an attribute in the XSLT namespace: xsl:mode.',
      details: [
        { key: 'attributeName', value: 'xsl:mode' },
        { key: 'instructionName', value: 'xsl:template' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:mode from xsl:template',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:param declarations', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:param name="greeting" select="\'hello\'" ext:trace="on"/>',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('hello');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:param into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="greeting" xsl:required="yes"/>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:param cannot use an attribute in the XSLT namespace: xsl:required.',
      details: [
        { key: 'attributeName', value: 'xsl:required' },
        { key: 'instructionName', value: 'xsl:param' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:required from xsl:param',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:with-param declarations', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <out>',
      '      <xsl:apply-templates select="/root/item">',
      '        <xsl:with-param name="greeting" select="\'hello\'" ext:trace="on"/>',
      '      </xsl:apply-templates>',
      '    </out>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <xsl:param name="greeting"/>',
      '    <xsl:value-of select="$greeting"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root><item/></root>').output;
    expect(output).toContain('hello');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:with-param into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="main">',
      '      <xsl:with-param name="greeting" xsl:tunnel="yes" select="\'hello\'"/>',
      '    </xsl:call-template>',
      '  </xsl:template>',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting"/>',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:with-param cannot use an attribute in the XSLT namespace: xsl:tunnel.',
      details: [
        { key: 'attributeName', value: 'xsl:tunnel' },
        { key: 'instructionName', value: 'xsl:with-param' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:tunnel from xsl:with-param',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:output declarations', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:output method="xml" ext:trace="on"/>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('<out');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:output into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:output method="xml" xsl:indent="yes"/>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:output cannot use an attribute in the XSLT namespace: xsl:indent.',
      details: [
        { key: 'attributeName', value: 'xsl:indent' },
        { key: 'instructionName', value: 'xsl:output' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:indent from xsl:output',
        confidence: 1,
      }],
    });
  });

  it('converts an empty stylesheet source into a static diagnostic', () => {
    const stylesheet = '';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet source is empty.',
      suggestions: [{
        kind: 'fix',
        label: 'provide an xsl:stylesheet or xsl:transform document before running the transform',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Stylesheet source is empty.',
      '  help: provide an xsl:stylesheet or xsl:transform document before running the transform',
    ].join('\n'));
  });

  it('adds a suggestion when the stylesheet root is not xsl:stylesheet', () => {
    const stylesheet = '<out/>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'wrap the stylesheet in an xsl:stylesheet or xsl:transform document element',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Stylesheet document element must be xsl:stylesheet or xsl:transform.',
      '--> <stylesheet>:1:1',
      '1 | <out/>',
      '  | ^',
      '  help: wrap the stylesheet in an xsl:stylesheet or xsl:transform document element',
    ].join('\n'));
  });

  it('adds a suggestion when a stylesheet has no templates', () => {
    const stylesheet = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'add at least one xsl:template to the stylesheet',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Stylesheet must declare at least one xsl:template.',
      '--> <stylesheet>:1:1',
      '1 | <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>',
      '  | ^',
      '  help: add at least one xsl:template to the stylesheet',
    ].join('\n'));
  });

  it('adds a suggestion for unsupported template match patterns', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="item[@id]">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item id="1"/></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'use one of the currently supported child-only match patterns: /, /name, name, section/item, *, node(), or text()',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Unsupported template match pattern "item[@id]" in current MVP+3 slice.',
      '--> <stylesheet>:2:24',
      '2 |   <xsl:template match="item[@id]">',
      '  |                        ^^^^^^^^^',
      '  help: use one of the currently supported child-only match patterns: /, /name, name, section/item, *, node(), or text()',
    ].join('\n'));
  });

  it('adds a suggestion when xsl:template is missing match and name', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template>',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'add match="..." or name="..." to xsl:template',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: xsl:template must declare either match or name.',
      '--> <stylesheet>:2:3',
      '2 |   <xsl:template>',
      '  |   ^',
      '  help: add match="..." or name="..." to xsl:template',
    ].join('\n'));
  });

  it('suggests the closest xsl:template attribute name for typos', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template macth="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:template has an unsupported attribute macth.',
      details: [
        { key: 'attributeName', value: 'macth' },
        { key: 'instructionName', value: 'xsl:template' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'did you mean match="..."?',
        replacement: 'match',
        confidence: 0.6,
      }],
    });
  });

  it('adds a suggestion when xsl:template uses mode', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/" mode="special">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'remove mode="..." and use the default mode in the current MVP+3 slice',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: xsl:template mode is not yet implemented in the current MVP+3 slice.',
      '--> <stylesheet>:2:33',
      '2 |   <xsl:template match="/" mode="special">',
      '  |                                 ^^^^^^^',
      '  help: remove mode="..." and use the default mode in the current MVP+3 slice',
    ].join('\n'));
  });

  it('suggests the closest xsl:if attribute name for typos', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:if tset="true()"><out/></xsl:if>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'did you mean test="..."?',
        replacement: 'test',
        confidence: 0.5,
      },
    ]);
  });

  it('suggests the closest xsl:value-of attribute name for typos', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of selct="\'hello\'"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'did you mean select="..."?',
        replacement: 'select',
        confidence: 5 / 6,
      },
    ]);
  });

  it('ignores foreign-namespace attributes on xsl:if instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <xsl:if test="true()" ext:trace="on"><out/></xsl:if>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('<out');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:if into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:if xsl:test="true()" test="true()"><out/></xsl:if>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:if cannot use an attribute in the XSLT namespace: xsl:test.',
      details: [
        { key: 'attributeName', value: 'xsl:test' },
        { key: 'instructionName', value: 'xsl:if' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:test from xsl:if',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:value-of instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="\'hello\'" ext:trace="on"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('hello');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:value-of into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of xsl:select="\'hello\'" select="\'hello\'"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:value-of cannot use an attribute in the XSLT namespace: xsl:select.',
      details: [
        { key: 'attributeName', value: 'xsl:select' },
        { key: 'instructionName', value: 'xsl:value-of' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:select from xsl:value-of',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:apply-templates instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="/root/item" ext:trace="on"/></out>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <xsl:value-of select="."/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>').output;
    expect(output).toContain('apple');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:apply-templates into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates xsl:select="/root/item" select="/root/item"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:apply-templates cannot use an attribute in the XSLT namespace: xsl:select.',
      details: [
        { key: 'attributeName', value: 'xsl:select' },
        { key: 'instructionName', value: 'xsl:apply-templates' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:select from xsl:apply-templates',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:call-template instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="main" ext:trace="on"/>',
      '  </xsl:template>',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('<out');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:call-template into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template xsl:name="main" name="main"/>',
      '  </xsl:template>',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:call-template cannot use an attribute in the XSLT namespace: xsl:name.',
      details: [
        { key: 'attributeName', value: 'xsl:name' },
        { key: 'instructionName', value: 'xsl:call-template' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:name from xsl:call-template',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:choose instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <xsl:choose ext:trace="on">',
      '      <xsl:when test="true()"><out/></xsl:when>',
      '    </xsl:choose>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('<out');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:choose into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:choose xsl:trace="on">',
      '      <xsl:when test="true()"><out/></xsl:when>',
      '    </xsl:choose>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:choose cannot use an attribute in the XSLT namespace: xsl:trace.',
      details: [
        { key: 'attributeName', value: 'xsl:trace' },
        { key: 'instructionName', value: 'xsl:choose' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:trace from xsl:choose',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:when instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <xsl:choose>',
      '      <xsl:when test="true()" ext:trace="on"><out/></xsl:when>',
      '    </xsl:choose>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('<out');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:when into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:choose>',
      '      <xsl:when xsl:test="true()" test="true()"><out/></xsl:when>',
      '    </xsl:choose>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:when cannot use an attribute in the XSLT namespace: xsl:test.',
      details: [
        { key: 'attributeName', value: 'xsl:test' },
        { key: 'instructionName', value: 'xsl:when' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:test from xsl:when',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:otherwise instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <xsl:choose>',
      '      <xsl:when test="false()"><skip/></xsl:when>',
      '      <xsl:otherwise ext:trace="on"><out/></xsl:otherwise>',
      '    </xsl:choose>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('<out');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:otherwise into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:choose>',
      '      <xsl:when test="false()"><skip/></xsl:when>',
      '      <xsl:otherwise xsl:trace="on"><out/></xsl:otherwise>',
      '    </xsl:choose>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:otherwise cannot use an attribute in the XSLT namespace: xsl:trace.',
      details: [
        { key: 'attributeName', value: 'xsl:trace' },
        { key: 'instructionName', value: 'xsl:otherwise' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:trace from xsl:otherwise',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:for-each instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <out><xsl:for-each select="/root/item" ext:trace="on"><xsl:value-of select="."/></xsl:for-each></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root><item>apple</item><item>pear</item></root>').output;
    expect(output).toContain('apple');
    expect(output).toContain('pear');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:for-each into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:for-each xsl:select="/root/item" select="/root/item"><xsl:value-of select="."/></xsl:for-each></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:for-each cannot use an attribute in the XSLT namespace: xsl:select.',
      details: [
        { key: 'attributeName', value: 'xsl:select' },
        { key: 'instructionName', value: 'xsl:for-each' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:select from xsl:for-each',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:comment instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <xsl:comment ext:trace="on">hello</xsl:comment>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('<!--hello-->');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:comment into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:comment xsl:trace="on">hello</xsl:comment>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:comment cannot use an attribute in the XSLT namespace: xsl:trace.',
      details: [
        { key: 'attributeName', value: 'xsl:trace' },
        { key: 'instructionName', value: 'xsl:comment' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:trace from xsl:comment',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on xsl:text instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <out><xsl:text ext:trace="on">hello</xsl:text></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('hello');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on xsl:text into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:text xsl:trace="on">hello</xsl:text></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:text cannot use an attribute in the XSLT namespace: xsl:trace.',
      details: [
        { key: 'attributeName', value: 'xsl:trace' },
        { key: 'instructionName', value: 'xsl:text' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:trace from xsl:text',
        confidence: 1,
      }],
    });
  });

  it('ignores foreign-namespace attributes on local xsl:variable instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ext="urn:test">',
      '  <xsl:template match="/">',
      '    <xsl:variable name="greeting" select="\'hello\'" ext:trace="on"/>',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const output = new XsltProcessor(stylesheet).transform('<root/>').output;
    expect(output).toContain('hello');
    expect(output).not.toContain('ext:trace=');
  });

  it('converts XSLT-namespace attributes on local xsl:variable into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:variable xsl:name="greeting" name="greeting" select="\'hello\'"/>',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0090',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:variable cannot use an attribute in the XSLT namespace: xsl:name.',
      details: [
        { key: 'attributeName', value: 'xsl:name' },
        { key: 'instructionName', value: 'xsl:variable' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'remove xsl:name from xsl:variable',
        confidence: 1,
      }],
    });
  });
});
