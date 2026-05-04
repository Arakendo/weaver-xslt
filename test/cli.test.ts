import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../src/index.js';
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

describe('CLI compile stub', () => {
  it('writes <file>.ts for a stylesheet source', () => {
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
      const expected = compileStylesheetToTs(stylesheet, { path: 'hello.xsl' });
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      const exitCode = runCli(['compile', stylesheetPath], io);
      const outputPath = `${stylesheetPath}.ts`;

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout).toEqual([`Wrote ${outputPath}\n`]);
      expect(existsSync(outputPath)).toBe(true);
      expect(readFileSync(outputPath, 'utf8')).toBe(expected);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('formats compile errors instead of throwing stacks', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-cli-'));

    try {
      const stylesheetPath = join(tempDir, 'broken.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <out><xsl:copy-of select="/root/item"/></out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const { io, stderr, stdout } = createTestIo();

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      const exitCode = runCli(['compile', stylesheetPath], io);

      expect(exitCode).toBe(1);
      expect(stdout).toEqual([]);
      expect(stderr).toHaveLength(1);
      expect(stderr[0]).toContain('error[XTSE0010]');
      expect(stderr[0]).toContain('xsl:copy-of');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});