import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { weaverVitePlugin } from '../../src/vite.js';

describe('vite plugin', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir !== undefined) {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      tempDir = undefined;
    }
  });

  it('loads .xsl files as generated TS modules with source maps', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'weaver-vite-plugin-'));
    const stylesheetPath = join(tempDir, 'hello.xsl');
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <hello><xsl:value-of select="/root/name"/></hello>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    writeFileSync(stylesheetPath, stylesheet, 'utf8');

    const plugin = weaverVitePlugin();
    const result = await plugin.load?.(`${stylesheetPath}?import`);

    expect(result).not.toBeNull();
    expect(result?.code).toContain('export function transform');
    expect(result?.code).toContain('// source map inlined for Vite');
    expect(result?.code).toContain('//# sourceMappingURL=data:application/json;base64,');
    expect(result?.code).not.toContain('import type');
    expect(result?.code).not.toContain(' as const');
    expect(result?.map).toMatchObject({
      file: 'hello.xsl.ts',
      sources: ['hello.xsl'],
    });
  });

  it('transforms .xsl modules for live Vite module requests', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'weaver-vite-plugin-'));
    const stylesheetPath = join(tempDir, 'hello.xsl');
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <hello><xsl:value-of select="/root/name"/></hello>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    writeFileSync(stylesheetPath, stylesheet, 'utf8');

    const plugin = weaverVitePlugin();
    const result = await plugin.transform?.(stylesheet, `${stylesheetPath}?import`);

    expect(result).not.toBeNull();
    expect(result?.code).toContain('export function transform');
    expect(result?.code).toContain('// source map inlined for Vite');
    expect(result?.code).toContain('//# sourceMappingURL=data:application/json;base64,');
    expect(result?.code).not.toContain('import type');
    expect(result?.code).not.toContain(' as const');
    expect(result?.map).toMatchObject({
      file: 'hello.xsl.ts',
      sources: ['hello.xsl'],
    });
  });

  it('ignores non-stylesheet ids', async () => {
    const plugin = weaverVitePlugin();

    expect(await plugin.load?.('/virtual/module.ts')).toBeNull();
    expect(await plugin.transform?.('', '/virtual/module.ts')).toBeNull();
  });
});