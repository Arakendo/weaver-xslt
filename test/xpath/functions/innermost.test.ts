import { describe, expect, it } from 'vitest';

import { parseXml } from '../../../src/xml/parse.js';
import { createXdmNode, type XdmNode } from '../../../src/xdm/types.js';
import type { DynamicContext } from '../../../src/xpath/eval/context.js';
import { evaluate } from '../../../src/xpath/eval/evaluator.js';
import { parseXPath } from '../../../src/xpath/parse/parser.js';

function evaluateNodes(expression: string, xml: string): XdmNode[] {
  const context: DynamicContext = {
    staticContext: { namespaces: new Map(), defaultElementNamespace: '' },
    contextItem: createXdmNode(parseXml(xml)),
    contextPosition: 1,
    contextSize: 1,
    variables: new Map(),
  };
  return [...evaluate(parseXPath(expression), context)] as XdmNode[];
}

describe('XPath innermost and snapshot functions', () => {
  it('retains only input nodes without a selected descendant in document order', () => {
    const result = evaluateNodes(
      'innermost(/root/section | /root/section/section)/@id',
      '<root><section id="1"><section id="1.1"/></section><section id="2"/></root>',
    );

    expect(result.map((item) => item.node.nodeValue)).toEqual(['1.1', '2']);
  });

  it('grounds a copied subtree for subsequent navigation', () => {
    const [result] = evaluateNodes(
      'snapshot(/root)/section/@id',
      '<root><section id="1"/></root>',
    );

    expect(result?.node.nodeValue).toBe('1');
    expect(result?.node.ownerDocument?.documentElement?.nodeName).toBe('root');
  });

  it('rejects atomic innermost inputs', () => {
    expect(() => evaluateNodes('innermost((1, 2))', '<root/>')).toThrow(
      'Function fn:innermost requires a node sequence.',
    );
  });
});
