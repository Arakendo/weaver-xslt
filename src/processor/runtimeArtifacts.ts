import { sortDiagnostics, type DiagnosticReport } from '../diagnostics/index.js';
import type { ExtensionFunctionCatalog } from '../xslt/compile/extensionFunctions.js';
import { analyzeStylesheet } from '../xslt/compile/analyze.js';
import { compileStylesheet } from '../xslt/compile/compiler.js';
import { emitStylesheetDeclarationModule, emitStylesheetModule } from '../xslt/codegen/emit.js';

export interface CompileStylesheetRuntimeArtifactsOptions {
  readonly path?: string;
  readonly filePath?: string;
  readonly sourceName?: string;
  readonly runtimeModuleSpecifier?: string;
  readonly sampleDocument?: string;
  readonly extensionFunctions?: ExtensionFunctionCatalog;
}

export interface CompileStylesheetArtifacts {
  readonly module: string;
  readonly declaration: string;
  readonly digest: string;
  readonly sourceMap: string;
  readonly diagnostics: readonly DiagnosticReport[];
}

export interface CompileStylesheetRuntimeArtifacts extends CompileStylesheetArtifacts {
  readonly ir: ReturnType<typeof compileStylesheet>;
}

export function compileStylesheetRuntimeArtifacts(
  stylesheetSource: string,
  options: CompileStylesheetRuntimeArtifactsOptions = {},
): CompileStylesheetRuntimeArtifacts {
  const digest = createStylesheetDigest(stylesheetSource);
  const sourcePath = options.filePath ?? options.path ?? '<stylesheet>';
  const ir = compileStylesheet(stylesheetSource, {
    ...(options.sourceName === undefined && options.path === undefined
      ? {}
      : { sourceName: options.sourceName ?? options.path }),
    ...(options.extensionFunctions === undefined
      ? {}
      : { extensionFunctions: options.extensionFunctions }),
  });
  const emitOptions = {
    digest,
    ...(options.filePath === undefined
      ? options.path === undefined
        ? {}
        : { path: options.path }
      : { filePath: options.filePath }),
    ...(options.runtimeModuleSpecifier === undefined
      ? {}
      : { runtimeModuleSpecifier: options.runtimeModuleSpecifier }),
  };
  const emittedModule = emitStylesheetModule(ir, emitOptions);
  const sourceBaseName = fileBasename(sourcePath);
  const module = appendSourceMappingUrl(emittedModule, `${sourceBaseName}.map`);
  const diagnostics = sortDiagnostics(
    analyzeStylesheet(ir, {
      ...(options.sampleDocument === undefined ? {} : { sampleDocument: options.sampleDocument }),
    }),
  );

  return {
    ir,
    module,
    declaration: emitStylesheetDeclarationModule(ir, emitOptions),
    digest,
    sourceMap: createStylesheetSourceMap(module, stylesheetSource, sourceBaseName),
    diagnostics,
  };
}

export function createStylesheetDigest(source: string): string {
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function fileBasename(path: string): string {
  const normalizedPath = path.replace(/\\/g, '/');
  const slashIndex = normalizedPath.lastIndexOf('/');
  return slashIndex >= 0 ? normalizedPath.slice(slashIndex + 1) : normalizedPath;
}

function appendSourceMappingUrl(moduleSource: string, sourceMapFileName: string): string {
  const sourceMapFooter = `//# source${'MappingURL='}${sourceMapFileName}`;
  return `${moduleSource.slice(0, -1)}
${sourceMapFooter}
`;
}

function createStylesheetSourceMap(
  moduleSource: string,
  stylesheetSource: string,
  sourcePath: string,
): string {
  const generatedLineCount = countLines(moduleSource);
  const sourceLineCount = Math.max(countLines(stylesheetSource), 1);
  let currentSourceLine: number | undefined;
  let previousSourceLine = 0;
  const mappings: string[] = [];
  const moduleLines = moduleSource.endsWith('\n')
    ? moduleSource.slice(0, -1).split('\n')
    : moduleSource.split('\n');

  for (
    let generatedLineIndex = 0;
    generatedLineIndex < generatedLineCount;
    generatedLineIndex += 1
  ) {
    const moduleLine = moduleLines[generatedLineIndex] ?? '';
    const anchoredSourceLine = readProvenanceLineNumber(moduleLine);
    if (anchoredSourceLine !== undefined) {
      currentSourceLine = Math.min(Math.max(anchoredSourceLine - 1, 0), sourceLineCount - 1);
    }

    if (
      currentSourceLine === undefined ||
      isCommentOnlyGeneratedLine(moduleLine) ||
      isGeneratedOnlyLine(moduleLine)
    ) {
      mappings.push('');
      continue;
    }

    mappings.push(
      `${encodeVlq(0)}${encodeVlq(0)}${encodeVlq(currentSourceLine - previousSourceLine)}${encodeVlq(0)}`,
    );
    previousSourceLine = currentSourceLine;
  }

  return `${JSON.stringify(
    {
      version: 3,
      file: `${sourcePath}.ts`,
      sources: [sourcePath],
      sourcesContent: [stylesheetSource],
      names: [],
      mappings: mappings.join(';'),
    },
    null,
    2,
  )}
`;
}

function countLines(text: string): number {
  if (text.length === 0) {
    return 1;
  }

  return text.endsWith('\n') ? text.slice(0, -1).split('\n').length : text.split('\n').length;
}

function readProvenanceLineNumber(moduleLine: string): number | undefined {
  const match = /:(\d+)\) \*\/$/.exec(moduleLine.trim());
  if (match === null) {
    return undefined;
  }

  return Number.parseInt(match[1] ?? '', 10);
}

function isCommentOnlyGeneratedLine(moduleLine: string): boolean {
  const trimmedLine = moduleLine.trim();
  return trimmedLine.startsWith('/** ') && trimmedLine.endsWith(' */');
}

function isGeneratedOnlyLine(moduleLine: string): boolean {
  const trimmedLine = moduleLine.trim();
  if (trimmedLine.length === 0) {
    return true;
  }

  return (
    trimmedLine.startsWith('import ') ||
    trimmedLine.startsWith('export const source = ') ||
    trimmedLine === 'export default { source, transform };' ||
    trimmedLine.startsWith('//# sourceMappingURL=')
  );
}

function encodeVlq(value: number): string {
  let remaining = value < 0 ? (-value << 1) + 1 : value << 1;
  let encoded = '';

  do {
    let digit = remaining & 31;
    remaining >>>= 5;
    if (remaining > 0) {
      digit |= 32;
    }
    encoded += BASE64_VLQ_DIGITS[digit] ?? '';
  } while (remaining > 0);

  return encoded;
}

const BASE64_VLQ_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
