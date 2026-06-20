import { describe, expect, it } from 'vitest';

import {
  diagnosticReportFromError,
  formatDiagnostic,
  assertValidDiagnostic,
} from '../../../src/diagnostics/index.js';
import { XsltProcessor } from '../../../src/index.js';
import type { StylesheetIR } from '../../../src/xslt/compile/ir.js';
import { runTransform } from '../../../src/xslt/eval/transform.js';
import { captureError } from './helpers.js';

describe('XSLT diagnostics', () => {
  it('converts malformed stylesheet XML into typed diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'WEAVER_XML_STYLESHEET_PARSE_ERROR',
      phase: 'compile',
      category: 'syntax',
      message:
        'Stylesheet XML is not well-formed: Opening and ending tag mismatch: "xsl:template" != "xsl:stylesheet".',
      primary: {
        lineStart: 2,
        columnStart: 27,
        lineEnd: 2,
        columnEnd: 28,
      },
      suggestions: [
        {
          kind: 'fix',
          label: 'fix the XML well-formedness error in the stylesheet document',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[WEAVER_XML_STYLESHEET_PARSE_ERROR]: Stylesheet XML is not well-formed: Opening and ending tag mismatch: "xsl:template" != "xsl:stylesheet".',
        '--> <stylesheet>:2:27',
        '2 |   <xsl:template match="/">',
        '  |                           ^',
        '  help: fix the XML well-formedness error in the stylesheet document',
      ].join('\n'),
    );
  });

  it('preserves malformed source XML diagnostics under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sourceXml = '<root>';

    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform(sourceXml, { execution: 'native' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'WEAVER_XML_SOURCE_PARSE_ERROR',
      phase: 'runtime',
      category: 'syntax',
      message: 'Source XML is not well-formed: unclosed xml tag(s): root.',
      primary: {
        lineStart: 1,
        columnStart: 1,
        lineEnd: 1,
        columnEnd: 2,
      },
      suggestions: [
        {
          kind: 'fix',
          label: 'supply a well-formed XML source document',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, sourceXml)).toBe(
      [
        'error[WEAVER_XML_SOURCE_PARSE_ERROR]: Source XML is not well-formed: unclosed xml tag(s): root.',
        '--> <source-xml>:1:1',
        '1 | <root>',
        '  | ^',
        '  help: supply a well-formed XML source document',
      ].join('\n'),
    );
  });

  it('converts unsupported xsl:import declarations into XTSE0165 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:import href="base.xsl"/>',
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
      code: 'XTSE0165',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet import declarations are not yet implemented in the current MVP+3 slice.',
      details: [
        {
          key: 'href',
          value: 'base.xsl',
        },
      ],
      primary: {
        lineStart: 2,
        columnStart: 21,
        lineEnd: 2,
        columnEnd: 29,
      },
      suggestions: [
        {
          kind: 'fix',
          label: 'inline or remove xsl:import in the current MVP+3 slice',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0165]: Stylesheet import declarations are not yet implemented in the current MVP+3 slice.',
        '--> <stylesheet>:2:21',
        '2 |   <xsl:import href="base.xsl"/>',
        '  |                     ^^^^^^^^',
        '  = href: base.xsl',
        '  help: inline or remove xsl:import in the current MVP+3 slice',
      ].join('\n'),
    );
  });

  it('converts unsupported xsl:include declarations into XTSE0165 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:include href="common.xsl"/>',
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
      code: 'XTSE0165',
      phase: 'compile',
      category: 'analysis',
      message:
        'Stylesheet include declarations are not yet implemented in the current MVP+3 slice.',
      details: [
        {
          key: 'href',
          value: 'common.xsl',
        },
      ],
      primary: {
        lineStart: 2,
        columnStart: 22,
        lineEnd: 2,
        columnEnd: 32,
      },
      suggestions: [
        {
          kind: 'fix',
          label: 'inline or remove xsl:include in the current MVP+3 slice',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0165]: Stylesheet include declarations are not yet implemented in the current MVP+3 slice.',
        '--> <stylesheet>:2:22',
        '2 |   <xsl:include href="common.xsl"/>',
        '  |                      ^^^^^^^^^^',
        '  = href: common.xsl',
        '  help: inline or remove xsl:include in the current MVP+3 slice',
      ].join('\n'),
    );
  });

  it('suggests the closest xsl:strip-space attribute name for typos', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:strip-space elments="*"/>',
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
      message: 'xsl:strip-space has an unsupported attribute elments.',
      details: [
        { key: 'attributeName', value: 'elments' },
        { key: 'instructionName', value: 'xsl:strip-space' },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'did you mean elements="..."?',
          replacement: 'elements',
          confidence: 0.875,
        },
      ],
    });
  });

  it('suggests the closest xsl:output attribute name for typos', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:output methd="xml"/>',
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
      message: 'xsl:output has an unsupported attribute methd.',
      details: [
        { key: 'attributeName', value: 'methd' },
        { key: 'instructionName', value: 'xsl:output' },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'did you mean method="..."?',
          replacement: 'method',
          confidence: 5 / 6,
        },
      ],
    });
  });

  it('converts known-later xsl:output attributes into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:output indent="yes"/>',
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
      message: 'xsl:output attribute indent is not yet implemented in the current MVP+3 slice.',
      details: [
        { key: 'attributeName', value: 'indent' },
        { key: 'instructionName', value: 'xsl:output' },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'remove indent from xsl:output or omit xsl:output in the current MVP+3 slice',
          confidence: 1,
        },
      ],
    });
  });

  it('allows xsl:output html method for the Vision corpus', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:output method="html"/>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const output = new XsltProcessor(stylesheet).transform('<root/>').output;

    expect(output).toContain('<out');
  });

  it('converts known-later xsl:output text method into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:output method="text"/>',
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
    expect(report.message).toBe(
      'xsl:output method "text" is not yet implemented in the current MVP+3 slice.',
    );
    expect(report.code).toBe('XTSE0090');
  });

  it('converts known-later xsl:output json method into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:output method="json"/>',
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
    expect(report.message).toBe(
      'xsl:output method "json" is not yet implemented in the current MVP+3 slice.',
    );
    expect(report.code).toBe('XTSE0090');
  });

  it('converts invalid xsl:output methods into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:output method="wat"/>',
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
      message: 'xsl:output has an unsupported method "wat".',
      details: [
        { key: 'method', value: 'wat' },
        { key: 'instructionName', value: 'xsl:output' },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'use method="xml" or omit xsl:output in the current MVP+3 slice',
          confidence: 1,
        },
      ],
    });
  });

  it('suggests the closest xsl:output method value for typos', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:output method="htlm"/>',
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
      message: 'xsl:output has an unsupported method "htlm".',
      details: [
        { key: 'method', value: 'htlm' },
        { key: 'instructionName', value: 'xsl:output' },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'did you mean method="html"?',
          replacement: 'html',
          confidence: 0.5,
        },
      ],
    });
  });

  it('converts missing initialTemplate options into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'Initial template main is not declared in the current stylesheet.',
      details: [
        {
          key: 'initialTemplate',
          value: 'main',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'declare xsl:template name="main" or omit initialTemplate',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: Initial template main is not declared in the current stylesheet.',
        '  = initialTemplate: main',
        '  help: declare xsl:template name="main" or omit initialTemplate',
      ].join('\n'),
    );
  });

  it('preserves XTSE0010 initialTemplate diagnostics under native execution when the stylesheet has no named initial template entry', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', {
        initialTemplate: 'main',
        execution: 'native',
      });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'Initial template main is not declared in the current stylesheet.',
      details: [
        {
          key: 'initialTemplate',
          value: 'main',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'declare xsl:template name="main" or omit initialTemplate',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: Initial template main is not declared in the current stylesheet.',
        '  = initialTemplate: main',
        '  help: declare xsl:template name="main" or omit initialTemplate',
      ].join('\n'),
    );
  });

  it('suggests the closest named template for initialTemplate typos', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'mian' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'did you mean initialTemplate "main"?',
        replacement: 'main',
        confidence: 0.5,
      },
    ]);
  });

  it('preserves XTSE0010 initialTemplate diagnostics under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', {
        initialTemplate: 'mian',
        execution: 'native',
      });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'Initial template mian is not declared in the current stylesheet.',
      details: [
        {
          key: 'initialTemplate',
          value: 'mian',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'did you mean initialTemplate "main"?',
          replacement: 'main',
          confidence: 0.5,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: Initial template mian is not declared in the current stylesheet.',
        '  = initialTemplate: mian',
        '  help: did you mean initialTemplate "main"?',
      ].join('\n'),
    );
  });

  it('converts unsupported initialMode options into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialMode: 'special' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTDE0040',
      phase: 'runtime',
      category: 'execution',
      message: 'Initial modes are not yet implemented in the current MVP+3 slice.',
      details: [
        {
          key: 'mode',
          value: 'special',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'omit initialMode and use the default mode in the current MVP+3 slice',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTDE0040]: Initial modes are not yet implemented in the current MVP+3 slice.',
        '  = mode: special',
        '  help: omit initialMode and use the default mode in the current MVP+3 slice',
      ].join('\n'),
    );
  });

  it('preserves XTDE0040 initialMode diagnostics under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', {
        initialMode: 'special',
        execution: 'native',
      });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTDE0040',
      phase: 'runtime',
      category: 'execution',
      message: 'Initial modes are not yet implemented in the current MVP+3 slice.',
      details: [
        {
          key: 'mode',
          value: 'special',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'omit initialMode and use the default mode in the current MVP+3 slice',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTDE0040]: Initial modes are not yet implemented in the current MVP+3 slice.',
        '  = mode: special',
        '  help: omit initialMode and use the default mode in the current MVP+3 slice',
      ].join('\n'),
    );
  });

  it('converts unsupported native execution requests into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/root">',
      '    <out><xsl:apply-templates select="item[position() &lt; (last() div 2) * (last() div 2) * (last() div 2)]"/></out>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <xsl:value-of select="."/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { execution: 'native' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'WEAVER_XSLT_NATIVE_UNSUPPORTED',
      phase: 'runtime',
      category: 'execution',
      message: 'Requested native execution is not available for this transform.',
      details: [
        {
          key: 'requestedExecution',
          value: 'native',
        },
        {
          key: 'fallbackCode',
          value: 'unsupported_stylesheet',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label:
            'use execution="auto" to allow interpreter fallback while the native surface is still landing',
          confidence: 1,
        },
        {
          kind: 'fix',
          label: 'use execution="interpreter" to stay on the stable runtime path',
          confidence: 0.9,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[WEAVER_XSLT_NATIVE_UNSUPPORTED]: Requested native execution is not available for this transform.',
        '  = requestedExecution: native',
        '  = fallbackCode: unsupported_stylesheet',
        '  help: use execution="auto" to allow interpreter fallback while the native surface is still landing',
        '  help: use execution="interpreter" to stay on the stable runtime path',
      ].join('\n'),
    );
  });

  it('preserves XTDE0640 diagnostics for circular top-level variables under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:variable name="a" select="$b"/>',
      '  <xsl:variable name="b" select="$a"/>',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="$a"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { execution: 'native' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTDE0640',
      phase: 'runtime',
      category: 'execution',
      message: 'Circular top-level variable dependency involving $a.',
      details: [
        {
          key: 'variableName',
          value: 'a',
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTDE0640]: Circular top-level variable dependency involving $a.',
        '--> <stylesheet>:2:23',
        '2 |   <xsl:variable name="a" select="$b"/>',
        '  |                       ^',
        '  in instruction xsl:variable name="a" select="$b" (<stylesheet>:2:23)',
        '  in instruction xsl:variable name="b" select="$a" (<stylesheet>:3:23)',
        'related:',
        '  top-level variable (<stylesheet>:2:23)',
        '  top-level variable (<stylesheet>:3:23)',
        '  = variableName: a',
      ].join('\n'),
    );
  });

  it('converts required xsl:param declarations with select attributes into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" select="\'hello\'" required="yes"/>',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:param with required="yes" cannot also specify a select attribute.',
      details: [
        {
          key: 'paramName',
          value: 'greeting',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'remove required="yes" or remove select="..." from xsl:param',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: xsl:param with required="yes" cannot also specify a select attribute.',
        '--> <stylesheet>:3:59',
        '3 |     <xsl:param name="greeting" select="\'hello\'" required="yes"/>',
        '  |                                                           ^^^',
        '  = paramName: greeting',
        '  help: remove required="yes" or remove select="..." from xsl:param',
      ].join('\n'),
    );
  });

  it('converts duplicate local xsl:param declarations into XTSE0580 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:param name="greeting" select="\'hello\'"/>',
      '    <xsl:param name="greeting" select="\'hi\'"/>',
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
      code: 'XTSE0580',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:template cannot declare duplicate xsl:param name greeting.',
      details: [
        {
          key: 'paramName',
          value: 'greeting',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'rename or remove one of the duplicate xsl:param declarations for greeting',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0580]: xsl:template cannot declare duplicate xsl:param name greeting.',
        '--> <stylesheet>:4:22',
        '4 |     <xsl:param name="greeting" select="\'hi\'"/>',
        '  |                      ^^^^^^^^',
        '  = paramName: greeting',
        '  help: rename or remove one of the duplicate xsl:param declarations for greeting',
      ].join('\n'),
    );
  });

  it('converts duplicate sibling xsl:with-param declarations into XTSE0670 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="target">',
      '    <xsl:param name="greeting"/>',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="target">',
      '      <xsl:with-param name="greeting" select="\'hello\'"/>',
      '      <xsl:with-param name="greeting" select="\'hi\'"/>',
      '    </xsl:call-template>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0670',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:call-template cannot declare duplicate xsl:with-param name greeting.',
      details: [
        {
          key: 'paramName',
          value: 'greeting',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'rename or remove one of the duplicate xsl:with-param declarations for greeting',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0670]: xsl:call-template cannot declare duplicate xsl:with-param name greeting.',
        '--> <stylesheet>:9:29',
        '9 |       <xsl:with-param name="greeting" select="\'hi\'"/>',
        '  |                             ^^^^^^^^',
        '  = paramName: greeting',
        '  help: rename or remove one of the duplicate xsl:with-param declarations for greeting',
      ].join('\n'),
    );
  });

  it('converts duplicate named xsl:template declarations into XTSE0660 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out/>',
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
      code: 'XTSE0660',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet cannot declare duplicate named xsl:template main.',
      details: [
        {
          key: 'templateName',
          value: 'main',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'rename or remove one of the duplicate named templates for main',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0660]: Stylesheet cannot declare duplicate named xsl:template main.',
        '--> <stylesheet>:5:23',
        '5 |   <xsl:template name="main">',
        '  |                       ^^^^',
        '  = templateName: main',
        '  help: rename or remove one of the duplicate named templates for main',
      ].join('\n'),
    );
  });

  it('converts duplicate global binding declarations into XTSE0630 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="glob" select="1"/>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:variable name="glob" select="2"/>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0630',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet cannot declare duplicate global binding glob.',
      details: [
        {
          key: 'bindingName',
          value: 'glob',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'rename or remove one of the duplicate global bindings for glob',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0630]: Stylesheet cannot declare duplicate global binding glob.',
        '--> <stylesheet>:6:23',
        '6 |   <xsl:variable name="glob" select="2"/>',
        '  |                       ^^^^',
        '  = bindingName: glob',
        '  help: rename or remove one of the duplicate global bindings for glob',
      ].join('\n'),
    );
  });

  it('converts xsl:call-template references to undeclared templates into XTSE0650 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="missing"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0650',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:call-template cannot target undeclared template missing.',
      details: [
        {
          key: 'templateName',
          value: 'missing',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'declare xsl:template name="missing" or update xsl:call-template',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0650]: xsl:call-template cannot target undeclared template missing.',
        '--> <stylesheet>:3:30',
        '3 |     <xsl:call-template name="missing"/>',
        '  |                              ^^^^^^^',
        '  = templateName: missing',
        '  help: declare xsl:template name="missing" or update xsl:call-template',
      ].join('\n'),
    );
  });

  it('preserves XTSE0650 call-template diagnostics under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="missing"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { execution: 'native' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0650',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:call-template cannot target undeclared template missing.',
      details: [
        {
          key: 'templateName',
          value: 'missing',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'declare xsl:template name="missing" or update xsl:call-template',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0650]: xsl:call-template cannot target undeclared template missing.',
        '--> <stylesheet>:3:30',
        '3 |     <xsl:call-template name="missing"/>',
        '  |                              ^^^^^^^',
        '  = templateName: missing',
        '  help: declare xsl:template name="missing" or update xsl:call-template',
      ].join('\n'),
    );
  });

  it('suggests the closest named template for xsl:call-template typos', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="mian"/>',
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
        label: 'did you mean xsl:call-template name="main"?',
        replacement: 'main',
        confidence: 0.5,
      },
    ]);
  });

  it('preserves xsl:call-template typo suggestions under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="mian"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { execution: 'native' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'did you mean xsl:call-template name="main"?',
        replacement: 'main',
        confidence: 0.5,
      },
    ]);
  });

  it('suggests the closest named template for runtime xsl:call-template fallback typos', () => {
    const ir = {
      version: '1.0',
      xsltVersion: '3.0',
      namespaces: {},
      defaultElementNamespace: '',
      globalBindings: [],
      templates: [
        {
          name: 'main',
          modes: [],
          params: [],
          body: [
            {
              kind: 'callTemplate',
              name: 'hepler',
              withParams: [],
            },
          ],
        },
        {
          name: 'helper',
          modes: [],
          params: [],
          body: [
            {
              kind: 'literalElement',
              name: 'out',
              attributes: [],
              body: [],
            },
          ],
        },
      ],
    } satisfies StylesheetIR;
    const error = captureError(() => {
      runTransform(ir, '<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0650',
      phase: 'compile',
      category: 'analysis',
      message: 'Named template hepler is not declared in the current stylesheet.',
      details: [
        {
          key: 'templateName',
          value: 'hepler',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'did you mean xsl:call-template name="helper"?',
          replacement: 'helper',
        },
      ],
    });
    expect(report.suggestions[0]?.confidence).toBeCloseTo(2 / 3);
  });

  it('converts undeclared xsl:call-template parameters into XTSE0680 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="target">',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="target">',
      '      <xsl:with-param name="extra" select="1"/>',
      '    </xsl:call-template>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0680',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:call-template cannot pass undeclared parameter extra to template target.',
      details: [
        {
          key: 'parameterName',
          value: 'extra',
        },
        {
          key: 'templateName',
          value: 'target',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'declare xsl:param name="extra" on template target or remove the xsl:with-param',
          confidence: 1,
        },
      ],
    });
  });

  it('preserves XTSE0660 duplicate named-template diagnostics under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template name="main">',
      '    <other/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { execution: 'native' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0660',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet cannot declare duplicate named xsl:template main.',
      details: [
        {
          key: 'templateName',
          value: 'main',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'rename or remove one of the duplicate named templates for main',
          confidence: 1,
        },
      ],
    });
  });

  it('preserves XTSE0630 duplicate global-binding diagnostics under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="greeting"/>',
      '  <xsl:variable name="greeting" select="\'hi\'"/>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { execution: 'native' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0630',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet cannot declare duplicate global binding greeting.',
      details: [
        {
          key: 'bindingName',
          value: 'greeting',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'rename or remove one of the duplicate global bindings for greeting',
          confidence: 1,
        },
      ],
    });
  });

  it('preserves XTSE0680 call-template parameter diagnostics under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="target">',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="target">',
      '      <xsl:with-param name="extra" select="1"/>',
      '    </xsl:call-template>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { execution: 'native' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0680',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:call-template cannot pass undeclared parameter extra to template target.',
      details: [
        {
          key: 'parameterName',
          value: 'extra',
        },
        {
          key: 'templateName',
          value: 'target',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'declare xsl:param name="extra" on template target or remove the xsl:with-param',
          confidence: 1,
        },
      ],
    });
  });

  it('suggests the closest declared parameter for xsl:call-template typos', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="target">',
      '    <xsl:param name="value"/>',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="target">',
      '      <xsl:with-param name="vaule" select="1"/>',
      '    </xsl:call-template>',
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
        label: 'did you mean xsl:with-param name="value"?',
        replacement: 'value',
        confidence: 0.6,
      },
    ]);
  });

  it('preserves xsl:call-template parameter typo suggestions under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="target">',
      '    <xsl:param name="value"/>',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="target">',
      '      <xsl:with-param name="vaule" select="1"/>',
      '    </xsl:call-template>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { execution: 'native' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'did you mean xsl:with-param name="value"?',
        replacement: 'value',
        confidence: 0.6,
      },
    ]);
  });

  it('converts missing required xsl:call-template parameters into XTSE0690 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="target">',
      '    <xsl:param name="required" required="yes"/>',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="target"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0690',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:call-template must supply required parameter required to template target.',
      details: [
        {
          key: 'parameterName',
          value: 'required',
        },
        {
          key: 'templateName',
          value: 'target',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label:
            'add xsl:with-param name="required" to xsl:call-template or make the parameter optional',
          confidence: 1,
        },
      ],
    });
  });

  it('preserves XTSE0690 call-template parameter diagnostics under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="target">',
      '    <xsl:param name="required" required="yes"/>',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="target"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { execution: 'native' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0690',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:call-template must supply required parameter required to template target.',
      details: [
        {
          key: 'parameterName',
          value: 'required',
        },
        {
          key: 'templateName',
          value: 'target',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label:
            'add xsl:with-param name="required" to xsl:call-template or make the parameter optional',
          confidence: 1,
        },
      ],
    });
  });

  it('converts unsupported null-namespace attributes on xsl:variable into XTSE0090 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:variable name="employee" department="\'IT\'"/>',
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
      message: 'xsl:variable has an unsupported attribute department.',
      details: [
        {
          key: 'attributeName',
          value: 'department',
        },
        {
          key: 'instructionName',
          value: 'xsl:variable',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'remove department from xsl:variable',
          confidence: 1,
        },
      ],
    });
  });

  it('converts required xsl:param declarations with content into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" required="yes">hello</xsl:param>',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:param with required="yes" cannot also specify a sequence constructor.',
      details: [
        {
          key: 'paramName',
          value: 'greeting',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'remove required="yes" or remove xsl:param content',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: xsl:param with required="yes" cannot also specify a sequence constructor.',
        '--> <stylesheet>:3:42',
        '3 |     <xsl:param name="greeting" required="yes">hello</xsl:param>',
        '  |                                          ^^^',
        '  = paramName: greeting',
        '  help: remove required="yes" or remove xsl:param content',
      ].join('\n'),
    );
  });

  it('converts xsl:param declarations with select attributes and content into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" select="\'hello\'">ignored</xsl:param>',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0620',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:param cannot specify both a select attribute and a sequence constructor.',
      details: [
        {
          key: 'paramName',
          value: 'greeting',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'remove select="..." or remove xsl:param content',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0620]: xsl:param cannot specify both a select attribute and a sequence constructor.',
        '--> <stylesheet>:3:40',
        '3 |     <xsl:param name="greeting" select="\'hello\'">ignored</xsl:param>',
        '  |                                        ^^^^^^^',
        '  = paramName: greeting',
        '  help: remove select="..." or remove xsl:param content',
      ].join('\n'),
    );
  });

  it('converts top-level xsl:variable declarations with select attributes and content into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:variable name="greeting" select="\'hello\'">ignored</xsl:variable>',
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
      code: 'XTSE0620',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:variable cannot specify both a select attribute and a sequence constructor.',
      details: [
        {
          key: 'variableName',
          value: 'greeting',
        },
      ],
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
        '--> <stylesheet>:2:41',
        '2 |   <xsl:variable name="greeting" select="\'hello\'">ignored</xsl:variable>',
        '  |                                         ^^^^^^^',
        '  = variableName: greeting',
        '  help: remove select="..." or remove xsl:variable content',
      ].join('\n'),
    );
  });

  it('converts xsl:with-param instructions with select attributes and content into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="main">',
      '      <xsl:with-param name="greeting" select="\'hello\'">ignored</xsl:with-param>',
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
    expect(report).toMatchObject({
      code: 'XTSE0620',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:with-param cannot specify both a select attribute and a sequence constructor.',
      details: [
        {
          key: 'paramName',
          value: 'greeting',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'remove select="..." or remove xsl:with-param content',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0620]: xsl:with-param cannot specify both a select attribute and a sequence constructor.',
        '--> <stylesheet>:4:47',
        '4 |       <xsl:with-param name="greeting" select="\'hello\'">ignored</xsl:with-param>',
        '  |                                               ^^^^^^^',
        '  = paramName: greeting',
        '  help: remove select="..." or remove xsl:with-param content',
      ].join('\n'),
    );
  });

  it('converts missing required stylesheet parameters into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="greeting" required="yes"/>',
      '  <xsl:template match="/">',
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
      code: 'XTDE0050',
      phase: 'runtime',
      category: 'execution',
      message: 'Required stylesheet parameter $greeting was not supplied.',
      details: [
        {
          key: 'parameterName',
          value: 'greeting',
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTDE0050]: Required stylesheet parameter $greeting was not supplied.',
        '--> <stylesheet>:2:20',
        '2 |   <xsl:param name="greeting" required="yes"/>',
        '  |                    ^^^^^^^^',
        '  in instruction xsl:param name="greeting" (<stylesheet>:2:20)',
        'related:',
        '  top-level param (<stylesheet>:2:20)',
        '  = parameterName: greeting',
      ].join('\n'),
    );
  });

  it('preserves XTDE0050 diagnostics for missing required stylesheet parameters under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="greeting" required="yes"/>',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { execution: 'native' });
    });
    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);

    assertValidDiagnostic(nativeReport);
    expect(nativeReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it('suggests the closest stylesheet parameter when transform options use a typo', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="greeting" required="yes"/>',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', {
        parameters: {
          greting: 'hello',
        },
      });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'did you mean to pass parameters["greeting"]?',
        replacement: 'greeting',
        confidence: 0.875,
      },
    ]);
  });

  it('preserves XTDE0050 parameter suggestions under native execution when transform options use a typo', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="greeting" required="yes"/>',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const options = {
      parameters: {
        greting: 'hello',
      },
    };
    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', options);
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { ...options, execution: 'native' });
    });
    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);

    assertValidDiagnostic(nativeReport);
    expect(nativeReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it('converts missing required template parameters into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" required="yes"/>',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTDE0700',
      phase: 'runtime',
      category: 'execution',
      message: 'Required template parameter $greeting was not supplied.',
      details: [
        {
          key: 'parameterName',
          value: 'greeting',
        },
      ],
      frames: [
        {
          kind: 'template',
          label: 'name="main"',
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTDE0700]: Required template parameter $greeting was not supplied.',
        '--> <stylesheet>:3:22',
        '3 |     <xsl:param name="greeting" required="yes"/>',
        '  |                      ^^^^^^^^',
        '  in template name="main" (<stylesheet>:2:23)',
        'related:',
        '  initial template (<stylesheet>:2:23)',
        '  = parameterName: greeting',
      ].join('\n'),
    );
  });

  it('preserves XTDE0700 diagnostics for missing required template parameters under native execution', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" required="yes"/>',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const options = {
      initialTemplate: 'main',
    };
    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', options);
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { ...options, execution: 'native' });
    });
    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);

    assertValidDiagnostic(nativeReport);
    expect(nativeReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it('suggests the closest required template parameter when runtime with-param names have a typo', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out>',
      '      <xsl:apply-templates select="/root/item">',
      '        <xsl:with-param name="greting" select="\'hello\'"/>',
      '      </xsl:apply-templates>',
      '    </out>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <xsl:param name="greeting" required="yes"/>',
      '    <xsl:value-of select="$greeting"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item/></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'did you mean xsl:with-param name="greeting"?',
        replacement: 'greeting',
        confidence: 0.875,
      },
    ]);
  });

  it('allows named-only templates when selected via initialTemplate', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out><xsl:value-of select="name(/root)"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    expect(new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' })).toEqual(
      {
        output: '<out>root</out>',
      },
    );
  });

  it('converts unsupported top-level literal result elements into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <out/>',
      '  <xsl:template match="/">',
      '    <ok/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'Unsupported top-level stylesheet element out in current MVP+3 slice.',
      details: [
        {
          key: 'elementName',
          value: 'out',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'move result elements inside xsl:template bodies in the current MVP+3 slice',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: Unsupported top-level stylesheet element out in current MVP+3 slice.',
        '--> <stylesheet>:2:4',
        '2 |   <out/>',
        '  |    ^^^',
        '  = elementName: out',
        '  help: move result elements inside xsl:template bodies in the current MVP+3 slice',
      ].join('\n'),
    );
  });

  it('converts unsupported top-level XSLT declarations into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:decimal-format name="comma" decimal-separator=","/>',
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
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'Unsupported top-level XSLT declaration xsl:decimal-format in current MVP+3 slice.',
      details: [
        {
          key: 'declarationName',
          value: 'xsl:decimal-format',
        },
      ],
      suggestions: [
        {
          kind: 'fix',
          label:
            'remove unsupported top-level declaration xsl:decimal-format in the current MVP+3 slice',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: Unsupported top-level XSLT declaration xsl:decimal-format in current MVP+3 slice.',
        '--> <stylesheet>:2:4',
        '2 |   <xsl:decimal-format name="comma" decimal-separator=","/>',
        '  |    ^^^^^^^^^^^^^^^^^^',
        '  = declarationName: xsl:decimal-format',
        '  help: remove unsupported top-level declaration xsl:decimal-format in the current MVP+3 slice',
      ].join('\n'),
    );
  });

  it('uses the version attribute span when the stylesheet version is empty', () => {
    const stylesheet =
      '<xsl:stylesheet version="" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0500',
      primary: {
        lineStart: 1,
        columnStart: 26,
        lineEnd: 1,
        columnEnd: 26,
      },
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0500]: Stylesheet module must declare a version attribute.',
        '--> <stylesheet>:1:26',
        '1 | <xsl:stylesheet version="" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>',
        '  |                          ^',
        '  help: add version="3.0" to the stylesheet document element',
      ].join('\n'),
    );
  });

  it('converts a missing stylesheet version into XTSE0500', () => {
    const stylesheet =
      '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0500',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet module must declare a version attribute.',
      suggestions: [
        {
          kind: 'fix',
          label: 'add version="3.0" to the stylesheet document element',
          replacement: 'version="3.0"',
          confidence: 1,
        },
      ],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0500]: Stylesheet module must declare a version attribute.',
        '--> <stylesheet>:1:1',
        '1 | <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>',
        '  | ^',
        '  help: add version="3.0" to the stylesheet document element',
      ].join('\n'),
    );
  });
});
