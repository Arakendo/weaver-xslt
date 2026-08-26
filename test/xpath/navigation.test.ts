import { describe, expect, it } from 'vitest';

import { XPathError } from '../../src/errors/XPathError.js';
import { createXdmNode, type XdmNode } from '../../src/xdm/types.js';
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

describe('XPath navigation coverage', () => {
  it('does not expose DOM whitespace as XDM document-node children', () => {
    const context = createContext('\n<root/>\n');

    expect([...evaluate(parseXPath('count(node())'), context)]).toMatchObject([
      { type: 'xs:integer', value: 1 },
    ]);
    expect([...evaluate(parseXPath('text()'), context)]).toEqual([]);
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
    expect(fullChain.map((item) => item.node.nodeName)).toEqual(['#document', 'root', 'group', 'item', 'leaf']);
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
    expect(precedingOrder.map((item) => item.node.textContent)).toEqual(['A', 'B']);
    expect(followingAxis).toHaveLength(1);
    expect(followingAxis[0]?.node.textContent).toBe('C');
    expect(precedingAxis).toHaveLength(1);
    expect(precedingAxis[0]?.node.textContent).toBe('A');
  });

  it('supports namespace-wildcard local-name tests', () => {
    const context = createContext('<root xmlns:a="urn:test"><a:Open>first</a:Open><a:Closed>skip</a:Closed><a:Open>second</a:Open></root>');

    const openNodes = [...evaluate(parseXPath('//*:Open'), context)] as XdmNode[];

    expect(openNodes.map((item) => item.node.textContent)).toEqual(['first', 'second']);
  });

  it('supports prefix-wildcard attribute tests', () => {
    const context = createContext('<root xml:lang="en" xmlns:xml="http://www.w3.org/XML/1998/namespace" other="x"/>');

    const xmlAttributes = [...evaluate(parseXPath('//@xml:*'), context)] as XdmNode[];

    expect(xmlAttributes.map((item) => item.node.nodeName)).toEqual(['xml:lang']);
  });

  it('supports the namespace axis over in-scope namespace declarations', () => {
    const context = createContext('<root xmlns:xlink="http://www.w3.org/1999/xlink"><child/></root>');

    const namespaceNodes = [...evaluate(parseXPath('//namespace::*[. = "http://www.w3.org/1999/xlink"]'), context)] as XdmNode[];

    expect(namespaceNodes).toHaveLength(1);
    expect(namespaceNodes[0]?.node.nodeName).toBe('xmlns:xlink');
    expect(namespaceNodes[0]?.node.textContent).toBe('http://www.w3.org/1999/xlink');
  });

  it('supports processing-instruction() kind tests', () => {
    const context = createContext('<?xml version="1.0"?><?xml-stylesheet type="text/xsl" href="style.xsl"?><root/>');

    expect([...evaluate(parseXPath('name((//processing-instruction())[1])'), context)]).toMatchObject([
      { type: 'xs:string', value: 'xml-stylesheet' },
    ]);
    expect([...evaluate(parseXPath('local-name((//processing-instruction())[1])'), context)]).toMatchObject([
      { type: 'xs:string', value: 'xml-stylesheet' },
    ]);
  });

  it('supports comment() kind tests', () => {
    const context = createContext('<root><!--note--><child/></root>');

    expect([...evaluate(parseXPath('name((//comment())[1]) = ""'), context)]).toMatchObject([
      { type: 'xs:boolean', value: true },
    ]);
  });

  it('supports zero-argument normalize-space() inside predicates', () => {
    const context = createContext('<doc><a>Hello,&#10;  How        are&#10;&#9;you?</a></doc>');

    expect([...evaluate(parseXPath('//a[normalize-space() = "Hello, How are you?"]'), context)]).toHaveLength(1);
    expect([...evaluate(parseXPath('//doc/normalize-space(zero-or-one(a[normalize-space() = "Hello, How are you?"]))'), context)]).toMatchObject([
      { type: 'xs:string', value: 'Hello, How are you?' },
    ]);
  });

  it('supports parenthesized union operands inside paths', () => {
    const context = createContext('<works><employee><status><day>Monday</day></status><overtime><day>Tuesday</day></overtime></employee></works>');

    expect([...evaluate(parseXPath('/works/employee/(status|overtime)/day/string()'), context)]).toMatchObject([
      { type: 'xs:string', value: 'Monday' },
      { type: 'xs:string', value: 'Tuesday' },
    ]);
    expect([...evaluate(parseXPath('/works/employee/(status union overtime)/day/string()'), context)]).toMatchObject([
      { type: 'xs:string', value: 'Monday' },
      { type: 'xs:string', value: 'Tuesday' },
    ]);
  });

  it('supports intersect and except over node sequences', () => {
    const context = createContext('<works><employee name="John Doe 12"><overtime><day>Tuesday</day></overtime></employee></works>');

    expect([...evaluate(parseXPath('string(((/works/employee/overtime/day/ancestor-or-self::employee) intersect (/works/employee/overtime/day/ancestor-or-self::employee))/@name)'), context)]).toMatchObject([
      { type: 'xs:string', value: 'John Doe 12' },
    ]);
    expect([...evaluate(parseXPath('count((/works/employee/overtime/day[ancestor::overtime]) except (/works/employee/overtime/day[ancestor::overtime]))'), context)]).toMatchObject([
      { type: 'xs:integer', value: 0 },
    ]);
  });

  it('raises a type error when node comparisons do not receive singleton nodes', () => {
    let thrown: unknown;

    try {
      Array.from(evaluate(parseXPath('1 is /root'), createContext('<root/>')));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(XPathError);
    expect(thrown).toMatchObject({ code: 'XPTY0004' });
  });
});
