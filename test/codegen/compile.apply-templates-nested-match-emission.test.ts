import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';

const APPLY_TEMPLATES_NESTED_MATCH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/section/item"/></items></xsl:template><xsl:template match="section/item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/section/item"/></items></xsl:template><xsl:template match="section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><detail><xsl:value-of select="."/></detail></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/section/item"/></items></xsl:template><xsl:template match="section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/section/item"/></items></xsl:template><xsl:template match="section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/section/item"/></items></xsl:template><xsl:template match="section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/section/item"/></items></xsl:template><xsl:template match="section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><xsl:if test="marker"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/section/item"/></items></xsl:template><xsl:template match="section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="marker"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_THREE_HOP_NESTED_MATCH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/section/item"/></items></xsl:template><xsl:template match="section/item"><item><name><xsl:value-of select="name"/></name><details><xsl:apply-templates select="detail"/></details></item></xsl:template><xsl:template match="detail"><detail><xsl:apply-templates select="marker"/></detail></xsl:template><xsl:template match="marker"><mark><xsl:value-of select="."/></mark></xsl:template></xsl:stylesheet>';

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

describe('XSLT codegen apply-templates nested-match emission', () => {
  it('emits native code for a root apply-templates select and a nested simple relative match template', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_NESTED_MATCH_FIXTURE_STYLESHEET, 'apply-templates-nested-match.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"section"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates select and a nested relative match template containing xsl:for-each', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_FIXTURE_STYLESHEET, 'apply-templates-nested-match-for-each.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"section"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(currentNode, ctx, {"kind":"xsl:value-of"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates select and a nested relative match template containing xsl:for-each with xsl:choose', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, 'apply-templates-nested-match-for-each-choose.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"section"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('return "<flagged" + "" + ">" + body + "</flagged>";');
    expect(emitted).toContain('return "<plain" + "" + ">" + body + "</plain>";');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates select and a nested relative match template containing xsl:for-each with xsl:choose without xsl:otherwise', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, 'apply-templates-nested-match-for-each-choose-no-otherwise.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"section"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('return "<flagged" + "" + ">" + body + "</flagged>";');
    expect(emitted).toContain(': "")');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates select and a nested relative match template containing xsl:for-each with multiple xsl:when branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, 'apply-templates-nested-match-for-each-choose-multi-when.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"section"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).toContain('return "<flagged" + "" + ">" + body + "</flagged>";');
    expect(emitted).toContain('return "<vip" + "" + ">" + body + "</vip>";');
    expect(emitted).toContain('return "<plain" + "" + ">" + body + "</plain>";');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates select and a nested relative match template containing xsl:for-each with nested xsl:if bodies inside xsl:choose branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, 'apply-templates-nested-match-for-each-choose-nested-if.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"section"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["marker"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates select and a nested relative match template containing xsl:for-each with nested xsl:choose blocks inside xsl:choose branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_NESTED_MATCH_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, 'apply-templates-nested-match-for-each-choose-nested-choose.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"section"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["marker"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a three-hop apply-templates chain instead of falling back to the interpreter path', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_THREE_HOP_NESTED_MATCH_FIXTURE_STYLESHEET, 'apply-templates-three-hop-nested-match.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"section"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(templateNode, [{"name":"detail"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(templateNode, [{"name":"marker"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });
});