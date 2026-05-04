import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { XsltProcessor, type TransformOptions } from '../../src/index.js';

import { compileAndLoadGeneratedModule } from './compile.support.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = join(__dirname, '..', 'golden');

interface GoldenCase {
  readonly name: string;
  readonly dir: string;
}

function discoverCases(): readonly GoldenCase[] {
  if (!existsSync(GOLDEN_DIR)) {
    return [];
  }

  return readdirSync(GOLDEN_DIR)
    .filter((name) => {
      const full = join(GOLDEN_DIR, name);
      return statSync(full).isDirectory() && existsSync(join(full, 'stylesheet.xsl'));
    })
    .map((name) => ({ name, dir: join(GOLDEN_DIR, name) }));
}

function readOptions(dir: string): TransformOptions {
  const path = join(dir, 'options.json');
  if (!existsSync(path)) {
    return {};
  }

  return JSON.parse(readFileSync(path, 'utf8')) as TransformOptions;
}

function normalizeXml(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

const cases = discoverCases();

describe('codegen golden runtime parity', () => {
  if (cases.length === 0) {
    it.skip('no golden cases yet', () => {
      // Add a folder under test/golden/ with stylesheet.xsl, input.xml, expected.xml.
    });
    return;
  }

  for (const goldenCase of cases) {
    it(goldenCase.name, () => {
      const stylesheet = readFileSync(join(goldenCase.dir, 'stylesheet.xsl'), 'utf8');
      const input = readFileSync(join(goldenCase.dir, 'input.xml'), 'utf8');
      const expected = readFileSync(join(goldenCase.dir, 'expected.xml'), 'utf8');
      const options = readOptions(goldenCase.dir);
      const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, `golden-${goldenCase.name}.xsl`);

      expect(diagnostics).toEqual([]);

      const generatedModule = exports as {
        readonly transform: (source: string, context?: TransformOptions) => ReturnType<XsltProcessor['transform']>;
      };
      const interpreterResult = new XsltProcessor(stylesheet).transform(input, options);
      const generatedResult = generatedModule.transform(input, options);

      expect(normalizeXml(generatedResult.output)).toBe(normalizeXml(expected));
      expect(normalizeXml(generatedResult.output)).toBe(normalizeXml(interpreterResult.output));
      expect(generatedResult.secondaryOutputs ?? {}).toEqual(interpreterResult.secondaryOutputs ?? {});
    });
  }
});