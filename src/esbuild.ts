import { dirname } from 'node:path';

import { compileStylesheetArtifactsFromFile } from './compile.js';

export interface WeaverEsbuildPluginOptions {
  readonly runtimeModuleSpecifier?: string;
  readonly sampleDocumentPath?: string;
  readonly onProgress?: (message: string) => void;
}

export interface EsbuildLoadArgs {
  readonly path: string;
}

export interface EsbuildLoadResult {
  readonly contents: string;
  readonly loader: 'ts';
  readonly resolveDir: string;
  readonly watchFiles?: readonly string[];
}

export interface EsbuildPluginBuild {
  onLoad(
    options: { readonly filter: RegExp },
    callback: (
      args: EsbuildLoadArgs,
    ) => EsbuildLoadResult | null | Promise<EsbuildLoadResult | null>,
  ): void;
}

export interface EsbuildLikePlugin {
  readonly name: string;
  setup(build: EsbuildPluginBuild): void;
}

export function weaverEsbuildPlugin(options: WeaverEsbuildPluginOptions = {}): EsbuildLikePlugin {
  return {
    name: 'weaver-xslt',
    setup(build) {
      build.onLoad({ filter: /\.xsl$/ }, (args) => {
        const artifacts = compileStylesheetArtifactsFromFile(args.path, options);
        const watchFiles =
          options.sampleDocumentPath === undefined
            ? [args.path]
            : [args.path, options.sampleDocumentPath];

        return {
          contents: artifacts.module,
          loader: 'ts',
          resolveDir: dirname(args.path),
          watchFiles,
        };
      });
    },
  };
}
