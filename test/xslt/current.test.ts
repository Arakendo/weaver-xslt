import { describe, expect, it } from 'vitest';

import { XsltProcessor } from '../../src/index.js';
import { compileStylesheet } from '../../src/xslt/compile/compiler.js';

const wrapStylesheet = (templates: string) =>
  `<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">${templates}</xsl:stylesheet>`;

const currentPatternStylesheet = wrapStylesheet(
  [
    '<xsl:template match="*"><xsl:copy><xsl:apply-templates select="*"/></xsl:copy></xsl:template>',
    '<xsl:template match="foo[preceding-sibling::foo[. eq current()]]" as="comment()">',
    '<xsl:comment select="\'match\'"/>',
    '</xsl:template>',
  ].join(''),
);

describe('XSLT current() pattern semantics', () => {
  it('retains source-located copy and comment select instructions in IR version 1.4', () => {
    const ir = compileStylesheet(currentPatternStylesheet);

    expect(ir.version).toBe('1.4');
    expect(ir.templates[0]?.body[0]).toMatchObject({
      kind: 'copy',
      location: expect.objectContaining({ line: 1 }),
    });
    expect(ir.templates[1]).toMatchObject({
      as: 'comment()',
      body: [{ kind: 'comment', selectText: "'match'" }],
    });
  });

  it('keeps current() anchored to each pattern candidate through nested predicates', () => {
    const processor = new XsltProcessor(currentPatternStylesheet);

    expect(
      processor.transform('<test><foo>bar</foo><foo>baz</foo><foo>bar</foo></test>').output,
    ).toBe('<test><foo></foo><foo></foo><!--match--></test>');
  });

  it('diagnoses unsupported copy and result-type forms', () => {
    expect(() =>
      compileStylesheet(
        wrapStylesheet('<xsl:template match="/"><xsl:copy select="."/></xsl:template>'),
      ),
    ).toThrow(/xsl:copy has an unsupported attribute select/);
    expect(() =>
      compileStylesheet(wrapStylesheet('<xsl:template match="/" as="element()"/>')),
    ).toThrow(/Unsupported xsl:template result sequence type "element\(\)"/);
  });

  it('keeps native execution explicitly unsupported', () => {
    const processor = new XsltProcessor(currentPatternStylesheet);

    expect(() =>
      processor.transform('<test><foo>bar</foo><foo>bar</foo></test>', {
        execution: 'native',
      }),
    ).toThrow(/WEAVER_XSLT_NATIVE_UNSUPPORTED/);
  });
});
