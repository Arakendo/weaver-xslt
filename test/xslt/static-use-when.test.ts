import { describe, expect, it } from 'vitest';

import { XsltProcessor } from '../../src/index.js';
import { compileStylesheet } from '../../src/xslt/compile/compiler.js';

const XSLT = 'http://www.w3.org/1999/XSL/Transform';

function stylesheet(variableSelect: string, useWhen: string): string {
  return [
    `<xsl:stylesheet version="3.0" xmlns:xsl="${XSLT}">`,
    `  <xsl:variable name="RUN" select="${variableSelect}" static="yes"/>`,
    `  <xsl:template name="main" use-when="${useWhen}"><out/></xsl:template>`,
    '</xsl:stylesheet>',
  ].join('\n');
}

describe('static use-when compilation', () => {
  it('retains declarations guarded by a true boolean static variable', () => {
    const source = stylesheet('true()', '$RUN');
    const ir = compileStylesheet(source);

    expect(ir.globalBindings).toHaveLength(1);
    expect(ir.templates.map((template) => template.name)).toEqual(['main']);
    expect(
      new XsltProcessor(source).transform('<root/>', { initialTemplate: 'main' }).output,
    ).toBe('<out></out>');
  });

  it('removes declarations guarded by a false boolean static variable', () => {
    const ir = compileStylesheet(stylesheet('false()', '$RUN'));

    expect(ir.globalBindings).toHaveLength(1);
    expect(ir.templates).toEqual([]);
  });

  it('keeps unsupported static expressions on the structured diagnostic path', () => {
    expect(() => compileStylesheet(stylesheet('1 = 1', '$RUN'))).toThrow(
      'xsl:variable has an unsupported attribute static.',
    );
  });

  it('keeps unsupported use-when expressions on the structured diagnostic path', () => {
    expect(() => compileStylesheet(stylesheet('true()', 'not($RUN)'))).toThrow(
      'xsl:template has an unsupported attribute use-when.',
    );
  });
});
