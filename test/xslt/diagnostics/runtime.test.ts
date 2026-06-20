import { describe, expect, it } from 'vitest';

import {
  diagnosticReportFromError,
  formatDiagnostic,
  assertValidDiagnostic,
} from '../../../src/diagnostics/index.js';
import { XsltProcessor } from '../../../src/index.js';
import { captureError } from './helpers.js';

describe('XSLT diagnostics', () => {
  it('adds a suggestion for near-miss unsupported XSLT instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:vale-of select="/root/item"/></out>',
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
        label: 'did you mean xsl:value-of?',
        replacement: 'xsl:value-of',
        confidence: expect.any(Number),
      },
    ]);
    expect(report.details).toEqual([
      {
        key: 'instructionName',
        value: 'xsl:vale-of',
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: Unsupported XSLT instruction xsl:vale-of in current MVP+3 slice.',
        '--> <stylesheet>:3:11',
        '3 |     <out><xsl:vale-of select="/root/item"/></out>',
        '  |           ^^^^^^^^^^^',
        '  = instructionName: xsl:vale-of',
        '  help: did you mean xsl:value-of?',
      ].join('\n'),
    );
  });

  it('converts invalid stylesheet roots into static diagnostics with stylesheet spans', () => {
    const stylesheet = '<out/>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.code).toBe('XTSE0010');
    expect(report.phase).toBe('compile');
    expect(report.message).toBe(
      'Stylesheet document element must be xsl:stylesheet or xsl:transform.',
    );
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'wrap the stylesheet in an xsl:stylesheet or xsl:transform document element',
        confidence: 1,
      },
    ]);
    expect(report.primary).toMatchObject({
      uri: '<stylesheet>',
      lineStart: 1,
      lineEnd: 1,
    });

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XTSE0010]: Stylesheet document element must be xsl:stylesheet or xsl:transform.',
        '--> <stylesheet>:1:1',
        '1 | <out/>',
        '  | ^',
        '  help: wrap the stylesheet in an xsl:stylesheet or xsl:transform document element',
      ].join('\n'),
    );
  });

  it('wraps xsl:value-of runtime failures with template and instruction frames', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="&quot;tea&quot; + 1"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.frames).toEqual([
      {
        kind: 'template',
        label: 'match="/"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        kind: 'instruction',
        label: 'xsl:value-of select=""tea" + 1"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 138,
          offsetEnd: 157,
          lineStart: 3,
          columnStart: 32,
          lineEnd: 3,
          columnEnd: 51,
        },
      },
    ]);
    expect(report.related).toEqual([
      {
        label: 'enclosing template',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        label: 'containing instruction',
        span: {
          uri: '<stylesheet>',
          offsetStart: 138,
          offsetEnd: 157,
          lineStart: 3,
          columnStart: 32,
          lineEnd: 3,
          columnEnd: 51,
        },
      },
    ]);
    expect(report).toMatchInlineSnapshot(`
      {
        "category": "type",
        "causes": [
          {
            "category": "type",
            "causes": [],
            "code": "XPTY0004",
            "details": [
              {
                "key": "expectedType",
                "value": "xs:double or xs:integer",
              },
              {
                "key": "actualType",
                "value": "xs:string",
              },
            ],
            "frames": [],
            "message": "Expected a single numeric value.",
            "phase": "runtime",
            "primary": {
              "columnEnd": 6,
              "columnStart": 1,
              "lineEnd": 1,
              "lineStart": 1,
              "offsetEnd": 5,
              "offsetStart": 0,
              "uri": "<xpath>",
            },
            "related": [],
            "severity": "error",
            "suggestions": [],
          },
        ],
        "code": "XPTY0004",
        "details": [
          {
            "key": "expectedType",
            "value": "xs:double or xs:integer",
          },
          {
            "key": "actualType",
            "value": "xs:string",
          },
        ],
        "frames": [
          {
            "kind": "template",
            "label": "match=\"/\"",
            "span": {
              "columnEnd": 25,
              "columnStart": 24,
              "lineEnd": 2,
              "lineStart": 2,
              "offsetEnd": 104,
              "offsetStart": 103,
              "uri": "<stylesheet>",
            },
          },
          {
            "kind": "instruction",
            "label": "xsl:value-of select=\"\"tea\" + 1\"",
            "span": {
              "columnEnd": 51,
              "columnStart": 32,
              "lineEnd": 3,
              "lineStart": 3,
              "offsetEnd": 157,
              "offsetStart": 138,
              "uri": "<stylesheet>",
            },
          },
        ],
        "message": "Expected a single numeric value.",
        "phase": "runtime",
        "primary": {
          "columnEnd": 6,
          "columnStart": 1,
          "lineEnd": 1,
          "lineStart": 1,
          "offsetEnd": 5,
          "offsetStart": 0,
          "uri": "<xpath>",
        },
        "related": [
          {
            "label": "enclosing template",
            "span": {
              "columnEnd": 25,
              "columnStart": 24,
              "lineEnd": 2,
              "lineStart": 2,
              "offsetEnd": 104,
              "offsetStart": 103,
              "uri": "<stylesheet>",
            },
          },
          {
            "label": "containing instruction",
            "span": {
              "columnEnd": 51,
              "columnStart": 32,
              "lineEnd": 3,
              "lineStart": 3,
              "offsetEnd": 157,
              "offsetStart": 138,
              "uri": "<stylesheet>",
            },
          },
        ],
        "severity": "error",
        "suggestions": [],
      }
    `);

    expect(formatDiagnostic(report, '"tea" + 1')).toBe(
      [
        'error[XPTY0004]: Expected a single numeric value.',
        '--> <xpath>:1:1',
        '1 | "tea" + 1',
        '  | ^^^^^',
        '  in template match="/" (<stylesheet>:2:24)',
        '  in instruction xsl:value-of select=""tea" + 1" (<stylesheet>:3:32)',
        'related:',
        '  enclosing template (<stylesheet>:2:24)',
        '  containing instruction (<stylesheet>:3:32)',
        '  = expectedType: xs:double or xs:integer',
        '  = actualType: xs:string',
      ].join('\n'),
    );
  });

  it('converts non-node xsl:apply-templates selections into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="1"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPTY0004',
      phase: 'runtime',
      category: 'type',
      message: 'xsl:apply-templates requires a sequence of nodes.',
      primary: {
        lineStart: 3,
        columnStart: 39,
        lineEnd: 3,
        columnEnd: 40,
      },
      details: [
        { key: 'expectedType', value: 'node()*' },
        { key: 'actualType', value: 'xs:double' },
      ],
      suggestions: [
        {
          kind: 'fix',
          label: 'use a node-selecting expression for xsl:apply-templates',
          confidence: 1,
        },
      ],
    });
    expect(report.frames).toEqual([
      {
        kind: 'template',
        label: 'match="/"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        kind: 'instruction',
        label: 'xsl:apply-templates select="1"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 145,
          offsetEnd: 146,
          lineStart: 3,
          columnStart: 39,
          lineEnd: 3,
          columnEnd: 40,
        },
      },
    ]);
    expect(report.related).toEqual([
      {
        label: 'enclosing template',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        label: 'caller instruction',
        span: {
          uri: '<stylesheet>',
          offsetStart: 145,
          offsetEnd: 146,
          lineStart: 3,
          columnStart: 39,
          lineEnd: 3,
          columnEnd: 40,
        },
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe(
      [
        'error[XPTY0004]: xsl:apply-templates requires a sequence of nodes.',
        '--> <stylesheet>:3:39',
        '3 |     <out><xsl:apply-templates select="1"/></out>',
        '  |                                       ^',
        '  in template match="/" (<stylesheet>:2:24)',
        '  in instruction xsl:apply-templates select="1" (<stylesheet>:3:39)',
        'related:',
        '  enclosing template (<stylesheet>:2:24)',
        '  caller instruction (<stylesheet>:3:39)',
        '  = expectedType: node()*',
        '  = actualType: xs:double',
        '  help: use a node-selecting expression for xsl:apply-templates',
      ].join('\n'),
    );
  });

  it('preserves the caller chain through xsl:apply-templates', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="/root/item"/></out>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <item><xsl:value-of select="&quot;tea&quot; + 1"/></item>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.frames).toEqual([
      {
        kind: 'template',
        label: 'match="/"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        kind: 'instruction',
        label: 'xsl:apply-templates select="/root/item"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 145,
          offsetEnd: 155,
          lineStart: 3,
          columnStart: 39,
          lineEnd: 3,
          columnEnd: 49,
        },
      },
      {
        kind: 'template',
        label: 'match="item"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 206,
          offsetEnd: 210,
          lineStart: 5,
          columnStart: 24,
          lineEnd: 5,
          columnEnd: 28,
        },
      },
      {
        kind: 'instruction',
        label: 'xsl:value-of select=""tea" + 1"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 245,
          offsetEnd: 264,
          lineStart: 6,
          columnStart: 33,
          lineEnd: 6,
          columnEnd: 52,
        },
      },
    ]);
    expect(report.related).toEqual([
      {
        label: 'enclosing template',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        label: 'caller instruction',
        span: {
          uri: '<stylesheet>',
          offsetStart: 145,
          offsetEnd: 155,
          lineStart: 3,
          columnStart: 39,
          lineEnd: 3,
          columnEnd: 49,
        },
      },
      {
        label: 'enclosing template',
        span: {
          uri: '<stylesheet>',
          offsetStart: 206,
          offsetEnd: 210,
          lineStart: 5,
          columnStart: 24,
          lineEnd: 5,
          columnEnd: 28,
        },
      },
      {
        label: 'containing instruction',
        span: {
          uri: '<stylesheet>',
          offsetStart: 245,
          offsetEnd: 264,
          lineStart: 6,
          columnStart: 33,
          lineEnd: 6,
          columnEnd: 52,
        },
      },
    ]);
    expect(report.causes).toHaveLength(1);
    expect(report.causes[0]).toMatchObject({
      code: 'XPTY0004',
      frames: [],
    });

    expect(formatDiagnostic(report, '"tea" + 1')).toBe(
      [
        'error[XPTY0004]: Expected a single numeric value.',
        '--> <xpath>:1:1',
        '1 | "tea" + 1',
        '  | ^^^^^',
        '  in template match="/" (<stylesheet>:2:24)',
        '  in instruction xsl:apply-templates select="/root/item" (<stylesheet>:3:39)',
        '  in template match="item" (<stylesheet>:5:24)',
        '  in instruction xsl:value-of select=""tea" + 1" (<stylesheet>:6:33)',
        'related:',
        '  enclosing template (<stylesheet>:2:24)',
        '  caller instruction (<stylesheet>:3:39)',
        '  enclosing template (<stylesheet>:5:24)',
        '  containing instruction (<stylesheet>:6:33)',
        '  = expectedType: xs:double or xs:integer',
        '  = actualType: xs:string',
      ].join('\n'),
    );
  });
});
