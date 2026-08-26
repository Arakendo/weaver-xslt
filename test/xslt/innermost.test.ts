import { describe, expect, it } from 'vitest';

import { XsltProcessor } from '../../src/index.js';

const stylesheet = [
  '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
  '  <xsl:template match="/">',
  '    <out><xsl:value-of select="innermost(/root//section)/@id"/></out>',
  '  </xsl:template>',
  '</xsl:stylesheet>',
].join('\n');

describe('XSLT innermost execution', () => {
  it('uses the shared XPath semantics in interpreter execution', () => {
    const processor = new XsltProcessor(stylesheet);

    expect(
      processor.transform(
        '<root><section id="1"><section id="1.1"/></section><section id="2"/></root>',
      ).output,
    ).toBe('<out>1.1 2</out>');
  });

  it('keeps native execution explicitly unsupported', () => {
    const processor = new XsltProcessor(stylesheet);

    expect(() =>
      processor.transform('<root><section id="1"/></root>', { execution: 'native' }),
    ).toThrow(/WEAVER_XSLT_NATIVE_UNSUPPORTED/);
  });
});
