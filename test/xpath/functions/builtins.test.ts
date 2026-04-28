import { describe, expect, it } from 'vitest';

import { parseXml } from '../../../src/xml/parse.js';
import { createXdmNode, type XdmAtomicValue, type XdmNode } from '../../../src/xdm/types.js';
import { evaluate } from '../../../src/xpath/eval/evaluator.js';
import type { DynamicContext } from '../../../src/xpath/eval/context.js';
import { parseXPath } from '../../../src/xpath/parse/parser.js';

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

describe('XPath built-in function coverage', () => {
  it('evaluates count, exists, and empty over sequences', () => {
    const context = createContext('<root><item>A</item><item>B</item><item>C</item></root>');

    expect([...evaluate(parseXPath('count(/root/item)'), context)]).toMatchObject([
      { type: 'xs:double', value: 3 },
    ]);
    expect([...evaluate(parseXPath('exists(/root/item[2])'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('empty(/root/missing)'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
  });

  it('evaluates boolean and not with effective boolean value semantics', () => {
    const context = createContext('<root><item>A</item></root>');

    expect([...evaluate(parseXPath('boolean(/root/item)'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('boolean(/root/missing)'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('not(/root/item)'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('not(/root/missing)'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
  });

  it('evaluates fixed-arity scalar built-ins', () => {
    const context = createContext('<root/>');

    expect([...evaluate(parseXPath('true()'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('false()'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('abs(-2)'), context)]).toMatchObject([
      { type: 'xs:double', value: 2 },
    ]);
    expect([...evaluate(parseXPath('floor(2.9)'), context)]).toMatchObject([
      { type: 'xs:double', value: 2 },
    ]);
    expect([...evaluate(parseXPath('ceiling(2.1)'), context)]).toMatchObject([
      { type: 'xs:double', value: 3 },
    ]);
    expect([...evaluate(parseXPath('round(2.5)'), context)]).toMatchObject([
      { type: 'xs:double', value: 3 },
    ]);
  });

  it('evaluates string-value and atomization built-ins', () => {
    const context = createContext('<root><item>A</item><item>12.5</item><group><leaf>B</leaf></group></root>');

    expect([...evaluate(parseXPath('string(/root/item[1])'), context)]).toMatchObject([
      { type: 'xs:string', value: 'A' },
    ]);
    expect([...evaluate(parseXPath('string-length(/root/group)'), context)]).toMatchObject([
      { type: 'xs:double', value: 1 },
    ]);
    expect([...evaluate(parseXPath('number(/root/item[2])'), context)]).toMatchObject([
      { type: 'xs:double', value: 12.5 },
    ]);
    const missingNumber = [...evaluate(parseXPath('number(/root/missing)'), context)];
    expect(missingNumber).toHaveLength(1);
    expect(missingNumber[0]).toMatchObject({ type: 'xs:double' });
    const [missingAtomic] = missingNumber;
    expect(missingAtomic?.xdmKind).toBe('atomic');
    if (missingAtomic?.xdmKind !== 'atomic') {
      throw new Error('Expected number(/root/missing) to produce an xs:double result.');
    }
    const missingValue = (missingAtomic as XdmAtomicValue).value;
    if (typeof missingValue !== 'number') {
      throw new Error('Expected number(/root/missing) to produce a numeric value.');
    }
    expect(Number.isNaN(missingValue)).toBe(true);

    const dataValues = [...evaluate(parseXPath('data(/root/item)'), context)];
    expect(dataValues).toMatchObject([
      { type: 'xs:string', value: 'A' },
      { type: 'xs:string', value: '12.5' },
    ]);

    const rootNode = [...evaluate(parseXPath('root(/root/group/leaf)'), context)] as XdmNode[];
    expect(rootNode).toHaveLength(1);
    expect(rootNode[0]?.node.nodeName).toBe('#document');
  });

  it('evaluates name and local-name for nodes', () => {
    const context = createContext('<root xmlns:p="urn:test"><p:item>A</p:item></root>');

    expect([...evaluate(parseXPath('name(/root/p:item)'), context)]).toMatchObject([
      { type: 'xs:string', value: 'p:item' },
    ]);
    expect([...evaluate(parseXPath('local-name(/root/p:item)'), context)]).toMatchObject([
      { type: 'xs:string', value: 'item' },
    ]);
    expect([...evaluate(parseXPath('name(root(/root/p:item))'), context)]).toMatchObject([
      { type: 'xs:string', value: '' },
    ]);
    expect([...evaluate(parseXPath('node-name(/root/p:item)'), context)]).toMatchObject([
      { type: 'xs:QName', value: 'p:item' },
    ]);
    expect([...evaluate(parseXPath('node-name(root(/root/p:item))'), context)]).toEqual([]);
  });

  it('evaluates sequence-shaping built-ins', () => {
    const context = createContext('<root><item>A</item><item>B</item><item>C</item></root>');

    const reversed = [...evaluate(parseXPath('reverse(/root/item)'), context)] as XdmNode[];
    const head = [...evaluate(parseXPath('head(/root/item)'), context)] as XdmNode[];
    const tail = [...evaluate(parseXPath('tail(/root/item)'), context)] as XdmNode[];
    const subsequence = [...evaluate(parseXPath('subsequence(/root/item, 2, 2)'), context)] as XdmNode[];

    expect(reversed.map((item) => item.node.textContent)).toEqual(['C', 'B', 'A']);
    expect(head.map((item) => item.node.textContent)).toEqual(['A']);
    expect(tail.map((item) => item.node.textContent)).toEqual(['B', 'C']);
    expect(subsequence.map((item) => item.node.textContent)).toEqual(['B', 'C']);
  });

  it('evaluates string and text built-ins', () => {
    const context = createContext('<root><item>  A  B  </item><item>MixedCase</item></root>');

    expect([...evaluate(parseXPath('concat("ab", "cd", /root/item[2])'), context)]).toMatchObject([
      { type: 'xs:string', value: 'abcdMixedCase' },
    ]);
    expect([...evaluate(parseXPath('normalize-space(/root/item[1])'), context)]).toMatchObject([
      { type: 'xs:string', value: 'A B' },
    ]);
    expect([...evaluate(parseXPath('contains(/root/item[2], "Case")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('starts-with(/root/item[2], "Mixed")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('ends-with(/root/item[2], "Case")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('upper-case(/root/item[2])'), context)]).toMatchObject([
      { type: 'xs:string', value: 'MIXEDCASE' },
    ]);
    expect([...evaluate(parseXPath('lower-case(/root/item[2])'), context)]).toMatchObject([
      { type: 'xs:string', value: 'mixedcase' },
    ]);
    expect([...evaluate(parseXPath('substring(/root/item[2], 2, 5)'), context)]).toMatchObject([
      { type: 'xs:string', value: 'ixedC' },
    ]);
    expect([...evaluate(parseXPath('string-join(/root/item, "|")'), context)]).toMatchObject([
      { type: 'xs:string', value: '  A  B  |MixedCase' },
    ]);
  });

  it('evaluates numeric aggregation built-ins', () => {
    const context = createContext('<root><value>2</value><value>4</value><value>6</value></root>');

    expect([...evaluate(parseXPath('sum(/root/value)'), context)]).toMatchObject([
      { type: 'xs:double', value: 12 },
    ]);
    expect([...evaluate(parseXPath('min(/root/value)'), context)]).toMatchObject([
      { type: 'xs:double', value: 2 },
    ]);
    expect([...evaluate(parseXPath('max(/root/value)'), context)]).toMatchObject([
      { type: 'xs:double', value: 6 },
    ]);
    expect([...evaluate(parseXPath('avg(/root/value)'), context)]).toMatchObject([
      { type: 'xs:double', value: 4 },
    ]);
    expect([...evaluate(parseXPath('sum(/root/missing)'), context)]).toMatchObject([
      { type: 'xs:double', value: 0 },
    ]);
    expect([...evaluate(parseXPath('avg(/root/missing)'), context)]).toEqual([]);
  });

  it('evaluates distinct-values over atomized sequences', () => {
    const context = createContext('<root><value>A</value><value>B</value><value>A</value></root>');

    expect([...evaluate(parseXPath('distinct-values(/root/value)'), context)]).toMatchObject([
      { type: 'xs:string', value: 'A' },
      { type: 'xs:string', value: 'B' },
    ]);
  });
});