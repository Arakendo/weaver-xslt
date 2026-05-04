import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';

const APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="."/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_MATCH_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
describe('XSLT codegen MVP4 slice', () => {
  it('emits native code for a root apply-templates select and a simple relative match template', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_FIXTURE_STYLESHEET, { path: 'apply-templates.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('/** match="/" (apply-templates.xsl:1) */');
    expect(emitted).toContain('/** match="item" (apply-templates.xsl:1) */');
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((');
    expect(emitted).toContain('(templateNode) => (');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates without select and a simple relative match template', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, { path: 'apply-templates-default.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["item"], (');
    expect(emitted).toContain('(templateNode) => (');
    expect(emitted).toContain('escapeText(stringValueOfNode(templateNode))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates without select and a simple absolute match template', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_ABSOLUTE_MATCH_DEFAULT_FIXTURE_STYLESHEET, { path: 'apply-templates-absolute-match-default.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","item"], (');
    expect(emitted).toContain('(templateNode) => (');
    expect(emitted).toContain(', true)');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

});