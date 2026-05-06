import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { compileStylesheetArtifacts, compileStylesheetArtifactsFromFile } from '../../src/compile.js';

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
});