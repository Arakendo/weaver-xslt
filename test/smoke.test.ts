import { describe, it, expect } from 'vitest';
import { VERSION, XsltProcessor } from '../src/index.js';

describe('@arakendo/xslt scaffold', () => {
  it('exposes a version string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('constructs an XsltProcessor', () => {
    const proc = new XsltProcessor('<xsl:stylesheet/>');
    expect(proc).toBeInstanceOf(XsltProcessor);
  });

  it('transforms a literal-result hello-world stylesheet', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/"><hello>world</hello></xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>')).toEqual({ output: '<hello>world</hello>' });
  });

  it('evaluates xsl:value-of against the source document', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/"><hello><xsl:value-of select="/root/name"/></hello></xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root><name>world</name></root>')).toEqual({ output: '<hello>world</hello>' });
  });

  it('applies templates through the built-in root and element rules', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template>
        <xsl:template match="item"><item><xsl:value-of select="."/></item></xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<invoice><item>apple</item><item>pear</item></invoice>')).toEqual({
      output: '<items><item>apple</item><item>pear</item></items>',
    });
  });

  it('prefers a higher default-priority name test over a wildcard template', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/"><out><xsl:apply-templates select="/root/*"/></out></xsl:template>
        <xsl:template match="*"><generic><xsl:value-of select="."/></generic></xsl:template>
        <xsl:template match="item"><item><xsl:value-of select="."/></item></xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root><item>apple</item><other>pear</other></root>')).toEqual({
      output: '<out><item>apple</item><generic>pear</generic></out>',
    });
  });

  it('prefers the later template when priorities tie', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/"><out><xsl:apply-templates select="/root/item"/></out></xsl:template>
        <xsl:template match="item"><first><xsl:value-of select="."/></first></xsl:template>
        <xsl:template match="item"><second><xsl:value-of select="."/></second></xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root><item>apple</item></root>')).toEqual({
      output: '<out><second>apple</second></out>',
    });
  });

  it('uses the built-in root rule before applying node() or wildcard templates', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="doc">
          <out><xsl:apply-templates select="foo"/></out>
        </xsl:template>
        <xsl:template match="node()"><xsl:text>Match-of-node-type</xsl:text></xsl:template>
        <xsl:template match="*"><xsl:text>Match-of-wildcard</xsl:text></xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<doc><foo test="true"/></doc>')).toEqual({
      output: '<out>Match-of-wildcard</out>',
    });
  });

  it('supports absolute root-child match patterns such as /doc', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/doc"><out><xsl:value-of select="./text()"/></out></xsl:template>
        <xsl:template match="text()"><xsl:value-of select="."/></xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<doc>test</doc>')).toEqual({
      output: '<out>test</out>',
    });
  });

  it('matches prefixed template names against default-namespaced source nodes', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet
        version="3.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        xmlns:ns1="urn:one"
        xmlns:ns2="urn:two"
      >
        <xsl:template match="ns2:doc">
          <out><xsl:value-of select="local-name(ns2:b)"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<doc xmlns="urn:two" xmlns:ns1="urn:one"><ns1:a/><b/></doc>')).toEqual({
      output: '<out xmlns:ns1="urn:one" xmlns:ns2="urn:two">b</out>',
    });
  });

  it('suppresses excluded result namespaces on literal result elements', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet
        version="3.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        xmlns:foo="urn:foo"
        exclude-result-prefixes="foo"
      >
        <xsl:template match="/">
          <out xmlns:bar="urn:bar" exclude-result-prefixes="bar">ok</out>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>')).toEqual({
      output: '<out>ok</out>',
    });
  });

  it('renders xsl:if bodies only when the test expression is true', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out>
            <xsl:if test="2 = 2"><xsl:text>number </xsl:text></xsl:if>
            <xsl:if test="'a' = 'a'"><xsl:text>string</xsl:text></xsl:if>
            <xsl:if test="0 = 1"><xsl:text>nope</xsl:text></xsl:if>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>')).toEqual({
      output: '<out>number string</out>',
    });
  });

  it('renders the first matching xsl:when branch or xsl:otherwise', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root"><out><xsl:apply-templates select="person"/></out></xsl:template>
        <xsl:template match="person">
          <xsl:choose>
            <xsl:when test="sex='M'"><male/></xsl:when>
            <xsl:when test="sex='F'"></xsl:when>
            <xsl:otherwise><other/></xsl:otherwise>
          </xsl:choose>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root><person><sex>M</sex></person><person><sex>F</sex></person><person><sex>X</sex></person></root>')).toEqual({
      output: '<out><male></male><other></other></out>',
    });
  });

  it('updates the focus for xsl:for-each iterations', () => {
    const proc = new XsltProcessor(`
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
    `);

    expect(proc.transform('<root><item>a</item><item>b</item><item>c</item></root>')).toEqual({
      output: '<out><first>a</first><last>c</last></out>',
    });
  });

  it('calls parameterless named templates with the current focus intact', () => {
    const proc = new XsltProcessor(`
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
    `);

    expect(proc.transform('<root><item>a</item><item>b</item></root>')).toEqual({
      output: '<out><root-name>root</root-name><item>1:a</item><item>2:b</item></out>',
    });
  });

  it('runs an initial template against the source document focus', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root"><wrong/></xsl:template>
        <xsl:template name="main">
          <out>
            <xsl:value-of select="name(/root)"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="count(/root/item)"/>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root><item/><item/></root>', { initialTemplate: 'main' })).toEqual({
      output: '<out>root:2</out>',
    });
  });

  it('matches named templates by expanded QName rather than lexical prefix', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out xmlns:foo="urn:test">
            <xsl:call-template name="foo:emit"/>
          </out>
        </xsl:template>
        <xsl:template xmlns:bar="urn:test" name="bar:emit">
          <xsl:text>ok</xsl:text>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>')).toEqual({
      output: '<out xmlns:foo="urn:test">ok</out>',
    });
  });

  it('accepts Clark notation for initialTemplate names', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:t="urn:test">
        <xsl:template name="t:main">
          <out>ok</out>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>', { initialTemplate: '{urn:test}main' })).toEqual({
      output: '<out xmlns:t="urn:test">ok</out>',
    });
  });

  it('binds xsl:with-param values and xsl:param defaults for named templates', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:call-template name="emit"/>
            <xsl:for-each select="item">
              <xsl:call-template name="emit">
                <xsl:with-param name="label" select="."/>
              </xsl:call-template>
            </xsl:for-each>
          </out>
        </xsl:template>
        <xsl:template name="emit">
          <xsl:param name="label" select="name()"/>
          <entry><xsl:value-of select="$label"/></entry>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root><item>a</item><item>b</item></root>')).toEqual({
      output: '<out><entry>root</entry><entry>a</entry><entry>b</entry></out>',
    });
  });

  it('binds local xsl:variable values for following instructions in the same sequence constructor', () => {
    const proc = new XsltProcessor(`
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
    `);

    expect(proc.transform('<root><item/><item/></root>')).toEqual({
      output: '<out>root:<entry>1</entry><entry>2</entry></out>',
    });
  });

  it('binds local xsl:variable sequence constructors as temporary trees', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:variable name="tree">
              <label><xsl:value-of select="name()"/></label>
            </xsl:variable>
            <xsl:value-of select="$tree/label"/>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>')).toEqual({
      output: '<out>root</out>',
    });
  });

  it('binds xsl:param and xsl:with-param sequence constructors as temporary trees', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:call-template name="emit"/>
            <xsl:call-template name="emit">
              <xsl:with-param name="tree">
                <label>override</label>
              </xsl:with-param>
            </xsl:call-template>
          </out>
        </xsl:template>
        <xsl:template name="emit">
          <xsl:param name="tree">
            <label>default</label>
          </xsl:param>
          <entry><xsl:value-of select="$tree/label"/></entry>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>')).toEqual({
      output: '<out><entry>default</entry><entry>override</entry></out>',
    });
  });

  it('treats valueless xsl:param and xsl:with-param bindings as zero-length strings', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:call-template name="emit"/>
            <xsl:call-template name="emit">
              <xsl:with-param name="label"/>
            </xsl:call-template>
          </out>
        </xsl:template>
        <xsl:template name="emit">
          <xsl:param name="label"/>
          <entry><xsl:value-of select="$label = ''"/></entry>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>')).toEqual({
      output: '<out><entry>true</entry><entry>true</entry></out>',
    });
  });

  it('passes xsl:with-param values through xsl:apply-templates into matched template params', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:variable name="tree">
              <label><xsl:value-of select="item"/></label>
            </xsl:variable>
            <xsl:apply-templates select="item">
              <xsl:with-param name="tree" select="$tree"/>
            </xsl:apply-templates>
          </out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:param name="tree"/>
          <xsl:param name="suffix">default</xsl:param>
          <xsl:value-of select="$tree/label"/>
          <xsl:text>, </xsl:text>
          <xsl:value-of select="$suffix"/>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root><item>test</item></root>')).toEqual({
      output: '<out>test, default</out>',
    });
  });

  it('binds top-level xsl:variable values before template execution', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:variable name="greeting" select="'hello'"/>
        <xsl:template match="/root">
          <out><xsl:value-of select="$greeting"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>')).toEqual({
      output: '<out>hello</out>',
    });
  });

  it('binds top-level xsl:param defaults and transform parameters before template execution', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:param name="greeting" select="'hello'"/>
        <xsl:template match="/root">
          <out><xsl:value-of select="$greeting"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>')).toEqual({
      output: '<out>hello</out>',
    });

    expect(proc.transform('<root/>', {
      parameters: {
        greeting: 'hi',
      },
    })).toEqual({
      output: '<out>hi</out>',
    });
  });

  it('binds top-level xsl:param and xsl:variable sequence constructors before template execution', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:param name="tree">
          <label>default</label>
        </xsl:param>
        <xsl:variable name="outer">
          <value><xsl:value-of select="$tree/label"/></value>
        </xsl:variable>
        <xsl:template match="/root">
          <out><xsl:value-of select="$outer/value"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root/>')).toEqual({
      output: '<out>default</out>',
    });
  });

  it('resolves forward references between top-level xsl:variable bindings', () => {
    const proc = new XsltProcessor(`
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:variable name="b" select="$a"/>
        <xsl:variable name="a" select="/root/item"/>
        <xsl:template match="/root">
          <out><xsl:value-of select="$b"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `);

    expect(proc.transform('<root><item>ok</item></root>')).toEqual({
      output: '<out>ok</out>',
    });
  });
});
