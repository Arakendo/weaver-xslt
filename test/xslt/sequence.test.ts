import { describe, expect, it } from 'vitest';

import { XsltProcessor } from '../../src/index.js';
import { compileStylesheet } from '../../src/xslt/compile/compiler.js';

const stylesheet = (body: string) =>
  `<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><out>${body}</out></xsl:template></xsl:stylesheet>`;

describe('xsl:sequence', () => {
  it('retains a source-located select expression in IR version 1.3', () => {
    const ir = compileStylesheet(stylesheet('<xsl:sequence select="1 to 3"/>'));
    const literalResult = ir.templates[0]?.body[0];
    const sequence = literalResult?.kind === 'literalElement' ? literalResult.body[0] : undefined;

    expect(ir.version).toBe('1.3');
    expect(sequence).toMatchObject({
      kind: 'sequence',
      selectText: '1 to 3',
      location: expect.objectContaining({ line: 1 }),
    });
  });

  it('constructs node and adjacent atomic sequence results', () => {
    const processor = new XsltProcessor(
      stylesheet('<xsl:sequence select="/root/item"/><xsl:sequence select="1 to 3"/>'),
    );

    expect(processor.transform('<root><item>A</item><item>B</item></root>').output).toBe(
      '<out><item>A</item><item>B</item>1 2 3</out>',
    );
  });

  it('diagnoses a missing select attribute in the supported slice', () => {
    expect(() => compileStylesheet(stylesheet('<xsl:sequence/>'))).toThrow(
      /\[XTSE0010\] xsl:sequence requires a select attribute/,
    );
  });

  it('keeps native execution explicitly unsupported until the shared plan supports it', () => {
    const processor = new XsltProcessor(stylesheet('<xsl:sequence select="1 to 3"/>'));

    expect(() => processor.transform('<root/>', { execution: 'native' })).toThrow(
      /WEAVER_XSLT_NATIVE_UNSUPPORTED/,
    );
  });
});
