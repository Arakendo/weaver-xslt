import { describe, expect, it } from 'vitest';

import { compileStylesheetArtifacts } from '../../src/compile.js';

const MULTI_LINE_STYLESHEET = [
  '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
  '  <xsl:template match="/">',
  '    <items>',
  '      <xsl:apply-templates select="/root/item"/>',
  '    </items>',
  '  </xsl:template>',
  '  <xsl:template match="item">',
  '    <item><xsl:value-of select="name"/></item>',
  '  </xsl:template>',
  '</xsl:stylesheet>',
].join('\n');

const CONTROL_FLOW_STYLESHEET = [
  '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
  '  <xsl:template match="/">',
  '    <out>',
  '      <xsl:if test="/root/enabled">',
  '        <flag>yes</flag>',
  '      </xsl:if>',
  '      <xsl:for-each select="/root/item">',
  '        <entry><xsl:value-of select="."/></entry>',
  '      </xsl:for-each>',
  '      <xsl:call-template name="tail"/>',
  '    </out>',
  '  </xsl:template>',
  '  <xsl:template name="tail">',
  '    <tail>done</tail>',
  '  </xsl:template>',
  '</xsl:stylesheet>',
].join('\n');

const CHOOSE_STYLESHEET = [
  '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
  '  <xsl:template match="/">',
  '    <out>',
  '      <xsl:choose>',
  '        <xsl:when test="/root/enabled">',
  '          <flag>yes</flag>',
  '        </xsl:when>',
  '        <xsl:otherwise>',
  '          <flag>no</flag>',
  '        </xsl:otherwise>',
  '      </xsl:choose>',
  '    </out>',
  '  </xsl:template>',
  '</xsl:stylesheet>',
].join('\n');

const STATIC_OUTPUT_STYLESHEET = [
  '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
  '  <xsl:template match="/">',
  '    <card>',
  '      <xsl:comment>note</xsl:comment>',
  '      <title>Hello</title>',
  '    </card>',
  '  </xsl:template>',
  '</xsl:stylesheet>',
].join('\n');

