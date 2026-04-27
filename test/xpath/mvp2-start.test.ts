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
    expect([...evaluate(parseXPath('matches("?a?", "^[\\C\\?a-c\\?]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("?d?", "^[\\C\\?a-c\\?]+$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
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
