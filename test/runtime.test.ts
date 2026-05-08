import { describe, expect, it } from 'vitest';

import { createCompiledDocument, createXmlNodeHandle } from '../src/runtime/index.js';

describe('xml node handles', () => {
  it('creates stable element, attribute, text, and document handles from a parsed input tree', () => {
    const document = createCompiledDocument([
      '<root id="r">',
      '  <section>',
      '    <item>alpha</item>',
      '    <item priority="high">beta</item>',
      '  </section>',
      '</root>',
    ].join(''));

    const root = document.documentElement;
    if (root === null) {
      throw new Error('expected root element');
    }

    const secondItem = root.getElementsByTagName('item').item(1);
    if (secondItem === null) {
      throw new Error('expected second item element');
    }

    const priority = secondItem.getAttributeNode('priority');
    const textNode = secondItem.firstChild;
    if (priority === null || textNode === null) {
      throw new Error('expected attribute and text node');
    }

    expect(createXmlNodeHandle(document, 'memory:/input.xml')).toEqual({
      documentUri: 'memory:/input.xml',
      kind: 'document',
      path: '/',
    });
    expect(createXmlNodeHandle(secondItem, 'memory:/input.xml')).toEqual({
      documentUri: 'memory:/input.xml',
      kind: 'element',
      path: '/root[1]/section[1]/item[2]',
    });
    expect(createXmlNodeHandle(priority, 'memory:/input.xml')).toEqual({
      documentUri: 'memory:/input.xml',
      kind: 'attribute',
      path: '/root[1]/section[1]/item[2]/@priority',
    });
    expect(createXmlNodeHandle(textNode, 'memory:/input.xml')).toEqual({
      documentUri: 'memory:/input.xml',
      kind: 'text',
      path: '/root[1]/section[1]/item[2]/text()[1]',
    });
  });
});