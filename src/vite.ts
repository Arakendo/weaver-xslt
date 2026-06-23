import { compileStylesheetArtifactsFromFile } from './compile.js';

export interface WeaverVitePluginOptions {
  readonly runtimeModuleSpecifier?: string;
  readonly sampleDocumentPath?: string;
  readonly onProgress?: (message: string) => void;
}

export interface ViteTransformResult {
  readonly code: string;
  readonly map: Record<string, unknown>;
}

export interface ViteLikePlugin {
  readonly name: string;
  readonly enforce?: 'pre' | 'post';
  load?(id: string): ViteTransformResult | null | Promise<ViteTransformResult | null>;
  transform?(
    code: string,
    id: string,
  ): ViteTransformResult | null | Promise<ViteTransformResult | null>;
}

export function weaverVitePlugin(options: WeaverVitePluginOptions = {}): ViteLikePlugin {
  const compileStylesheetModule = (id: string): ViteTransformResult | null => {
    const stylesheetPath = toStylesheetPath(id);
    if (stylesheetPath === undefined) {
      return null;
    }

    const artifacts = compileStylesheetArtifactsFromFile(stylesheetPath, options);
    const sourceMap = JSON.parse(artifacts.sourceMap) as Record<string, unknown>;
    return {
      code: appendInlineSourceMap(stripTypeScriptForVite(artifacts.module), artifacts.sourceMap),
      map: sourceMap,
    };
  };

  return {
    name: 'weaver-xslt',
    enforce: 'pre',
    load(id) {
      return compileStylesheetModule(id);
    },
    transform(_code, id) {
      return compileStylesheetModule(id);
    },
  };
}

function toStylesheetPath(id: string): string | undefined {
  const queryStart = id.indexOf('?');
  const path = queryStart >= 0 ? id.slice(0, queryStart) : id;

  return path.endsWith('.xsl') ? path : undefined;
}

function stripTypeScriptForVite(moduleSource: string): string {
  return moduleSource
    .split('\n')
    .map((line) => {
      if (line.startsWith('import type ')) {
        return '// type-only import elided for Vite';
      }

      if (line.startsWith('export const source = ')) {
        return line.replace(' as const;', ';');
      }

      if (line.startsWith('export function transform(')) {
        return line.replace(
          'export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {',
          'export function transform(sourceXml, ctx = {}) {',
        );
      }

      if (line.startsWith('//# sourceMappingURL=')) {
        return '// source map inlined for Vite';
      }

      return line;
    })
    .join('\n');
}

function appendInlineSourceMap(moduleSource: string, sourceMap: string): string {
  const encodedSourceMap = Buffer.from(sourceMap, 'utf8').toString('base64');
  return `${moduleSource}\n//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}`;
}
