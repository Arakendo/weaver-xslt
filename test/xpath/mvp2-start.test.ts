import { describe, expect, it } from 'vitest';

import { parseXml } from '../../src/xml/parse.js';
import { createXdmNode, type XdmAtomicValue, type XdmNode } from '../../src/xdm/types.js';
import { evaluate } from '../../src/xpath/eval/evaluator.js';
import type { DynamicContext } from '../../src/xpath/eval/context.js';
import { XPathError } from '../../src/errors/XPathError.js';
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

describe('XPath MVP+2 start', () => {
  it('parses zero-argument function calls', () => {
    expect(parseXPath('position()')).toMatchObject({
      kind: 'functionCall',
      callee: 'position',
      arguments: [],
    });
    expect(parseXPath('last()')).toMatchObject({
      kind: 'functionCall',
      callee: 'last',
      arguments: [],
    });
    expect(parseXPath('1 eq 2')).toMatchObject({
      kind: 'binary',
      operator: 'eq',
    });
    expect(parseXPath('1 to 3')).toMatchObject({
      kind: 'binary',
      operator: 'to',
    });
    expect(parseXPath('(1, 2, 3)')).toMatchObject({
      kind: 'sequence',
    });
    expect(parseXPath('if (1 eq 1) then 2 else 3')).toMatchObject({
      kind: 'if',
    });
    expect(parseXPath('let $x := 1 return $x')).toMatchObject({
      kind: 'let',
    });
    expect(parseXPath('for $x in (1, 2) return $x')).toMatchObject({
      kind: 'for',
    });
    expect(parseXPath('for $x in (1, 2), $y in (3, 4) return ($x, $y)')).toMatchObject({
      kind: 'for',
    });
    expect(parseXPath('some $x in (1, 2) satisfies $x eq 2')).toMatchObject({
      kind: 'quantified',
    });
  });

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

  it('evaluates the initial regex function slice', () => {
    const context = createContext('<root/>');

    expect([...evaluate(parseXPath('matches("ABC", "abc", "i")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a.c", "a.c", "q")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a b", "a b", "qx")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a#b", "a#b", "qx")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("_:alpha", "\\i\\c*")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("1.0", "\\i+")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("a b  Z:_", "^[\\s\\i]*$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("1", "^[\\s\\i]*$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("1.0", "^[\\I]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("_", "^[\\I]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("_", "^[^\\I]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("1", "^[^\\I]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("?a?", "^[\\C\\?a-c\\?]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("?d?", "^[\\C\\?a-c\\?]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("_", "^[^\\C\\?a-c\\?]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("?", "^[^\\C\\?a-c\\?]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ad", "^[a-d-[b-c]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("b", "^[a-d-[b-c]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("24680", "^[\\d-[357]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("357", "^[\\d-[357]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("abc", "^[a-c-[^a-c]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("d", "^[a-c-[^a-c]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("meet", "^m[\\w-[^aeiou]][\\w-[^aeiou]]t$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("mbbt", "^m[\\w-[^aeiou]][\\w-[^aeiou]]t$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("bfxyz", "^[^cde-[ag]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("d", "^[^cde-[ag]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("_:alpha", "^[\\c-[^\\i]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("1", "^[\\c-[^\\i]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("_", "^[\\i-[^\\c]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("1", "^[\\i-[^\\c]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("_:alpha", "^[\\c-[\\I]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a1", "^[\\c-[\\I]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("_:alpha", "^[\\i-[\\C]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a1", "^[\\i-[\\C]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("1.-", "^[\\c-[\\i\\C]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("_", "^[\\c-[\\i\\C]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("_", "^[\\i-[\\c\\I]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches(":", "^[\\i-[\\c\\I]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("_:alpha", "^[^\\c-[\\i\\C]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("1.-", "^[^\\c-[\\i\\C]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("_:alpha", "^[^\\i-[\\c\\I]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("1.-", "^[^\\i-[\\c\\I]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("b", "^[\\p{Ll}-[ae-z]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^[\\p{Ll}-[ae-z]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("13579", "^[\\p{Nd}-[2468]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("2468", "^[\\p{Nd}-[2468]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("1.-", "^[\\P{Lu}-[ae-z]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^[\\P{Lu}-[ae-z]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("AZ09_", "^[\\w-[\\p{Ll}]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("aZ09_", "^[\\w-[\\p{Ll}]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("Az09", "^\\p{IsBasicLatin}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ā", "^\\p{IsBasicLatin}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("Ā", "^\\P{IsBasicLatin}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\P{IsBasicLatin}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("A", "^[\\p{IsBasicLatin}]$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ā", "^[\\p{IsBasicLatin}]$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("Ā", "^[\\P{IsBasicLatin}]$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("A", "^[\\P{IsBasicLatin}]$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("Ā", "^[^\\p{IsBasicLatin}]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^[^\\p{IsBasicLatin}]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^[^\\P{IsBasicLatin}]$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ā", "^[^\\P{IsBasicLatin}]$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("A", "^[\\p{IsBasicLatin}-[\\P{Lu}]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^[\\p{IsBasicLatin}-[\\P{Lu}]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("Α", "^[\\p{IsGreekandCoptic}-[\\P{Lu}]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("α", "^[\\p{IsGreekandCoptic}-[\\P{Lu}]]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ɐ", "^\\p{IsIPAExtensions}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ʰ", "^\\p{IsIPAExtensions}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsIPAExtensions}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ʰ", "^\\p{IsSpacingModifierLetters}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ɐ", "^\\p{IsSpacingModifierLetters}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsSpacingModifierLetters}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ѐ", "^\\p{IsCyrillic}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ա", "^\\p{IsCyrillic}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("Ѐӿ", "^\\p{IsCyrillic}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCyrillic}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCyrillic}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ա", "^\\p{IsArmenian}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ѐ", "^\\p{IsArmenian}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("Աֆ", "^\\p{IsArmenian}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsArmenian}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsArmenian}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("א", "^\\p{IsHebrew}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ա", "^\\p{IsHebrew}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("אב", "^\\p{IsHebrew}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsHebrew}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsHebrew}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ا", "^\\p{IsArabic}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("א", "^\\p{IsArabic}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("اب", "^\\p{IsArabic}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsArabic}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsArabic}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ܐ", "^\\p{IsSyriac}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ا", "^\\p{IsSyriac}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ܐܒ", "^\\p{IsSyriac}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsSyriac}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsSyriac}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ހ", "^\\p{IsThaana}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ܐ", "^\\p{IsThaana}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ހށ", "^\\p{IsThaana}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsThaana}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsThaana}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("अ", "^\\p{IsDevanagari}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ހ", "^\\p{IsDevanagari}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("अआ", "^\\p{IsDevanagari}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsDevanagari}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsDevanagari}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("অ", "^\\p{IsBengali}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("अ", "^\\p{IsBengali}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("অআ", "^\\p{IsBengali}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsBengali}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsBengali}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ਅ", "^\\p{IsGurmukhi}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("অ", "^\\p{IsGurmukhi}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ਅਆ", "^\\p{IsGurmukhi}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsGurmukhi}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsGurmukhi}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("અ", "^\\p{IsGujarati}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ਅ", "^\\p{IsGujarati}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("અઆ", "^\\p{IsGujarati}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsGujarati}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsGujarati}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ଅ", "^\\p{IsOriya}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("અ", "^\\p{IsOriya}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ଅଆ", "^\\p{IsOriya}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsOriya}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsOriya}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("அ", "^\\p{IsTamil}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ଅ", "^\\p{IsTamil}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("அஆ", "^\\p{IsTamil}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsTamil}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsTamil}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("అ", "^\\p{IsTelugu}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("அ", "^\\p{IsTelugu}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("అఆ", "^\\p{IsTelugu}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsTelugu}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsTelugu}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ಅ", "^\\p{IsKannada}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("అ", "^\\p{IsKannada}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ಅಆ", "^\\p{IsKannada}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsKannada}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsKannada}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("അ", "^\\p{IsMalayalam}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ಅ", "^\\p{IsMalayalam}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("അആ", "^\\p{IsMalayalam}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsMalayalam}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsMalayalam}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("අ", "^\\p{IsSinhala}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("അ", "^\\p{IsSinhala}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("අආ", "^\\p{IsSinhala}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsSinhala}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsSinhala}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ก", "^\\p{IsThai}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("අ", "^\\p{IsThai}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("กข", "^\\p{IsThai}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsThai}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsThai}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ກ", "^\\p{IsLao}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ก", "^\\p{IsLao}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ກຂ", "^\\p{IsLao}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsLao}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsLao}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ཀ", "^\\p{IsTibetan}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ກ", "^\\p{IsTibetan}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ཀཁ", "^\\p{IsTibetan}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsTibetan}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsTibetan}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("က", "^\\p{IsMyanmar}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ཀ", "^\\p{IsMyanmar}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ကခ", "^\\p{IsMyanmar}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsMyanmar}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsMyanmar}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ⴀ", "^\\p{IsGeorgian}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("က", "^\\p{IsGeorgian}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ႠႡ", "^\\p{IsGeorgian}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsGeorgian}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsGeorgian}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ᄀ", "^\\p{IsHangulJamo}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ⴀ", "^\\p{IsHangulJamo}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ᄀᄁ", "^\\p{IsHangulJamo}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsHangulJamo}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsHangulJamo}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ሀ", "^\\p{IsEthiopic}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ᄀ", "^\\p{IsEthiopic}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ሀሁ", "^\\p{IsEthiopic}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsEthiopic}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsEthiopic}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ꭰ", "^\\p{IsCherokee}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ሀ", "^\\p{IsCherokee}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ᎠᎡ", "^\\p{IsCherokee}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCherokee}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCherokee}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("᐀", "^\\p{IsUnifiedCanadianAboriginalSyllabics}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ꭰ", "^\\p{IsUnifiedCanadianAboriginalSyllabics}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("᐀ᐁ", "^\\p{IsUnifiedCanadianAboriginalSyllabics}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsUnifiedCanadianAboriginalSyllabics}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsUnifiedCanadianAboriginalSyllabics}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches(" ", "^\\p{IsGeneralPunctuation}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⁰", "^\\p{IsGeneralPunctuation}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("  ", "^\\p{IsGeneralPunctuation}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsGeneralPunctuation}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsGeneralPunctuation}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⁰", "^\\p{IsSuperscriptsandSubscripts}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("₠", "^\\p{IsSuperscriptsandSubscripts}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("⁰ⁱ", "^\\p{IsSuperscriptsandSubscripts}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsSuperscriptsandSubscripts}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsSuperscriptsandSubscripts}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("₠", "^\\p{IsCurrencySymbols}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x20d0)}", "^\\p{IsCurrencySymbols}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("₠₡", "^\\p{IsCurrencySymbols}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCurrencySymbols}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCurrencySymbols}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x20d0)}", "^\\p{IsCombiningDiacriticalMarksforSymbols}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("℀", "^\\p{IsCombiningDiacriticalMarksforSymbols}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x20d0, 0x20d1)}", "^\\p{IsCombiningDiacriticalMarksforSymbols}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCombiningDiacriticalMarksforSymbols}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCombiningDiacriticalMarksforSymbols}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("℀", "^\\p{IsLetterlikeSymbols}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⅐", "^\\p{IsLetterlikeSymbols}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("℀℁", "^\\p{IsLetterlikeSymbols}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsLetterlikeSymbols}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsLetterlikeSymbols}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⅐", "^\\p{IsNumberForms}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("←", "^\\p{IsNumberForms}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("⅐⅑", "^\\p{IsNumberForms}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsNumberForms}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsNumberForms}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("←", "^\\p{IsArrows}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("∀", "^\\p{IsArrows}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("←↑", "^\\p{IsArrows}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsArrows}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsArrows}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("∀", "^\\p{IsMathematicalOperators}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⌀", "^\\p{IsMathematicalOperators}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("∀∁", "^\\p{IsMathematicalOperators}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsMathematicalOperators}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsMathematicalOperators}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⌀", "^\\p{IsMiscellaneousTechnical}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("␀", "^\\p{IsMiscellaneousTechnical}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("⌀⌁", "^\\p{IsMiscellaneousTechnical}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsMiscellaneousTechnical}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsMiscellaneousTechnical}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("␀", "^\\p{IsControlPictures}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⑀", "^\\p{IsControlPictures}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("␀␁", "^\\p{IsControlPictures}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsControlPictures}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsControlPictures}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⑀", "^\\p{IsOpticalCharacterRecognition}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("①", "^\\p{IsOpticalCharacterRecognition}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("⑀⑁", "^\\p{IsOpticalCharacterRecognition}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsOpticalCharacterRecognition}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsOpticalCharacterRecognition}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("①", "^\\p{IsEnclosedAlphanumerics}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("─", "^\\p{IsEnclosedAlphanumerics}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("①②", "^\\p{IsEnclosedAlphanumerics}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsEnclosedAlphanumerics}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsEnclosedAlphanumerics}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("─", "^\\p{IsBoxDrawing}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("▀", "^\\p{IsBoxDrawing}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("─━", "^\\p{IsBoxDrawing}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsBoxDrawing}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsBoxDrawing}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("▀", "^\\p{IsBlockElements}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("■", "^\\p{IsBlockElements}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("▀▁", "^\\p{IsBlockElements}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsBlockElements}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsBlockElements}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("■", "^\\p{IsGeometricShapes}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("☀", "^\\p{IsGeometricShapes}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("■□", "^\\p{IsGeometricShapes}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsGeometricShapes}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsGeometricShapes}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("☀", "^\\p{IsMiscellaneousSymbols}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("■", "^\\p{IsMiscellaneousSymbols}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("☀☁", "^\\p{IsMiscellaneousSymbols}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsMiscellaneousSymbols}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsMiscellaneousSymbols}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("✀", "^\\p{IsDingbats}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⠀", "^\\p{IsDingbats}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("✀✁", "^\\p{IsDingbats}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsDingbats}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsDingbats}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⠀", "^\\p{IsBraillePatterns}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⺀", "^\\p{IsBraillePatterns}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("⠀⠁", "^\\p{IsBraillePatterns}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsBraillePatterns}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsBraillePatterns}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⺀", "^\\p{IsCJKRadicalsSupplement}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⼀", "^\\p{IsCJKRadicalsSupplement}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("⺀⺁", "^\\p{IsCJKRadicalsSupplement}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCJKRadicalsSupplement}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCJKRadicalsSupplement}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⼀", "^\\p{IsKangxiRadicals}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⿰", "^\\p{IsKangxiRadicals}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("⼀⼁", "^\\p{IsKangxiRadicals}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsKangxiRadicals}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsKangxiRadicals}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("⿰", "^\\p{IsIdeographicDescriptionCharacters}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("　", "^\\p{IsIdeographicDescriptionCharacters}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("⿰⿱", "^\\p{IsIdeographicDescriptionCharacters}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsIdeographicDescriptionCharacters}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsIdeographicDescriptionCharacters}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("　", "^\\p{IsCJKSymbolsandPunctuation}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ぁ", "^\\p{IsCJKSymbolsandPunctuation}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("　、", "^\\p{IsCJKSymbolsandPunctuation}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCJKSymbolsandPunctuation}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCJKSymbolsandPunctuation}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ぁ", "^\\p{IsHiragana}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ァ", "^\\p{IsHiragana}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ぁあ", "^\\p{IsHiragana}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsHiragana}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsHiragana}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ァ", "^\\p{IsKatakana}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ㄅ", "^\\p{IsKatakana}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ァア", "^\\p{IsKatakana}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsKatakana}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsKatakana}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ㄅ", "^\\p{IsBopomofo}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("㄰", "^\\p{IsBopomofo}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ㄅㄆ", "^\\p{IsBopomofo}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsBopomofo}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsBopomofo}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("㄰", "^\\p{IsHangulCompatibilityJamo}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("ㄅ", "^\\p{IsHangulCompatibilityJamo}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("㄰ㄱ", "^\\p{IsHangulCompatibilityJamo}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsHangulCompatibilityJamo}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsHangulCompatibilityJamo}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3190)}", "^\\p{IsKanbun}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x31a0)}", "^\\p{IsKanbun}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3190, 0x3191)}", "^\\p{IsKanbun}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsKanbun}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsKanbun}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x31a0)}", "^\\p{IsBopomofoExtended}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3200)}", "^\\p{IsBopomofoExtended}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x31a0, 0x31a1)}", "^\\p{IsBopomofoExtended}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsBopomofoExtended}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsBopomofoExtended}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3200)}", "^\\p{IsEnclosedCJKLettersandMonths}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3300)}", "^\\p{IsEnclosedCJKLettersandMonths}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3200, 0x3201)}", "^\\p{IsEnclosedCJKLettersandMonths}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsEnclosedCJKLettersandMonths}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsEnclosedCJKLettersandMonths}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3300)}", "^\\p{IsCJKCompatibility}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3400)}", "^\\p{IsCJKCompatibility}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3300, 0x3301)}", "^\\p{IsCJKCompatibility}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCJKCompatibility}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCJKCompatibility}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3400)}", "^\\p{IsCJKUnifiedIdeographsExtensionA}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("一", "^\\p{IsCJKUnifiedIdeographsExtensionA}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x3400, 0x3401)}", "^\\p{IsCJKUnifiedIdeographsExtensionA}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCJKUnifiedIdeographsExtensionA}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCJKUnifiedIdeographsExtensionA}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("一", "^\\p{IsCJKUnifiedIdeographs}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xa000)}", "^\\p{IsCJKUnifiedIdeographs}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("一丁", "^\\p{IsCJKUnifiedIdeographs}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCJKUnifiedIdeographs}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCJKUnifiedIdeographs}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xa000)}", "^\\p{IsYiSyllables}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xa490)}", "^\\p{IsYiSyllables}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xa000, 0xa001)}", "^\\p{IsYiSyllables}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsYiSyllables}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsYiSyllables}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xa490)}", "^\\p{IsYiRadicals}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("가", "^\\p{IsYiRadicals}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xa490, 0xa491)}", "^\\p{IsYiRadicals}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsYiRadicals}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsYiRadicals}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("가", "^\\p{IsHangulSyllables}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xe000)}", "^\\p{IsHangulSyllables}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("가각", "^\\p{IsHangulSyllables}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsHangulSyllables}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsHangulSyllables}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xe000)}", "^\\p{IsPrivateUseArea}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("가", "^\\p{IsPrivateUseArea}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xe000, 0xe001)}", "^\\p{IsPrivateUseArea}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsPrivateUseArea}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsPrivateUseArea}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xf900)}", "^\\p{IsCJKCompatibilityIdeographs}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfb00)}", "^\\p{IsCJKCompatibilityIdeographs}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xf900, 0xf901)}", "^\\p{IsCJKCompatibilityIdeographs}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCJKCompatibilityIdeographs}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCJKCompatibilityIdeographs}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfb00)}", "^\\p{IsAlphabeticPresentationForms}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfb50)}", "^\\p{IsAlphabeticPresentationForms}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfb00, 0xfb01)}", "^\\p{IsAlphabeticPresentationForms}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsAlphabeticPresentationForms}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsAlphabeticPresentationForms}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfb50)}", "^\\p{IsArabicPresentationForms-A}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe20)}", "^\\p{IsArabicPresentationForms-A}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfb50, 0xfb51)}", "^\\p{IsArabicPresentationForms-A}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsArabicPresentationForms-A}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsArabicPresentationForms-A}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe20)}", "^\\p{IsCombiningHalfMarks}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe30)}", "^\\p{IsCombiningHalfMarks}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe20, 0xfe21)}", "^\\p{IsCombiningHalfMarks}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCombiningHalfMarks}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCombiningHalfMarks}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe30)}", "^\\p{IsCJKCompatibilityForms}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe50)}", "^\\p{IsCJKCompatibilityForms}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe30, 0xfe31)}", "^\\p{IsCJKCompatibilityForms}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCJKCompatibilityForms}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCJKCompatibilityForms}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe50)}", "^\\p{IsSmallFormVariants}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe70)}", "^\\p{IsSmallFormVariants}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe50, 0xfe51)}", "^\\p{IsSmallFormVariants}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsSmallFormVariants}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsSmallFormVariants}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe70)}", "^\\p{IsArabicPresentationForms-B}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ａ", "^\\p{IsArabicPresentationForms-B}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfe70, 0xfe71)}", "^\\p{IsArabicPresentationForms-B}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsArabicPresentationForms-B}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsArabicPresentationForms-B}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ａ", "^\\p{IsHalfwidthandFullwidthForms}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfb00)}", "^\\p{IsHalfwidthandFullwidthForms}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ＡＢ", "^\\p{IsHalfwidthandFullwidthForms}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsHalfwidthandFullwidthForms}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsHalfwidthandFullwidthForms}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfff0)}", "^\\p{IsSpecials}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ａ", "^\\p{IsSpecials}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0xfff0, 0xfff9)}", "^\\p{IsSpecials}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsSpecials}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsSpecials}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("À", "^\\p{IsLatin-1Supplement}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ā", "^\\p{IsLatin-1Supplement}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("ÀÁ", "^\\p{IsLatin-1Supplement}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsLatin-1Supplement}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsLatin-1Supplement}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("Ā", "^\\p{IsLatinExtended-A}$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x180)}", "^\\p{IsLatinExtended-A}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("Āā", "^\\p{IsLatinExtended-A}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsLatinExtended-A}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsLatinExtended-A}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x180)}", "^\\p{IsLatinExtended-B}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x250)}", "^\\p{IsLatinExtended-B}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x180, 0x181)}", "^\\p{IsLatinExtended-B}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsLatinExtended-B}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsLatinExtended-B}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x300)}", "^\\p{IsCombiningDiacriticalMarks}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x370)}", "^\\p{IsCombiningDiacriticalMarks}$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(`matches("${String.fromCodePoint(0x300, 0x301)}", "^\\p{IsCombiningDiacriticalMarks}+$")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("a", "^\\p{IsCombiningDiacriticalMarks}+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("", "^\\p{IsCombiningDiacriticalMarks}?$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);

    const supplementaryRegexFixtures = [
      {
        alias: 'IsOgham',
        single: String.fromCodePoint(0x1680),
        missing: String.fromCodePoint(0x16a0),
        repeated: String.fromCodePoint(0x1680, 0x1681),
      },
      {
        alias: 'IsRunic',
        single: String.fromCodePoint(0x16a0),
        missing: String.fromCodePoint(0x1700),
        repeated: String.fromCodePoint(0x16a0, 0x16a1),
      },
      {
        alias: 'IsKhmer',
        single: String.fromCodePoint(0x1780),
        missing: String.fromCodePoint(0x1800),
        repeated: String.fromCodePoint(0x1780, 0x1781),
      },
      {
        alias: 'IsMongolian',
        single: String.fromCodePoint(0x1800),
        missing: String.fromCodePoint(0x18b0),
        repeated: String.fromCodePoint(0x1800, 0x1801),
      },
      {
        alias: 'IsLatinExtendedAdditional',
        single: String.fromCodePoint(0x1e00),
        missing: String.fromCodePoint(0x1f00),
        repeated: String.fromCodePoint(0x1e00, 0x1e01),
      },
      {
        alias: 'IsGreekExtended',
        single: String.fromCodePoint(0x1f00),
        missing: String.fromCodePoint(0x2000),
        repeated: String.fromCodePoint(0x1f00, 0x1f01),
      },
      {
        alias: 'IsHighSurrogates',
        single: String.fromCharCode(0xd800),
        missing: String.fromCharCode(0xdc00),
        repeated: String.fromCharCode(0xd800, 0xd801),
      },
      {
        alias: 'IsLowSurrogates',
        single: String.fromCharCode(0xdc00),
        missing: String.fromCharCode(0xd800),
        repeated: String.fromCharCode(0xdc00, 0xdc01),
      },
      {
        alias: 'IsOldItalic',
        single: String.fromCodePoint(0x10300),
        missing: String.fromCodePoint(0x10330),
        repeated: String.fromCodePoint(0x10300, 0x10301),
      },
      {
        alias: 'IsGothic',
        single: String.fromCodePoint(0x10330),
        missing: String.fromCodePoint(0x10400),
        repeated: String.fromCodePoint(0x10330, 0x10331),
      },
      {
        alias: 'IsDeseret',
        single: String.fromCodePoint(0x10400),
        missing: String.fromCodePoint(0x10450),
        repeated: String.fromCodePoint(0x10400, 0x10401),
      },
      {
        alias: 'IsByzantineMusicalSymbols',
        single: String.fromCodePoint(0x1d000),
        missing: String.fromCodePoint(0x1d100),
        repeated: String.fromCodePoint(0x1d000, 0x1d001),
      },
      {
        alias: 'IsMusicalSymbols',
        single: String.fromCodePoint(0x1d100),
        missing: String.fromCodePoint(0x1d400),
        repeated: String.fromCodePoint(0x1d100, 0x1d101),
      },
      {
        alias: 'IsMathematicalAlphanumericSymbols',
        single: String.fromCodePoint(0x1d400),
        missing: String.fromCodePoint(0x1d800),
        repeated: String.fromCodePoint(0x1d400, 0x1d401),
      },
      {
        alias: 'IsCJKUnifiedIdeographsExtensionB',
        single: String.fromCodePoint(0x20000),
        missing: String.fromCodePoint(0x2f800),
        repeated: String.fromCodePoint(0x20000, 0x20001),
      },
      {
        alias: 'IsCJKCompatibilityIdeographsSupplement',
        single: String.fromCodePoint(0x2f800),
        missing: String.fromCodePoint(0xe0000),
        repeated: String.fromCodePoint(0x2f800, 0x2f801),
      },
      {
        alias: 'IsTags',
        single: String.fromCodePoint(0xe0000),
        missing: String.fromCodePoint(0xf0000),
        repeated: String.fromCodePoint(0xe0000, 0xe0001),
      },
      {
        alias: 'IsSupplementaryPrivateUseArea-A',
        single: String.fromCodePoint(0xf0000),
        missing: String.fromCodePoint(0x100000),
        repeated: String.fromCodePoint(0xf0000, 0xf0001),
      },
      {
        alias: 'IsSupplementaryPrivateUseArea-B',
        single: String.fromCodePoint(0x100000),
        missing: String.fromCodePoint(0xe0000),
        repeated: String.fromCodePoint(0x100000, 0x100001),
      },
    ] as const;

    for (const fixture of supplementaryRegexFixtures) {
      expect([...evaluate(parseXPath(`matches("${fixture.single}", "^\\p{${fixture.alias}}$")`), context)]).toMatchObject([
        { type: 'xs:boolean', value: true },
      ]);
      expect([...evaluate(parseXPath(`matches("${fixture.missing}", "^\\p{${fixture.alias}}$")`), context)]).toMatchObject([
        { type: 'xs:boolean', value: false },
      ]);
      expect([...evaluate(parseXPath(`matches("${fixture.repeated}", "^\\p{${fixture.alias}}+$")`), context)]).toMatchObject([
        { type: 'xs:boolean', value: true },
      ]);
      expect([...evaluate(parseXPath(`matches("a", "^\\p{${fixture.alias}}+$")`), context)]).toMatchObject([
        { type: 'xs:boolean', value: false },
      ]);
      expect([...evaluate(parseXPath(`matches("", "^\\p{${fixture.alias}}?$")`), context)]).toMatchObject([
        { type: 'xs:boolean', value: true },
      ]);
    }
    expect([...evaluate(parseXPath('matches("abc", "a b c", "x")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('replace("abracadabra", "bra", "*")'), context)]).toMatchObject([
      { type: 'xs:string', value: 'a*cada*' },
    ]);
    expect([...evaluate(parseXPath('replace("a.c", "a.c", "*", "q")'), context)]).toMatchObject([
      { type: 'xs:string', value: '*' },
    ]);
    expect([...evaluate(parseXPath('tokenize("a,b,c", ",")'), context)]).toMatchObject([
      { type: 'xs:string', value: 'a' },
      { type: 'xs:string', value: 'b' },
      { type: 'xs:string', value: 'c' },
    ]);
  });

  it('raises an error for unsupported regex flags in the initial regex slice', () => {
    let thrown: unknown;

    try {
      [...evaluate(parseXPath('matches("a", ".", "z")'), createContext('<root/>'))];
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(XPathError);
    expect(thrown).toMatchObject({ code: 'FOCA0002' });
  });

  it('supports XPath x-flag regex comments in the initial translator slice', () => {
    const context = createContext('<root/>');

    expect([...evaluate(parseXPath('matches("abc", "a # skip\n b c", "x")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
  });

  it('supports the parent axis through .. and parent::', () => {
    const context = createContext('<root><group><item>A</item><item>B</item></group></root>');

    const viaAbbreviation = [...evaluate(parseXPath('/root/group/item[2]/../item[1]'), context)] as XdmNode[];
    const viaAxisName = [...evaluate(parseXPath('/root/group/item[2]/parent::group/item[2]'), context)] as XdmNode[];

    expect(viaAbbreviation).toHaveLength(1);
    expect(viaAbbreviation[0]?.node.textContent).toBe('A');
    expect(viaAxisName).toHaveLength(1);
    expect(viaAxisName[0]?.node.textContent).toBe('B');
  });

  it('supports ancestor and ancestor-or-self axes', () => {
    const context = createContext('<root><group><item><leaf>A</leaf></item></group></root>');

    const ancestors = [...evaluate(parseXPath('/root/group/item/leaf/ancestor::group'), context)] as XdmNode[];
    const ancestorsOrSelf = [...evaluate(parseXPath('/root/group/item/leaf/ancestor-or-self::leaf'), context)] as XdmNode[];
    const fullChain = [...evaluate(parseXPath('/root/group/item/leaf/ancestor-or-self::node()'), context)] as XdmNode[];

    expect(ancestors).toHaveLength(1);
    expect(ancestors[0]?.node.nodeName).toBe('group');
    expect(ancestorsOrSelf).toHaveLength(1);
    expect(ancestorsOrSelf[0]?.node.nodeName).toBe('leaf');
    expect(fullChain.map((item) => item.node.nodeName)).toEqual(['leaf', 'item', 'group', 'root', '#document']);
  });

  it('supports node comparisons for identity and document order', () => {
    const context = createContext('<root><item id="a"/><item id="b"/><item id="c"/></root>');

    expect([...evaluate(parseXPath('/root/item[1] is /root/item[1]'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('/root/item[1] << /root/item[2]'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('/root/item[3] >> /root/item[2]'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
  });

  it('supports following-sibling and preceding-sibling axes', () => {
    const context = createContext('<root><item>A</item><item>B</item><item>C</item></root>');

    const following = [...evaluate(parseXPath('/root/item[1]/following-sibling::item[2]'), context)] as XdmNode[];
    const preceding = [...evaluate(parseXPath('/root/item[3]/preceding-sibling::item[2]'), context)] as XdmNode[];
    const precedingOrder = [...evaluate(parseXPath('/root/item[3]/preceding-sibling::item'), context)] as XdmNode[];
    const followingAxis = [...evaluate(parseXPath('/root/item[1]/following::item[2]'), context)] as XdmNode[];
    const precedingAxis = [...evaluate(parseXPath('/root/item[3]/preceding::item[2]'), context)] as XdmNode[];

    expect(following).toHaveLength(1);
    expect(following[0]?.node.textContent).toBe('C');
    expect(preceding).toHaveLength(1);
    expect(preceding[0]?.node.textContent).toBe('A');
    expect(precedingOrder.map((item) => item.node.textContent)).toEqual(['B', 'A']);
    expect(followingAxis).toHaveLength(1);
    expect(followingAxis[0]?.node.textContent).toBe('C');
    expect(precedingAxis).toHaveLength(1);
    expect(precedingAxis[0]?.node.textContent).toBe('A');
  });

  it('raises a type error when node comparisons do not receive singleton nodes', () => {
    let thrown: unknown;

    try {
      [...evaluate(parseXPath('1 is /root'), createContext('<root/>'))];
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(XPathError);
    expect(thrown).toMatchObject({ code: 'XPTY0004' });
  });

  it('evaluates general comparisons with sequence and boolean coercion semantics', () => {
    const context = createContext('<root><value>2</value><value>4</value><item/></root>');

    expect([...evaluate(parseXPath('(1, 2, 3) = 2'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('/root/value = 4'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('1 = true()'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('0 = false()'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('/root/item = true()'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('() = false()'), context)]).toMatchObject([{ type: 'xs:boolean', value: false }]);
  });

  it('evaluates value comparisons with singleton semantics', () => {
    const context = createContext('<root><value>2</value><value>4</value></root>');

    expect([...evaluate(parseXPath('2 eq 2'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('2 ne 3'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('2 lt 3'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('2 le 2'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('4 gt 3'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('4 ge 4'), context)]).toMatchObject([{ type: 'xs:boolean', value: true }]);
    expect([...evaluate(parseXPath('/root/value[1] eq /root/value[1]'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('/root/missing eq 1'), context)]).toEqual([]);
  });

  it('raises a type error for mismatched value-comparison operand types', () => {
    let thrown: unknown;

    try {
      [...evaluate(parseXPath('1 eq "1"'), createContext('<root/>'))];
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(XPathError);
    expect(thrown).toMatchObject({ code: 'XPTY0004' });
  });
});
