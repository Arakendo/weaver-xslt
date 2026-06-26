import { expect, test } from 'vitest';

import { compileStylesheetArtifacts } from '../../src/compile.js';
import { transpileTsToJs } from '../../src/processor/emitJs.js';

// Minimal XSLT stylesheet for testing JS emission
const MINIMAL_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <html><body><xsl:value-of select="/"/></body></html>
  </xsl:template>
</xsl:stylesheet>`;

// Simple stylesheet with multiple template rules
const MULTI_TEMPLATE_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <root><xsl:apply-templates/></root>
  </xsl:template>
  <xsl:template match="item">
    <li><xsl:value-of select="."/></li>
  </xsl:template>
</xsl:stylesheet>`;

// Test helper: compile and transpile to JS
function compileAndTranspile(xsl: string, baseName: string): {
  js: string;
  sourceMap: string;
  digest: string;
  diagnosticsCount: number;
} {
  const artifacts = compileStylesheetArtifacts(xsl, {
    path: baseName,
    emitTargets: ['js'],
  });

  const jsResult = transpileTsToJs(artifacts.module, { sourcePath: baseName });

  return {
    js: jsResult.js,
    sourceMap: jsResult.sourceMap,
    digest: artifacts.digest,
    diagnosticsCount: artifacts.diagnostics.length,
  };
}

// Test helper: verify source map is valid JSON
function isValidSourceMap(sourceMap: string): boolean {
  try {
    const parsed = JSON.parse(sourceMap);
    return parsed.version === 3 && typeof parsed.mappings === 'string';
  } catch {
    return false;
  }
}

test('JS emission produces valid transpiled output', () => {
  const result = compileAndTranspile(MINIMAL_XSL, 'test.xsl');

  expect(result.js.length).toBeGreaterThan(0);
  expect(result.sourceMap.length).toBeGreaterThan(0);
  expect(result.digest.length).toBe(8);
  expect(result.diagnosticsCount).toBe(0);
});

test('transpiled JS preserves source and transform exports', () => {
  const result = compileAndTranspile(MINIMAL_XSL, 'test.xsl');

  // Check that the transpiled JS contains the expected export structure
  expect(result.js).toContain('source');
  expect(result.js).toContain('transform');
});

test('transpiled JS source map is valid', () => {
  const result = compileAndTranspile(MINIMAL_XSL, 'test.xsl');

  // Debug: print the source map to see what we got
  if (!isValidSourceMap(result.sourceMap)) {
    console.log('sourceMap:', result.sourceMap.slice(0, 500));
  }
  expect(isValidSourceMap(result.sourceMap)).toBe(true);
});

test('transpiled JS contains ES imports', () => {
  const result = compileAndTranspile(MINIMAL_XSL, 'test.xsl');

  // The transpiled JS should contain ES import statements
  expect(result.js.includes('import')).toBe(true);
});

test('multi-template stylesheet transpiles correctly', () => {
  const result = compileAndTranspile(MULTI_TEMPLATE_XSL, 'multi.xsl');

  expect(result.js.length).toBeGreaterThan(0);
  expect(result.digest.length).toBe(8);
  expect(isValidSourceMap(result.sourceMap)).toBe(true);
});

test('digest matches between TS and JS artifacts', () => {
  const tsOnly = compileStylesheetArtifacts(MINIMAL_XSL, { path: 'digest-test.xsl' });
  const withJs = compileStylesheetArtifacts(MINIMAL_XSL, { path: 'digest-test.xsl', emitTargets: ['js'] });

  expect(tsOnly.digest).toBe(withJs.digest);
});

test('emitTargets option passes through to compile pipeline', () => {
  // This test verifies that the emitTargets option is passed through correctly
  const result = compileStylesheetArtifacts(MINIMAL_XSL, { path: 'profile-test.xsl', emitTargets: ['js'] });

  expect(result.module.length).toBeGreaterThan(0);
  expect(result.digest.length).toBe(8);
});