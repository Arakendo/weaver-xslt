import { describe, expect, it } from 'vitest';

import { XsltProcessor } from '../../../src/index.js';

function transformNumbering(body: string, sourceXml: string): string {
  const processor = new XsltProcessor(`
    <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
      <xsl:template match="/">
        <out><xsl:apply-templates select="root/item"/></out>
      </xsl:template>
      <xsl:template match="item">${body}</xsl:template>
    </xsl:stylesheet>
  `);

  return processor.transform(sourceXml, { execution: 'interpreter' }).output;
}

describe('interpreter xsl:number', () => {
  it('counts matching siblings at the single level', () => {
    expect(
      transformNumbering(
        '<xsl:number count="item" level="single" format="1"/>',
        '<root><item/><item/><item/></root>',
      ),
    ).toBe('<out>123</out>');
  });

  it('formats counts with upper- and lower-case Roman numerals', () => {
    expect(
      transformNumbering(
        '<xsl:number count="item" level="single" format="I"/><xsl:text>/</xsl:text><xsl:number count="item" level="single" format="i"/><xsl:text>;</xsl:text>',
        '<root><item/><item/><item/></root>',
      ),
    ).toBe('<out>I/i;II/ii;III/iii;</out>');
  });

  it('counts matching nodes in document order at the any level', () => {
    expect(
      transformNumbering(
        '<xsl:number count="item" level="any" format="1"/>',
        '<root><item/><item/><item/></root>',
      ),
    ).toBe('<out>123</out>');
  });
});
