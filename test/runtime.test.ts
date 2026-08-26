import { describe, expect, it, vi } from 'vitest';

import { createCompiledDocument, createXmlNodeHandle, resolveXmlNodeHandle } from '../src/index.js';
import { selectSimplePathNodes } from '../src/runtime/index.js';

describe('xml node handles', () => {
  it('creates stable element, attribute, text, and document handles from a parsed input tree', () => {
    const document = createCompiledDocument(
      [
        '<root id="r">',
        '  <section>',
        '    <item>alpha</item>',
        '    <item priority="high">beta</item>',
        '  </section>',
        '</root>',
      ].join(''),
    );

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

  it('resolves stable handle paths back into public XML node handles', () => {
    const document = createCompiledDocument(
      [
        '<root>',
        '  <?debug step?>',
        '  <section>',
        '    <!--note-->',
        '    <item priority="high">beta</item>',
        '  </section>',
        '</root>',
      ].join(''),
    );
    const root = document.documentElement;
    if (root === null) {
      throw new Error('expected root element');
    }

    const section = root.getElementsByTagName('section').item(0);
    const item = root.getElementsByTagName('item').item(0);
    const attribute = item?.getAttributeNode('priority') ?? null;
    const textNode = item?.firstChild ?? null;
    const comment = section?.childNodes.item(1) ?? null;
    const processingInstruction = root.childNodes.item(1);
    if (
      section === null ||
      item === null ||
      attribute === null ||
      textNode === null ||
      comment === null ||
      processingInstruction === null
    ) {
      throw new Error('expected test nodes');
    }

    expect(resolveXmlNodeHandle(document, 'memory:/input.xml', '/')).toEqual(
      createXmlNodeHandle(document, 'memory:/input.xml'),
    );
    expect(
      resolveXmlNodeHandle(document, 'memory:/input.xml', '/root[1]/section[1]/item[1]'),
    ).toEqual(createXmlNodeHandle(item, 'memory:/input.xml'));
    expect(
      resolveXmlNodeHandle(document, 'memory:/input.xml', '/root[1]/section[1]/item[1]/@priority'),
    ).toEqual(createXmlNodeHandle(attribute, 'memory:/input.xml'));
    expect(
      resolveXmlNodeHandle(document, 'memory:/input.xml', '/root[1]/section[1]/item[1]/text()[1]'),
    ).toEqual(createXmlNodeHandle(textNode, 'memory:/input.xml'));
    expect(
      resolveXmlNodeHandle(document, 'memory:/input.xml', '/root[1]/section[1]/comment()[1]'),
    ).toEqual(createXmlNodeHandle(comment, 'memory:/input.xml'));
    expect(
      resolveXmlNodeHandle(
        document,
        'memory:/input.xml',
        '/root[1]/processing-instruction("debug")[1]',
      ),
    ).toEqual(createXmlNodeHandle(processingInstruction, 'memory:/input.xml'));
  });

  it('returns undefined for missing or malformed XML node paths', () => {
    const document = createCompiledDocument('<root><item>alpha</item></root>');

    expect(resolveXmlNodeHandle(document, 'memory:/input.xml', 'root[1]')).toBeUndefined();
    expect(resolveXmlNodeHandle(document, 'memory:/input.xml', '/root[1]/item[2]')).toBeUndefined();
    expect(
      resolveXmlNodeHandle(document, 'memory:/input.xml', '/root[1]/@missing'),
    ).toBeUndefined();
    expect(resolveXmlNodeHandle(document, 'memory:/input.xml', '/root[1]/text()')).toBeUndefined();
  });

  it('memoizes repeated simple path selection on the same node', () => {
    const document = createCompiledDocument('<root><section><item>A</item></section></root>');
    const root = document.documentElement;
    if (root === null) {
      throw new Error('expected root element');
    }

    const documentChildNodesSpy = vi.spyOn(document.childNodes, 'item');
    const rootChildNodesSpy = vi.spyOn(root.childNodes, 'item');
    const section = root.getElementsByTagName('section').item(0);
    if (section === null) {
      throw new Error('expected section element');
    }
    const sectionChildNodesSpy = vi.spyOn(section.childNodes, 'item');

    const firstResult = selectSimplePathNodes(document, ['root', 'section', 'item']);
    const firstCallCount =
      documentChildNodesSpy.mock.calls.length +
      rootChildNodesSpy.mock.calls.length +
      sectionChildNodesSpy.mock.calls.length;

    const secondResult = selectSimplePathNodes(document, ['root', 'section', 'item']);
    const secondCallCount =
      documentChildNodesSpy.mock.calls.length +
      rootChildNodesSpy.mock.calls.length +
      sectionChildNodesSpy.mock.calls.length;

    expect(secondResult).toBe(firstResult);
    expect(secondCallCount).toBe(firstCallCount);
  });
});
