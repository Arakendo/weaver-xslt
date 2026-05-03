import { readFileSync } from 'node:fs';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';
import {
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  escapeText,
  selectDescendantElementsByName,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodes,
  selectSimplePathText,
  stringValueOfNode,
  transformCompiledStylesheet,
} from '../../src/runtime/index.js';
import { compileStylesheet } from '../../src/xslt/compile/compiler.js';
import { XsltProcessor } from '../../src/index.js';

const FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><hello><xsl:value-of select="/root/name"/></hello></xsl:template></xsl:stylesheet>';
const CONDITIONAL_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><out><xsl:if test="/root/name = &apos;world&apos;"><yes/></xsl:if><xsl:choose><xsl:when test="/root/role = &apos;admin&apos;"><role>admin</role></xsl:when><xsl:otherwise><role>user</role></xsl:otherwise></xsl:choose></out></xsl:template></xsl:stylesheet>';
const FOR_EACH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:if test="flag"><flagged/></xsl:if></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:if test="detail"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="detail"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><details><xsl:apply-templates select="detail"/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><details><xsl:apply-templates/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FIXTURE_STYLESHEET = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:value-of select="name"/>
            <xsl:if test="flag"><flagged/></xsl:if>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
const MATCHED_ROOT_FOR_EACH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:if test="detail"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="detail"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates select="detail"/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/><xsl:if test="flag"><flagged/></xsl:if></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_DOT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="."/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:if test="flag"><flagged/></xsl:if></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_FOR_EACH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><detail><xsl:value-of select="."/></detail></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><details><xsl:for-each select="detail"><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:for-each></details></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><details><xsl:for-each select="group"><xsl:apply-templates select="detail"/></xsl:for-each></details></item></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><details><xsl:for-each select="group"><xsl:apply-templates/></xsl:for-each></details></item></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:if test="detail"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="detail"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates select="detail"/></details></item></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates/></details></item></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="."/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_RELATIVE_SELECT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_MATCH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="/root/item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_MATCH_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/section/item"/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_NESTED_MATCH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/section/item"/></items></xsl:template><xsl:template match="section/item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const APPLY_TEMPLATES_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates/></items></xsl:template><xsl:template match="section/item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';
const GENERATED_RUNTIME_MODULE_SPECIFIER = '@runtime-test';
const GENERATED_RUNTIME_MODULE = {
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  escapeText,
  selectDescendantElementsByName,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodes,
  selectSimplePathText,
  stringValueOfNode,
  transformCompiledStylesheet,
};

