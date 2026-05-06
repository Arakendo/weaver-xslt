import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';

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

describe('XSLT codegen core emission smoke tests', () => {
  it('emits a native TypeScript module for the simple literal-result subset', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/"><hello><xsl:value-of select="/root/name"/></hello></xsl:template>
      </xsl:stylesheet>
    `;
    const { emitted, transpiled } = transpileEmittedModule(stylesheet, 'hello.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('@arakendo/weaver-xslt/runtime');
    expect(emitted).toContain('export const source = { path: "hello.xsl"');
    expect(emitted).toContain('createCompiledDocument(sourceXml)');
    expect(emitted).toContain('selectSimplePathText(document, ["root","name"])');
    expect(emitted).not.toContain('const currentNode = document;');
    expect(emitted).toContain('"<hello>"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for simple relative child paths and existence tests', () => {
    const { emitted, transpiled } = transpileEmittedModule(RELATIVE_FIXTURE_STYLESHEET, 'relative.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathText(currentNode, ["root","name"])');
    expect(emitted).toContain('selectSimplePathExists(currentNode, ["root","flag"])');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native conditionals for the simple xsl:if and xsl:choose subset', () => {
    const { emitted, transpiled } = transpileEmittedModule(CONDITIONAL_FIXTURE_STYLESHEET, 'conditional.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('selectSimplePathText(document, ["root","name"]) === "world"');
    expect(emitted).toContain('"<yes>" +');
    expect(emitted).toContain(': "")');
    expect(emitted).toContain('selectSimplePathText(document, ["root","role"]) === "admin"');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native boolean helper calls in simple tests', () => {
    const { emitted, transpiled } = transpileEmittedModule(BOOLEAN_HELPERS_FIXTURE_STYLESHEET, 'boolean-helpers.xsl');

    expect(transpiled.diagnostics ?? []).toEqual([]);
    expect(emitted).toContain('(!selectSimplePathExists(currentNode, ["root","flag"]))');
    expect(emitted).toContain('"<always>" +');
    expect(emitted).toContain('"<never>" +');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });
});