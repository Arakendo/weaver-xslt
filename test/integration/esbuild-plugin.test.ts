import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { build, type Plugin } from 'esbuild';
import { afterEach, describe, expect, it } from 'vitest';

import { weaverEsbuildPlugin, type EsbuildLoadArgs, type EsbuildLoadResult } from '../../src/esbuild.js';

const WORKSPACE_ROOT = resolve(import.meta.dirname, '../..');

describe('esbuild plugin', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir !== undefined) {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      tempDir = undefined;
    }
  });

  it('registers an onLoad hook that compiles .xsl files to TS', async () => {
    tempDir = mkdtempSync(join(WORKSPACE_ROOT, 'tmp-weaver-esbuild-plugin-'));
    const stylesheetPath = join(tempDir, 'hello.xsl');
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <hello><xsl:value-of select="/root/name"/></hello>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    writeFileSync(stylesheetPath, stylesheet, 'utf8');

    let onLoadCallback: ((args: EsbuildLoadArgs) => EsbuildLoadResult | null | Promise<EsbuildLoadResult | null>) | undefined;
    const plugin = weaverEsbuildPlugin();

    plugin.setup({
      onLoad(options, callback) {
        expect(options.filter.test('hello.xsl')).toBe(true);
        expect(options.filter.test('hello.ts')).toBe(false);
        onLoadCallback = callback;
      },
    });

    expect(onLoadCallback).toBeDefined();

    const result = await onLoadCallback?.({ path: stylesheetPath });

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      loader: 'ts',
      resolveDir: tempDir,
      watchFiles: [stylesheetPath],
    });
    expect(result?.contents).toContain('export function transform');
    expect(result?.contents).toContain('//# sourceMappingURL=hello.xsl.map');
  });

  it('bundles and runs a stylesheet import through esbuild', async () => {
    tempDir = mkdtempSync(join(WORKSPACE_ROOT, 'tmp-weaver-esbuild-plugin-'));
    const stylesheetPath = join(tempDir, 'hello.xsl');
    const entryPath = join(tempDir, 'entry.ts');
    const bundlePath = join(tempDir, 'bundle.mjs');
    const runtimeSpecifier = toPosixPath(relative(tempDir, join(WORKSPACE_ROOT, 'src', 'runtime', 'index.ts')));
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <hello><xsl:value-of select="/root/name"/></hello>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const entry = [
      "import { transform } from './hello.xsl';",
      "const result = transform('<root><name>world</name></root>');",
      'console.log(result.output);',
    ].join('\n');

    writeFileSync(stylesheetPath, stylesheet, 'utf8');
    writeFileSync(entryPath, entry, 'utf8');

    await build({
      absWorkingDir: tempDir,
      entryPoints: [entryPath],
      bundle: true,
      format: 'esm',
      outfile: bundlePath,
      platform: 'node',
      plugins: [weaverEsbuildPlugin({
        runtimeModuleSpecifier: runtimeSpecifier.startsWith('.') ? runtimeSpecifier : `./${runtimeSpecifier}`,
      }) as Plugin],
      write: true,
    });

    const stdout = execFileSync(process.execPath, [bundlePath], {
      cwd: WORKSPACE_ROOT,
      encoding: 'utf8',
    });

    expect(stdout).toBe('<hello>world</hello>\n');
  });
});

function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}