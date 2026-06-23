import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import {
  compileStylesheetArtifacts,
  compileStylesheetArtifactsFromFile,
  summarizeComposedStylesheetFromFile,
} from '../../src/compile.js';
import { createSyntheticBenchmarkFixture } from '../../scripts/benchmark-fixtures.js';
import { XsltProcessor } from '../../src/index.js';

describe('compileStylesheetArtifactsFromFile', () => {
  it('reports coarse progress while compiling from disk', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-compile-progress-'));

    try {
      const stylesheetPath = join(tempDir, 'progress.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <out/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const progressMessages: string[] = [];

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      compileStylesheetArtifactsFromFile(stylesheetPath, {
        onProgress: (message) => progressMessages.push(message),
      });

      expect(progressMessages).toEqual([
        expect.stringContaining('Composing stylesheet source from'),
        expect.stringContaining('Compiling stylesheet IR for'),
        expect.stringContaining('Emitting stylesheet module for'),
        expect.stringContaining('Analyzing stylesheet diagnostics for'),
        expect.stringContaining('Generating stylesheet declaration and source map for'),
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('captures structured compile timings while compiling from disk', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-compile-profile-'));

    try {
      const stylesheetPath = join(tempDir, 'profile.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="/">',
        '    <out/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');

      writeFileSync(stylesheetPath, stylesheet, 'utf8');

      const artifacts = compileStylesheetArtifactsFromFile(stylesheetPath, {
        captureProfile: true,
      });

      expect(artifacts.profile).toBeDefined();
      expect(artifacts.profile?.totalElapsedMs).toBeGreaterThanOrEqual(0);
      expect(artifacts.profile?.phases.map((phase) => phase.key)).toEqual([
        'compose',
        'compileIr',
        'emitModule',
        'analyzeDiagnostics',
        'emitDeclaration',
        'emitSourceMap',
      ]);
      expect(artifacts.profile?.phases.every((phase) => phase.elapsedMs >= 0)).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

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

  it('deduplicates identical unnamed templates pulled in through repeated imports', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-compile-duplicate-match-'));

    try {
      const stylesheetPath = join(tempDir, 'main.xsl');
      const firstImportPath = join(tempDir, 'first.xsl');
      const secondImportPath = join(tempDir, 'second.xsl');
      const sharedPath = join(tempDir, 'shared.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:import href="first.xsl"/>',
        '  <xsl:import href="second.xsl"/>',
        '  <xsl:template match="/">',
        '    <xsl:apply-templates select="root/item"/>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');
      const importer = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:import href="shared.xsl"/>',
        '</xsl:stylesheet>',
      ].join('\n');
      const shared = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="item">',
        '    <out><xsl:value-of select="."/></out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(firstImportPath, importer, 'utf8');
      writeFileSync(secondImportPath, importer, 'utf8');
      writeFileSync(sharedPath, shared, 'utf8');

      const actual = compileStylesheetArtifactsFromFile(stylesheetPath, {
        captureIrStats: true,
      });

      expect(actual.diagnostics).toEqual([]);
      expect(actual.irStats?.templateRuleCount).toBe(2);
      expect(
        actual.irStats?.hottestTemplateKeys.find((entry) => entry.key === 'item')?.invocationCount,
      ).toBe(1);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('summarizes duplicate composition entries for repeated imported match templates', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-compose-summary-'));

    try {
      const stylesheetPath = join(tempDir, 'main.xsl');
      const firstImportPath = join(tempDir, 'first.xsl');
      const secondImportPath = join(tempDir, 'second.xsl');
      const sharedPath = join(tempDir, 'shared.xsl');
      const stylesheet = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:import href="first.xsl"/>',
        '  <xsl:import href="second.xsl"/>',
        '</xsl:stylesheet>',
      ].join('\n');
      const importer = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:import href="shared.xsl"/>',
        '</xsl:stylesheet>',
      ].join('\n');
      const shared = [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:template match="item">',
        '    <out><xsl:value-of select="."/></out>',
        '  </xsl:template>',
        '</xsl:stylesheet>',
      ].join('\n');

      writeFileSync(stylesheetPath, stylesheet, 'utf8');
      writeFileSync(firstImportPath, importer, 'utf8');
      writeFileSync(secondImportPath, importer, 'utf8');
      writeFileSync(sharedPath, shared, 'utf8');

      const summary = summarizeComposedStylesheetFromFile(stylesheetPath);

      expect(summary.droppedDuplicateEntries).toBe(1);
      expect(summary.duplicateSummaries).toContainEqual({
        key: 'template:item',
        occurrencesBeforePrune: 2,
        occurrencesAfterPrune: 1,
        droppedOccurrences: 1,
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('preserves the synthetic benchmark guardrail duplicate-collapse shape', () => {
    const fixture = createSyntheticBenchmarkFixture('vision-guardrail');

    try {
      const stylesheetPath = fixture.stylesheetPaths[0];
      if (stylesheetPath === undefined) {
        throw new Error('Synthetic benchmark fixture did not produce a stylesheet path.');
      }
      const artifacts = compileStylesheetArtifactsFromFile(stylesheetPath, {
        captureIrStats: true,
      });
      const summary = summarizeComposedStylesheetFromFile(stylesheetPath);

      expect(artifacts.diagnostics).toEqual([]);
      expect(artifacts.irStats?.templateRuleCount).toBe(76);
      expect(artifacts.irStats?.xpathParseCount).toBe(871);
      expect(summary.droppedDuplicateEntries).toBe(1725);
      expect(summary.duplicateSummaries[0]).toMatchObject({
        key: 'template:detail',
        occurrencesBeforePrune: 24,
        occurrencesAfterPrune: 1,
        droppedOccurrences: 23,
      });
    } finally {
      for (const cleanupDir of fixture.cleanupDirs) {
        rmSync(cleanupDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
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

  it('compiles a globals-only helper stylesheet with no templates', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:variable name="version">5</xsl:variable>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, {
      path: 'globals-only.xsl',
      filePath: 'f:/LocalSource/TS XSLT/globals-only.xsl',
    });

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(artifacts.diagnostics[0]?.code).toBe('WEAVER_ANALYZE_UNUSED_GLOBAL_VARIABLE');
    expect(artifacts.module).toContain('"globalBindings":[');
    expect(artifacts.module).toContain('"name":"version"');
    expect(artifacts.module).toContain('"templates":[]');
  });
});
