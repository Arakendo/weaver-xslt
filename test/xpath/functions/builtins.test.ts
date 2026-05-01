import { describe, expect, it } from 'vitest';

import { XPathError } from '../../../src/errors/XPathError.js';
import { parseXml } from '../../../src/xml/parse.js';
import { createXdmNode, type XdmAtomicValue, type XdmNode } from '../../../src/xdm/types.js';
import { evaluate } from '../../../src/xpath/eval/evaluator.js';
import type { DynamicContext } from '../../../src/xpath/eval/context.js';
import { parseXPath } from '../../../src/xpath/parse/parser.js';

type ContextOptions = {
  readonly namespaces?: ReadonlyArray<readonly [string, string]>;
  readonly defaultElementNamespace?: string;
};

function createContext(xml: string, options: ContextOptions = {}): DynamicContext {
  return {
    staticContext: {
      namespaces: new Map(options.namespaces ?? []),
      defaultElementNamespace: options.defaultElementNamespace ?? '',
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
      { type: 'xs:integer', value: 3 },
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
    expect([...evaluate(parseXPath('boolean((/root/item[1], 93.7))'), context)]).toMatchObject([
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
    expect(() => [...evaluate(parseXPath('boolean((1, 2))'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORG0006' } satisfies Partial<XPathError>),
    );
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
    expect([...evaluate(parseXPath('round(35.425, 2)'), context)]).toMatchObject([
      { type: 'xs:double', value: 35.43 },
    ]);
    expect([...evaluate(parseXPath('round(-1234.567, -2)'), context)]).toMatchObject([
      { type: 'xs:double', value: -1200 },
    ]);
    expect([...evaluate(parseXPath('round((), 2)'), context)]).toEqual([]);
    expect([...evaluate(parseXPath('abs(())'), context)]).toEqual([]);
  });

  it('evaluates string-value and atomization built-ins', () => {
    const context = createContext('<root><item>A</item><item>12.5</item><group><leaf>B</leaf></group></root>');

    expect([...evaluate(parseXPath('string(/root/item[1])'), context)]).toMatchObject([
      { type: 'xs:string', value: 'A' },
    ]);
    expect([...evaluate(parseXPath('string-length(/root/group)'), context)]).toMatchObject([
      { type: 'xs:integer', value: 1 },
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
    expect([...evaluate(parseXPath('data([])'), context)]).toEqual([]);
    expect([...evaluate(parseXPath('data([1, 2])'), context)]).toMatchObject([
      { type: 'xs:double', value: 1 },
      { type: 'xs:double', value: 2 },
    ]);

    const rootNode = [...evaluate(parseXPath('root(/root/group/leaf)'), context)] as XdmNode[];
    expect(rootNode).toHaveLength(1);
    expect(rootNode[0]?.node.nodeName).toBe('#document');

    expect(() => [...evaluate(parseXPath('string([1, 2])'), context)]).toThrowError(
      expect.objectContaining({ code: 'FOTY0014' } satisfies Partial<XPathError>),
    );
  });

  it('evaluates name and local-name for nodes', () => {
    const context = createContext('<root xmlns:p="urn:test"><p:item>A</p:item></root>', {
      namespaces: [['p', 'urn:test']],
    });

    expect([...evaluate(parseXPath('name(/root/p:item)'), context)]).toMatchObject([
      { type: 'xs:string', value: 'p:item' },
    ]);
    expect([...evaluate(parseXPath('local-name(/root/p:item)'), context)]).toMatchObject([
      { type: 'xs:string', value: 'item' },
    ]);
    expect([...evaluate(parseXPath('namespace-uri(/root/p:item)'), context)]).toMatchObject([
      { type: 'xs:string', value: 'urn:test' },
    ]);
    expect([...evaluate(parseXPath('name(root(/root/p:item))'), context)]).toMatchObject([
      { type: 'xs:string', value: '' },
    ]);
    expect([...evaluate(parseXPath('namespace-uri(/root)'), context)]).toMatchObject([
      { type: 'xs:string', value: '' },
    ]);
    expect([...evaluate(parseXPath('node-name(/root/p:item)'), context)]).toMatchObject([
      { type: 'xs:QName', value: 'p:item' },
    ]);
    expect([...evaluate(parseXPath('local-name-from-QName(node-name(/root/p:item))'), context)]).toMatchObject([
      { type: 'xs:string', value: 'item' },
    ]);
    expect([...evaluate(parseXPath('node-name(root(/root/p:item))'), context)]).toEqual([]);
    expect([...evaluate(parseXPath('name((//namespace::*[. = "http://www.w3.org/XML/1998/namespace"])[1])'), createContext('<root xmlns:xml="http://www.w3.org/XML/1998/namespace"/>'))]).toMatchObject([
      { type: 'xs:string', value: 'xml' },
    ]);

    const commentedDocumentContext = createContext('<!--lead--><root/>');
    expect([...evaluate(parseXPath('name(/*)'), commentedDocumentContext)]).toMatchObject([
      { type: 'xs:string', value: 'root' },
    ]);

    const attributeParentContext = createContext('<works><employee name="Ada"/></works>');
    expect([...evaluate(parseXPath('for $h in (/works/employee/@name) return name($h/parent::node())'), attributeParentContext)]).toMatchObject([
      { type: 'xs:string', value: 'employee' },
    ]);
    expect([...evaluate(parseXPath('for $h in (/works/employee/@name) return local-name($h/parent::node())'), attributeParentContext)]).toMatchObject([
      { type: 'xs:string', value: 'employee' },
    ]);
  });

  it('evaluates sequence-shaping built-ins', () => {
    const context = createContext('<root><item>A</item><item>B</item><item>C</item></root>');

    const reversed = [...evaluate(parseXPath('reverse(/root/item)'), context)] as XdmNode[];
    const head = [...evaluate(parseXPath('head(/root/item)'), context)] as XdmNode[];
    const tail = [...evaluate(parseXPath('tail(/root/item)'), context)] as XdmNode[];
    const subsequence = [...evaluate(parseXPath('subsequence(/root/item, 2, 2)'), context)] as XdmNode[];
    const exact = [...evaluate(parseXPath('exactly-one(/root/item[2])'), context)] as XdmNode[];
    const zeroOrOne = [...evaluate(parseXPath('zero-or-one(/root/item[2])'), context)] as XdmNode[];
    const oneOrMore = [...evaluate(parseXPath('one-or-more(/root/item)'), context)] as XdmNode[];

    expect(reversed.map((item) => item.node.textContent)).toEqual(['C', 'B', 'A']);
    expect(head.map((item) => item.node.textContent)).toEqual(['A']);
    expect(tail.map((item) => item.node.textContent)).toEqual(['B', 'C']);
    expect(subsequence.map((item) => item.node.textContent)).toEqual(['B', 'C']);
    expect([...evaluate(parseXPath('subsequence((1, 2, 3), 1.8, 1)'), context)]).toMatchObject([
      { type: 'xs:double', value: 2 },
    ]);
    expect([...evaluate(parseXPath('subsequence(("a", 0 div 0E0, "b", "c"), 0, 2)'), context)]).toMatchObject([
      { type: 'xs:string', value: 'a' },
    ]);
    expect(exact.map((item) => item.node.textContent)).toEqual(['B']);
    expect(zeroOrOne.map((item) => item.node.textContent)).toEqual(['B']);
    expect(oneOrMore.map((item) => item.node.textContent)).toEqual(['A', 'B', 'C']);
    expect([...evaluate(parseXPath('zero-or-one(/root/missing)'), context)]).toEqual([]);
    expect([...evaluate(parseXPath('trace((1, 2, 3), "msg")'), context)]).toMatchObject([
      { type: 'xs:double', value: 1 },
      { type: 'xs:double', value: 2 },
      { type: 'xs:double', value: 3 },
    ]);
    expect(() => [...evaluate(parseXPath('exactly-one(/root/item)'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORG0005' }),
    );
    expect(() => [...evaluate(parseXPath('exactly-one(/root/missing)'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORG0005' }),
    );
    expect(() => [...evaluate(parseXPath('zero-or-one(/root/item)'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORG0005' }),
    );
    expect(() => [...evaluate(parseXPath('one-or-more(/root/missing)'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORG0005' }),
    );
  });

  it('evaluates string and text built-ins', () => {
    const context = createContext('<root><item>  A  B  </item><item>MixedCase</item></root>');

    expect([...evaluate(parseXPath('concat("ab", "cd", /root/item[2])'), context)]).toMatchObject([
      { type: 'xs:string', value: 'abcdMixedCase' },
    ]);
    expect([...evaluate(parseXPath('normalize-space(/root/item[1])'), context)]).toMatchObject([
      { type: 'xs:string', value: 'A B' },
    ]);
    expect([...evaluate(parseXPath('translate("bar", "abc", "ABC")'), context)]).toMatchObject([
      { type: 'xs:string', value: 'BAr' },
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
    expect([...evaluate(parseXPath('substring("12345", 0, 3)'), context)]).toMatchObject([
      { type: 'xs:string', value: '12' },
    ]);
    expect([...evaluate(parseXPath('substring("12345", 1.5, 2.6)'), context)]).toMatchObject([
      { type: 'xs:string', value: '234' },
    ]);
    expect([...evaluate(parseXPath('count(substring("12345", 0 div 0E0, 3))'), context)]).toMatchObject([
      { type: 'xs:integer', value: 1 },
    ]);
    expect([...evaluate(parseXPath('count(substring("12345", 1, 0 div 0E0))'), context)]).toMatchObject([
      { type: 'xs:integer', value: 1 },
    ]);
    expect([...evaluate(parseXPath('substring("A😀B", 2, 1)'), context)]).toMatchObject([
      { type: 'xs:string', value: '😀' },
    ]);
    expect([...evaluate(parseXPath('string(65535032e2)'), context)]).toMatchObject([
      { type: 'xs:string', value: '6.5535032E9' },
    ]);
    expect([...evaluate(parseXPath('string(65535032.0023)'), context)]).toMatchObject([
      { type: 'xs:string', value: '65535032.0023' },
    ]);
    expect([...evaluate(parseXPath('string(2.0)'), context)]).toMatchObject([
      { type: 'xs:string', value: '2' },
    ]);
    expect([...evaluate(parseXPath('string(465.)'), context)]).toMatchObject([
      { type: 'xs:string', value: '465' },
    ]);
    expect([...evaluate(parseXPath('string-length("😀")'), context)]).toMatchObject([
      { type: 'xs:integer', value: 1 },
    ]);
    expect([...evaluate(parseXPath('codepoints-to-string((65, 10, 66))'), context)]).toMatchObject([
      { type: 'xs:string', value: 'A\nB' },
    ]);
    expect([...evaluate(parseXPath('string-to-codepoints("A😀B")'), context)]).toMatchObject([
      { type: 'xs:integer', value: 65 },
      { type: 'xs:integer', value: 128512 },
      { type: 'xs:integer', value: 66 },
    ]);
    expect([...evaluate(parseXPath('count(for $s in ("red", "blue", "green") return string-to-codepoints($s))'), context)]).toMatchObject([
      { type: 'xs:integer', value: 12 },
    ]);
    expect([...evaluate(parseXPath('string-join(/root/item, "|")'), context)]).toMatchObject([
      { type: 'xs:string', value: '  A  B  |MixedCase' },
    ]);
    expect([...evaluate(parseXPath('string-join(("1", "2", "3"))'), context)]).toMatchObject([
      { type: 'xs:string', value: '123' },
    ]);
    expect(() => [...evaluate(parseXPath('string-join("a string", ())'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPTY0004' } satisfies Partial<XPathError>),
    );
    expect([...evaluate(parseXPath('tokenize(" abc  def ")'), context)]).toMatchObject([
      { type: 'xs:string', value: 'abc' },
      { type: 'xs:string', value: 'def' },
    ]);
    expect([...evaluate(parseXPath('count(tokenize(codepoints-to-string((97, 98, 99, 160, 100, 101, 102))))'), context)]).toMatchObject([
      { type: 'xs:integer', value: 1 },
    ]);
    expect([...evaluate(parseXPath('tokenize(())'), context)]).toEqual([]);
    expect(() => [...evaluate(parseXPath('tokenize("input", ())'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPTY0004' } satisfies Partial<XPathError>),
    );
    expect([...evaluate(parseXPath('replace("a?bracadabra?", "a?", "\\$1", "q")'), context)]).toMatchObject([
      { type: 'xs:string', value: '\\$1bracadabr\\$1' },
    ]);
    expect([...evaluate(parseXPath(`replace("Now, let's SEND OUT for QUICHE!!", "[A-Z][A-Z]+", "$0$0")`), context)]).toMatchObject([
      { type: 'xs:string', value: "Now, let's SENDSEND OUTOUT for QUICHEQUICHE!!" },
    ]);
    expect(() => [...evaluate(parseXPath('replace("input", (), "replacement")'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPTY0004' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('replace("input", "pattern", ())'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPTY0004' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('replace("abcd", "(asd)[\\1]", "")'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORX0002' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('replace("abcd", "1[asd\\0]", "")'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORX0002' } satisfies Partial<XPathError>),
    );
    expect([...evaluate(parseXPath("matches(codepoints-to-string(8490), '[A-Z]', 'i')"), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath("matches(codepoints-to-string(1632), '^(?:\\d)$')"), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath("matches('-12', '^(?:\\-\\d\\d)$')"), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath("matches(codepoints-to-string(58), '^(?:\\d)$')"), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath("matches('A', '^(?:\\W)$')"), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath("matches(' ', '^(?:\\W)$')"), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath("matches(codepoints-to-string(65536), '^(?:[𐀀])$')"), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath("let $d := codepoints-to-string(13) return matches($d||$d||'a'||$d||$d||'b'||$d||$d, '^\\r\\ra\\r\\rb\\r\\r$')"), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath("matches('abcdefghiabcdefghia0a1', '(a)(b)(c)(d)(e)(f)(g)(h)(i)\\1\\2\\3\\4\\5\\6\\7\\8\\9\\10\\11')"), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect(() => [...evaluate(parseXPath('matches("input", ())'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPTY0004' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('matches("input", "pattern", ())'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPTY0004' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('matches("foo", "[a-\\b]")'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORX0002' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('matches("foo", "[^]")'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORX0002' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('matches("qwerty", "[\\u0100\\u0102\\u0104]+")'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORX0002' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('matches("qwerty", "[\\p]")'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORX0002' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('matches("qwerty", "{5")'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORX0002' } satisfies Partial<XPathError>),
    );
    expect([...evaluate(parseXPath('matches("azBCDE1234567890BCDEFza", "^(?:([^0-9-[a-zAE-Z]]|[\\w-[a-zAF-Z]])+)$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("first.last@seznam.cz", "^(?:[\\w\\-\\.]+@.*)$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("first-last@seznam.cz", "^(?:[\\w\\-\\.]+@.*)$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("first_last@seznam.cz", "^(?:[\\w\\-\\.]+@.*)$")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("alpha", "alp^?ha")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("alpha", "alp^+ha")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("alpha", "^{2}alpha")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("zalpha", "^{2}alpha")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('matches("alpha", "alp$?ha")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('matches("alpha", "alp${2,4}ha")'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath(String.raw`matches("hello world", "hello\ sworld", "x")`), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('string(//namespace::*[. = "http://www.w3.org/XML/1998/namespace"][1])'), createContext('<root xmlns:xml="http://www.w3.org/XML/1998/namespace"/>'))]).toMatchObject([
      { type: 'xs:string', value: 'http://www.w3.org/XML/1998/namespace' },
    ]);
  });

  it('raises FOCH0001 for invalid XML codepoints', () => {
    const context = createContext('<root/>');

    expect(() => [...evaluate(parseXPath('codepoints-to-string(0)'), context)]).toThrowError(
      expect.objectContaining({ code: 'FOCH0001' } satisfies Partial<XPathError>),
    );
  });

  it('raises FOER0000 for fn:error()', () => {
    const context = createContext('<root/>');

    expect(() => [...evaluate(parseXPath('error()'), context)]).toThrowError(
      expect.objectContaining({ code: 'FOER0000' } satisfies Partial<XPathError>),
    );
  });

  it('evaluates deep-equal over sequences and nodes', () => {
    const context = createContext('<root><item>A</item><item>A</item></root>');

    expect([...evaluate(parseXPath('deep-equal((1, 2, 3), (1, 2, 3)[true()])'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('deep-equal((1, 2, 3), (1, 2))'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect([...evaluate(parseXPath('deep-equal(/root/item[1], /root/item[2])'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
  });

  it('constructs QNames and rejects their effective boolean value', () => {
    const context = createContext('<root/>');

    expect([...evaluate(parseXPath('QName("urn:test", "p:name")'), context)]).toMatchObject([
      { type: 'xs:QName', value: 'p:name' },
    ]);
    expect(([...evaluate(parseXPath('map:entry("a", "string")'), context)][0] as { xdmKind?: string })?.xdmKind).toBe('map');
    expect(() => [...evaluate(parseXPath('string(map:entry("a", "string"))'), context)]).toThrowError(
      expect.objectContaining({ code: 'FOTY0014' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('boolean(QName("urn:test", "p:name"))'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORG0006' } satisfies Partial<XPathError>),
    );
  });

  it('evaluates numeric aggregation built-ins', () => {
    const context = createContext('<root><value>2</value><value>4</value><value>6</value></root>');

    expect([...evaluate(parseXPath('sum(/root/value)'), context)]).toMatchObject([
      { type: 'xs:double', value: 12 },
    ]);
    expect([...evaluate(parseXPath('min(/root/value)'), context)]).toMatchObject([
      { type: 'xs:double', value: 2 },
    ]);
    expect([...evaluate(parseXPath('min([3, 1, 2])'), context)]).toMatchObject([
      { type: 'xs:double', value: 1 },
    ]);
    expect([...evaluate(parseXPath('max(/root/value)'), context)]).toMatchObject([
      { type: 'xs:double', value: 6 },
    ]);
    expect([...evaluate(parseXPath('max([1, 2, 3, 4, 5])'), context)]).toMatchObject([
      { type: 'xs:double', value: 5 },
    ]);
    expect([...evaluate(parseXPath('avg(/root/value)'), context)]).toMatchObject([
      { type: 'xs:double', value: 4 },
    ]);
    expect([...evaluate(parseXPath('sum((), 3)'), context)]).toMatchObject([
      { type: 'xs:double', value: 3 },
    ]);
    expect([...evaluate(parseXPath('sum((), ())'), context)]).toEqual([]);
    expect([...evaluate(parseXPath('max(("a", "c", "b"))'), context)]).toMatchObject([
      { type: 'xs:string', value: 'c' },
    ]);
    expect([...evaluate(parseXPath('max((false(), true(), false()))'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
    expect([...evaluate(parseXPath('min((false(), true(), false()))'), context)]).toMatchObject([
      { type: 'xs:boolean', value: false },
    ]);
    expect(() => [...evaluate(parseXPath('max(("str1", "str2"), "http://example.com/UNSUPPORTED_COLLATION")'), context)]).toThrowError(
      expect.objectContaining({ code: 'FOCH0002' } satisfies Partial<XPathError>),
    );
    expect([...evaluate(parseXPath('sum(/root/missing)'), context)]).toMatchObject([
      { type: 'xs:double', value: 0 },
    ]);
    expect([...evaluate(parseXPath('avg(/root/missing)'), context)]).toEqual([]);
    expect(() => [...evaluate(parseXPath('avg(/root/textValue)'), createContext('<root><textValue>A</textValue></root>'))]).toThrowError(
      expect.objectContaining({ code: 'FORG0001' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('max(QName("urn:test", "p:name"))'), context)]).toThrowError(
      expect.objectContaining({ code: 'FORG0006' } satisfies Partial<XPathError>),
    );
  });

  it('evaluates distinct-values over atomized sequences', () => {
    const context = createContext('<root><value>A</value><value>B</value><value>A</value></root>');

    expect([...evaluate(parseXPath('distinct-values(/root/value)'), context)]).toMatchObject([
      { type: 'xs:string', value: 'A' },
      { type: 'xs:string', value: 'B' },
    ]);
  });
});