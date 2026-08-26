import ts from 'typescript';

import {
  appendCoverageWarnings,
  appendTraceSummary,
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  createTemporaryTreeNode,
  escapeText,
  getRecordedTracePause,
  getRecordedTraceSummary,
  localNameOfNode,
  matchesTemplatePath,
  nameOfNode,
  normalizeNativeTemplateName,
  prependNativeGlobalBindingError,
  prependNativeInitialTemplateError,
  resetRecordedTracePause,
  resetRecordedTraceSummary,
  selectDescendantElementsByName,
  selectDocumentDataValueNode,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodes,
  selectSimplePathNodesByStepPlan,
  selectSimplePathText,
  stringValueOfNativeValue,
  stringValueOfNode,
  throwCircularNativeGlobalBinding,
  throwMissingNativeInitialTemplate,
  throwMissingNativeStylesheetParameter,
  throwMissingNativeTemplateParameter,
  throwUnsupportedNativeInitialMode,
  traceFocusEnter,
  traceSelectedNodes,
  traceStringValueOfNode,
  traceTemplateEnter,
  transformCompiledStylesheet,
} from '../../src/runtime/index.js';
import { compileStylesheetToTs } from '../../src/compile.js';

const GENERATED_RUNTIME_MODULE_SPECIFIER = '@runtime-test';
const GENERATED_RUNTIME_MODULE = {
  appendCoverageWarnings,
  appendTraceSummary,
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  createTemporaryTreeNode,
  escapeText,
  localNameOfNode,
  matchesTemplatePath,
  nameOfNode,
  normalizeNativeTemplateName,
  selectDescendantElementsByName,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodesByStepPlan,
  selectSimplePathNodes,
  selectSimplePathText,
  stringValueOfNativeValue,
  stringValueOfNode,
  getRecordedTracePause,
  getRecordedTraceSummary,
  resetRecordedTracePause,
  resetRecordedTraceSummary,
  selectDocumentDataValueNode,
  traceFocusEnter,
  traceSelectedNodes,
  traceStringValueOfNode,
  traceTemplateEnter,
  prependNativeGlobalBindingError,
  prependNativeInitialTemplateError,
  throwCircularNativeGlobalBinding,
  throwMissingNativeInitialTemplate,
  throwMissingNativeStylesheetParameter,
  throwMissingNativeTemplateParameter,
  throwUnsupportedNativeInitialMode,
  transformCompiledStylesheet,
};

export function compileAndLoadGeneratedModule(
  stylesheet: string,
  path: string,
  filePath?: string,
): {
  readonly diagnostics: readonly ts.Diagnostic[];
  readonly exports: Record<string, unknown>;
} {
  const emitted = compileStylesheetToTs(stylesheet, {
    path,
    ...(filePath === undefined ? {} : { filePath }),
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
