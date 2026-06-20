import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';

const APPLY_TEMPLATES_CHILD_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:if test="detail"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="detail"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates select="detail"/></details></item></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates/></details></item></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';

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

describe('XSLT codegen apply-templates child emission', () => {
  it('emits native code when a child template contains xsl:choose', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_CHILD_CHOOSE_FIXTURE_STYLESHEET, 'apply-templates-child-choose.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of"');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).toContain('return "<flagged" + "" + ">" + body + "</flagged>";');
    expect(emitted).toContain('return "<plain" + "" + ">" + body + "</plain>";');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains xsl:choose without xsl:otherwise', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_CHILD_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, 'apply-templates-child-choose-no-otherwise.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of"');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).toContain('return "<flagged" + "" + ">" + body + "</flagged>";');
    expect(emitted).toContain(': "")');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains xsl:choose with multiple xsl:when branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_CHILD_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, 'apply-templates-child-choose-multi-when.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of"');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["vip"])');
    expect(emitted).toContain('return "<flagged" + "" + ">" + body + "</flagged>";');
    expect(emitted).toContain('return "<vip" + "" + ">" + body + "</vip>";');
    expect(emitted).toContain('return "<plain" + "" + ">" + body + "</plain>";');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains nested xsl:if bodies inside xsl:choose branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, 'apply-templates-child-choose-nested-if.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of"');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains nested xsl:choose blocks inside xsl:choose branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, 'apply-templates-child-choose-nested-choose.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of"');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains nested xsl:apply-templates', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_FIXTURE_STYLESHEET, 'apply-templates-child-apply-templates.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(templateNode, [{"name":"detail"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains nested xsl:apply-templates without select', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, 'apply-templates-child-apply-templates-default.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('applyBuiltInTemplatesByPath(templateNode, ["detail"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });
});