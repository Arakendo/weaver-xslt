import { describe, expect, it } from 'vitest';

import { XsltProcessor } from '../../src/index.js';
import { compileStylesheet } from '../../src/xslt/compile/compiler.js';

const stylesheet = (body: string) =>
  `<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><out>${body}</out></xsl:template></xsl:stylesheet>`;

describe('xsl:sort', () => {
  it('retains a leading default text sort key in IR version 1.3', () => {
    const ir = compileStylesheet(
      stylesheet(
        '<xsl:for-each select="/*/item"><xsl:sort/><xsl:copy-of select="."/></xsl:for-each>',
      ),
    );
    const literalResult = ir.templates[0]?.body[0];
    const forEach = literalResult?.kind === 'literalElement' ? literalResult.body[0] : undefined;

    expect(ir.version).toBe('1.3');
    expect(forEach).toMatchObject({ kind: 'forEach' });
    expect(forEach?.kind === 'forEach' ? forEach.body[0] : undefined).toMatchObject({
      kind: 'sort',
      selectText: '.',
      location: expect.objectContaining({ line: 1 }),
    });
  });

  it('stably orders the for-each input by its leading text sort keys', () => {
    const processor = new XsltProcessor(
      stylesheet(
        '<xsl:for-each select="/*/item"><xsl:sort select="@group"/><xsl:sort select="."/><xsl:copy-of select="."/></xsl:for-each>',
      ),
    );

    expect(
      processor.transform(
        '<doc><item group="2">c</item><item group="1">b</item><item group="1">a</item></doc>',
      ).output,
    ).toBe('<out><item group="1">a</item><item group="1">b</item><item group="2">c</item></out>');
  });

  it('diagnoses misplaced and unsupported sort forms', () => {
    expect(() =>
      compileStylesheet(
        stylesheet('<xsl:for-each select="/*"><xsl:copy-of select="."/><xsl:sort/></xsl:for-each>'),
      ),
    ).toThrow(/xsl:sort must precede every other instruction/);
    expect(() => compileStylesheet(stylesheet('<xsl:sort/>'))).toThrow(
      /xsl:sort is only supported as a leading child of xsl:for-each/,
    );
    expect(() =>
      compileStylesheet(
        stylesheet('<xsl:for-each select="/*"><xsl:sort order="descending"/></xsl:for-each>'),
      ),
    ).toThrow(/xsl:sort has an unsupported attribute order/);
  });

  it('keeps native execution explicitly unsupported', () => {
    const processor = new XsltProcessor(
      stylesheet(
        '<xsl:for-each select="/*/item"><xsl:sort/><xsl:copy-of select="."/></xsl:for-each>',
      ),
    );

    expect(() =>
      processor.transform('<doc><item>b</item><item>a</item></doc>', {
        execution: 'native',
      }),
    ).toThrow(/WEAVER_XSLT_NATIVE_UNSUPPORTED/);
  });
});
