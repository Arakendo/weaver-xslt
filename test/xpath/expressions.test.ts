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
    expect([...evaluate(parseXPath('(1, 2, 3)[1.0e0]'), context)]).toMatchObject([
      { type: 'xs:double', value: 1 },
    ]);
    expect([...evaluate(parseXPath('3 to 1'), context)]).toEqual([]);
    expect([...evaluate(parseXPath('7 idiv 2'), context)]).toMatchObject([
      { type: 'xs:double', value: 3 },
    ]);
    expect([...evaluate(parseXPath('1!data()'), context)]).toMatchObject([
      { type: 'xs:double', value: 1 },
    ]);
  });

  it('raises a type error for non-integer range operands in the initial range slice', () => {
    let thrown: unknown;

    try {
      Array.from(evaluate(parseXPath('1.5 to 3'), createContext('<root/>')));
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
      { type: 'xs:integer', value: 3 },
    ]);
    expect([...evaluate(parseXPath('((1 to 6)[. mod 2 eq 0])'), context)]).toMatchObject([
      { type: 'xs:double', value: 2 },
      { type: 'xs:double', value: 4 },
      { type: 'xs:double', value: 6 },
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
    expect([...evaluate(parseXPath('let $x := /root return $x/item[1]'), context)]).toMatchObject([
      { xdmKind: 'node' },
    ]);
    expect([...evaluate(parseXPath('let $x := 1, $y := $x + 1 return ($x, $y)'), context)]).toMatchObject([
      { type: 'xs:double', value: 1 },
      { type: 'xs:double', value: 2 },
    ]);
  });

  it('coerces node-valued variables in arithmetic expressions', () => {
    const context = createContext('<root><item>30</item></root>');

    expect([...evaluate(parseXPath('let $x := /root/item return $x + 1'), context)]).toMatchObject([
      { type: 'xs:double', value: 31 },
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

    const nestedContext = createContext('<root><Folder><File>A</File><Folder><File>B</File></Folder><File>C</File></Folder></root>');
    expect([...evaluate(parseXPath('for $file in //Folder/File return string($file)'), nestedContext)]).toMatchObject([
      { type: 'xs:string', value: 'A' },
      { type: 'xs:string', value: 'B' },
      { type: 'xs:string', value: 'C' },
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
    expect([...evaluate(parseXPath('some $x in (1, 2) satisfies $x eq 2, 0'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
      { type: 'xs:double', value: 0 },
    ]);
    expect(() => [...evaluate(parseXPath('some $a in (1, 2), $b in (1, 2), $c in (1, 2) satisfies 1, $a'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPST0008' }),
    );
    expect(() => [...evaluate(parseXPath('$PREFIXNOTEXIST:NOTEXIST'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPST0081' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('$xs:NOTEXIST'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPST0008' } satisfies Partial<XPathError>),
    );
    expect(() => [...evaluate(parseXPath('(1 to 10)/count()'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPST0017' } satisfies Partial<XPathError>),
    );
  });

  it('uses position() and last() inside predicates', () => {
    const context = createContext('<root><item name="A">A</item><item name="B">B</item><item name="C">C</item></root>');

    const second = [...evaluate(parseXPath('/root/item[position() = 2]'), context)] as XdmNode[];
    const final = [...evaluate(parseXPath('/root/item[position() = last()]'), context)] as XdmNode[];
    const names = [...evaluate(parseXPath('/root/item[position() >= 2]/string(@name)'), context)];

    expect(second).toHaveLength(1);
    expect(second[0]?.node.textContent).toBe('B');
    expect(final).toHaveLength(1);
    expect(final[0]?.node.textContent).toBe('C');
    expect(names).toMatchObject([
      { type: 'xs:string', value: 'B' },
      { type: 'xs:string', value: 'C' },
    ]);
  });

  it('rebinds focus correctly for nested position() and last() path predicates', () => {
    const context = createContext([
      '<root>',
      '  <a><b>A1</b><b>A2</b><b>A3</b></a>',
      '  <a><b>B1</b><b>B2</b></a>',
      '  <a><b>C1</b></a>',
      '</root>',
    ].join(''));

    const result = [...evaluate(parseXPath('string(/root/a[b[position() = 2]][position() = last()]/b[last()])'), context)];

    expect(result).toMatchObject([{ type: 'xs:string', value: 'B2' }]);
  });

  it('raises XPDY0002 when position() or last() is called without a focus', () => {
    const context: DynamicContext = {
      staticContext: {
        namespaces: new Map(),
        defaultElementNamespace: '',
      },
      contextItem: null,
      contextPosition: 0,
      contextSize: 0,
      variables: new Map(),
    };

    expect(() => [...evaluate(parseXPath('position()'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPDY0002' }),
    );
    expect(() => [...evaluate(parseXPath('last()'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPDY0002' }),
    );
    expect(() => [...evaluate(parseXPath('last(1)'), context)]).toThrowError(
      expect.objectContaining({ code: 'XPST0017' }),
    );
  });
});