describe('codegen source maps', () => {
  it('anchors emitted template regions to executable template lines', () => {
    const artifacts = compileStylesheetArtifacts(MULTI_LINE_STYLESHEET, { path: 'anchored-source-map.xsl' });
    const moduleLines = artifacts.module.trimEnd().split('\n');
    const sourceMap = JSON.parse(artifacts.sourceMap) as {
      readonly file: string;
      readonly sources: readonly string[];
      readonly sourcesContent: readonly string[];
      readonly mappings: string;
    };
    const decodedMappings = decodeSourceLineMappings(sourceMap.mappings);
    const rootTemplateCommentLine = moduleLines.findIndex((line) => line.includes('/** match="/" (anchored-source-map.xsl:2) */'));
    const itemTemplateCommentLine = moduleLines.findIndex((line) => line.includes('/** match="item" (anchored-source-map.xsl:7) */'));
    const rootTemplateExecutableLine = findNextExecutableLineIndex(moduleLines, rootTemplateCommentLine);
    const itemTemplateExecutableLine = findNextExecutableLineIndex(moduleLines, itemTemplateCommentLine);

    expect(sourceMap.file).toBe('anchored-source-map.xsl.ts');
    expect(sourceMap.sources).toEqual(['anchored-source-map.xsl']);
    expect(sourceMap.sourcesContent).toEqual([MULTI_LINE_STYLESHEET]);
    expect(artifacts.module).toContain('//# sourceMappingURL=anchored-source-map.xsl.map');
    expect(rootTemplateCommentLine).toBeGreaterThanOrEqual(0);
    expect(itemTemplateCommentLine).toBeGreaterThan(rootTemplateCommentLine);
    expect(rootTemplateExecutableLine).toBeGreaterThan(rootTemplateCommentLine);
    expect(itemTemplateExecutableLine).toBeGreaterThan(itemTemplateCommentLine);
    expect(decodedMappings[rootTemplateExecutableLine]).toBe(1);
    expect(decodedMappings[itemTemplateExecutableLine]).toBe(6);
  });

  it('anchors generated instruction expressions to the original instruction lines', () => {
    const artifacts = compileStylesheetArtifacts(MULTI_LINE_STYLESHEET, { path: 'anchored-source-map.xsl' });
    const moduleLines = artifacts.module.trimEnd().split('\n');
    const sourceMap = JSON.parse(artifacts.sourceMap) as { readonly mappings: string };
    const decodedMappings = decodeSourceLineMappings(sourceMap.mappings);
    const applyTemplatesCommentLine = moduleLines.findIndex((line) => line.includes('/** xsl:apply-templates (anchored-source-map.xsl:4) */'));
    const valueOfCommentLine = moduleLines.findIndex((line) => line.includes('/** xsl:value-of (anchored-source-map.xsl:8) */'));
    const applyTemplatesExecutableLine = findNextExecutableLineIndex(moduleLines, applyTemplatesCommentLine);
    const valueOfExecutableLine = findNextExecutableLineIndex(moduleLines, valueOfCommentLine);

    expect(applyTemplatesCommentLine).toBeGreaterThanOrEqual(0);
    expect(valueOfCommentLine).toBeGreaterThan(applyTemplatesCommentLine);
    expect(applyTemplatesExecutableLine).toBeGreaterThan(applyTemplatesCommentLine);
    expect(valueOfExecutableLine).toBeGreaterThan(valueOfCommentLine);
    expect(decodedMappings[applyTemplatesExecutableLine]).toBe(3);
    expect(decodedMappings[valueOfExecutableLine]).toBe(7);
  });

  it('anchors if, for-each, and call-template executable lines to their original instruction lines', () => {
    const artifacts = compileStylesheetArtifacts(CONTROL_FLOW_STYLESHEET, { path: 'control-flow-source-map.xsl' });
    const moduleLines = artifacts.module.trimEnd().split('\n');
    const sourceMap = JSON.parse(artifacts.sourceMap) as { readonly mappings: string };
    const decodedMappings = decodeSourceLineMappings(sourceMap.mappings);
    const ifCommentLine = moduleLines.findIndex((line) => line.includes('/** xsl:if (control-flow-source-map.xsl:4) */'));
    const forEachCommentLine = moduleLines.findIndex((line) => line.includes('/** xsl:for-each (control-flow-source-map.xsl:7) */'));
    const callTemplateCommentLine = moduleLines.findIndex((line) => line.includes('/** xsl:call-template (control-flow-source-map.xsl:10) */'));
    const ifExecutableLine = findNextExecutableLineIndex(moduleLines, ifCommentLine);
    const forEachExecutableLine = findNextExecutableLineIndex(moduleLines, forEachCommentLine);
    const callTemplateExecutableLine = findNextExecutableLineIndex(moduleLines, callTemplateCommentLine);

    expect(ifCommentLine).toBeGreaterThanOrEqual(0);
    expect(forEachCommentLine).toBeGreaterThan(ifCommentLine);
    expect(callTemplateCommentLine).toBeGreaterThan(forEachCommentLine);
    expect(decodedMappings[ifExecutableLine]).toBe(3);
    expect(decodedMappings[forEachExecutableLine]).toBe(6);
    expect(decodedMappings[callTemplateExecutableLine]).toBe(9);
  });

  it('anchors choose, when, and otherwise executable lines to their original instruction lines', () => {
    const artifacts = compileStylesheetArtifacts(CHOOSE_STYLESHEET, { path: 'choose-source-map.xsl' });
    const moduleLines = artifacts.module.trimEnd().split('\n');
    const sourceMap = JSON.parse(artifacts.sourceMap) as { readonly mappings: string };
    const decodedMappings = decodeSourceLineMappings(sourceMap.mappings);
    const chooseCommentLine = moduleLines.findIndex((line) => line.includes('/** xsl:choose (choose-source-map.xsl:4) */'));
    const whenCommentLine = moduleLines.findIndex((line) => line.includes('/** xsl:when (choose-source-map.xsl:5) */'));
    const otherwiseCommentLine = moduleLines.findIndex((line) => line.includes('/** xsl:otherwise (choose-source-map.xsl:8) */'));
    const chooseExecutableLine = findNextExecutableLineIndex(moduleLines, chooseCommentLine);
    const whenExecutableLine = findNextExecutableLineIndex(moduleLines, whenCommentLine);
    const otherwiseExecutableLine = findNextExecutableLineIndex(moduleLines, otherwiseCommentLine);

    expect(chooseCommentLine).toBeGreaterThanOrEqual(0);
    expect(whenCommentLine).toBeGreaterThan(chooseCommentLine);
    expect(otherwiseCommentLine).toBeGreaterThan(whenCommentLine);
    expect(decodedMappings[chooseExecutableLine]).toBe(3);
    expect(decodedMappings[whenExecutableLine]).toBe(4);
    expect(decodedMappings[otherwiseExecutableLine]).toBe(7);
  });

  it('anchors literal elements and xsl:comment executable lines to their original instruction lines', () => {
    const artifacts = compileStylesheetArtifacts(STATIC_OUTPUT_STYLESHEET, { path: 'static-output-source-map.xsl' });
    const moduleLines = artifacts.module.trimEnd().split('\n');
    const sourceMap = JSON.parse(artifacts.sourceMap) as { readonly mappings: string };
    const decodedMappings = decodeSourceLineMappings(sourceMap.mappings);
    const cardCommentLine = moduleLines.findIndex((line) => line.includes('/** literal card (static-output-source-map.xsl:3) */'));
    const commentCommentLine = moduleLines.findIndex((line) => line.includes('/** xsl:comment (static-output-source-map.xsl:4) */'));
    const titleCommentLine = moduleLines.findIndex((line) => line.includes('/** literal title (static-output-source-map.xsl:5) */'));
    const cardExecutableLine = findNextExecutableLineIndex(moduleLines, cardCommentLine);
    const commentExecutableLine = findNextExecutableLineIndex(moduleLines, commentCommentLine);
    const titleExecutableLine = findNextExecutableLineIndex(moduleLines, titleCommentLine);

    expect(cardCommentLine).toBeGreaterThanOrEqual(0);
    expect(commentCommentLine).toBeGreaterThan(cardCommentLine);
    expect(titleCommentLine).toBeGreaterThan(commentCommentLine);
    expect(decodedMappings[cardExecutableLine]).toBe(2);
    expect(decodedMappings[commentExecutableLine]).toBe(3);
    expect(decodedMappings[titleExecutableLine]).toBe(4);
  });
});

