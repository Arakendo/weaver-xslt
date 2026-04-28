import { describe, expect, it } from 'vitest';

import { XPathError } from '../../src/errors/XPathError.js';
import { parseXml } from '../../src/xml/parse.js';
import { createXdmNode, type XdmNode } from '../../src/xdm/types.js';
import { evaluate } from '../../src/xpath/eval/evaluator.js';
import type { DynamicContext } from '../../src/xpath/eval/context.js';
import { parseXPath } from '../../src/xpath/parse/parser.js';

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

describe('XPath expression coverage', () => {
  it('evaluates integer range expressions', () => {
    const context = createContext('<root/>');

    expect([...evaluate(parseXPath('1 to 3'), context)]).toMatchObject([
      { type: 'xs:double', value: 1 },
      { type: 'xs:double', value: 2 },
      { type: 'xs:double', value: 3 },
    ]);
    expect([...evaluate(parseXPath('3 to 1'), context)]).toEqual([]);
  });

  it('raises a type error for non-integer range operands in the initial range slice', () => {
    let thrown: unknown;

    try {
      [...evaluate(parseXPath('1.5 to 3'), createContext('<root/>'))];
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(XPathError);
    expect(thrown).toMatchObject({ code: 'XPTY0004' });
  });

  it('evaluates the initial sequence constructor slice', () => {
    const context = createContext('<root/>');

    expect([...evaluate(parseXPath('()'), context)]).toEqual([]);
    expect([...evaluate(parseXPath('(1, 2, 3)'), context)]).toMatchObject([
      { type: 'xs:double', value: 1 },
      { type: 'xs:double', value: 2 },
      { type: 'xs:double', value: 3 },
    ]);
    expect([...evaluate(parseXPath('count((1, 2, 3))'), context)]).toMatchObject([
      { type: 'xs:double', value: 3 },
    ]);
  });

  it('evaluates the initial if-then-else slice', () => {
    const context = createContext('<root><item>A</item></root>');

    expect([...evaluate(parseXPath('if (1 eq 1) then "yes" else "no"'), context)]).toMatchObject([
      { type: 'xs:string', value: 'yes' },
    ]);
    expect([...evaluate(parseXPath('if (/root/missing) then 1 else 2'), context)]).toMatchObject([
      { type: 'xs:double', value: 2 },
    ]);
  });

  it('evaluates the initial let-return slice', () => {
    const context = createContext('<root><item>A</item><item>B</item></root>');

    expect([...evaluate(parseXPath('let $x := /root/item[2] return $x'), context)]).toMatchObject([
      { xdmKind: 'node' },
    ]);
    expect([...evaluate(parseXPath('let $x := 1, $y := $x + 1 return ($x, $y)'), context)]).toMatchObject([
      { type: 'xs:double', value: 1 },
      { type: 'xs:double', value: 2 },
    ]);
  });

  it('evaluates the initial for-return slice', () => {
    const context = createContext('<root><item>A</item><item>B</item></root>');

    expect([...evaluate(parseXPath('for $x in /root/item return $x'), context)]).toMatchObject([
      { xdmKind: 'node' },
      { xdmKind: 'node' },
    ]);
    expect([...evaluate(parseXPath('for $x in (1, 2, 3) return $x + 1'), context)]).toMatchObject([
      { type: 'xs:double', value: 2 },
      { type: 'xs:double', value: 3 },
      { type: 'xs:double', value: 4 },
    ]);
    expect([...evaluate(parseXPath('for $x in (1, 2), $y in (10, 20) return $x + $y'), context)]).toMatchObject([
      { type: 'xs:double', value: 11 },
      { type: 'xs:double', value: 21 },
      { type: 'xs:double', value: 12 },
      { type: 'xs:double', value: 22 },
    ]);
  });

  it('evaluates the initial some/every satisfies slice', () => {
    const context = createContext('<root/>');

    expect([...evaluate(parseXPath('some $x in (1, 2, 3) satisfies $x eq 2'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('every $x in (1, 2, 3) satisfies $x lt 4'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('some $x in (1, 2), $y in (3, 4) satisfies $x + $y eq 6'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('every $x in () satisfies $x eq 1'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
  });

  it('uses position() and last() inside predicates', () => {
    const context = createContext('<root><item>A</item><item>B</item><item>C</item></root>');

    const second = [...evaluate(parseXPath('/root/item[position() = 2]'), context)] as XdmNode[];
    const final = [...evaluate(parseXPath('/root/item[position() = last()]'), context)] as XdmNode[];

    expect(second).toHaveLength(1);
    expect(second[0]?.node.textContent).toBe('B');
    expect(final).toHaveLength(1);
    expect(final[0]?.node.textContent).toBe('C');
  });
});