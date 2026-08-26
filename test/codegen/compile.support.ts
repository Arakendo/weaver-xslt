import { readFileSync, writeFileSync } from 'node:fs';

import { expect } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';
import { XsltProcessor } from '../../src/index.js';
import type { TransformOptions } from '../../src/processor/types.js';
import { compileAndLoadGeneratedModule } from './generated-module.support.js';

export { compileAndLoadGeneratedModule } from './generated-module.support.js';
export const NATIVE_DIRECT_PARITY_TAG = '[native-direct]';

export function expectGeneratedFixtureToMatch(stylesheet: string, path: string): void {
  const emitted = compileStylesheetToTs(stylesheet, { path });
  const fixtureUrl = new URL(`../generated-fixtures/${path}.ts`, import.meta.url);

  if (process.env.WEAVER_UPDATE_GENERATED_FIXTURES === '1') {
    writeFileSync(fixtureUrl, `${emitted.trimEnd()}\n`, 'utf8');
    return;
  }

  const fixture = readFileSync(fixtureUrl, 'utf8').replaceAll('\r\n', '\n');

  expect(emitted.trimEnd()).toBe(fixture.trimEnd());
}

export function expectRuntimeModuleToMatchInterpreter(
  stylesheet: string,
  path: string,
  sourceXml: string,
): void {
  const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, path);

  expect(diagnostics).toEqual([]);

  const generatedModule = exports as {
    readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
  };
  const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

  expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
}

export function expectNativeRuntimeParity(
  stylesheet: string,
  path: string,
  sourceXml: string,
  options: Omit<TransformOptions, 'execution'> = {},
): void {
  const { diagnostics, exports } = compileAndLoadGeneratedModule(stylesheet, path);

  expect(diagnostics).toEqual([]);

  const generatedModule = exports as {
    readonly transform: (
      source: string,
      ctx?: Omit<TransformOptions, 'execution'>,
    ) => ReturnType<XsltProcessor['transform']>;
  };
  const processor = new XsltProcessor(stylesheet);
  const interpreterResult = processor.transform(sourceXml, options);

  expect(
    processor.transform(sourceXml, {
      ...options,
      execution: 'native',
    }),
  ).toEqual({
    ...interpreterResult,
    execution: {
      requested: 'native',
      resolved: 'native',
    },
  });
  expect(generatedModule.transform(sourceXml, options)).toEqual(interpreterResult);
}
