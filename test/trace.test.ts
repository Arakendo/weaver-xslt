import { describe, expect, it } from 'vitest';

import type { XmlTraceEvent } from '../src/index.js';
import { XsltProcessor } from '../src/index.js';

describe('xml node tracing', () => {
  it('emits focus-enter and template-enter events on the interpreter path', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <items><xsl:apply-templates select="/root/item"/></items>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <entry><xsl:value-of select="."/></entry>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const events: XmlTraceEvent[] = [];
    const result = new XsltProcessor(stylesheet).transform(
      '<root><item>alpha</item><item>beta</item></root>',
      {
        execution: 'interpreter',
        trace: {
          documentUri: 'memory:/input.xml',
          onEvent: (event) => events.push(event),
        },
      },
    );

    expect(result.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(events).toEqual([
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
        template: {
          match: '/',
          location: expect.any(Object),
        },
      },
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
        template: {
          match: 'item',
          location: expect.any(Object),
        },
      },
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
        template: {
          match: 'item',
          location: expect.any(Object),
        },
      },
    ]);
  });
});