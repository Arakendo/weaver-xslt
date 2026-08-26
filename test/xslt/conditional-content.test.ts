import { describe, expect, it } from 'vitest';

import { XsltProcessor } from '../../src/index.js';
import { compileStylesheet } from '../../src/xslt/compile/compiler.js';

const stylesheet = (body: string) =>
  `<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><out>${body}</out></xsl:template></xsl:stylesheet>`;

describe('conditional sequence content', () => {
  it('retains source-located conditional content in IR version 1.4', () => {
    const ir = compileStylesheet(
      stylesheet('<value/><xsl:on-non-empty select="23"/><xsl:on-empty>empty</xsl:on-empty>'),
    );
    const literalResult = ir.templates[0]?.body[0];
    const body = literalResult?.kind === 'literalElement' ? literalResult.body : [];

    expect(ir.version).toBe('1.4');
    expect(body[1]).toMatchObject({
      kind: 'conditionalContent',
      condition: 'non-empty',
      selectText: '23',
      location: expect.objectContaining({ line: 1 }),
    });
    expect(body[2]).toMatchObject({
      kind: 'conditionalContent',
      condition: 'empty',
      body: [{ kind: 'literalText', text: 'empty' }],
    });
  });

  it('buffers the constructor and preserves marker positions and variable snapshots', () => {
    const processor = new XsltProcessor(
      stylesheet(
        [
          '<xsl:variable name="x" select="21"/>',
          '<xsl:on-non-empty select="$x"/>',
          '<xsl:copy-of select="/comment()"/>',
          '<xsl:variable name="x" select="23"/>',
          '<xsl:on-non-empty select="$x"/>',
          '<in/>',
        ].join(''),
      ),
    );

    expect(processor.transform('<doc/>').output).toBe('<out>21 23<in></in></out>');
  });

  it('selects empty content and ignores fallback instructions', () => {
    const processor = new XsltProcessor(
      stylesheet(
        '<xsl:value-of select="/missing"/><xsl:on-non-empty>non-empty</xsl:on-non-empty><xsl:on-empty>empty</xsl:on-empty><xsl:fallback>ignored</xsl:fallback>',
      ),
    );

    expect(processor.transform('<doc/>').output).toBe('<out>empty</out>');
  });

  it('diagnoses xsl:on-empty before another constructor instruction', () => {
    expect(() =>
      compileStylesheet(
        stylesheet(
          '<xsl:on-empty>empty</xsl:on-empty><xsl:on-non-empty>non-empty</xsl:on-non-empty>',
        ),
      ),
    ).toThrow(/\[XTSE0010\] xsl:on-empty must be the last instruction/);
  });

  it('keeps native execution explicitly unsupported', () => {
    const processor = new XsltProcessor(stylesheet('<value/><xsl:on-non-empty select="23"/>'));

    expect(() => processor.transform('<doc/>', { execution: 'native' })).toThrow(
      /WEAVER_XSLT_NATIVE_UNSUPPORTED/,
    );
  });
});
