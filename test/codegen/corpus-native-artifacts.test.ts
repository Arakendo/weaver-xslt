import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { compileStylesheetArtifacts } from '../../src/compile.js';
import { loadXslt30Overlay } from '../conformance/xslt30/overlay.js';
import { decodeSourceLineMappings, findNextExecutableLineIndex } from './source-map.support.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const PROFILE_PATH = join(
  REPO_ROOT,
  'corpus',
  'overlays',
  'xslt30',
  'weaver-template-path-native-parity-v1.json',
);
const profile = loadXslt30Overlay(PROFILE_PATH);
const selectedCase = profile.cases.find((testCase) => testCase.selection === 'selected');

describe('corpus-linked native artifacts', () => {
  it('keeps template-006 readable and source-mapped under its suite-native identity', () => {
    expect(selectedCase).toMatchObject({
      setFile: 'tests/decl/template/_template-test-set.xml',
      caseName: 'template-006',
    });

    const sourcePath = join(
      dirname(selectedCase!.setFile),
      `${selectedCase!.caseName}.xsl`,
    ).replaceAll('\\', '/');
    const artifactFileName = `${selectedCase!.caseName}.xsl`;
    const stylesheet = readFileSync(join(REPO_ROOT, 'vendor', 'xslt30-test', sourcePath), 'utf8');
    const artifacts = compileStylesheetArtifacts(stylesheet, { path: sourcePath });
    const moduleLines = artifacts.module.trimEnd().split('\n');
    const sourceMap = JSON.parse(artifacts.sourceMap) as {
      readonly file: string;
      readonly sources: readonly string[];
      readonly sourcesContent: readonly string[];
      readonly mappings: string;
    };
    const decodedMappings = decodeSourceLineMappings(sourceMap.mappings);
    const templateComment = `/** match="/" (${sourcePath}:4) */`;
    const literalComment = `/** literal o (${sourcePath}:4) */`;
    const templateCommentLine = moduleLines.findIndex((line) => line.includes(templateComment));
    const literalCommentLine = moduleLines.findIndex((line) => line.includes(literalComment));
    const templateExecutableLine = findNextExecutableLineIndex(moduleLines, templateCommentLine);
    const literalExecutableLine = findNextExecutableLineIndex(moduleLines, literalCommentLine);

    expect(artifacts.diagnostics).toEqual([]);
    expect(artifacts.module).toContain('from "@arakendo/weaver-xslt/runtime";');
    expect(artifacts.module).not.toContain('from "@arakendo/weaver-xslt/compile";');
    expect(artifacts.module).not.toContain('transformCompiledStylesheet(');
    expect(artifacts.module).toContain(
      `export const source = { path: ${JSON.stringify(sourcePath)}, digest:`,
    );
    expect(artifacts.module).toContain('export function transform(');
    expect(artifacts.module).toContain('return "<o" + "" + ">" + body + "</o>";');
    expect(artifacts.module).toContain(`//# sourceMappingURL=${artifactFileName}.map`);

    expect(sourceMap.file).toBe(`${artifactFileName}.ts`);
    expect(sourceMap.sources).toEqual([artifactFileName]);
    expect(sourceMap.sourcesContent).toEqual([stylesheet]);
    expect(templateCommentLine).toBeGreaterThanOrEqual(0);
    expect(literalCommentLine).toBeGreaterThan(templateCommentLine);
    expect(decodedMappings[templateExecutableLine]).toBe(3);
    expect(decodedMappings[literalExecutableLine]).toBe(3);
  });
});
