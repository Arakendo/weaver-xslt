import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

export interface BundleJsOptions {
  readonly jsModule: string;
  readonly sourcePath?: string;
}

export interface BundleJsResult {
  readonly js: string;
  readonly sourceMap: string;
}

export function bundleJs(options: BundleJsOptions): BundleJsResult {
  const { buildSync } = require('esbuild') as typeof import('esbuild');
  const sourcePath = options.sourcePath ?? 'stylesheet';
  // Prefer the built JS runtime when invoking from a packaging or single-repo layout.
  // Using .js avoids esbuild alias resolution pointing at non-existent .ts files in dist.
  const runtimeSourcePath = resolve(import.meta.dirname, '../runtime/index.js');
  const bundleOutputPath = `${sourcePath}.bundle.js`;

  const result = buildSync({
    stdin: {
      contents: options.jsModule,
      sourcefile: `${sourcePath}.js`,
      resolveDir: process.cwd(),
      loader: 'js',
    },
    bundle: true,
    outfile: bundleOutputPath,
    format: 'esm',
    platform: 'node',
    target: ['es2022'],
    external: ['node:*'],
    sourcemap: 'external',
    write: false,
    alias: {
      '@arakendo/weaver-xslt/runtime': runtimeSourcePath,
    },
    conditions: ['import', 'module', 'default'],
    mainFields: ['module', 'import', 'main'],
  });

  if (result.errors.length > 0) {
    const errorText = result.errors.map((error) => error.text).join('\n');
    throw new Error(`Bundle emission failed: ${errorText}`);
  }

  const outputFiles = result.outputFiles ?? [];
  const js = outputFiles.find((file) => file.path.endsWith('.js'))?.text ?? '';
  const sourceMap = outputFiles.find((file) => file.path.endsWith('.js.map'))?.text ?? '';

  return { js, sourceMap };
}
