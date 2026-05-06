import { readFileSync } from 'node:fs';

import ts from 'typescript';
import { expect } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';
import { XsltProcessor } from '../../src/index.js';
import type { TransformOptions } from '../../src/processor/types.js';
import {
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  escapeText,
  localNameOfNode,
  nameOfNode,
  selectDescendantElementsByName,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodes,
  selectSimplePathText,
  stringValueOfNode,
  prependNativeGlobalBindingError,
  throwCircularNativeGlobalBinding,
  transformCompiledStylesheet,
} from '../../src/runtime/index.js';

const GENERATED_RUNTIME_MODULE_SPECIFIER = '@runtime-test';
const GENERATED_RUNTIME_MODULE = {
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  escapeText,
  localNameOfNode,
  nameOfNode,
  selectDescendantElementsByName,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodes,
  selectSimplePathText,
  stringValueOfNode,
  prependNativeGlobalBindingError,
  throwCircularNativeGlobalBinding,
  transformCompiledStylesheet,
};

export function compileAndLoadGeneratedModule(stylesheet: string, path: string): {
  readonly diagnostics: readonly ts.Diagnostic[];
  readonly exports: Record<string, unknown>;
} {
  const emitted = compileStylesheetToTs(stylesheet, {
    path,
    runtimeModuleSpecifier: GENERATED_RUNTIME_MODULE_SPECIFIER,
  });
  const transpiled = ts.transpileModule(emitted, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  const module = { exports: {} as Record<string, unknown> };
  const localRequire = (specifier: string) => {
    if (specifier === GENERATED_RUNTIME_MODULE_SPECIFIER) {
      return GENERATED_RUNTIME_MODULE;
    }

    throw new Error(`Unexpected generated-module import: ${specifier}`);
  };
  const executeModule = new Function('require', 'module', 'exports', transpiled.outputText) as (
    requireImpl: (specifier: string) => unknown,
    localModule: { exports: Record<string, unknown> },
    localExports: Record<string, unknown>,
  ) => void;

  executeModule(localRequire, module, module.exports);

  return {
    diagnostics: transpiled.diagnostics ?? [],
    exports: module.exports,
  };
}

export function expectGeneratedFixtureToMatch(stylesheet: string, path: string): void {
  const emitted = compileStylesheetToTs(stylesheet, { path });
  const fixture = readFileSync(new URL(`../generated-fixtures/${path}.ts`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');

  expect(emitted.trimEnd()).toBe(fixture.trimEnd());
}

export function expectRuntimeModuleToMatchInterpreter(stylesheet: string, path: string, sourceXml: string): void {
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
    readonly transform: (source: string, ctx?: Omit<TransformOptions, 'execution'>) => ReturnType<XsltProcessor['transform']>;
  };
  const processor = new XsltProcessor(stylesheet);
  const interpreterResult = processor.transform(sourceXml, options);

  expect(processor.transform(sourceXml, {
    ...options,
    execution: 'native',
  })).toEqual({
    ...interpreterResult,
    execution: {
      requested: 'native',
      resolved: 'native',
    },
  });
  expect(generatedModule.transform(sourceXml, options)).toEqual(interpreterResult);
}
