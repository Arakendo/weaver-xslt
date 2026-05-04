import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, '../..');
const GENERATED_FIXTURES_DIR = join(WORKSPACE_ROOT, 'test', 'generated-fixtures');
const SOURCE_ROOT = join(WORKSPACE_ROOT, 'src');

describe('generated fixture audit', () => {
  it('keeps generated fixtures readable and runtime-only', () => {
    const fixtureFiles = readdirSync(GENERATED_FIXTURES_DIR)
      .filter((fileName) => fileName.endsWith('.xsl.ts'))
      .sort();

    expect(fixtureFiles.length).toBeGreaterThan(0);

    for (const fixtureFile of fixtureFiles) {
      const fixtureText = readFileSync(join(GENERATED_FIXTURES_DIR, fixtureFile), 'utf8').replaceAll('\r\n', '\n');

      expect(fixtureText, fixtureFile).toContain('from "@arakendo/weaver-xslt/runtime";');
      expect(fixtureText, fixtureFile).not.toContain('from "@arakendo/weaver-xslt/compile";');
      expect(fixtureText, fixtureFile).not.toContain('from "@arakendo/weaver-xslt";');
      expect(fixtureText, fixtureFile).not.toContain('transformCompiledStylesheet(');
      expect(fixtureText, fixtureFile).toContain('export const source =');
      expect(fixtureText, fixtureFile).toContain('export function transform(');
      expect(fixtureText, fixtureFile).toContain('/** ');
    }
  });

  it('runs a generated module in a sandbox that only exposes the runtime subpath', async () => {
    const sandboxDir = mkdtempSync(join(tmpdir(), 'weaver-runtime-sandbox-'));

    try {
      const generatedTs = compileStylesheetToTs([
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <hello><xsl:value-of select="/root/name"/></hello>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n'), { path: 'sandbox-hello.xsl' });
      const transpiled = ts.transpileModule(generatedTs, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
        reportDiagnostics: true,
      });
      const generatedModulePath = join(sandboxDir, 'generated', 'sandbox-hello.mjs');

      expect(transpiled.diagnostics ?? []).toEqual([]);

      stageRuntimeOnlyPackage(sandboxDir);
      mkdirSync(dirname(generatedModulePath), { recursive: true });
      writeFileSync(generatedModulePath, transpiled.outputText, 'utf8');

      const generatedModule = await import(`${pathToFileURL(generatedModulePath).href}?t=${Date.now()}`) as {
        readonly transform: (sourceXml: string) => { readonly output: string };
      };

      expect(generatedModule.transform('<root><name>world</name></root>').output).toBe('<hello>world</hello>');
    } finally {
      rmSync(sandboxDir, { recursive: true, force: true });
    }
  });
});

function stageRuntimeOnlyPackage(sandboxDir: string): void {
  const packageRoot = join(sandboxDir, 'node_modules', '@arakendo', 'weaver-xslt');
  const runtimeEntry = join(SOURCE_ROOT, 'runtime', 'index.ts');

  mkdirSync(packageRoot, { recursive: true });
  writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({
    name: '@arakendo/weaver-xslt',
    type: 'module',
    exports: {
      './runtime': './runtime/index.js',
    },
  }, null, 2));

  stageTranspiledModuleTree(runtimeEntry, packageRoot, new Set<string>());

  cpSync(join(WORKSPACE_ROOT, 'node_modules', '@xmldom'), join(sandboxDir, 'node_modules', '@xmldom'), { recursive: true });
}

function stageTranspiledModuleTree(sourceFilePath: string, packageRoot: string, seen: Set<string>): void {
  const normalizedSourcePath = resolve(sourceFilePath);
  if (seen.has(normalizedSourcePath)) {
    return;
  }

  seen.add(normalizedSourcePath);

  const sourceText = readFileSync(normalizedSourcePath, 'utf8');
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: normalizedSourcePath,
  });
  const relativeSourcePath = relative(SOURCE_ROOT, normalizedSourcePath);
  const outputPath = join(packageRoot, relativeSourcePath).replace(/\.ts$/, '.js');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, transpiled.outputText, 'utf8');

  for (const importSpecifier of collectRelativeImports(transpiled.outputText)) {
    const importedSourcePath = resolve(dirname(normalizedSourcePath), importSpecifier).replace(/\.js$/, '.ts');
    stageTranspiledModuleTree(importedSourcePath, packageRoot, seen);
  }
}

function collectRelativeImports(transpiledModuleText: string): readonly string[] {
  const imports = new Set<string>();
  const importPattern = /(?:from\s+|import\s*\()(['"])(\.[^'"]+)\1/g;

  for (const match of transpiledModuleText.matchAll(importPattern)) {
    const specifier = match[2];
    if (specifier !== undefined) {
      imports.add(specifier);
    }
  }

  return [...imports];
}