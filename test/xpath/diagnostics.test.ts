import { describe, expect, it } from 'vitest';

import { assertValidDiagnostic, diagnosticReportFromError, formatDiagnostic } from '../../src/diagnostics/index.js';
import { parseXml } from '../../src/xml/parse.js';
import { createXdmNode } from '../../src/xdm/types.js';
import { evaluate } from '../../src/xpath/eval/evaluator.js';
import { parseXPath } from '../../src/xpath/parse/parser.js';
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

function captureError(action: () => void): unknown {
  try {
    action();
    throw new Error('Expected the action to throw.');
  } catch (error) {
    return error;
  }
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
        "details": [],
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
});