function compileAndLoadGeneratedModule(stylesheet: string, path: string): {
  readonly diagnostics: readonly ts.Diagnostic[];
  readonly exports: Record<string, unknown>;
} {
  const emitted = compileStylesheetToTs(stylesheet, {
    path,
    runtimeModuleSpecifier: GENERATED_RUNTIME_MODULE_SPECIFIER,
  });
  const transpiled = ts.transpileModule(emitted, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  const module = { exports: {} as Record<string, unknown> };
  const localRequire = (specifier: string) => {
    if (specifier === GENERATED_RUNTIME_MODULE_SPECIFIER) {
      return GENERATED_RUNTIME_MODULE;
    }

    throw new Error(`Unexpected generated-module import: ${specifier}`);
  };
  const executeModule = new Function('require', 'module', 'exports', transpiled.outputText) as (
    requireImpl: (specifier: string) => unknown,
    localModule: { exports: Record<string, unknown> },
    localExports: Record<string, unknown>,
  ) => void;

  executeModule(localRequire, module, module.exports);

  return {
    diagnostics: transpiled.diagnostics ?? [],
    exports: module.exports,
  };
}

describe('XSLT codegen MVP4 slice', () => {
  it('emits a native TypeScript module for the simple literal-result subset', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/"><hello><xsl:value-of select="/root/name"/></hello></xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'hello.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('@arakendo/weaver-xslt/runtime');
    expect(emitted).toContain("export const source = { path: \"hello.xsl\"");
    expect(emitted).toContain('createCompiledDocument(sourceXml)');
    expect(emitted).toContain('selectSimplePathText(document, ["root","name"])');
    expect(emitted).not.toContain('const currentNode = document;');
    expect(emitted).toContain('"<hello>"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for simple relative child paths and existence tests', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out>
            <xsl:value-of select="root/name"/>
            <xsl:if test="root/flag"><flagged/></xsl:if>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'relative.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathText(currentNode, ["root","name"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["root","flag"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native conditionals for the simple xsl:if and xsl:choose subset', () => {
    const emitted = compileStylesheetToTs(CONDITIONAL_FIXTURE_STYLESHEET, { path: 'conditional.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain("selectSimplePathText(document, [\"root\",\"name\"]) === \"world\"");
    expect(emitted).toContain('? "<yes>" +');
    expect(emitted).toContain('"</yes>" : ""');
    expect(emitted).toContain("selectSimplePathText(document, [\"root\",\"role\"]) === \"admin\"");
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native boolean helper calls in simple tests', () => {
    const stylesheet = `
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

    const emitted = compileStylesheetToTs(stylesheet, { path: 'boolean-helpers.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('(!selectSimplePathExists(currentNode, ["root","flag"]))');
    expect(emitted).toContain('(true ? "<always>" +');
    expect(emitted).toContain('(false ? "<never>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a simple xsl:for-each over a simple path', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_FIXTURE_STYLESHEET, { path: 'for-each.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains xsl:if in its body', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_IF_FIXTURE_STYLESHEET, { path: 'for-each-if.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains xsl:choose in its body', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, { path: 'for-each-choose.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('? "<flagged>" +');
    expect(emitted).toContain(': "<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains xsl:choose without xsl:otherwise', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, { path: 'for-each-choose-no-otherwise.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('? "<flagged>" +');
    expect(emitted).toContain(': "")');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains xsl:choose with multiple xsl:when branches', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, { path: 'for-each-choose-multi-when.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).toContain('? "<flagged>" +');
    expect(emitted).toContain('? "<vip>" +');
    expect(emitted).toContain(': "<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains nested xsl:if bodies inside xsl:choose branches', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, { path: 'for-each-choose-nested-if.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when xsl:for-each contains nested xsl:choose blocks inside xsl:choose branches', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, { path: 'for-each-choose-nested-choose.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('falls back when xsl:for-each contains nested xsl:apply-templates', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET, { path: 'for-each-apply-templates.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
    expect(emitted).not.toContain('selectSimplePathNodes(document, ["root","item"]).map((currentNode) =>');
  });

  it('falls back when xsl:for-each contains nested xsl:apply-templates without select', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, { path: 'for-each-apply-templates-default.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
    expect(emitted).not.toContain('applyBuiltInTemplatesByPath(');
  });

  it('emits native code for a single absolute matched element with relative body paths', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FIXTURE_STYLESHEET, { path: 'matched-root.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root"]);');
    expect(emitted).toContain('selectSimplePathText(currentNode, ["name"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a matched element template containing xsl:for-each', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_FIXTURE_STYLESHEET, { path: 'matched-root-for-each.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a matched element template containing xsl:for-each with xsl:choose', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-choose.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('? "<flagged>" +');
    expect(emitted).toContain(': "<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a matched element template containing xsl:for-each with xsl:choose without xsl:otherwise', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-choose-no-otherwise.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('? "<flagged>" +');
    expect(emitted).toContain(': "")');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a matched element template containing xsl:for-each with multiple xsl:when branches', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-choose-multi-when.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).toContain('? "<flagged>" +');
    expect(emitted).toContain('? "<vip>" +');
    expect(emitted).toContain(': "<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a matched element template containing xsl:for-each with nested xsl:if bodies inside xsl:choose branches', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-choose-nested-if.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a matched element template containing xsl:for-each with nested xsl:choose blocks inside xsl:choose branches', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-choose-nested-choose.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root"]);');
    expect(emitted).toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('falls back when a matched element template contains xsl:for-each with nested xsl:apply-templates', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-apply-templates.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
    expect(emitted).not.toContain('selectSimplePathNodes(currentNode, ["item"]).map((currentNode) =>');
  });

  it('falls back when a matched element template contains xsl:for-each with nested xsl:apply-templates without select', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-apply-templates-default.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
    expect(emitted).not.toContain('applyBuiltInTemplatesByPath(');
  });

  it('emits native code for a single absolute multi-step matched element with relative body paths', () => {
    const emitted = compileStylesheetToTs(MATCHED_NESTED_ROOT_FIXTURE_STYLESHEET, { path: 'matched-nested-root.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('const currentNode = selectSimplePathNode(document, ["root","section","item"]);');
    expect(emitted).toContain('escapeText(selectSimplePathText(currentNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

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
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates with a simple relative select', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_RELATIVE_SELECT_FIXTURE_STYLESHEET, { path: 'apply-templates-relative.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates select and a simple absolute match template', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_ABSOLUTE_MATCH_FIXTURE_STYLESHEET, { path: 'apply-templates-absolute-match.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
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
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["item"], (templateNode) =>');
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
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","item"], (templateNode) =>');
    expect(emitted).toContain(', true)');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates select and an absolute nested match template', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_FIXTURE_STYLESHEET, { path: 'apply-templates-absolute-nested-match.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","section","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates without select and an absolute nested match template', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET, { path: 'apply-templates-absolute-nested-match-default.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode) =>');
    expect(emitted).toContain(', true)');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates select and a nested simple relative match template', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_NESTED_MATCH_FIXTURE_STYLESHEET, { path: 'apply-templates-nested-match.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","section","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a root apply-templates without select and a nested simple relative match template', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET, { path: 'apply-templates-nested-match-default.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('applyBuiltInTemplatesByPath(document, ["section","item"], (templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template uses xsl:value-of select="."', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_DOT_FIXTURE_STYLESHEET, { path: 'apply-templates-dot.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(stringValueOfNode(templateNode))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains xsl:if', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_IF_FIXTURE_STYLESHEET, { path: 'apply-templates-child-if.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains xsl:for-each', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_FOR_EACH_FIXTURE_STYLESHEET, { path: 'apply-templates-child-for-each.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) =>');
    expect(emitted).toContain('escapeText(stringValueOfNode(currentNode))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains xsl:for-each with xsl:choose in its body', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, { path: 'apply-templates-child-for-each-choose.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) =>');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["flag"])');
    expect(emitted).toContain('? "<flagged>" +');
    expect(emitted).toContain(': "<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('falls back when a child template contains xsl:for-each with nested xsl:apply-templates', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET, { path: 'apply-templates-child-for-each-apply-templates.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
    expect(emitted).not.toContain('selectSimplePathNodes(templateNode, ["group"]).map((currentNode) =>');
  });

  it('falls back when a child template contains xsl:for-each with nested xsl:apply-templates without select', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, { path: 'apply-templates-child-for-each-apply-templates-default.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
    expect(emitted).not.toContain('applyBuiltInTemplatesByPath(');
  });

  it('emits native code when a child template contains xsl:choose', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_CHOOSE_FIXTURE_STYLESHEET, { path: 'apply-templates-child-choose.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).toContain('? "<flagged>" +');
    expect(emitted).toContain(': "<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains xsl:choose without xsl:otherwise', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, { path: 'apply-templates-child-choose-no-otherwise.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).toContain('? "<flagged>" +');
    expect(emitted).toContain(': "")');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains xsl:choose with multiple xsl:when branches', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, { path: 'apply-templates-child-choose-multi-when.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["vip"])');
    expect(emitted).toContain('? "<flagged>" +');
    expect(emitted).toContain('? "<vip>" +');
    expect(emitted).toContain(': "<plain>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains nested xsl:if bodies inside xsl:choose branches', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, { path: 'apply-templates-child-choose-nested-if.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code when a child template contains nested xsl:choose blocks inside xsl:choose branches', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, { path: 'apply-templates-child-choose-nested-choose.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
    expect(emitted).toContain('escapeText(selectSimplePathText(templateNode, ["name"]))');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["flag"])');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["detail"])');
    expect(emitted).toContain('selectSimplePathExists(templateNode, ["vip"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('falls back when a child template contains nested xsl:apply-templates', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_FIXTURE_STYLESHEET, { path: 'apply-templates-child-apply-templates.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
    expect(emitted).not.toContain('selectSimplePathNodes(document, ["root","item"]).map((templateNode) =>');
  });

  it('falls back when a child template contains nested xsl:apply-templates without select', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, { path: 'apply-templates-child-apply-templates-default.xsl' });
    const transpiled = ts.transpileModule(emitted, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
    expect(emitted).not.toContain('applyBuiltInTemplatesByPath(');
  });

  it('falls back to the interpreter-backed runtime surface for unsupported instructions', () => {
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

    expect(emitted).toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
    expect(emitted).toContain('"kind": "if"');
  });

  it('matches the checked-in generated fixture for the hello stylesheet', () => {
    const emitted = compileStylesheetToTs(FIXTURE_STYLESHEET, { path: 'hello.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/hello.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the conditional stylesheet', () => {
    const emitted = compileStylesheetToTs(CONDITIONAL_FIXTURE_STYLESHEET, { path: 'conditional.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/conditional.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the for-each stylesheet', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_FIXTURE_STYLESHEET, { path: 'for-each.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/for-each.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the for-each-if stylesheet', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_IF_FIXTURE_STYLESHEET, { path: 'for-each-if.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/for-each-if.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the for-each-choose stylesheet', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, { path: 'for-each-choose.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/for-each-choose.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the for-each-choose-no-otherwise stylesheet', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, { path: 'for-each-choose-no-otherwise.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/for-each-choose-no-otherwise.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the for-each-choose-multi-when stylesheet', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, { path: 'for-each-choose-multi-when.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/for-each-choose-multi-when.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the for-each-choose-nested-if stylesheet', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, { path: 'for-each-choose-nested-if.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/for-each-choose-nested-if.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the for-each-choose-nested-choose stylesheet', () => {
    const emitted = compileStylesheetToTs(FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, { path: 'for-each-choose-nested-choose.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/for-each-choose-nested-choose.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the matched-root stylesheet', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FIXTURE_STYLESHEET, { path: 'matched-root.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/matched-root.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the matched-root-for-each stylesheet', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_FIXTURE_STYLESHEET, { path: 'matched-root-for-each.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/matched-root-for-each.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the matched-root-for-each-choose stylesheet', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-choose.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/matched-root-for-each-choose.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the matched-root-for-each-choose-no-otherwise stylesheet', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-choose-no-otherwise.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/matched-root-for-each-choose-no-otherwise.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the matched-root-for-each-choose-multi-when stylesheet', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-choose-multi-when.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/matched-root-for-each-choose-multi-when.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the matched-root-for-each-choose-nested-if stylesheet', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-choose-nested-if.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/matched-root-for-each-choose-nested-if.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the matched-root-for-each-choose-nested-choose stylesheet', () => {
    const emitted = compileStylesheetToTs(MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, { path: 'matched-root-for-each-choose-nested-choose.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/matched-root-for-each-choose-nested-choose.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the matched-nested-root stylesheet', () => {
    const emitted = compileStylesheetToTs(MATCHED_NESTED_ROOT_FIXTURE_STYLESHEET, { path: 'matched-nested-root.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/matched-nested-root.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_FIXTURE_STYLESHEET, { path: 'apply-templates.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-absolute-match stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_ABSOLUTE_MATCH_FIXTURE_STYLESHEET, { path: 'apply-templates-absolute-match.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-absolute-match.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-absolute-match-default stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_ABSOLUTE_MATCH_DEFAULT_FIXTURE_STYLESHEET, { path: 'apply-templates-absolute-match-default.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-absolute-match-default.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-absolute-nested-match stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_FIXTURE_STYLESHEET, { path: 'apply-templates-absolute-nested-match.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-absolute-nested-match.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-absolute-nested-match-default stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET, { path: 'apply-templates-absolute-nested-match-default.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-absolute-nested-match-default.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-relative stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_RELATIVE_SELECT_FIXTURE_STYLESHEET, { path: 'apply-templates-relative.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-relative.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-nested-match stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_NESTED_MATCH_FIXTURE_STYLESHEET, { path: 'apply-templates-nested-match.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-nested-match.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-nested-match-default stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET, { path: 'apply-templates-nested-match-default.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-nested-match-default.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-dot stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_DOT_FIXTURE_STYLESHEET, { path: 'apply-templates-dot.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-dot.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-child-for-each stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_FOR_EACH_FIXTURE_STYLESHEET, { path: 'apply-templates-child-for-each.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-child-for-each.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-child-for-each-choose stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, { path: 'apply-templates-child-for-each-choose.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-child-for-each-choose.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-child-if stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_IF_FIXTURE_STYLESHEET, { path: 'apply-templates-child-if.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-child-if.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-child-choose stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_CHOOSE_FIXTURE_STYLESHEET, { path: 'apply-templates-child-choose.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-child-choose.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-child-choose-no-otherwise stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, { path: 'apply-templates-child-choose-no-otherwise.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-child-choose-no-otherwise.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-child-choose-multi-when stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, { path: 'apply-templates-child-choose-multi-when.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-child-choose-multi-when.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-child-choose-nested-if stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, { path: 'apply-templates-child-choose-nested-if.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-child-choose-nested-if.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-child-choose-nested-choose stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, { path: 'apply-templates-child-choose-nested-choose.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-child-choose-nested-choose.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('matches the checked-in generated fixture for the apply-templates-default stylesheet', () => {
    const emitted = compileStylesheetToTs(APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, { path: 'apply-templates-default.xsl' });
    const fixture = readFileSync(new URL('../generated-fixtures/apply-templates-default.xsl.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');

    expect(emitted.trimEnd()).toBe(fixture.trimEnd());
  });

  it('executes compiled IR through the runtime helper with interpreter-equivalent output', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/"><hello><xsl:value-of select="/root/name"/></hello></xsl:template>
      </xsl:stylesheet>
    `;
    const sourceXml = '<root><name>world</name></root>';

    const ir = compileStylesheet(stylesheet);
    const generatedResult = transformCompiledStylesheet(ir, sourceXml);
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedResult).toEqual(interpreterResult);
  });

  it('executes a generated module end-to-end through the runtime surface', async () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/"><hello><xsl:value-of select="/root/name"/></hello></xsl:template>
      </xsl:stylesheet>
    `;
    const sourceXml = '<root><name>world</name></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, 'hello.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly source: { readonly path: string };
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.source).toMatchObject({ path: 'hello.xsl' });
    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a matched-element native module through the runtime surface', () => {
    const sourceXml = '<root><name>world</name><flag/></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(MATCHED_ROOT_FIXTURE_STYLESHEET, 'matched-root.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MATCHED_ROOT_FIXTURE_STYLESHEET).transform(sourceXml);
    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native xsl:for-each module through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(FOR_EACH_FIXTURE_STYLESHEET, 'for-each.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(FOR_EACH_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native xsl:for-each body containing xsl:if through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(FOR_EACH_IF_FIXTURE_STYLESHEET, 'for-each-if.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(FOR_EACH_IF_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native xsl:for-each body containing xsl:choose through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, 'for-each-choose.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(FOR_EACH_CHOOSE_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native xsl:for-each body containing xsl:choose without xsl:otherwise through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, 'for-each-choose-no-otherwise.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native xsl:for-each body containing xsl:choose with multiple xsl:when branches through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name><vip/></item><item><name>plum</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, 'for-each-choose-multi-when.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native xsl:for-each body containing nested xsl:if bodies inside xsl:choose branches through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/><detail/></item><item><name>pear</name><vip/></item><item><name>plum</name><flag/></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, 'for-each-choose-nested-if.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native xsl:for-each body containing nested xsl:choose blocks inside xsl:choose branches through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/><detail/></item><item><name>pear</name><flag/></item><item><name>plum</name><vip/></item><item><name>berry</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, 'for-each-choose-nested-choose.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a for-each nested xsl:apply-templates stylesheet through the fallback runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><detail>fresh</detail><detail>green</detail></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET, 'for-each-apply-templates.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a for-each nested xsl:apply-templates stylesheet without select through the fallback runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><detail>fresh</detail><detail>green</detail></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, 'for-each-apply-templates-default.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a nested matched-element native module through the runtime surface', () => {
    const sourceXml = '<root><section><item><name>world</name><flag/></item></section></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(MATCHED_NESTED_ROOT_FIXTURE_STYLESHEET, 'matched-nested-root.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MATCHED_NESTED_ROOT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a matched-element native module containing xsl:for-each through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(MATCHED_ROOT_FOR_EACH_FIXTURE_STYLESHEET, 'matched-root-for-each.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MATCHED_ROOT_FOR_EACH_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a matched-element native module containing xsl:for-each with xsl:choose through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(MATCHED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, 'matched-root-for-each-choose.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MATCHED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a matched-element native module containing xsl:for-each with xsl:choose without xsl:otherwise through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(MATCHED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, 'matched-root-for-each-choose-no-otherwise.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MATCHED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a matched-element native module containing xsl:for-each with multiple xsl:when branches through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name><vip/></item><item><name>plum</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(MATCHED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, 'matched-root-for-each-choose-multi-when.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MATCHED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a matched-element native module containing xsl:for-each with nested xsl:if bodies inside xsl:choose branches through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/><detail/></item><item><name>pear</name><vip/></item><item><name>plum</name><flag/></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, 'matched-root-for-each-choose-nested-if.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a matched-element native module containing xsl:for-each with nested xsl:choose blocks inside xsl:choose branches through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/><detail/></item><item><name>pear</name><flag/></item><item><name>plum</name><vip/></item><item><name>berry</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, 'matched-root-for-each-choose-nested-choose.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a matched-template for-each nested xsl:apply-templates stylesheet through the fallback runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><detail>fresh</detail><detail>green</detail></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET, 'matched-root-for-each-apply-templates.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a matched-template for-each nested xsl:apply-templates stylesheet without select through the fallback runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><detail>fresh</detail><detail>green</detail></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, 'matched-root-for-each-apply-templates-default.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a simple native apply-templates module through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_FIXTURE_STYLESHEET, 'apply-templates.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates module with a relative select through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_RELATIVE_SELECT_FIXTURE_STYLESHEET, 'apply-templates-relative.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_RELATIVE_SELECT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates module with an absolute match template through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_ABSOLUTE_MATCH_FIXTURE_STYLESHEET, 'apply-templates-absolute-match.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_ABSOLUTE_MATCH_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates module with a nested relative match through the runtime surface', () => {
    const sourceXml = '<root><item><name>skip</name></item><section><item><name>apple</name></item></section><section><item><name>pear</name></item></section></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_NESTED_MATCH_FIXTURE_STYLESHEET, 'apply-templates-nested-match.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_NESTED_MATCH_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates child template using context-item string value', () => {
    const sourceXml = '<root><item>apple</item><item>pear</item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_DOT_FIXTURE_STYLESHEET, 'apply-templates-dot.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_DOT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates child template containing xsl:if through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_IF_FIXTURE_STYLESHEET, 'apply-templates-child-if.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_IF_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates child template containing xsl:for-each through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><detail>fresh</detail><detail>green</detail></item><item><name>pear</name><detail>ripe</detail></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_FOR_EACH_FIXTURE_STYLESHEET, 'apply-templates-child-for-each.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_FOR_EACH_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates child template containing xsl:for-each with xsl:choose through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><detail><flag/></detail><detail/></item><item><name>pear</name><detail/></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET, 'apply-templates-child-for-each-choose.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a child-template for-each nested xsl:apply-templates stylesheet through the fallback runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><group><detail>fresh</detail><detail>green</detail></group></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET, 'apply-templates-child-for-each-apply-templates.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a child-template for-each nested xsl:apply-templates stylesheet without select through the fallback runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><group><detail>fresh</detail><detail>green</detail></group></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, 'apply-templates-child-for-each-apply-templates-default.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates child template containing xsl:choose through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_CHOOSE_FIXTURE_STYLESHEET, 'apply-templates-child-choose.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_CHOOSE_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates child template containing xsl:choose without xsl:otherwise through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET, 'apply-templates-child-choose-no-otherwise.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates child template containing xsl:choose with multiple xsl:when branches through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/></item><item><name>pear</name><vip/></item><item><name>plum</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET, 'apply-templates-child-choose-multi-when.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates child template containing nested xsl:if bodies inside xsl:choose branches through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/><detail/></item><item><name>pear</name><vip/></item><item><name>plum</name><flag/></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET, 'apply-templates-child-choose-nested-if.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates child template containing nested xsl:choose blocks inside xsl:choose branches through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><flag/><detail/></item><item><name>pear</name><flag/></item><item><name>plum</name><vip/></item><item><name>berry</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET, 'apply-templates-child-choose-nested-choose.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a child-template nested xsl:apply-templates stylesheet through the fallback runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><detail>fresh</detail><detail>green</detail></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_FIXTURE_STYLESHEET, 'apply-templates-child-apply-templates.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a child-template nested xsl:apply-templates stylesheet without select through the fallback runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name><detail>fresh</detail><detail>green</detail></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, 'apply-templates-child-apply-templates-default.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_CHILD_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates module without select through the runtime surface', () => {
    const sourceXml = '<invoice><item>apple</item><note>carry</note><section><item>pear</item></section></invoice>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET, 'apply-templates-default.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates module without select and with an absolute match through the runtime surface', () => {
    const sourceXml = '<root><item><name>apple</name></item><note>carry</note><group><item><name>skip</name></item></group><item><name>pear</name></item></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_ABSOLUTE_MATCH_DEFAULT_FIXTURE_STYLESHEET, 'apply-templates-absolute-match-default.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_ABSOLUTE_MATCH_DEFAULT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates module with an absolute nested match through the runtime surface', () => {
    const sourceXml = '<root><section><item><name>apple</name></item></section><section><item><name>pear</name></item></section></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates module without select and with an absolute nested match through the runtime surface', () => {
    const sourceXml = '<root><item><name>skip</name></item><section><item><name>apple</name></item></section><group><item><name>skip-too</name></item></group><section><item><name>pear</name></item></section></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET, 'apply-templates-absolute-nested-match-default.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_ABSOLUTE_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes a native apply-templates module without select and with a nested relative match through the runtime surface', () => {
    const sourceXml = '<root><item><name>skip</name></item><section><item><name>apple</name></item></section><group><item><name>skip-too</name></item></group><section><item><name>pear</name></item></section></root>';
    const { diagnostics, exports } = compileAndLoadGeneratedModule(APPLY_TEMPLATES_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET, 'apply-templates-nested-match-default.xsl');

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(APPLY_TEMPLATES_NESTED_MATCH_DEFAULT_FIXTURE_STYLESHEET).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });
});