import { describe, expect, it } from 'vitest';

import { assertValidDiagnostic, diagnosticReportFromError, formatDiagnostic, formatDiagnostics, projectDiagnosticReport, projectDiagnosticReports, renderDiagnosticError, sortDiagnostics } from '../../src/diagnostics/index.js';
import { parseXml } from '../../src/xml/parse.js';
import { createXdmNode } from '../../src/xdm/types.js';
import { evaluate } from '../../src/xpath/eval/evaluator.js';
import { parseXPath } from '../../src/xpath/parse/parser.js';
import { captureError } from '../helpers/captureError.js';
import type { DynamicContext } from '../../src/xpath/eval/context.js';

function createContext(xml: string): DynamicContext {
  return {
    staticContext: {
      namespaces: new Map(),
      defaultElementNamespace: '',
    },
    contextItem: createXdmNode(parseXml(xml)),
    contextPosition: 1,
    contextSize: 1,
    variables: new Map(),
  };
}

describe('XPath diagnostics', () => {
  it('converts parse failures into validated DiagnosticReport snapshots', () => {
    const error = captureError(() => parseXPath('"test'));
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchInlineSnapshot(`
      {
        "category": "syntax",
        "causes": [],
        "code": "XPST0003",
        "details": [],
        "frames": [],
        "message": "Unterminated string literal.",
        "phase": "compile",
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
      }
    `);
  });

  it('converts runtime type failures into validated DiagnosticReport snapshots', () => {
    const error = captureError(() => {
      Array.from(evaluate(parseXPath('"tea" + 1'), createContext('<root/>')));
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchInlineSnapshot(`
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
      }
    `);
  });

  it('converts arity failures into validated DiagnosticReport snapshots with required details', () => {
    const error = captureError(() => {
      Array.from(evaluate(parseXPath('matches("tea")'), createContext('<root/>')));
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchInlineSnapshot(`
      {
        "category": "syntax",
        "causes": [],
        "code": "XPST0017",
        "details": [
          {
            "key": "functionName",
            "value": "fn:matches",
          },
          {
            "key": "actualArity",
            "value": 1,
          },
          {
            "key": "arityRequirement",
            "value": "2..3",
          },
        ],
        "frames": [],
        "message": "Function fn:matches expects 2 or 3 arguments but got 1.",
        "phase": "compile",
        "primary": {
          "columnEnd": 15,
          "columnStart": 1,
          "lineEnd": 1,
          "lineStart": 1,
          "offsetEnd": 14,
          "offsetStart": 0,
          "uri": "<xpath>",
        },
        "related": [],
        "severity": "error",
        "suggestions": [],
      }
    `);
  });

  it('converts unknown function typos into diagnostics with nearest-name suggestions', () => {
    const expression = 'matces("tea", "ea")';
    const error = captureError(() => {
      Array.from(evaluate(parseXPath(expression), createContext('<root/>')));
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPST0017',
      message: 'Unknown function matces with arity 2.',
      suggestions: [{
        kind: 'fix',
        label: 'did you mean matches(...)?',
        replacement: 'matches',
      }],
    });
    expect(report.suggestions[0]?.confidence).toBeCloseTo(6 / 7);
    expect(formatDiagnostic(report, expression)).toContain('help: did you mean matches(...)?');
  });

  it('projects diagnostics into JSON-safe deep clones without changing the report shape', () => {
    const report = projectDiagnosticReport({
      code: 'WEAVER_ALPHA',
      phase: 'compile',
      severity: 'warning',
      category: 'analysis',
      message: 'project me',
      primary: {
        uri: 'demo.xsl',
        offsetStart: 1,
        offsetEnd: 2,
        lineStart: 1,
        columnStart: 2,
        lineEnd: 1,
        columnEnd: 3,
      },
      related: [{
        label: 'neighbor',
        span: {
          uri: 'demo.xsl',
          offsetStart: 3,
          offsetEnd: 4,
          lineStart: 1,
          columnStart: 4,
          lineEnd: 1,
          columnEnd: 5,
        },
      }],
      frames: [{
        kind: 'template',
        label: '/',
      }],
      details: [{ key: 'name', value: 'value' }],
      suggestions: [{ kind: 'hint', label: 'keep it' }],
      causes: [{
        code: 'WEAVER_BETA',
        phase: 'compile',
        severity: 'warning',
        category: 'analysis',
        message: 'nested',
        related: [],
        frames: [],
        details: [],
        suggestions: [],
        causes: [],
      }],
    });
    const reports = projectDiagnosticReports([report]);

    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
    expect(reports).toEqual([report]);
    expect(reports[0]).not.toBe(report);
    expect(reports[0]?.primary).not.toBe(report.primary);
    expect(reports[0]?.related[0]).not.toBe(report.related[0]);
    expect(reports[0]?.causes[0]).not.toBe(report.causes[0]);
  });

  it('formats caret diagnostics from DiagnosticReport', () => {
    const error = captureError(() => parseXPath('foo ? bar'));
    const report = diagnosticReportFromError(error);

    expect(formatDiagnostic(report, 'foo ? bar')).toBe([
      'error[XPST0003]: Unexpected character "?".',
      '--> <xpath>:1:5',
      '1 | foo ? bar',
      '  |     ^',
    ].join('\n'));
  });

  it('formats runtime diagnostics against the failing subexpression span', () => {
    const expression = '"tea" + 1';
    const error = captureError(() => {
      Array.from(evaluate(parseXPath(expression), createContext('<root/>')));
    });
    const report = diagnosticReportFromError(error);

    expect(formatDiagnostic(report, expression)).toBe([
      'error[XPTY0004]: Expected a single numeric value.',
      '--> <xpath>:1:1',
      '1 | "tea" + 1',
      '  | ^^^^^',
      '  = expectedType: xs:double or xs:integer',
      '  = actualType: xs:string',
    ].join('\n'));
  });

  it('sorts diagnostics by primary source position before fallback keys', () => {
    const reports = sortDiagnostics([
      {
        code: 'WEAVER_ZETA',
        phase: 'compile',
        severity: 'warning',
        category: 'analysis',
        message: 'later diagnostic',
        primary: {
          uri: 'b.xsl',
          offsetStart: 10,
          offsetEnd: 11,
          lineStart: 2,
          columnStart: 1,
          lineEnd: 2,
          columnEnd: 2,
        },
        related: [],
        frames: [],
        details: [],
        suggestions: [],
        causes: [],
      },
      {
        code: 'WEAVER_ALPHA',
        phase: 'compile',
        severity: 'warning',
        category: 'analysis',
        message: 'earlier diagnostic',
        primary: {
          uri: 'a.xsl',
          offsetStart: 5,
          offsetEnd: 6,
          lineStart: 1,
          columnStart: 6,
          lineEnd: 1,
          columnEnd: 7,
        },
        related: [],
        frames: [],
        details: [],
        suggestions: [],
        causes: [],
      },
      {
        code: 'WEAVER_BETA',
        phase: 'compile',
        severity: 'warning',
        category: 'analysis',
        message: 'no primary location',
        related: [],
        frames: [],
        details: [],
        suggestions: [],
        causes: [],
      },
    ]);

    expect(reports.map((report) => report.code)).toEqual([
      'WEAVER_ALPHA',
      'WEAVER_ZETA',
      'WEAVER_BETA',
    ]);
  });

  it('formats multiple diagnostics as one shared renderer-owned stream', () => {
    const rendered = formatDiagnostics([
      {
        code: 'WEAVER_ALPHA',
        phase: 'compile',
        severity: 'warning',
        category: 'analysis',
        message: 'first warning',
        related: [],
        frames: [],
        details: [],
        suggestions: [],
        causes: [],
      },
      {
        code: 'WEAVER_BETA',
        phase: 'compile',
        severity: 'warning',
        category: 'analysis',
        message: 'second warning',
        related: [],
        frames: [],
        details: [],
        suggestions: [],
        causes: [],
      },
    ]);

    expect(rendered).toBe([
      'warning[WEAVER_ALPHA]: first warning',
      'warning[WEAVER_BETA]: second warning',
      '',
    ].join('\n'));
  });

  it('rejects malformed diagnostics at shared boundary helpers', () => {
    const invalidReport = {
      code: '',
      phase: 'compile',
      severity: 'warning',
      category: 'analysis',
      message: 'broken',
      related: [],
      frames: [],
      details: [],
      suggestions: [],
      causes: [],
    } as const;

    expect(() => formatDiagnostic(invalidReport)).toThrow('Diagnostic code must be non-empty.');
    expect(() => sortDiagnostics([invalidReport])).toThrow('Diagnostic code must be non-empty.');
  });

  it('renders unknown errors through the shared diagnostics error adapter', () => {
    expect(renderDiagnosticError(new Error('boom'))).toBe('boom');
  });
});
