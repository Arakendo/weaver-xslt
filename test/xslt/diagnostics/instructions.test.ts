import { describe, expect, it } from 'vitest';

import {
  diagnosticReportFromError,
  formatDiagnostic,
  assertValidDiagnostic,
} from '../../../src/diagnostics/index.js';
import { XsltProcessor } from '../../../src/index.js';
import { captureError } from './helpers.js';

describe('XSLT diagnostics', () => {
  it('supports xsl:apply-templates mode without diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="/root/item" mode="special"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const result = new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');

    expect(result.output).toBe('<out>apple</out>');
  });

  it('adds a suggestion when xsl:apply-templates has non-xsl:with-param children', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:apply-templates select="/root/item">',
      '      <xsl:text>ignored</xsl:text>',
      '    </xsl:apply-templates>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'replace the child with xsl:with-param or remove it from xsl:apply-templates',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: xsl:apply-templates only supports xsl:with-param children; found xsl:text.',
        '--> <stylesheet>:4:8',
        '4 |       <xsl:text>ignored</xsl:text>',
        '  |        ^^^^^^^^',
        '  help: replace the child with xsl:with-param or remove it from xsl:apply-templates',
      ].join('\n'),
    );
  });

  it('adds a suggestion when xsl:call-template has non-xsl:with-param children', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="main">',
      '      <xsl:text>ignored</xsl:text>',
      '    </xsl:call-template>',
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
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'replace the child with xsl:with-param or remove it from xsl:call-template',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: xsl:call-template only supports xsl:with-param children; found xsl:text.',
        '--> <stylesheet>:4:8',
        '4 |       <xsl:text>ignored</xsl:text>',
        '  |        ^^^^^^^^',
        '  help: replace the child with xsl:with-param or remove it from xsl:call-template',
      ].join('\n'),
    );
  });

  it('adds a suggestion when xsl:value-of is missing select', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'add a select="..." attribute to xsl:value-of',
        replacement: 'select="..."',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: xsl:value-of requires a select attribute.',
        '--> <stylesheet>:3:10',
        '3 |     <out><xsl:value-of/></out>',
        '  |          ^',
        '  help: add a select="..." attribute to xsl:value-of',
      ].join('\n'),
    );
  });

  it('adds a suggestion when xsl:if is missing test', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:if><out/></xsl:if>',
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
        label: 'add a test="..." attribute to xsl:if',
        replacement: 'test="..."',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: xsl:if requires a test attribute.',
        '--> <stylesheet>:3:5',
        '3 |     <xsl:if><out/></xsl:if>',
        '  |     ^',
        '  help: add a test="..." attribute to xsl:if',
      ].join('\n'),
    );
  });

  it('adds a suggestion when xsl:call-template is missing name', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template/>',
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
        label: 'add a name="..." attribute to xsl:call-template',
        replacement: 'name="..."',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: xsl:call-template requires a name attribute.',
        '--> <stylesheet>:3:5',
        '3 |     <xsl:call-template/>',
        '  |     ^',
        '  help: add a name="..." attribute to xsl:call-template',
      ].join('\n'),
    );
  });

  it('adds a suggestion when local xsl:variable is missing name', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:variable select="\'hello\'"/>',
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
        label: 'add a name="..." attribute to xsl:variable',
        replacement: 'name="..."',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: xsl:variable requires a name attribute.',
        '--> <stylesheet>:3:5',
        '3 |     <xsl:variable select="\'hello\'"/>',
        '  |     ^',
        '  help: add a name="..." attribute to xsl:variable',
      ].join('\n'),
    );
  });

  it('adds a suggestion when local xsl:variable mixes select and content', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:variable name="greeting" select="\'hello\'">ignored</xsl:variable>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0620',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:variable cannot specify both a select attribute and a sequence constructor.',
      details: [{ key: 'variableName', value: 'greeting' }],
      suggestions: [
        {
          kind: 'fix',
          label: 'remove select="..." or remove xsl:variable content',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0620]: xsl:variable cannot specify both a select attribute and a sequence constructor.',
        '--> <stylesheet>:3:43',
        '3 |     <xsl:variable name="greeting" select="\'hello\'">ignored</xsl:variable>',
        '  |                                           ^^^^^^^',
        '  = variableName: greeting',
        '  help: remove select="..." or remove xsl:variable content',
      ].join('\n'),
    );
  });

  it('surfaces malformed XPath syntax in xsl:if test attributes', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:if test="1 + "><out/></xsl:if>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPST0003',
      phase: 'compile',
      category: 'syntax',
      primary: expect.objectContaining({
        uri: '<xpath>',
      }),
    });
  });

  it('reports unknown namespace prefixes in xsl:call-template names precisely', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="missing:main"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPST0081',
      phase: 'compile',
      category: 'syntax',
      message: 'Unknown namespace prefix "missing" in xsl:call-template name.',
      details: [
        { key: 'namespacePrefix', value: 'missing' },
        { key: 'qName', value: 'missing:main' },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XPST0081]: Unknown namespace prefix "missing" in xsl:call-template name.',
        '--> <stylesheet>:3:30',
        '3 |     <xsl:call-template name="missing:main"/>',
        '  |                              ^^^^^^^^^^^^',
        '  = namespacePrefix: missing',
        '  = qName: missing:main',
      ].join('\n'),
    );
  });

  it('surfaces malformed XPath syntax in xsl:value-of select attributes', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="1 + "/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPST0003',
      phase: 'compile',
      category: 'syntax',
      primary: expect.objectContaining({
        uri: '<xpath>',
      }),
    });
  });

  it('wraps malformed xsl:value-of select syntax with stylesheet instruction context', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="1 + "/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.causes).toHaveLength(1);
    expect(report.causes[0]).toMatchObject({
      code: 'XPST0003',
      phase: 'compile',
      primary: expect.objectContaining({ uri: '<xpath>' }),
    });
    expect(report.related).toEqual([
      {
        label: 'containing instruction',
        span: {
          uri: '<stylesheet>',
          offsetStart: 138,
          offsetEnd: 142,
          lineStart: 3,
          columnStart: 32,
          lineEnd: 3,
          columnEnd: 36,
        },
      },
    ]);
    expect(report.frames).toEqual([
      {
        kind: 'instruction',
        label: 'xsl:value-of select="1 + "',
        span: {
          uri: '<stylesheet>',
          offsetStart: 138,
          offsetEnd: 142,
          lineStart: 3,
          columnStart: 32,
          lineEnd: 3,
          columnEnd: 36,
        },
      },
    ]);

    expect(formatDiagnostic(report, '1 + ')).toBe(
      [
        'error[XPST0003]: Unexpected token "".',
        '--> <xpath>:1:5',
        '1 | 1 + ',
        '  |     ^',
        '  in instruction xsl:value-of select="1 + " (<stylesheet>:3:32)',
        'related:',
        '  containing instruction (<stylesheet>:3:32)',
      ].join('\n'),
    );
  });

  it('surfaces malformed XPath syntax in xsl:apply-templates select attributes', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="1 + "/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPST0003',
      phase: 'compile',
      category: 'syntax',
      primary: expect.objectContaining({
        uri: '<xpath>',
      }),
    });
  });

  it('reports unknown namespace prefixes in local xsl:variable names precisely', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:variable name="missing:value" select="\'hello\'"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPST0081',
      phase: 'compile',
      category: 'syntax',
      message: 'Unknown namespace prefix "missing" in xsl:variable name.',
      details: [
        { key: 'namespacePrefix', value: 'missing' },
        { key: 'qName', value: 'missing:value' },
      ],
    });
  });

  it('reports unknown namespace prefixes in xsl:with-param names precisely', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="main">',
      '      <xsl:with-param name="missing:value" select="\'hello\'"/>',
      '    </xsl:call-template>',
      '  </xsl:template>',
      '  <xsl:template name="main"/>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPST0081',
      phase: 'compile',
      category: 'syntax',
      message: 'Unknown namespace prefix "missing" in xsl:with-param name.',
      details: [
        { key: 'namespacePrefix', value: 'missing' },
        { key: 'qName', value: 'missing:value' },
      ],
    });
  });

  it('surfaces malformed XPath syntax in xsl:template match attributes', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="1 + "><out/></xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPST0003',
      phase: 'compile',
      category: 'syntax',
      primary: expect.objectContaining({
        uri: '<xpath>',
      }),
    });
  });

  it('wraps malformed xsl:template match syntax with stylesheet template context', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="1 + "><out/></xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.causes).toHaveLength(1);
    expect(report.causes[0]).toMatchObject({
      code: 'XPST0003',
      phase: 'compile',
      primary: expect.objectContaining({ uri: '<xpath>' }),
    });
    expect(report.related).toEqual([
      {
        label: 'containing template',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 107,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 28,
        },
      },
    ]);
    expect(report.frames).toEqual([
      {
        kind: 'template',
        label: 'match="1 + "',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 107,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 28,
        },
      },
    ]);

    expect(formatDiagnostic(report, '1 + ')).toBe(
      [
        'error[XPST0003]: Unexpected token "".',
        '--> <xpath>:1:5',
        '1 | 1 + ',
        '  |     ^',
        '  in template match="1 + " (<stylesheet>:2:24)',
        'related:',
        '  containing template (<stylesheet>:2:24)',
      ].join('\n'),
    );
  });

  it('surfaces malformed XPath syntax in xsl:param select attributes', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" select="1 + "/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPST0003',
      phase: 'compile',
      category: 'syntax',
      primary: expect.objectContaining({
        uri: '<xpath>',
      }),
    });
  });

  it('wraps malformed xsl:param select syntax with stylesheet instruction context', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" select="1 + "/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.causes).toHaveLength(1);
    expect(report.causes[0]).toMatchObject({
      code: 'XPST0003',
      phase: 'compile',
      primary: expect.objectContaining({ uri: '<xpath>' }),
    });
    expect(report.related).toEqual([
      {
        label: 'containing instruction',
        span: {
          uri: '<stylesheet>',
          offsetStart: 148,
          offsetEnd: 152,
          lineStart: 3,
          columnStart: 40,
          lineEnd: 3,
          columnEnd: 44,
        },
      },
    ]);
    expect(report.frames).toEqual([
      {
        kind: 'instruction',
        label: 'xsl:param select="1 + "',
        span: {
          uri: '<stylesheet>',
          offsetStart: 148,
          offsetEnd: 152,
          lineStart: 3,
          columnStart: 40,
          lineEnd: 3,
          columnEnd: 44,
        },
      },
    ]);

    expect(formatDiagnostic(report, '1 + ')).toBe(
      [
        'error[XPST0003]: Unexpected token "".',
        '--> <xpath>:1:5',
        '1 | 1 + ',
        '  |     ^',
        '  in instruction xsl:param select="1 + " (<stylesheet>:3:40)',
        'related:',
        '  containing instruction (<stylesheet>:3:40)',
      ].join('\n'),
    );
  });

  it('surfaces malformed XPath syntax in top-level xsl:variable select attributes', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:variable name="greeting" select="1 + "/>',
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
      code: 'XPST0003',
      phase: 'compile',
      category: 'syntax',
      primary: expect.objectContaining({
        uri: '<xpath>',
      }),
    });
  });

  it('reports unknown namespace prefixes in xsl:param names precisely', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="missing:value"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPST0081',
      phase: 'compile',
      category: 'syntax',
      message: 'Unknown namespace prefix "missing" in xsl:param name.',
      details: [
        { key: 'namespacePrefix', value: 'missing' },
        { key: 'qName', value: 'missing:value' },
      ],
    });
  });

  it('reports unknown namespace prefixes in xsl:template names precisely', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="missing:main">',
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
      code: 'XPST0081',
      phase: 'compile',
      category: 'syntax',
      message: 'Unknown namespace prefix "missing" in xsl:template name.',
      details: [
        { key: 'namespacePrefix', value: 'missing' },
        { key: 'qName', value: 'missing:main' },
      ],
    });
  });
});
