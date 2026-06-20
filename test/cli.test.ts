import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import { formatDiagnostics, projectDiagnosticReports } from '../src/diagnostics/index.js';
import { compileStylesheetArtifacts } from '../src/index.js';
import { runCli } from '../src/cli.js';

function createTestIo() {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout,
    stderr,
    io: {
      stdout: (text: string) => {
        stdout.push(text);
      },
      stderr: (text: string) => {
        stderr.push(text);
      },
    },
  };
}

describe('CLI', () => {
  it('writes <glob>.ts, .d.ts, .digest, and .map outputs for matched stylesheets', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const firstStylesheetPath = join(tempDir, 'hello.xsl');
      const secondStylesheetPath = join(tempDir, 'goodbye.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <hello><xsl:value-of select="/root/name"/></hello>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const firstExpected = compileStylesheetArtifacts(stylesheet, { path: 'hello.xsl' });
      const secondExpected = compileStylesheetArtifacts(stylesheet.replaceAll('hello', 'goodbye'), {
        path: 'goodbye.xsl',
      });
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(firstStylesheetPath, stylesheet, 'utf8');
      writeFileSync(secondStylesheetPath, stylesheet.replaceAll('hello', 'goodbye'), 'utf8');

      const exitCode = await runCli(['compile', join(tempDir, '*.xsl')], io);
      const firstOutputPath = `${firstStylesheetPath}.ts`;
      const firstDeclarationPath = `${firstStylesheetPath}.d.ts`;
      const firstDigestPath = `${firstStylesheetPath}.digest`;
      const firstSourceMapPath = `${firstStylesheetPath}.map`;
      const secondOutputPath = `${secondStylesheetPath}.ts`;
      const secondDeclarationPath = `${secondStylesheetPath}.d.ts`;
      const secondDigestPath = `${secondStylesheetPath}.digest`;
      const secondSourceMapPath = `${secondStylesheetPath}.map`;

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout).toEqual([`Wrote ${secondOutputPath}\n`, `Wrote ${firstOutputPath}\n`].sort());
      expect(existsSync(firstOutputPath)).toBe(true);
      expect(existsSync(firstDeclarationPath)).toBe(true);
      expect(existsSync(firstDigestPath)).toBe(true);
      expect(existsSync(firstSourceMapPath)).toBe(true);
      expect(existsSync(secondOutputPath)).toBe(true);
      expect(existsSync(secondDeclarationPath)).toBe(true);
      expect(existsSync(secondDigestPath)).toBe(true);
      expect(existsSync(secondSourceMapPath)).toBe(true);
      expect(readFileSync(firstOutputPath, 'utf8')).toBe(firstExpected.module);
      expect(readFileSync(firstDeclarationPath, 'utf8')).toBe(firstExpected.declaration);
      expect(readFileSync(firstDigestPath, 'utf8')).toBe(`${firstExpected.digest}\n`);
      expect(readFileSync(firstSourceMapPath, 'utf8')).toBe(firstExpected.sourceMap);
      expect(readFileSync(secondOutputPath, 'utf8')).toBe(secondExpected.module);
      expect(readFileSync(secondDeclarationPath, 'utf8')).toBe(secondExpected.declaration);
      expect(readFileSync(secondDigestPath, 'utf8')).toBe(`${secondExpected.digest}\n`);
      expect(readFileSync(secondSourceMapPath, 'utf8')).toBe(secondExpected.sourceMap);
      expect(readFileSync(firstOutputPath, 'utf8')).toContain('//# sourceMappingURL=hello.xsl.map');
      expect(readFileSync(secondOutputPath, 'utf8')).toContain(
        '//# sourceMappingURL=goodbye.xsl.map',
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('formats compile errors instead of throwing stacks', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'broken.xsl');
      const stylesheet = '<out/>';
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      const exitCode = await runCli(['compile', stylesheetPath], io);

      expect(exitCode).toBe(1);
      expect(stdout).toEqual([]);
      expect(stderr).toHaveLength(1);
      expect(stderr[0]).toContain('error[XTSE0010]');
      expect(stderr[0]).toContain(
        'Stylesheet document element must be xsl:stylesheet or xsl:transform',
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('compiles file-based include and import composition through the CLI', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'root.xsl');
      const importPath = join(tempDir, 'imported.xsl');
      const includePath = join(tempDir, 'included.xsl');
      const outputPath = `${stylesheetPath}.ts`;
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:import href="imported.xsl"/>',
        '  <xsl:include href="included.xsl"/>',
        '  <xsl:template match="/">',
        '    <xsl:call-template name="emit"/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const imported = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template name="emit">',
        '    <out>low</out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const included = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template name="emit">',
        '    <out>high</out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(importPath, imported, 'utf8');
      writeFileSync(includePath, included, 'utf8');

      const exitCode = await runCli(['compile', stylesheetPath], io);

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout).toEqual([`Wrote ${outputPath}\n`]);
      expect(existsSync(outputPath)).toBe(true);
      expect(readFileSync(outputPath, 'utf8')).toContain('/** name="emit"');
      expect(readFileSync(outputPath, 'utf8')).toContain('high');
      expect(readFileSync(outputPath, 'utf8')).not.toContain('low');
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('compiles a globals-only helper stylesheet through the CLI', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'globals-only.xsl');
      const outputPath = `${stylesheetPath}.ts`;
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:variable name="version">5</xsl:variable>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      const exitCode = await runCli(['compile', stylesheetPath], io);

      expect(exitCode).toBe(0);
      expect(stdout).toEqual([`Wrote ${outputPath}\n`]);
      expect(stderr).toHaveLength(1);
      expect(stderr[0]).toContain('warning[WEAVER_ANALYZE_UNUSED_GLOBAL_VARIABLE]');
      expect(stderr[0]).toContain('version');
      expect(existsSync(outputPath)).toBe(true);
      expect(readFileSync(outputPath, 'utf8')).toContain('"globalBindings": [');
      expect(readFileSync(outputPath, 'utf8')).toContain('"templates": []');
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('reports unchanged artifacts as up to date on repeated compile', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'hello.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <hello><xsl:value-of select="/root/name"/></hello>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const outputPath = `${stylesheetPath}.ts`;
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      expect(await runCli(['compile', stylesheetPath], io)).toBe(0);
      expect(await runCli(['compile', stylesheetPath], io)).toBe(0);

      expect(stderr).toEqual([]);
      expect(stdout).toEqual([`Wrote ${outputPath}\n`, `Up to date ${outputPath}\n`]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('prints analysis warnings during compile without failing the build', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'unused-template.xsl');
      const outputPath = `${stylesheetPath}.ts`;
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <out>ok</out>',
        '  </xsl:template>',
        '  <xsl:template name="tail">',
        '    <tail>unused</tail>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      const exitCode = await runCli(['compile', stylesheetPath], io);

      expect(exitCode).toBe(0);
      expect(stdout).toEqual([`Wrote ${outputPath}\n`]);
      expect(stderr).toEqual([
        [
          'warning[WEAVER_ANALYZE_UNUSED_TEMPLATE]: Named template tail is never called from any matched template.',
          '--> unused-template.xsl:5:23',
          '5 |   <xsl:template name="tail">',
          '  |                       ^^^^',
          '  in template tail (unused-template.xsl:5:23)',
          '  = templateName: tail',
          '  hint: remove the template or add an xsl:call-template that reaches it from a matched template',
          '',
        ].join('\n'),
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('passes a sample document to compile diagnostics via --sample', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'sample-warning.xsl');
      const samplePath = join(tempDir, 'sample.xml');
      const outputPath = `${stylesheetPath}.ts`;
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <xsl:value-of select="/root/prodcut"/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(samplePath, '<root><product>ok</product></root>', 'utf8');

      const exitCode = await runCli(['compile', stylesheetPath, '--sample', samplePath], io);

      expect(exitCode).toBe(0);
      expect(stdout).toEqual([`Wrote ${outputPath}\n`]);
      expect(stderr).toHaveLength(1);
      expect(stderr[0]).toContain('warning[WEAVER_ANALYZE_UNKNOWN_SAMPLE_ELEMENT_NAME]');
      expect(stderr[0]).toContain('did you mean "product"?');
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('prints multiple analysis warnings in a stable order during compile', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'multi-warning.xsl');
      const outputPath = `${stylesheetPath}.ts`;
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:variable name="global-unused" select="\'value\'"/>',
        '  <xsl:template match="item">',
        '    <one/>',
        '  </xsl:template>',
        '  <xsl:template match="item">',
        '    <xsl:param name="param-unused"/>',
        '    <two/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      const exitCode = await runCli(['compile', stylesheetPath], io);

      expect(exitCode).toBe(0);
      expect(stdout).toEqual([`Wrote ${outputPath}\n`]);
      expect(stderr).toEqual([
        [
          'warning[WEAVER_ANALYZE_UNUSED_GLOBAL_VARIABLE]: Stylesheet variable global-unused is never referenced from any reachable template or global binding.',
          '--> multi-warning.xsl:2:23',
          '2 |   <xsl:variable name="global-unused" select="\'value\'"/>',
          '  |                       ^^^^^^^^^^^^^',
          '  in instruction xsl:variable name="global-unused" (multi-warning.xsl:2:23)',
          '  = variableName: global-unused',
          '  hint: remove the stylesheet variable or reference $global-unused from a reachable template or global binding',
          'warning[WEAVER_ANALYZE_PRIORITY_CONFLICT]: Template match "item" has the same effective priority 0 as an earlier overlapping template; declaration order decides which one wins.',
          '--> multi-warning.xsl:6:24',
          '6 |   <xsl:template match="item">',
          '  |                        ^^^^',
          '  in template item (multi-warning.xsl:6:24)',
          'related:',
          '  earlier overlapping template match="item" (multi-warning.xsl:3:24)',
          '  = matchPattern: item',
          '  = priority: 0',
          '  = earlierMatchPattern: item',
          '  = earlierPriority: 0',
          '  hint: set an explicit priority or narrow one of the overlapping match patterns',
          'warning[WEAVER_ANALYZE_UNUSED_TEMPLATE_PARAM]: Template parameter param-unused is never referenced within its template.',
          '--> multi-warning.xsl:7:22',
          '7 |     <xsl:param name="param-unused"/>',
          '  |                      ^^^^^^^^^^^^',
          '  in template item (multi-warning.xsl:7:22)',
          '  = paramName: param-unused',
          '  hint: remove the parameter or reference $param-unused from the template body or parameter defaults',
          '',
        ].join('\n'),
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('prints analysis warnings in source order instead of analyzer bucket order', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'source-ordered-warnings.xsl');
      const outputPath = `${stylesheetPath}.ts`;
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="item">',
        '    <xsl:param name="first-unused"/>',
        '    <one/>',
        '  </xsl:template>',
        '  <xsl:template match="item">',
        '    <two/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      const exitCode = await runCli(['compile', stylesheetPath], io);

      expect(exitCode).toBe(0);
      expect(stdout).toEqual([`Wrote ${outputPath}\n`]);
      expect(stderr).toEqual([
        [
          'warning[WEAVER_ANALYZE_UNUSED_TEMPLATE_PARAM]: Template parameter first-unused is never referenced within its template.',
          '--> source-ordered-warnings.xsl:3:22',
          '3 |     <xsl:param name="first-unused"/>',
          '  |                      ^^^^^^^^^^^^',
          '  in template item (source-ordered-warnings.xsl:3:22)',
          '  = paramName: first-unused',
          '  hint: remove the parameter or reference $first-unused from the template body or parameter defaults',
          'warning[WEAVER_ANALYZE_PRIORITY_CONFLICT]: Template match "item" has the same effective priority 0 as an earlier overlapping template; declaration order decides which one wins.',
          '--> source-ordered-warnings.xsl:6:24',
          '6 |   <xsl:template match="item">',
          '  |                        ^^^^',
          '  in template item (source-ordered-warnings.xsl:6:24)',
          'related:',
          '  earlier overlapping template match="item" (source-ordered-warnings.xsl:2:24)',
          '  = matchPattern: item',
          '  = priority: 0',
          '  = earlierMatchPattern: item',
          '  = earlierPriority: 0',
          '  hint: set an explicit priority or narrow one of the overlapping match patterns',
          '',
        ].join('\n'),
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('runs a stylesheet against an input XML file via the interpreter', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'hello.xsl');
      const inputPath = join(tempDir, 'input.xml');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <hello><xsl:value-of select="/root/name"/></hello>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(inputPath, '<root><name>world</name></root>', 'utf8');

      const exitCode = await runCli(['run', stylesheetPath, '--input', inputPath], io);

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout).toEqual(['<hello>world</hello>\n']);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('resolves stylesheet-relative document() calls when running from the CLI', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'doc-run.xsl');
      const inputPath = join(tempDir, 'input.xml');
      const lookupPath = join(tempDir, 'lookup.xml');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        `    <out><xsl:value-of select="document('lookup.xml')/lookup/value"/></out>`,
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(inputPath, '<root/>', 'utf8');
      writeFileSync(lookupPath, '<lookup><value>ok</value></lookup>', 'utf8');

      const exitCode = await runCli(['run', stylesheetPath, '--input', inputPath], io);

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout).toEqual(['<out>ok</out>\n']);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('runs file-based include and import composition through the CLI run command', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'root.xsl');
      const importPath = join(tempDir, 'imported.xsl');
      const includePath = join(tempDir, 'included.xsl');
      const inputPath = join(tempDir, 'input.xml');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:import href="imported.xsl"/>',
        '  <xsl:include href="included.xsl"/>',
        '  <xsl:template match="/">',
        '    <xsl:call-template name="emit"/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const imported = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template name="emit">',
        '    <out>low</out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const included = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template name="emit">',
        '    <out>high</out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(importPath, imported, 'utf8');
      writeFileSync(includePath, included, 'utf8');
      writeFileSync(inputPath, '<root/>', 'utf8');

      const exitCode = await runCli(['run', stylesheetPath, '--input', inputPath], io);

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout).toEqual(['<out>high</out>\n']);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('passes stylesheet parameters through the CLI run command', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'assets.xsl');
      const sourcePath = join(tempDir, 'source.xml');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:param name="filePath"/>',
        '  <xsl:template match="/">',
        '    <out href="{$filePath}/style.css"/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(sourcePath, '<root/>', 'utf8');

      const { io, stderr, stdout } = createTestIo();
      const exitCode = await runCli(
        ['run', stylesheetPath, '--input', sourcePath, '--param', 'filePath=/assets'],
        io,
      );

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout).toEqual(['<out href="/assets/style.css"></out>\n']);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('prints an auto-execution fallback warning when run falls back to the interpreter', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'fallback-warning.xsl');
      const inputPath = join(tempDir, 'input.xml');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/root">',
        '    <out><xsl:apply-templates select="item[position() &lt; (last() div 2) * (last() div 2) * (last() div 2)]"/></out>',
        '  </xsl:template>',
        '  <xsl:template match="item">',
        '    <xsl:value-of select="."/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(
        inputPath,
        '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
        'utf8',
      );

      const exitCode = await runCli(
        ['run', stylesheetPath, '--input', inputPath, '--execution', 'auto'],
        io,
      );

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([
        [
          'warning[native-fallback]: The current stylesheet is outside the native-supported slice for M6.25.',
          '  = fallbackCode: unsupported_stylesheet',
          '  help: retry with execution="native" to get a hard unsupported-native error while simplifying the stylesheet',
          '  help: simplify the select/match shape toward the documented native slice if you want to stay on the native path',
          '',
        ].join('\n'),
      ]);
      expect(stdout).toEqual(['<out>abcd</out>\n']);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('watches stylesheets, recompiles on change, and removes outputs on delete', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'hello.xsl');
      const outputPath = `${stylesheetPath}.ts`;
      const declarationPath = `${stylesheetPath}.d.ts`;
      const digestPath = `${stylesheetPath}.digest`;
      const sourceMapPath = `${stylesheetPath}.map`;
      const initialStylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <hello><xsl:value-of select="/root/name"/></hello>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const updatedStylesheet = initialStylesheet.replaceAll('hello', 'goodbye');
      const initialExpected = compileStylesheetArtifacts(initialStylesheet, {
        path: 'hello.xsl',
        filePath: stylesheetPath,
      });
      const updatedExpected = compileStylesheetArtifacts(updatedStylesheet, {
        path: 'hello.xsl',
        filePath: stylesheetPath,
      });
      const { io, stderr, stdout } = createTestIo();
      const abortController = new AbortController();

      writeFileSync(stylesheetPath, initialStylesheet, 'utf8');

      const exitCodePromise = runCli(['watch', join(tempDir, '*.xsl')], io, {
        signal: abortController.signal,
      });

      await vi.waitFor(() => {
        expect(readFileSync(outputPath, 'utf8')).toBe(initialExpected.module);
        expect(readFileSync(declarationPath, 'utf8')).toBe(initialExpected.declaration);
        expect(readFileSync(digestPath, 'utf8')).toBe(`${initialExpected.digest}\n`);
        expect(readFileSync(sourceMapPath, 'utf8')).toBe(initialExpected.sourceMap);
        expect(stdout).toContain(`Wrote ${outputPath}.ts\n`.replace('.ts.ts', '.ts'));
        expect(stdout).toContain(`Watching ${join(tempDir, '*.xsl')}\n`);
      });

      writeFileSync(stylesheetPath, initialStylesheet, 'utf8');

      await vi.waitFor(() => {
        expect(stdout).toContain(`Unchanged ${outputPath}\n`);
      });

      writeFileSync(stylesheetPath, updatedStylesheet, 'utf8');

      await vi.waitFor(() => {
        expect(readFileSync(outputPath, 'utf8')).toBe(updatedExpected.module);
        expect(readFileSync(declarationPath, 'utf8')).toBe(updatedExpected.declaration);
        expect(readFileSync(digestPath, 'utf8')).toBe(`${updatedExpected.digest}\n`);
        expect(readFileSync(sourceMapPath, 'utf8')).toBe(updatedExpected.sourceMap);
      });

      rmSync(stylesheetPath);

      await vi.waitFor(() => {
        expect(existsSync(outputPath)).toBe(false);
        expect(existsSync(declarationPath)).toBe(false);
        expect(existsSync(digestPath)).toBe(false);
        expect(existsSync(sourceMapPath)).toBe(false);
        expect(stdout).toContain(`Removed ${stylesheetPath}\n`);
      });

      abortController.abort();

      const exitCode = await exitCodePromise;

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('recompiles watched stylesheets when the sample document changes', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'sample-watch.xsl');
      const samplePath = join(tempDir, 'sample.xml');
      const outputPath = `${stylesheetPath}.ts`;
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <xsl:value-of select="/root/prodcut"/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();
      const abortController = new AbortController();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(samplePath, '<root><product>ok</product></root>', 'utf8');

      const exitCodePromise = runCli(['watch', stylesheetPath, '--sample', samplePath], io, {
        signal: abortController.signal,
      });

      await vi.waitFor(() => {
        expect(readFileSync(outputPath, 'utf8')).toContain('root');
        expect(
          stderr.some((entry) => entry.includes('WEAVER_ANALYZE_UNKNOWN_SAMPLE_ELEMENT_NAME')),
        ).toBe(true);
      });

      writeFileSync(samplePath, '<root><prodcut>ok</prodcut></root>', 'utf8');

      await vi.waitFor(() => {
        expect(stdout).toContain(`Up to date ${outputPath}\n`);
      });

      expect(stderr).toHaveLength(1);

      abortController.abort();
      expect(await exitCodePromise).toBe(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('renders watch-mode diagnostics from the same DiagnosticReport values used by JSON projection', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'watch-diagnostics.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="item">',
        '    <xsl:param name="first-unused"/>',
        '    <one/>',
        '  </xsl:template>',
        '  <xsl:template match="item">',
        '    <two/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const expected = compileStylesheetArtifacts(stylesheet, {
        path: 'watch-diagnostics.xsl',
        filePath: stylesheetPath,
      });
      const renderedProjectedDiagnostics = formatDiagnostics(
        projectDiagnosticReports(expected.diagnostics),
        stylesheet,
      );
      const { io, stderr } = createTestIo();
      const abortController = new AbortController();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      const exitCodePromise = runCli(['watch', stylesheetPath], io, {
        signal: abortController.signal,
      });

      await vi.waitFor(() => {
        expect(stderr).toEqual([renderedProjectedDiagnostics]);
      });

      abortController.abort();
      expect(await exitCodePromise).toBe(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('recompiles watched stylesheets when adjacent functions.ts changes and removes stale outputs on compile failure', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'functions-watch.xsl');
      const functionsPath = join(tempDir, 'functions.ts');
      const outputPath = `${stylesheetPath}.ts`;
      const declarationPath = `${stylesheetPath}.d.ts`;
      const digestPath = `${stylesheetPath}.digest`;
      const sourceMapPath = `${stylesheetPath}.map`;
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:demo="urn:demo">',
        '  <xsl:template match="/">',
        '    <out><xsl:value-of select="demo:formatAmount(42)"/></out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const validFunctions = [
        "import { defineXsltFunctions } from '@arakendo/weaver-xslt';",
        '',
        "export default defineXsltFunctions('urn:demo', {",
        '  formatAmount(value: number): string {',
        '    return String(value);',
        '  },',
        '});',
      ].join('\n');
      const invalidFunctions = [
        "import { defineXsltFunctions } from '@arakendo/weaver-xslt';",
        '',
        "export default defineXsltFunctions('urn:demo', {",
        '  formatTotal(value: number): string {',
        '    return String(value);',
        '  },',
        '});',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();
      const abortController = new AbortController();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(functionsPath, validFunctions, 'utf8');

      const exitCodePromise = runCli(['watch', stylesheetPath], io, {
        signal: abortController.signal,
      });

      await vi.waitFor(() => {
        expect(existsSync(outputPath)).toBe(true);
        expect(existsSync(declarationPath)).toBe(true);
        expect(existsSync(digestPath)).toBe(true);
        expect(existsSync(sourceMapPath)).toBe(true);
      });

      writeFileSync(functionsPath, invalidFunctions, 'utf8');

      await vi.waitFor(() => {
        expect(existsSync(outputPath)).toBe(false);
        expect(existsSync(declarationPath)).toBe(false);
        expect(existsSync(digestPath)).toBe(false);
        expect(existsSync(sourceMapPath)).toBe(false);
        expect(stdout).toContain(`Removed stale outputs for ${stylesheetPath}\n`);
        expect(
          stderr.some((entry) =>
            entry.includes('Unknown function demo:formatAmount with arity 1.'),
          ),
        ).toBe(true);
      });

      writeFileSync(functionsPath, validFunctions, 'utf8');

      await vi.waitFor(() => {
        expect(existsSync(outputPath)).toBe(true);
        expect(existsSync(declarationPath)).toBe(true);
        expect(existsSync(digestPath)).toBe(true);
        expect(existsSync(sourceMapPath)).toBe(true);
      });

      abortController.abort();
      expect(await exitCodePromise).toBe(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('prints help text for --help without treating it as an error', async () => {
    const { io, stderr, stdout } = createTestIo();

    const exitCode = await runCli(['--help'], io);

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(stdout).toEqual([
      [
        'Usage:',
        '  weaver-xslt compile <glob> [--sample <xml>]',
        '  weaver-xslt watch <glob> [--sample <xml>]',
        '  weaver-xslt run <stylesheet> --input <xml> [--execution <interpreter|native|auto>] [--param <name=value> ...]',
        '  weaver-xslt --help',
      ].join('\n'),
    ]);
  });
});
