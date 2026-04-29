import { describe, expect, it } from 'vitest';

import { parseXml } from '../../src/xml/parse.js';
import { createXdmNode, type XdmAtomicValue, type XdmNode } from '../../src/xdm/types.js';
import { evaluate } from '../../src/xpath/eval/evaluator.js';
import type { DynamicContext } from '../../src/xpath/eval/context.js';
import { parseXPath } from '../../src/xpath/parse/parser.js';

function createContext(xml: string, variables?: DynamicContext['variables']): DynamicContext {
  return {
    staticContext: {
      namespaces: new Map(),
      defaultElementNamespace: '',
    },
    contextItem: createXdmNode(parseXml(xml)),
    contextPosition: 1,
    contextSize: 1,
    variables: variables ?? new Map(),
  };
}

function evaluateAtomic(expression: string, context: DynamicContext): XdmAtomicValue {
  const result = [...evaluate(parseXPath(expression), context)] as XdmAtomicValue[];
  expect(result).toHaveLength(1);
  return result[0]!;
}

describe('XPath MVP+1 slice coverage', () => {
  it('evaluates every MVP+1 binary operator', () => {
    const context = createContext('<root/>');
    const expectations = [
      ['1 + 2', { type: 'xs:double', value: 3 }],
      ['5 - 3', { type: 'xs:double', value: 2 }],
      ['4 * 2', { type: 'xs:double', value: 8 }],
      ['9 div 3', { type: 'xs:double', value: 3 }],
      ['7 idiv 2', { type: 'xs:double', value: 3 }],
      ['10 mod 4', { type: 'xs:double', value: 2 }],
      ['2 = 2', { type: 'xs:boolean', value: true }],
      ['2 != 3', { type: 'xs:boolean', value: true }],
      ['2 < 3', { type: 'xs:boolean', value: true }],
      ['2 <= 2', { type: 'xs:boolean', value: true }],
      ['3 > 2', { type: 'xs:boolean', value: true }],
      ['3 >= 3', { type: 'xs:boolean', value: true }],
      ['2 < 3 and 5 > 1', { type: 'xs:boolean', value: true }],
      ['2 > 3 or 5 > 1', { type: 'xs:boolean', value: true }],
    ] as const;

    for (const [expression, expected] of expectations) {
      expect(evaluateAtomic(expression, context)).toMatchObject(expected);
    }
  });

  it('evaluates string literals, unary minus, and variable references', () => {
    const context = createContext('<root/>', new Map([['item', 'north']])) ;

    expect(evaluateAtomic('"tea"', context)).toMatchObject({ type: 'xs:string', value: 'tea' });
    expect(evaluateAtomic('-5', context)).toMatchObject({ type: 'xs:double', value: -5 });
    expect(evaluateAtomic('$item', context)).toMatchObject({ type: 'xs:string', value: 'north' });
  });

  it('evaluates every MVP+1 axis and node test', () => {
    const documentContext = createContext('<library><book id="b1">alpha<title>One</title><meta><title>Nested</title></meta></book></library>');
    const bookContext: DynamicContext = {
      ...documentContext,
      contextItem: createXdmNode(parseXml('<book id="b1">alpha<title>One</title><meta><title>Nested</title></meta></book>').documentElement!),
    };

    expect(([...evaluate(parseXPath('/library/book'), documentContext)] as XdmNode[]).map((item) => item.node.nodeName)).toEqual(['book']);
    expect(([...evaluate(parseXPath('descendant::title'), bookContext)] as XdmNode[]).map((item) => item.node.textContent)).toEqual(['One', 'Nested']);
    expect(([...evaluate(parseXPath('descendant-or-self::book'), bookContext)] as XdmNode[]).map((item) => item.node.nodeName)).toEqual(['book']);
    expect(([...evaluate(parseXPath('self::node()'), bookContext)] as XdmNode[]).map((item) => item.node.nodeName)).toEqual(['book']);
    expect(([...evaluate(parseXPath('@id'), bookContext)] as XdmNode[]).map((item) => item.node.nodeValue)).toEqual(['b1']);
    expect(([...evaluate(parseXPath('*'), documentContext)] as XdmNode[]).map((item) => item.node.nodeName)).toEqual(['library']);
    expect(([...evaluate(parseXPath('child::text()'), bookContext)] as XdmNode[]).map((item) => item.node.textContent)).toContain('alpha');
  });

  it('evaluates the direct QT3 path slice case', () => {
    const context = createContext(`
      <works>
        <employee name="Jane Doe 1"><hours>40</hours><hours>70</hours></employee>
        <employee name="John Doe 2"><hours>20</hours><hours>80</hours></employee>
        <employee name="Jane Doe 3"><hours>20</hours><hours>40</hours></employee>
        <employee name="John Doe 4"><hours>20</hours><hours>30</hours></employee>
        <employee name="Jane Doe 5"><hours>12</hours><hours>30</hours></employee>
      </works>
    `);

    const result = [...evaluate(parseXPath('/works/employee[5]/hours[2]'), context)] as XdmNode[];
    expect(result).toHaveLength(1);
    expect(result[0]?.node.textContent).toBe('30');
  });
});
