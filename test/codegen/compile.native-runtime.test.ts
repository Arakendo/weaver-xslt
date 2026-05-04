import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';
import { XsltProcessor } from '../../src/index.js';

import { compileAndLoadGeneratedModule } from './compile.support.js';

describe('XSLT codegen MVP4 slice', () => {
  it('emits native code for a single-focus position() test', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <xsl:if test="position() = 1">
            <hello><xsl:value-of select="/root/name"/></hello>
          </xsl:if>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'conditional.xsl' });

    expect(emitted).toContain('selectSimplePathText(document, ["root","name"])');
    expect(emitted).toContain('1 === 1');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native position() and last() tests inside xsl:for-each through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:for-each select="item">
              <xsl:if test="position() = 1"><first><xsl:value-of select="."/></first></xsl:if>
              <xsl:if test="position() = last()"><last><xsl:value-of select="."/></last></xsl:if>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, 'position-last-for-each.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item><item>c</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:value-of select="position()" and last() inside xsl:for-each', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:for-each select="item">
              <xsl:value-of select="position()"/>
              <xsl:text>/</xsl:text>
              <xsl:value-of select="last()"/>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'position-last-value-of.xsl' });

    expect(emitted).toContain('String((currentIndex + 1))');
    expect(emitted).toContain('String(currentNodes.length)');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:value-of position() and last() inside xsl:for-each through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:for-each select="item">
              <entry>
                <xsl:value-of select="position()"/>
                <xsl:text>/</xsl:text>
                <xsl:value-of select="last()"/>
                <xsl:text>:</xsl:text>
                <xsl:value-of select="."/>
              </entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, 'position-last-value-of-runtime.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item><item>c</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:value-of select="name()" on the current focus', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:value-of select="name()"/>
            <xsl:for-each select="item">
              <entry><xsl:value-of select="name()"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'name-value-of.xsl' });

    expect(emitted).toContain('escapeText(nameOfNode(currentNode))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:value-of name() on matched-root and for-each contexts through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:value-of select="name()"/>
            <xsl:for-each select="item">
              <entry><xsl:value-of select="name()"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, 'name-value-of-runtime.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:value-of select="name(/root)" and count(/root/item)', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out>
            <xsl:value-of select="name(/root)"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="count(/root/item)"/>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'name-count-value-of.xsl' });

    expect(emitted).toContain('nameOfNode(selectSimplePathNode(document, ["root"]))');
    expect(emitted).toContain('String(selectSimplePathNodes(document, ["root","item"]).length)');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:value-of name(/root) and count(/root/item) through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out>
            <xsl:value-of select="name(/root)"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="count(/root/item)"/>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, 'name-count-value-of-runtime.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:value-of select="local-name()" on the current focus', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:value-of select="local-name()"/>
            <xsl:for-each select="item">
              <entry><xsl:value-of select="local-name()"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'local-name-value-of.xsl' });

    expect(emitted).toContain('escapeText(localNameOfNode(currentNode))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:value-of local-name() on matched-root and for-each contexts through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:value-of select="local-name()"/>
            <xsl:for-each select="item">
              <entry><xsl:value-of select="local-name()"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, 'local-name-value-of-runtime.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:value-of select="local-name(/root)"', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out><xsl:value-of select="local-name(/root)"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'local-name-arg-value-of.xsl' });

    expect(emitted).toContain('localNameOfNode(selectSimplePathNode(document, ["root"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:value-of local-name(/root) through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out><xsl:value-of select="local-name(/root)"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, 'local-name-arg-value-of-runtime.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for parameterless named templates with the current focus intact', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:call-template name="emit-root"/>
            <xsl:for-each select="item">
              <xsl:call-template name="emit-item"/>
            </xsl:for-each>
          </out>
        </xsl:template>
        <xsl:template name="emit-root">
          <root-name><xsl:value-of select="name()"/></root-name>
        </xsl:template>
        <xsl:template name="emit-item">
          <item>
            <xsl:value-of select="position()"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="."/>
          </item>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'named-template-focus.xsl' });

    expect(emitted).toContain('/** name="emit-root" (named-template-focus.xsl:11) */');
    expect(emitted).toContain('/** name="emit-item" (named-template-focus.xsl:14) */');
    expect(emitted).toContain('escapeText(nameOfNode(currentNode))');
    expect(emitted).toContain('String((currentIndex + 1))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native parameterless named templates with the current focus intact through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:call-template name="emit-root"/>
            <xsl:for-each select="item">
              <xsl:call-template name="emit-item"/>
            </xsl:for-each>
          </out>
        </xsl:template>
        <xsl:template name="emit-root">
          <root-name><xsl:value-of select="name()"/></root-name>
        </xsl:template>
        <xsl:template name="emit-item">
          <item>
            <xsl:value-of select="position()"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="."/>
          </item>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, 'named-template-focus-runtime.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:comment', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:comment><xsl:value-of select="name()"/></xsl:comment>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'comment.xsl' });

    expect(emitted).toContain('"<!--" +');
    expect(emitted).toContain('escapeText(nameOfNode(currentNode))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:comment through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:comment><xsl:value-of select="name()"/></xsl:comment>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, 'comment-runtime.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for select-only local xsl:variable bindings reused by xsl:value-of', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:variable name="label" select="name()"/>
            <xsl:value-of select="$label"/>
            <xsl:text>:</xsl:text>
            <xsl:for-each select="item">
              <xsl:variable name="index" select="position()"/>
              <entry><xsl:value-of select="$index"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'local-variable-value-of.xsl' });

    expect(emitted).toContain('const variable_label_0 = nameOfNode(currentNode);');
    expect(emitted).toContain('const variable_index_0 = String((currentIndex + 1));');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native select-only local xsl:variable bindings through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:variable name="label" select="name()"/>
            <xsl:value-of select="$label"/>
            <xsl:text>:</xsl:text>
            <xsl:for-each select="item">
              <xsl:variable name="index" select="position()"/>
              <entry><xsl:value-of select="$index"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, 'local-variable-value-of-runtime.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item/><item/></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });
});