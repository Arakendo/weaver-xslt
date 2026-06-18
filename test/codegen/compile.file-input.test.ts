import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import {
  compileStylesheetArtifacts,
  compileStylesheetArtifactsFromFile,
} from '../../src/compile.js';
import { XsltProcessor } from '../../src/index.js';

describe('compileStylesheetArtifactsFromFile', () => {
  it('loads stylesheet and sample document inputs from disk', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-compile-file-'));

    try {
      const stylesheetPath = join(tempDir, 'sample-warning.xsl');
      const samplePath = join(tempDir, 'sample.xml');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <xsl:value-of select="/root/prodcut"/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(samplePath, '<root><product>ok</product></root>', 'utf8');

      const actual = compileStylesheetArtifactsFromFile(stylesheetPath, {
        sampleDocumentPath: samplePath,
      });
      const expected = compileStylesheetArtifacts(readFileSync(stylesheetPath, 'utf8'), {
        path: 'sample-warning.xsl',
        filePath: stylesheetPath,
        sampleDocument: readFileSync(samplePath, 'utf8'),
      });

      expect(actual.module).toBe(expected.module);
      expect(actual.declaration).toBe(expected.declaration);
      expect(actual.digest).toBe(expected.digest);
      expect(actual.sourceMap).toBe(expected.sourceMap);
      expect(actual.diagnostics).toMatchObject(expected.diagnostics);
      expect(actual.diagnostics[0]?.code).toBe('WEAVER_ANALYZE_UNKNOWN_SAMPLE_ELEMENT_NAME');
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('expands xsl:include declarations from disk before compilation', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-compile-include-'));

    try {
      const stylesheetPath = join(tempDir, 'main.xsl');
      const includePath = join(tempDir, 'common.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:include href="common.xsl"/>',
        '  <xsl:template match="/">',
        '    <xsl:call-template name="emit"/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const included = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template name="emit">',
        '    <out>ok</out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(includePath, included, 'utf8');

      const actual = compileStylesheetArtifactsFromFile(stylesheetPath);

      expect(actual.diagnostics).toEqual([]);
      expect(actual.module).toContain('/** name="emit"');
      expect(actual.module).toContain('<out');
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('expands xsl:import declarations from disk before compilation', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-compile-import-'));

    try {
      const stylesheetPath = join(tempDir, 'main.xsl');
      const importPath = join(tempDir, 'base.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:import href="base.xsl"/>',
        '  <xsl:template match="/">',
        '    <xsl:call-template name="emit"/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const imported = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template name="emit">',
        '    <out>ok</out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(importPath, imported, 'utf8');

      const actual = compileStylesheetArtifactsFromFile(stylesheetPath);

      expect(actual.diagnostics).toEqual([]);
      expect(actual.module).toContain('/** name="emit"');
      expect(actual.module).toContain('<out');
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('keeps the highest-precedence duplicate named template from imported stylesheets', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-compile-dedup-'));

    try {
      const stylesheetPath = join(tempDir, 'main.xsl');
      const importPath = join(tempDir, 'common.xsl');
      const includePath = join(tempDir, 'language.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:import href="common.xsl"/>',
        '  <xsl:import href="language.xsl"/>',
        '  <xsl:template match="/">',
        '    <xsl:call-template name="emit"/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const imported = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:include href="language.xsl"/>',
        '</xsl:stylesheet>',
      ].join('\n');
      const included = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template name="emit">',
        '    <out>high</out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const lowerPrecedence = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template name="emit">',
        '    <out>low</out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(
        importPath,
        imported.replace(
          '<xsl:include href="language.xsl"/>',
          lowerPrecedence.slice(
            lowerPrecedence.indexOf('\n') + 1,
            lowerPrecedence.lastIndexOf('\n'),
          ),
        ),
        'utf8',
      );
      writeFileSync(includePath, included, 'utf8');

      const actual = compileStylesheetArtifactsFromFile(stylesheetPath);

      expect(actual.diagnostics).toEqual([]);
      expect(actual.module).toContain('/** name="emit"');
      expect(actual.module).toContain('high');
      expect(actual.module).not.toContain('low');
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('compiles and runs xsl:attribute inside a literal result element', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <item><xsl:attribute name="class"><xsl:text>hot</xsl:text></xsl:attribute><xsl:text>x</xsl:text></item>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, {
      path: 'attribute-sample.xsl',
      filePath: 'f:/LocalSource/TS XSLT/attribute-sample.xsl',
    });
    expect(artifacts.diagnostics).toEqual([]);

    const result = new XsltProcessor(stylesheet).transform('<root/>');
    expect(result.output).toBe('<item class="hot">x</item>');
  });
});
