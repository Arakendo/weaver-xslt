import { describe, expect, it } from 'vitest';

import { transformCompiledStylesheet } from '../../src/runtime/index.js';
import { compileStylesheet } from '../../src/xslt/compile/compiler.js';
import { XsltProcessor } from '../../src/index.js';

import { compileAndLoadGeneratedModule, expectRuntimeModuleToMatchInterpreter } from './compile.support.js';

const HELLO_FIXTURE_STYLESHEET = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/"><hello><xsl:value-of select="/root/name"/></hello></xsl:template>
      </xsl:stylesheet>
    `;
const CONDITIONAL_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><out><xsl:if test="/root/name = &apos;world&apos;"><yes/></xsl:if><xsl:choose><xsl:when test="/root/role = &apos;admin&apos;"><role>admin</role></xsl:when><xsl:otherwise><role>user</role></xsl:otherwise></xsl:choose></out></xsl:template></xsl:stylesheet>';
const RELATIVE_FIXTURE_STYLESHEET = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out>
            <xsl:value-of select="root/name"/>
            <xsl:if test="root/flag"><flagged/></xsl:if>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
const BOOLEAN_HELPERS_FIXTURE_STYLESHEET = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out>
            <xsl:if test="not(root/flag)"><missing/></xsl:if>
            <xsl:if test="true()"><always/></xsl:if>
            <xsl:if test="false()"><never/></xsl:if>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
const APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="."/></item></xsl:template></xsl:stylesheet>';

const MODULE_RUNTIME_CASES = [
  { name: 'conditional', path: 'conditional.xsl', stylesheet: CONDITIONAL_FIXTURE_STYLESHEET, sourceXml: '<root><name>world</name><role>admin</role></root>' },
  { name: 'relative', path: 'relative.xsl', stylesheet: RELATIVE_FIXTURE_STYLESHEET, sourceXml: '<root><name>world</name><flag/></root>' },
  { name: 'boolean-helpers', path: 'boolean-helpers.xsl', stylesheet: BOOLEAN_HELPERS_FIXTURE_STYLESHEET, sourceXml: '<root><name>world</name></root>' },
  { name: 'apply-templates', path: 'apply-templates.xsl', stylesheet: APPLY_TEMPLATES_FIXTURE_STYLESHEET, sourceXml: '<root><item><name>apple</name></item><item><name>pear</name></item></root>' },
  { name: 'apply-templates-default', path: 'apply-templates-default.xsl', stylesheet: APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, sourceXml: '<invoice><item>apple</item><note>carry</note><section><item>pear</item></section></invoice>' },
] as const;

describe('XSLT codegen core runtime surface', () => {
  it('executes compiled IR through the runtime helper with interpreter-equivalent output', () => {
    const sourceXml = '<root><name>world</name></root>';
    const ir = compileStylesheet(HELLO_FIXTURE_STYLESHEET);
    const generatedResult = transformCompiledStylesheet(ir, sourceXml);
    const interpreterResult = new XsltProcessor(HELLO_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedResult).toEqual(interpreterResult);
  });

  it('executes a generated module end-to-end through the runtime surface', async () => {
    const sourceXml = '<root><name>world</name></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(HELLO_FIXTURE_STYLESHEET, 'hello.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly source: { readonly path: string };
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(HELLO_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.source).toMatchObject({ path: 'hello.xsl' });
    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  for (const { name, path, stylesheet, sourceXml } of MODULE_RUNTIME_CASES) {
    it(`executes the ${name} module through the runtime surface`, () => {
      expectRuntimeModuleToMatchInterpreter(stylesheet, path, sourceXml);
    });
  }
});