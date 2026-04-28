import { describe, expect, it } from 'vitest';

import { XPathError } from '../../src/errors/XPathError.js';
import { createXdmNode } from '../../src/xdm/types.js';
import type { DynamicContext } from '../../src/xpath/eval/context.js';
import { evaluate } from '../../src/xpath/eval/evaluator.js';
import { parseXPath } from '../../src/xpath/parse/parser.js';
import { parseXml } from '../../src/xml/parse.js';

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

describe('XPath comparison coverage', () => {
  it('evaluates general comparison operators across cross-type and sequence operands', () => {
    const context = createContext('<root><value>2</value><value>4</value><item/></root>');
    const fixtures = [
      { expression: '2 = "2"', expected: true },
      { expression: '2 != "3"', expected: true },
      { expression: '2 < "3"', expected: true },
      { expression: '2 <= "2"', expected: true },
      { expression: '3 > "2"', expected: true },
      { expression: '3 >= "3"', expected: true },
      { expression: '(1, 2, 3) = 3', expected: true },
      { expression: '(1, 2, 3) != 4', expected: true },
      { expression: '(1, 2, 3) < 4', expected: true },
      { expression: '(1, 2, 3) <= 1', expected: true },
      { expression: '(1, 2, 3) > 2', expected: true },
      { expression: '(1, 2, 3) >= 3', expected: true },
      { expression: '/root/value = 4', expected: true },
      { expression: '/root/value != 8', expected: true },
      { expression: '/root/value < 3', expected: true },
      { expression: '/root/value <= 2', expected: true },
      { expression: '/root/value > 3', expected: true },
      { expression: '/root/value >= 4', expected: true },
      { expression: '1 = true()', expected: true },
      { expression: '0 = false()', expected: true },
      { expression: '/root/item = true()', expected: true },
      { expression: '() = false()', expected: false },
      { expression: '() != true()', expected: false },
    ] as const;

    for (const fixture of fixtures) {
      expect([...evaluate(parseXPath(fixture.expression), context)]).toMatchObject([
        { type: 'xs:boolean', value: fixture.expected },
      ]);
    }
  });

  it('raises a type error for relational general comparisons over booleans', () => {
    const booleanRelationalExpressions = ['true() < false()', 'true() <= false()', 'true() > false()', 'true() >= false()'];

    for (const expression of booleanRelationalExpressions) {
      let thrown: unknown;

      try {
        [...evaluate(parseXPath(expression), createContext('<root/>'))];
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(XPathError);
      expect(thrown).toMatchObject({ code: 'XPTY0004' });
    }
  });

  it('evaluates value comparison operators for singleton, false, and empty-sequence cases', () => {
    const context = createContext('<root><value>2</value><value>4</value></root>');
    const trueFixtures = [
      '2 eq 2',
      '2 ne 3',
      '2 lt 3',
      '2 le 2',
      '4 gt 3',
      '4 ge 4',
      '/root/value[1] eq /root/value[1]',
    ] as const;
    const falseFixtures = ['2 eq 3', '2 ne 2', '2 lt 2', '3 le 2', '3 gt 3', '3 ge 4'] as const;
    const emptyFixtures = [
      '/root/missing eq 1',
      '/root/missing ne 1',
      '/root/missing lt 1',
      '/root/missing le 1',
      '/root/missing gt 1',
      '/root/missing ge 1',
    ] as const;

    for (const expression of trueFixtures) {
      expect([...evaluate(parseXPath(expression), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    }

    for (const expression of falseFixtures) {
      expect([...evaluate(parseXPath(expression), context)]).toMatchObject([{ type: 'xs:boolean', value: false }]);
    }

    for (const expression of emptyFixtures) {
      expect([...evaluate(parseXPath(expression), context)]).toEqual([]);
    }
  });

  it('raises a type error for mismatched value-comparison operand types across operators', () => {
    const expressions = ['1 eq "1"', '1 ne "1"', '1 lt "1"', '1 le "1"', '1 gt "1"', '1 ge "1"'] as const;

    for (const expression of expressions) {
      let thrown: unknown;

      try {
        [...evaluate(parseXPath(expression), createContext('<root/>'))];
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(XPathError);
      expect(thrown).toMatchObject({ code: 'XPTY0004' });
    }
  });

  it('raises a type error for non-singleton value-comparison operands across operators', () => {
    const expressions = [
      '(1, 2) eq 1',
      '(1, 2) ne 1',
      '(1, 2) lt 1',
      '(1, 2) le 1',
      '(1, 2) gt 1',
      '(1, 2) ge 1',
    ] as const;

    for (const expression of expressions) {
      let thrown: unknown;

      try {
        [...evaluate(parseXPath(expression), createContext('<root/>'))];
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(XPathError);
      expect(thrown).toMatchObject({ code: 'XPTY0004' });
    }
  });

  it('evaluates node comparison operators for false and empty-sequence cases', () => {
    const context = createContext('<root><item id="a"/><item id="b"/><item id="c"/></root>');
    const falseFixtures = [
      '/root/item[1] is /root/item[2]',
      '/root/item[2] << /root/item[1]',
      '/root/item[2] >> /root/item[3]',
    ] as const;
    const emptyFixtures = [
      '/root/missing is /root/item[1]',
      '/root/missing << /root/item[1]',
      '/root/missing >> /root/item[1]',
    ] as const;

    for (const expression of falseFixtures) {
      expect([...evaluate(parseXPath(expression), context)]).toMatchObject([{ type: 'xs:boolean', value: false }]);
    }

    for (const expression of emptyFixtures) {
      expect([...evaluate(parseXPath(expression), context)]).toEqual([]);
    }
  });

  it('raises a type error for non-singleton node-comparison operands across operators', () => {
    const context = createContext('<root><item id="a"/><item id="b"/><item id="c"/></root>');
    const expressions = [
      '/root/item is /root/item[1]',
      '/root/item << /root/item[1]',
      '/root/item >> /root/item[1]',
    ] as const;

    for (const expression of expressions) {
      let thrown: unknown;

      try {
        [...evaluate(parseXPath(expression), context)];
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(XPathError);
      expect(thrown).toMatchObject({ code: 'XPTY0004' });
    }
  });
});