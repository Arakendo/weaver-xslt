import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';

const FOR_EACH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:if test="flag"><flagged/></xsl:if></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:if test="detail"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="detail"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><details><xsl:apply-templates select="detail"/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><details><xsl:apply-templates/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:if test="detail"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="detail"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates select="detail"/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';

function transpileEmittedModule(stylesheet: string, path: string) {
  const emitted = compileStylesheetToTs(stylesheet, { path });
  const transpiled = ts.transpileModule(emitted, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });

  return { emitted, transpiled };
}

describe('XSLT codegen for-each emission', () => {
  it('emits native code for a simple xsl:for-each over a simple path', () => {
    const { emitted, transpiled } = transpileEmittedModule(FOR_EACH_FIXTURE_STYLESHEET, 'for-each.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a multi-step matched element template containing xsl:for-each', () => {
    const { emitted, transpiled } = transpileEmittedModule(MATCHED_NESTED_ROOT_FOR_EACH_FIXTURE_STYLESHEET, 'matched-nested-root-for-each.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root","section"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a multi-step matched element template containing xsl:for-each with xsl:choose', () => {
    const { emitted, transpiled } = transpileEmittedModule(MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, 'matched-nested-root-for-each-choose.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root","section"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('"<flagged>" +');
    expect(emitted).toContain('"<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a multi-step matched element template containing xsl:for-each with xsl:choose without xsl:otherwise', () => {
    const { emitted, transpiled } = transpileEmittedModule(MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, 'matched-nested-root-for-each-choose-no-otherwise.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root","section"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('"<flagged>" +');
    expect(emitted).toContain(': "")');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a multi-step matched element template containing xsl:for-each with multiple xsl:when branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, 'matched-nested-root-for-each-choose-multi-when.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root","section"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).toContain('"<flagged>" +');
    expect(emitted).toContain('"<vip>" +');
    expect(emitted).toContain('"<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a multi-step matched element template containing xsl:for-each with nested xsl:if bodies inside xsl:choose branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, 'matched-nested-root-for-each-choose-nested-if.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root","section"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a multi-step matched element template containing xsl:for-each with nested xsl:choose blocks inside xsl:choose branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, 'matched-nested-root-for-each-choose-nested-choose.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root","section"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a multi-step matched element template contains xsl:for-each with nested xsl:apply-templates', () => {
    const { emitted, transpiled } = transpileEmittedModule(MATCHED_NESTED_ROOT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET, 'matched-nested-root-for-each-apply-templates.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root","section"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["detail"]).map((templateNode) =>');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a multi-step matched element template contains xsl:for-each with nested xsl:apply-templates without select', () => {
    const { emitted, transpiled } = transpileEmittedModule(MATCHED_NESTED_ROOT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, 'matched-nested-root-for-each-apply-templates-default.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root","section"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('applyBuiltInTemplatesByPath(currentNode, ["detail"], (templateNode) =>');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains xsl:if in its body', () => {
    const { emitted, transpiled } = transpileEmittedModule(FOR_EACH_IF_FIXTURE_STYLESHEET, 'for-each-if.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains xsl:choose in its body', () => {
    const { emitted, transpiled } = transpileEmittedModule(FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, 'for-each-choose.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('"<flagged>" +');
    expect(emitted).toContain('"<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains xsl:choose without xsl:otherwise', () => {
    const { emitted, transpiled } = transpileEmittedModule(FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, 'for-each-choose-no-otherwise.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('"<flagged>" +');
    expect(emitted).toContain(': "")');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains xsl:choose with multiple xsl:when branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, 'for-each-choose-multi-when.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).toContain('"<flagged>" +');
    expect(emitted).toContain('"<vip>" +');
    expect(emitted).toContain('"<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains nested xsl:if bodies inside xsl:choose branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, 'for-each-choose-nested-if.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains nested xsl:choose blocks inside xsl:choose branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, 'for-each-choose-nested-choose.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains nested xsl:apply-templates', () => {
    const { emitted, transpiled } = transpileEmittedModule(FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET, 'for-each-apply-templates.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["detail"]).map((templateNode) =>');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains nested xsl:apply-templates without select', () => {
    const { emitted, transpiled } = transpileEmittedModule(FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, 'for-each-apply-templates-default.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('applyBuiltInTemplatesByPath(currentNode, ["detail"], (templateNode) =>');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });
});