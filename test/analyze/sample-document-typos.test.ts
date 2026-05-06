import { describe, expect, it } from 'vitest';

import { assertValidDiagnostic, formatDiagnostic } from '../../src/diagnostics/index.js';
import { compileStylesheetArtifacts } from '../../src/compile.js';

describe('analyze sample document typos', () => {
  it('reports a warning for near-miss element names against a supplied sample document', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:value-of select="/root/prodcut"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sampleDocument = '<root><product>ok</product></root>';

    const artifacts = compileStylesheetArtifacts(stylesheet, {
      path: 'sample-element-typo.xsl',
      sampleDocument,
    });
    const [report] = artifacts.diagnostics;

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(report).toBeDefined();
    assertValidDiagnostic(report!);
    expect(report).toMatchObject({
      code: 'WEAVER_ANALYZE_UNKNOWN_SAMPLE_ELEMENT_NAME',
      message: 'XPath element name test "prodcut" does not appear in the supplied sample document.',
      suggestions: [{
        kind: 'fix',
        label: 'did you mean "product"?',
        replacement: 'product',
      }],
    });
    expect(report?.suggestions[0]?.confidence).toBeCloseTo(5 / 7);
    expect(formatDiagnostic(report!, stylesheet)).toContain('help: did you mean "product"?');
  });

  it('reports a warning for near-miss attribute names against a supplied sample document', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:value-of select="/root/item/@identifer"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sampleDocument = '<root><item identifier="x"/></root>';

    const artifacts = compileStylesheetArtifacts(stylesheet, {
      path: 'sample-attribute-typo.xsl',
      sampleDocument,
    });

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(artifacts.diagnostics[0]).toMatchObject({
      code: 'WEAVER_ANALYZE_UNKNOWN_SAMPLE_ATTRIBUTE_NAME',
      message: 'XPath attribute name test "identifer" does not appear in the supplied sample document.',
      suggestions: [{
        kind: 'fix',
        label: 'did you mean "identifier"?',
        replacement: 'identifier',
      }],
    });
  });

  it('does not report sample-document typo warnings when no sample document is supplied', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:value-of select="/root/prodcut"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');

    const artifacts = compileStylesheetArtifacts(stylesheet, { path: 'no-sample-document.xsl' });

    expect(artifacts.diagnostics).toEqual([]);
  });

  it('uses stylesheet namespace bindings when suggesting prefixed element names', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:inv="urn:inventory">',
      '  <xsl:template match="/">',
      '    <xsl:value-of select="/root/inv:prodcut"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sampleDocument = '<root xmlns:inv="urn:inventory"><inv:product>ok</inv:product></root>';

    const artifacts = compileStylesheetArtifacts(stylesheet, {
      path: 'sample-prefixed-element-typo.xsl',
      sampleDocument,
    });

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(artifacts.diagnostics[0]).toMatchObject({
      code: 'WEAVER_ANALYZE_UNKNOWN_SAMPLE_ELEMENT_NAME',
      suggestions: [{
        kind: 'fix',
        label: 'did you mean "inv:product"?',
        replacement: 'inv:product',
      }],
    });
  });

  it('does not suggest unprefixed names from a different element namespace bucket', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:value-of select="/root/prodcut"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sampleDocument = '<root xmlns="urn:catalog"><product>ok</product></root>';

    const artifacts = compileStylesheetArtifacts(stylesheet, {
      path: 'sample-default-namespace-mismatch.xsl',
      sampleDocument,
    });

    expect(artifacts.diagnostics).toEqual([]);
  });

  it('uses xpath-default-namespace for unprefixed element name suggestions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xpath-default-namespace="urn:catalog">',
      '  <xsl:template match="/">',
      '    <xsl:value-of select="/catalog/prodcut"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sampleDocument = '<catalog xmlns="urn:catalog"><product>ok</product></catalog>';

    const artifacts = compileStylesheetArtifacts(stylesheet, {
      path: 'sample-default-namespace-typo.xsl',
      sampleDocument,
    });

    expect(artifacts.diagnostics).toHaveLength(1);
    expect(artifacts.diagnostics[0]).toMatchObject({
      code: 'WEAVER_ANALYZE_UNKNOWN_SAMPLE_ELEMENT_NAME',
      suggestions: [{
        kind: 'fix',
        label: 'did you mean "product"?',
        replacement: 'product',
      }],
    });
  });
});