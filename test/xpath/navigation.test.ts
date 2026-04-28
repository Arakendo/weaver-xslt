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
});