import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';

import ts from 'typescript';

/**
 * Transpile a generated TypeScript stylesheet module to ESM JavaScript.
 *
 * This function reads the already-produced TS module string and transforms it
 * into a standalone JavaScript file that preserves the stable renderer contract:
 * - `source: { path: string; digest: string }`
 * - `transform(xml: string, ctx?: TransformContext): TransformResult`
 *
 * @param tsModule - The generated TypeScript module string from compileStylesheetArtifacts
 * @param options - Transpilation options
 * @returns The transpiled ESM JavaScript string with source map
 */
export function transpileTsToJs(
  tsModule: string,
  options?: {
    /** Source file path for source map generation (optional) */
    sourcePath?: string;
  },
): { js: string; sourceMap: string } {
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    sourceMap: false, // We generate our own source map below
    inlineSources: false,
  };

  const transpilationResult = ts.transpileModule(tsModule, {
    compilerOptions,
    reportDiagnostics: false,
    fileName: options?.sourcePath ? `${options.sourcePath}.ts` : 'stylesheet.ts',
  });

  // Generate a proper source map by combining the TS source with the transpiled output
  const sourceMap = generateSourceMap(tsModule, transpilationResult);

  return {
    js: transpilationResult.outputText,
    sourceMap,
  };
}

/**
 * Encode a value as VLQ (Variable Length Quantity) per source map spec.
 */
function encodeVlq(value: number): string {
  let remaining = value < 0 ? (-value << 1) + 1 : value << 1;
  let encoded = '';

  do {
    let digit = remaining & 31;
    remaining >>>= 5;
    if (remaining > 0) {
      digit |= 32;
    }
    encoded += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.charAt(digit);
  } while (remaining > 0);

  return encoded;
}

/**
 * Generate a source map that maps the transpiled JS back to the original TS source.
 */
function generateSourceMap(tsSource: string, transpilationResult: ts.TranspileOutput): string {
  // Use the generated source map from TypeScript if available, otherwise create a minimal one
  if (transpilationResult.sourceMapText) {
    return transpilationResult.sourceMapText;
  }

  // Fallback: generate a minimal source map that maps each line to itself
  const lines = tsSource.split('\n');
  const mappings: string[] = [];
  let previousSourceLine = 0;

  for (let i = 0; i < lines.length; i++) {
    // Each generated line maps to column 0 of the same line in the source file
    const sourceLineDelta = i - previousSourceLine;
    mappings.push(`${encodeVlq(0)}${encodeVlq(0)}${encodeVlq(sourceLineDelta)}${encodeVlq(0)}`);
    previousSourceLine = i;
  }

  const sourceMapData = {
    version: 3,
    file: 'stylesheet.js',
    sources: ['stylesheet.ts'],
    sourcesContent: [tsSource],
    names: [],
    mappings: mappings.join(';'),
  };

  return JSON.stringify(sourceMapData);
}

/**
 * Write a JS artifact to the file system.
 *
 * @param jsContent - The transpiled JavaScript content
 * @param sourceMapContent - The source map content
 * @param outputPath - The base output path (without extension)
 * @returns The paths of the written files
 */
export function writeJsArtifact(
  jsContent: string,
  sourceMapContent: string,
  outputPath: string,
): { jsPath: string; sourceMapPath: string } {
  const jsPath = `${outputPath}.js`;
  const sourceMapPath = `${outputPath}.js.map`;

  // Write the JS file with a source map reference comment
  const sourceMappingURL = basename(sourceMapPath);
  const jsWithSourceMapRef = `${jsContent}\n//# sourceMappingURL=${sourceMappingURL}\n`;

  writeFileSync(jsPath, jsWithSourceMapRef, 'utf8');
  writeFileSync(sourceMapPath, sourceMapContent, 'utf8');

  return { jsPath, sourceMapPath };
}
