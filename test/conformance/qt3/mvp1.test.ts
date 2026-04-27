import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseXml } from '../../../src/xml/parse.js';
import { createXdmNode, type XdmAtomicValue, type XdmItem, type XdmNode } from '../../../src/xdm/types.js';
import { evaluate } from '../../../src/xpath/eval/evaluator.js';
import { parseXPath } from '../../../src/xpath/parse/parser.js';
import type { DynamicContext } from '../../../src/xpath/eval/context.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const QT3_ROOT = join(REPO_ROOT, 'vendor', 'qt3tests');

type Qt3SliceCase = {
  readonly setFile: string;
  readonly caseName: string;
  readonly assertion: 'assert-string-value' | 'assert-eq' | 'error';
  readonly expected: string;
  readonly sourceFile?: string;
};

const MVP1_QT3_CASES: readonly Qt3SliceCase[] = [
  { setFile: 'prod/Literal.xml', caseName: 'Literals001', assertion: 'assert-string-value', expected: 'test' },
  { setFile: 'prod/Literal.xml', caseName: 'Literals002', assertion: 'assert-string-value', expected: 'test' },
  { setFile: 'prod/Literal.xml', caseName: 'Literals010', assertion: 'assert-eq', expected: '65535032' },
  { setFile: 'prod/Literal.xml', caseName: 'Literals011', assertion: 'assert-eq', expected: '-65535032' },
  { setFile: 'prod/Literal.xml', caseName: 'Literals006', assertion: 'error', expected: 'XPST0003' },
  {
    setFile: 'prod/AxisStep.abbr.xml',
    caseName: 'abbreviatedSyntax-8',
    assertion: 'assert-string-value',
    expected: '30',
    sourceFile: 'docs/works-mod.xml',
  },
];

describe('W3C conformance — QT3 MVP+1 slice', () => {
  it('executes a real filtered QT3 slice and reports a pass rate', () => {
    let passed = 0;

    for (const testCase of MVP1_QT3_CASES) {
      const definition = loadQt3Case(testCase.setFile, testCase.caseName);
      const context = createContext(testCase.sourceFile);

      try {
        const actual = evaluateToComparableString(definition.expression, context);
        if (testCase.assertion === 'error') {
          throw new Error(`Expected ${testCase.caseName} to raise ${testCase.expected} but it succeeded with ${actual}.`);
        }
        expect(actual).toBe(testCase.expected);
        passed += 1;
      } catch (error) {
        if (testCase.assertion !== 'error') {
          throw error;
        }

        expect(error).toBeInstanceOf(Error);
        expect((error as Error & { code?: string }).code ?? '').toBe(testCase.expected);
        passed += 1;
      }
    }

    // eslint-disable-next-line no-console
    console.log(`  QT3 MVP+1 slice: ${passed}/${MVP1_QT3_CASES.length} passed`);
    expect(passed).toBe(MVP1_QT3_CASES.length);
  });
});

function loadQt3Case(setFile: string, caseName: string): { expression: string } {
  const doc = parseXml(readFileSync(join(QT3_ROOT, setFile), 'utf8'));
  const testCases = Array.from(doc.getElementsByTagName('test-case'));
  const testCase = testCases.find((entry) => entry.getAttribute('name') === caseName);
  if (testCase === undefined) {
    throw new Error(`Unable to locate QT3 case ${caseName} in ${setFile}.`);
  }

  const expression = testCase.getElementsByTagName('test')[0]?.textContent?.trim();
  if (expression === undefined || expression.length === 0) {
    throw new Error(`QT3 case ${caseName} does not contain a test expression.`);
  }

  return { expression };
}

function createContext(sourceFile: string | undefined): DynamicContext {
  const xml = sourceFile === undefined ? '<root/>' : readFileSync(join(QT3_ROOT, sourceFile), 'utf8');
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

function evaluateToComparableString(expression: string, context: DynamicContext): string {
  const items = [...evaluate(parseXPath(expression), context)];
  return items.map(itemToString).join(' ');
}

function itemToString(item: XdmItem): string {
  if ((item as XdmNode).xdmKind === 'node') {
    return ((item as XdmNode).node.textContent ?? '').trim();
  }

  const atomic = item as XdmAtomicValue;
  return String(atomic.value);
}
