import { describe, expect, it } from 'vitest';

import { assertValidDiagnostic, diagnosticReportFromError, formatDiagnostic } from '../../src/diagnostics/index.js';
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
      [...evaluate(parseXPath('"tea" + 1'), createContext('<root/>'))];
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
      [...evaluate(parseXPath('matches("tea")'), createContext('<root/>'))];
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
      [...evaluate(parseXPath(expression), createContext('<root/>'))];
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
});
