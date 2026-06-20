import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';

const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><detail><xsl:value-of select="."/></detail></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><xsl:if test="marker"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="marker"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="group"><xsl:apply-templates select="detail"/></xsl:for-each></details></item></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/><details><xsl:for-each select="group"><xsl:apply-templates/></xsl:for-each></details></item></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';

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

describe('XSLT codegen apply-templates absolute nested-match default emission', () => {
  it('emits native code for a root apply-templates without select and an absolute nested match template', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match-default.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).toContain(', true, ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates without select and an absolute nested match template containing xsl:for-each', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match-default-for-each.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).toContain(', true, ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('escapeText(traceStringValueOfNode(currentNode, ctx, {"kind":"xsl:value-of"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates without select and an absolute nested match template containing xsl:for-each with xsl:choose', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match-default-for-each-choose.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).toContain(', true, ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('return "<flagged" + "" + ">" + body + "</flagged>";');
    expect(emitted).toContain('return "<plain" + "" + ">" + body + "</plain>";');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates without select and an absolute nested match template containing xsl:for-each with xsl:choose without xsl:otherwise', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match-default-for-each-choose-no-otherwise.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).toContain(', true, ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('return "<flagged" + "" + ">" + body + "</flagged>";');
    expect(emitted).toContain(': "")');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates without select and an absolute nested match template containing xsl:for-each with multiple xsl:when branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match-default-for-each-choose-multi-when.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).toContain(', true, ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).toContain('return "<flagged" + "" + ">" + body + "</flagged>";');
    expect(emitted).toContain('return "<vip" + "" + ">" + body + "</vip>";');
    expect(emitted).toContain('return "<plain" + "" + ">" + body + "</plain>";');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates without select and an absolute nested match template containing xsl:for-each with nested xsl:if bodies inside xsl:choose branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).toContain(', true, ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["marker"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates without select and an absolute nested match template containing xsl:for-each with nested xsl:choose blocks inside xsl:choose branches', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match-default-for-each-choose-nested-choose.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).toContain(', true, ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["marker"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when an absolute nested match template selected by built-in apply-templates contains xsl:for-each with nested xsl:apply-templates', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match-default-for-each-apply-templates.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["group"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodesByStepPlan(currentNode, [{"name":"detail"}]), ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when an absolute nested match template selected by built-in apply-templates contains xsl:for-each with nested xsl:apply-templates without select', () => {
    const { emitted, transpiled } = transpileEmittedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).toContain('traceSelectedNodes(selectSimplePathNodes(templateNode, ["group"]), ctx, {"kind":"xsl:for-each"');
    expect(emitted).toContain('applyBuiltInTemplatesByPath(currentNode, ["detail"], (templateNode, templateIndex, templateNodes) =>');
    expect(emitted).toContain('false, ctx, {"kind":"xsl:apply-templates"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });
});