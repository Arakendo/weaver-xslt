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
});