function findNextExecutableLineIndex(moduleLines: readonly string[], startIndex: number): number {
  for (let index = startIndex + 1; index < moduleLines.length; index += 1) {
    const trimmedLine = moduleLines[index]?.trim() ?? '';
    if (trimmedLine.length === 0) {
      continue;
    }

    if (trimmedLine.startsWith('/** ') && trimmedLine.endsWith(' */')) {
      continue;
    }

    return index;
  }

  throw new Error(`No executable line found after module line ${startIndex + 1}.`);
}

function decodeSourceLineMappings(mappings: string): number[] {
  const decodedLines: number[] = [];
  let previousSourceLine = 0;

  for (const encodedLine of mappings.split(';')) {
    if (encodedLine.length === 0) {
      decodedLines.push(previousSourceLine);
      continue;
    }

    let offset = 0;
    offset = decodeVlq(encodedLine, offset).nextOffset;
    offset = decodeVlq(encodedLine, offset).nextOffset;
    const decodedSourceLine = decodeVlq(encodedLine, offset);
    previousSourceLine += decodedSourceLine.value;
    decodedLines.push(previousSourceLine);
  }

  return decodedLines;
}

function decodeVlq(text: string, startOffset: number): { readonly value: number; readonly nextOffset: number } {
  let offset = startOffset;
  let shift = 0;
  let value = 0;

  while (true) {
    const character = text[offset];
    if (character === undefined) {
      throw new Error('Unexpected end of VLQ segment.');
    }

    const digit = BASE64_VLQ_DIGITS.indexOf(character);
    if (digit < 0) {
      throw new Error(`Invalid base64 VLQ digit: ${character}`);
    }

    offset += 1;
    value |= (digit & 31) << shift;
    if ((digit & 32) === 0) {
      const isNegative = (value & 1) === 1;
      return {
        value: isNegative ? -(value >> 1) : value >> 1,
        nextOffset: offset,
      };
    }

    shift += 5;
  }
}

const BASE64_VLQ_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';