import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import chokidar from 'chokidar';

import { formatDiagnostics, renderDiagnosticError, projectDiagnosticReports } from './diagnostics/index.js';
import {
  XsltProcessor,
  type TransformExecutionFallbackReason,
  type TransformExecutionMode,
} from './index.js';
import {
  compileStylesheetArtifactsFromFile,
  composeStylesheetSourceFromFile,
  createStylesheetDigest,
  type EmitTarget,
} from './processor/compile.js';
import { bundleJs } from './processor/bundleJs.js';
import { transpileTsToJs, writeJsArtifact } from './processor/emitJs.js';

export interface CliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
  readonly progress?: (text: string) => void;
}

export interface RunCliOptions {
  readonly signal?: AbortSignal;
  readonly onWatchReady?: () => void | Promise<void>;
}

let cliDiagnosticsFormat: 'text' | 'json' = 'text';
let cliDiagnosticsOutPath: string | undefined = undefined;
let cliFailOnDiagnostics = false;
let cliEmittedErrorDiagnostics = false;

export async function runCli(
  args: readonly string[],
  io: CliIo = defaultIo,
  options: RunCliOptions = {},
): Promise<number> {
  // Handle empty or explicit help flags first
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    io.stdout(renderUsage());
    return 0;
  }

  // Extract global flags (diagnostics/format) and remove them from the dispatched args
  const filteredArgs: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === undefined) {
      continue;
    }

    // Look ahead token helper to satisfy strict null checks
    const next = args[i + 1];

    if ((token === '--diagnostics' || token === '--format') && next === 'json') {
      cliDiagnosticsFormat = 'json';
      i += 1; // skip the 'json' token
      continue;
    }

    if (token === '--diagnostics-out' && next !== undefined) {
      cliDiagnosticsOutPath = next;
      i += 1;
      continue;
    }

    if (token === '--fail-on-diagnostics' && next !== undefined) {
      const v = next.toLowerCase();
      cliFailOnDiagnostics = v === 'true' || v === '1' || v === 'yes';
      i += 1;
      continue;
    }

    filteredArgs.push(token);
  }

  const effectiveArgs = filteredArgs as readonly string[];
  const [command] = effectiveArgs;

  switch (command) {
    case 'compile':
      return runCompileCommand(effectiveArgs.slice(1), io);
    case 'watch':
      return runWatchCommand(effectiveArgs.slice(1), io, options);
    case 'run':
      return runTransformCommand(effectiveArgs.slice(1), io);
    case 'help': {
      const helpCommand = effectiveArgs[1];
      if (!helpCommand) {
        io.stdout(renderUsage());
        return 0;
      }

      switch (helpCommand) {
        case 'compile':
          io.stdout([
            'weaver-xslt compile <glob> [--sample <xml>] [--emit ts|js|bundle|ts,js|ts,bundle|js,bundle] [--diagnostics json]',
            '',
            'Compile matched stylesheets into artifacts. Use --sample to provide a sample XML document for composition. --emit chooses emitted artifact flavors.',
            '',
            'Machine-readable diagnostics: add "--diagnostics json" or "--format json" to emit a JSON diagnostics payload suitable for MSBuild/MSBuild targets.',
            '',
          ].join('\n'));
          return 0;
        case 'watch':
          io.stdout([
            'weaver-xslt watch <glob> [--sample <xml>] [--emit ...] [--diagnostics json]',
            '',
            'Watch matching files and recompile on change. Diagnostics can be emitted in JSON mode as above.',
            '',
          ].join('\n'));
          return 0;
        case 'run':
          io.stdout([
            'weaver-xslt run <stylesheet> --input <xml> [--execution <interpreter|native|auto>] [--param <name=value> ...]',
            '',
            'Run a compiled or source stylesheet against an input XML and write the transform output to stdout. This command is primarily for quick validation and debugging.',
            '',
          ].join('\n'));
          return 0;
        default:
          io.stderr(`Unknown help topic: ${helpCommand}\n`);
          return 1;
      }
    }
    default:
      io.stderr(`${renderUsage()}\n`);
      return 1;
  }
}

function runCompileCommand(args: readonly string[], io: CliIo): number {
  const parsed = parseCompileLikeArguments(args, { allowEmit: true });

  if (parsed === undefined) {
    io.stderr(
      'Usage: weaver-xslt compile <glob> [--sample <xml>] [--emit ts|js|bundle|ts,js|ts,bundle|js,bundle]\n',
    );
    return 1;
  }

  const sampleDocument =
    parsed.samplePath === undefined ? undefined : readSampleDocument(parsed.samplePath);
  if (parsed.samplePath !== undefined && sampleDocument === undefined) {
    io.stderr(`Could not read sample document ${resolve(parsed.samplePath)}\n`);
    return 1;
  }

  const inputPattern = parsed.inputPattern;

  const matchedPaths = globSync(inputPattern, {
    absolute: true,
    nodir: true,
    windowsPathsNoEscape: true,
  }).sort();

  if (matchedPaths.length === 0) {
    io.stderr(`No stylesheets matched ${inputPattern}\n`);
    return 1;
  }

  // Reset transient diagnostic state for this invocation
  cliEmittedErrorDiagnostics = false;

  for (const resolvedInputPath of matchedPaths) {
    if (!emitCompiledArtifacts(resolvedInputPath, io, parsed.samplePath, parsed.emitTargets)) {
      return 1;
    }
  }

  // If requested, fail the CLI when diagnostics contained error/warning per policy
  if (cliFailOnDiagnostics && cliEmittedErrorDiagnostics) {
    return 2;
  }

  return 0;
}

async function runWatchCommand(
  args: readonly string[],
  io: CliIo,
  options: RunCliOptions,
): Promise<number> {
  const parsed = parseCompileLikeArguments(args, { allowEmit: true });

  if (parsed === undefined) {
    io.stderr(
      'Usage: weaver-xslt watch <glob> [--sample <xml>] [--emit ts|js|bundle|ts,js|ts,bundle|js,bundle]\n',
    );
    return 1;
  }

  const inputPattern = parsed.inputPattern;

  const resolvedPattern = resolve(inputPattern);
  const matcher = createGlobMatcher(resolvedPattern);
  const watchRoots = hasGlobMagic(resolvedPattern)
    ? [findGlobBaseDirectory(resolvedPattern)]
    : [dirname(resolvedPattern)];
  const resolvedSamplePath =
    parsed.samplePath === undefined ? undefined : resolve(parsed.samplePath);
  const watcherRoots =
    resolvedSamplePath === undefined
      ? watchRoots
      : [...new Set([...watchRoots, dirname(resolvedSamplePath)])];

  const watcher = chokidar.watch(watcherRoots, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 25,
    },
  });

  const pendingTasks = new Set<Promise<void>>();
  const watchedDigests = new Map<string, string>();

  const trackTask = (callback: () => void): void => {
    const task = Promise.resolve()
      .then(callback)
      .finally(() => {
        pendingTasks.delete(task);
      });
    pendingTasks.add(task);
  };

  return new Promise<number>((resolveExitCode) => {
    let finished = false;

    const finish = (exitCode: number): void => {
      if (finished) {
        return;
      }

      finished = true;
      options.signal?.removeEventListener('abort', abortListener);
      void (async () => {
        await watcher.close();
        await Promise.allSettled([...pendingTasks]);
        resolveExitCode(exitCode);
      })();
    };

    const abortListener = (): void => {
      finish(0);
    };

    const matchesWatchPattern = (inputPath: string): boolean =>
      matcher(testPath(resolve(inputPath)));
    const listMatchedStylesheets = (): string[] =>
      globSync(inputPattern, {
        absolute: true,
        nodir: true,
        windowsPathsNoEscape: true,
      }).sort();
    const readWatchedSampleDocument = (): string | undefined =>
      resolvedSamplePath === undefined ? undefined : readSampleDocument(resolvedSamplePath);
    const recompileStylesheets = (stylesheetPaths: readonly string[]): void => {
      const sampleDocument = readWatchedSampleDocument();
      if (resolvedSamplePath !== undefined && sampleDocument === undefined) {
        io.stderr(`Could not read sample document ${resolvedSamplePath}\n`);
        return;
      }

      for (const matchedPath of stylesheetPaths) {
        emitWatchedArtifacts(
          matchedPath,
          io,
          watchedDigests,
          sampleDocument,
          resolvedSamplePath,
          parsed.emitTargets,
        );
      }
    };
    const recompileAllMatchedStylesheets = (): void => {
      recompileStylesheets(listMatchedStylesheets());
    };
    const invalidateWatchedDigests = (stylesheetPaths: readonly string[]): void => {
      for (const stylesheetPath of stylesheetPaths) {
        watchedDigests.delete(stylesheetPath);
      }
    };
    const findDependencyAffectedStylesheets = (dependencyPath: string): string[] => {
      if (!isExtensionFunctionCatalogPath(dependencyPath)) {
        return [];
      }

      return listMatchedStylesheets().filter((matchedPath) => {
        return (
          canonicalizePath(resolve(join(dirname(matchedPath), 'functions.ts'))) ===
          canonicalizePath(dependencyPath)
        );
      });
    };

    watcher.on('add', (inputPath) => {
      const resolvedInputPath = resolve(inputPath);
      if (resolvedSamplePath !== undefined && resolvedInputPath === resolvedSamplePath) {
        trackTask(() => {
          recompileAllMatchedStylesheets();
        });
        return;
      }

      if (matchesWatchPattern(resolvedInputPath)) {
        trackTask(() => {
          emitWatchedArtifacts(
            resolvedInputPath,
            io,
            watchedDigests,
            readWatchedSampleDocument(),
            resolvedSamplePath,
            parsed.emitTargets,
          );
        });
        return;
      }

      const affectedStylesheets = findDependencyAffectedStylesheets(resolvedInputPath);
      if (affectedStylesheets.length === 0) {
        return;
      }

      trackTask(() => {
        invalidateWatchedDigests(affectedStylesheets);
        recompileStylesheets(affectedStylesheets);
      });
    });
    watcher.on('change', (inputPath) => {
      const resolvedInputPath = resolve(inputPath);
      if (resolvedSamplePath !== undefined && resolvedInputPath === resolvedSamplePath) {
        trackTask(() => {
          recompileAllMatchedStylesheets();
        });
        return;
      }

      if (matchesWatchPattern(resolvedInputPath)) {
        trackTask(() => {
          emitWatchedArtifacts(
            resolvedInputPath,
            io,
            watchedDigests,
            readWatchedSampleDocument(),
            resolvedSamplePath,
            parsed.emitTargets,
          );
        });
        return;
      }

      const affectedStylesheets = findDependencyAffectedStylesheets(resolvedInputPath);
      if (affectedStylesheets.length === 0) {
        return;
      }

      trackTask(() => {
        invalidateWatchedDigests(affectedStylesheets);
        recompileStylesheets(affectedStylesheets);
      });
    });
    watcher.on('unlink', (inputPath) => {
      const resolvedInputPath = resolve(inputPath);
      if (resolvedSamplePath !== undefined && resolvedInputPath === resolvedSamplePath) {
        trackTask(() => {
          watchedDigests.clear();
          recompileAllMatchedStylesheets();
        });
        return;
      }

      if (matchesWatchPattern(resolvedInputPath)) {
        trackTask(() => {
          watchedDigests.delete(resolvedInputPath);
          removeCompiledArtifacts(resolvedInputPath, io);
        });
        return;
      }

      const affectedStylesheets = findDependencyAffectedStylesheets(resolvedInputPath);
      if (affectedStylesheets.length === 0) {
        return;
      }

      trackTask(() => {
        invalidateWatchedDigests(affectedStylesheets);
        recompileStylesheets(affectedStylesheets);
      });
    });
    watcher.on('ready', () => {
      recompileAllMatchedStylesheets();
      io.stdout(`Watching ${inputPattern}\n`);
      void options.onWatchReady?.();
      if (options.signal?.aborted === true) {
        finish(0);
      }
    });
    watcher.on('error', (error) => {
      io.stderr(`${renderDiagnosticError(error)}\n`);
      finish(1);
    });

    if (options.signal?.aborted === true) {
      finish(0);
      return;
    }

    options.signal?.addEventListener('abort', abortListener, { once: true });
  });
}

function runTransformCommand(args: readonly string[], io: CliIo): number {
  const parsed = parseRunArguments(args);
  if (parsed === undefined) {
    io.stderr(
      'Usage: weaver-xslt run <stylesheet> --input <xml> [--execution <interpreter|native|auto>] [--param <name=value> ...]\n',
    );
    return 1;
  }

  const resolvedStylesheetPath = resolve(parsed.stylesheetPath);
  const resolvedInputPath = resolve(parsed.inputPath);

  try {
    const stylesheet = composeStylesheetSourceFromFile(resolvedStylesheetPath);
    const inputXml = readFileSync(resolvedInputPath, 'utf8');
    const result = new XsltProcessor(stylesheet, {
      sourceName: pathToFileURL(resolvedStylesheetPath).href,
    }).transform(inputXml, {
      ...(parsed.execution === undefined ? {} : { execution: parsed.execution }),
      ...(parsed.parameters === undefined ? {} : { parameters: parsed.parameters }),
    });

    const fallbackReason = result.execution?.fallbackReason;
    if (fallbackReason !== undefined) {
      io.stderr(renderExecutionFallbackWarning(fallbackReason));
    }

    io.stdout(`${result.output}\n`);
    return 0;
  } catch (error) {
    const stylesheet = tryReadSource(resolvedStylesheetPath);
    io.stderr(`${renderDiagnosticError(error, stylesheet)}\n`);
    return 1;
  }
}

function parseRunArguments(args: readonly string[]):
  | {
      readonly stylesheetPath: string;
      readonly inputPath: string;
      readonly execution?: TransformExecutionMode;
      readonly parameters?: Readonly<Record<string, unknown>>;
    }
  | undefined {
  const [stylesheetPath, ...rest] = args;
  if (stylesheetPath === undefined) {
    return undefined;
  }

  let inputPath: string | undefined;
  let execution: TransformExecutionMode | undefined;
  const parameters: Record<string, unknown> = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === '--input') {
      inputPath = rest[index + 1];
      index += 1;
      continue;
    }

    if (token === '--execution') {
      const requestedExecution = rest[index + 1];
      if (
        requestedExecution !== 'interpreter' &&
        requestedExecution !== 'native' &&
        requestedExecution !== 'auto'
      ) {
        return undefined;
      }

      execution = requestedExecution;
      index += 1;
      continue;
    }

    if (token === '--param') {
      const parameterText = rest[index + 1];
      if (parameterText === undefined) {
        return undefined;
      }

      const equalsIndex = parameterText.indexOf('=');
      if (equalsIndex <= 0) {
        return undefined;
      }

      const name = parameterText.slice(0, equalsIndex);
      const value = parameterText.slice(equalsIndex + 1);
      if (name.length === 0) {
        return undefined;
      }

      parameters[name] = value;
      index += 1;
      continue;
    }

    return undefined;
  }

  if (inputPath === undefined) {
    return undefined;
  }

  return {
    stylesheetPath,
    inputPath,
    ...(execution === undefined ? {} : { execution }),
    ...(Object.keys(parameters).length === 0 ? {} : { parameters }),
  };
}

function renderExecutionFallbackWarning(fallbackReason: TransformExecutionFallbackReason): string {
  return [
    `warning[native-fallback]: ${fallbackReason.message}`,
    `  = fallbackCode: ${fallbackReason.code}`,
    ...(fallbackReason.suggestions ?? []).map((suggestion) => `  help: ${suggestion.label}`),
    '',
  ].join('\n');
}

function renderUsage(): string {
  return [
    'Usage:',
    '  weaver-xslt compile <glob> [--sample <xml>] [--emit ts|js|bundle|ts,js|ts,bundle|js,bundle]',
    '  weaver-xslt watch <glob> [--sample <xml>] [--emit ts|js|bundle|ts,js|ts,bundle|js,bundle]',
    '  weaver-xslt run <stylesheet> --input <xml> [--execution <interpreter|native|auto>] [--param <name=value> ...]',
    '  weaver-xslt --help',
  ].join('\n');
}

const defaultIo: CliIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  progress: (text) => process.stdout.write(`${text}\n`),
};

function tryReadSource(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  void runCli(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      process.stderr.write(`${renderDiagnosticError(error)}\n`);
      process.exitCode = 1;
    },
  );
}

function emitCompiledArtifacts(
  resolvedInputPath: string,
  io: CliIo,
  sampleDocumentPath?: string,
  emitTargets?: EmitTarget[],
): boolean {
  try {
    return (
      emitCompiledArtifactsFromFile(
        resolvedInputPath,
        io,
        sampleDocumentPath,
        undefined,
        emitTargets,
      ) !== undefined
    );
  } catch (error) {
    const stylesheet = tryReadSource(resolvedInputPath);
    io.stderr(`${renderDiagnosticError(error, stylesheet)}\n`);
    return false;
  }
}

function removeCompiledArtifacts(resolvedInputPath: string, io: CliIo): void {
  removeEmittedArtifacts(resolvedInputPath);
  io.stdout(`Removed ${resolvedInputPath}\n`);
}

function removeStaleCompiledArtifacts(resolvedInputPath: string, io: CliIo): void {
  removeEmittedArtifacts(resolvedInputPath);
  io.stdout(`Removed stale outputs for ${resolvedInputPath}\n`);
}

function emitWatchedArtifacts(
  resolvedInputPath: string,
  io: CliIo,
  watchedDigests: Map<string, string>,
  sampleDocument?: string,
  sampleDocumentPath?: string,
  emitTargets?: EmitTarget[],
): void {
  try {
    const effectiveEmitTargets = normalizeEmitTargets(emitTargets);
    const stylesheet = readFileSync(resolvedInputPath, 'utf8');
    const watchInputDigest = createWatchInputDigest(
      stylesheet,
      sampleDocument,
      readExtensionFunctionCatalogSource(resolvedInputPath),
    );
    const outputPath = getPrimaryArtifactPath(resolvedInputPath, effectiveEmitTargets);

    if (
      watchedDigests.get(resolvedInputPath) === watchInputDigest &&
      hasCompiledArtifacts(resolvedInputPath, effectiveEmitTargets)
    ) {
      io.stdout(`Unchanged ${outputPath}\n`);
      return;
    }

    const emittedDigest = emitCompiledArtifactsFromFile(
      resolvedInputPath,
      io,
      sampleDocumentPath,
      stylesheet,
      emitTargets,
    );
    if (emittedDigest !== undefined) {
      watchedDigests.set(resolvedInputPath, watchInputDigest);
    } else {
      watchedDigests.delete(resolvedInputPath);
    }
  } catch (error) {
    watchedDigests.delete(resolvedInputPath);
    if (hasCompiledArtifacts(resolvedInputPath, normalizeEmitTargets(emitTargets))) {
      removeStaleCompiledArtifacts(resolvedInputPath, io);
    }
    const stylesheet = tryReadSource(resolvedInputPath);
    io.stderr(`${renderDiagnosticError(error, stylesheet)}\n`);
  }
}

function emitCompiledArtifactsFromFile(
  resolvedInputPath: string,
  io: CliIo,
  sampleDocumentPath?: string,
  stylesheet = readFileSync(resolvedInputPath, 'utf8'),
  emitTargets?: EmitTarget[],
): string | undefined {
  const effectiveEmitTargets = normalizeEmitTargets(emitTargets);
  const hasTsTarget = effectiveEmitTargets.includes('ts');
  const hasJsTarget = effectiveEmitTargets.includes('js');
  const hasBundleTarget = effectiveEmitTargets.includes('bundle');
  io.progress?.(`Compiling stylesheet ${resolvedInputPath}`);
  const output = compileStylesheetArtifactsFromFile(resolvedInputPath, {
    ...(sampleDocumentPath === undefined ? {} : { sampleDocumentPath }),
    ...(io.progress === undefined ? {} : { onProgress: io.progress }),
    ...(emitTargets === undefined ? {} : { emitTargets }),
  });

  const outputPath = `${resolvedInputPath}.ts`;
  const declarationPath = `${resolvedInputPath}.d.ts`;
  const digestPath = `${resolvedInputPath}.digest`;
  const sourceMapPath = `${resolvedInputPath}.map`;
  const digestContents = `${output.digest}\n`;
  const jsArtifacts =
    !hasJsTarget && !hasBundleTarget
      ? undefined
      : transpileTsToJs(output.module, {
          sourcePath: resolvedInputPath,
        });
  const jsOutputPath = `${resolvedInputPath}.js`;
  const jsSourceMapPath = `${resolvedInputPath}.js.map`;
  const bundleOutputPath = `${resolvedInputPath}.bundle.js`;
  const bundleSourceMapPath = `${resolvedInputPath}.bundle.js.map`;

  if (hasTsTarget && !hasJsTarget && !hasBundleTarget) {
    if (
      tryReadSource(outputPath) === output.module &&
      tryReadSource(declarationPath) === output.declaration &&
      tryReadSource(digestPath) === digestContents &&
      tryReadSource(sourceMapPath) === output.sourceMap
    ) {
      writeDiagnostics(output.diagnostics, stylesheet, io);
      io.stdout(`Up to date ${outputPath}\n`);
      return output.digest;
    }

    replaceFileContents(outputPath, output.module);
    replaceFileContents(declarationPath, output.declaration);
    replaceFileContents(digestPath, digestContents);
    replaceFileContents(sourceMapPath, output.sourceMap);
    writeDiagnostics(output.diagnostics, stylesheet, io);
    io.stdout(`Wrote ${outputPath}\n`);
    return output.digest;
  }

  if (hasTsTarget) {
    replaceFileContents(outputPath, output.module);
    replaceFileContents(declarationPath, output.declaration);
    replaceFileContents(digestPath, digestContents);
    replaceFileContents(sourceMapPath, output.sourceMap);
    io.stdout(`Wrote ${outputPath}\n`);
  }

  if (hasJsTarget && jsArtifacts !== undefined) {
    const jsOutput = writeJsArtifact(jsArtifacts.js, jsArtifacts.sourceMap, resolvedInputPath);
    if (jsOutput.jsPath !== jsOutputPath || jsOutput.sourceMapPath !== jsSourceMapPath) {
      throw new Error(`Unexpected JS artifact paths for ${resolvedInputPath}`);
    }
    io.stdout(`Wrote ${jsOutput.jsPath}\n`);
  }

  if (hasBundleTarget && jsArtifacts !== undefined) {
    const bundleOutput = bundleJs({
      jsModule: jsArtifacts.js,
      sourcePath: resolvedInputPath,
    });
    replaceFileContents(
      bundleOutputPath,
      `${bundleOutput.js}\n//# sourceMappingURL=${basename(bundleSourceMapPath)}\n`,
    );
    replaceFileContents(bundleSourceMapPath, bundleOutput.sourceMap);
    io.stdout(`Wrote ${bundleOutputPath}\n`);
  }

  writeDiagnostics(output.diagnostics, stylesheet, io);
  return output.digest;
}

function parseCompileLikeArguments(
  args: readonly string[],
  options: { readonly allowEmit?: boolean } = {},
):
  | {
      readonly inputPattern: string;
      readonly samplePath?: string;
      readonly emitTargets?: EmitTarget[];
    }
  | undefined {
  const [inputPattern, ...rest] = args;
  if (inputPattern === undefined) {
    return undefined;
  }

  let samplePath: string | undefined;
  let emitTargetsRaw: string | undefined;
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === '--sample') {
      samplePath = rest[index + 1];
      if (samplePath === undefined) {
        return undefined;
      }
      index += 1;
      continue;
    }

    if (token === '--emit') {
      if (options.allowEmit !== true) {
        return undefined;
      }
      emitTargetsRaw = rest[index + 1];
      if (emitTargetsRaw === undefined) {
        return undefined;
      }
      index += 1;
      continue;
    }

    return undefined;
  }

  if (emitTargetsRaw === undefined) {
    return {
      inputPattern,
      ...(samplePath === undefined ? {} : { samplePath }),
    };
  }

  const emitTargets = parseEmitTargets(emitTargetsRaw);
  if (emitTargets === undefined) {
    return undefined;
  }

  return {
    inputPattern,
    ...(samplePath === undefined ? {} : { samplePath }),
    emitTargets,
  };
}

function parseEmitTargets(raw: string): EmitTarget[] | undefined {
  const targets = raw.split(',').map((t) => t.trim() as EmitTarget);
  for (const target of targets) {
    if (target !== 'ts' && target !== 'js' && target !== 'bundle') {
      return undefined;
    }
  }
  return targets;
}

function readSampleDocument(samplePath: string): string | undefined {
  try {
    return readFileSync(resolve(samplePath), 'utf8');
  } catch {
    return undefined;
  }
}

function createWatchInputDigest(
  stylesheet: string,
  sampleDocument: string | undefined,
  extensionFunctionCatalogSource: string | undefined,
): string {
  return createStylesheetDigest(
    `${stylesheet}\u0000${sampleDocument ?? ''}\u0000${extensionFunctionCatalogSource ?? ''}`,
  );
}

function hasCompiledArtifactsForTargets(
  resolvedInputPath: string,
  emitTargets: readonly EmitTarget[],
): boolean {
  const expectsTs = emitTargets.includes('ts');
  const expectsJs = emitTargets.includes('js');
  const expectsBundle = emitTargets.includes('bundle');

  if (
    expectsTs &&
    (!existsSync(`${resolvedInputPath}.ts`) ||
      !existsSync(`${resolvedInputPath}.d.ts`) ||
      !existsSync(`${resolvedInputPath}.digest`) ||
      !existsSync(`${resolvedInputPath}.map`))
  ) {
    return false;
  }

  if (
    expectsJs &&
    (!existsSync(`${resolvedInputPath}.js`) || !existsSync(`${resolvedInputPath}.js.map`))
  ) {
    return false;
  }

  if (
    expectsBundle &&
    (!existsSync(`${resolvedInputPath}.bundle.js`) ||
      !existsSync(`${resolvedInputPath}.bundle.js.map`))
  ) {
    return false;
  }

  return true;
}

function hasCompiledArtifacts(
  resolvedInputPath: string,
  emitTargets: readonly EmitTarget[] = ['ts'],
): boolean {
  return hasCompiledArtifactsForTargets(resolvedInputPath, emitTargets);
}

function normalizeEmitTargets(emitTargets?: readonly EmitTarget[]): EmitTarget[] {
  if (emitTargets === undefined || emitTargets.length === 0) {
    return ['ts'];
  }

  return [...new Set(emitTargets)];
}

function getPrimaryArtifactPath(
  resolvedInputPath: string,
  emitTargets: readonly EmitTarget[],
): string {
  if (emitTargets.includes('bundle')) {
    return `${resolvedInputPath}.bundle.js`;
  }

  if (emitTargets.includes('js')) {
    return `${resolvedInputPath}.js`;
  }

  return `${resolvedInputPath}.ts`;
}

function removeEmittedArtifacts(resolvedInputPath: string): void {
  rmSync(`${resolvedInputPath}.ts`, { force: true });
  rmSync(`${resolvedInputPath}.d.ts`, { force: true });
  rmSync(`${resolvedInputPath}.digest`, { force: true });
  rmSync(`${resolvedInputPath}.map`, { force: true });
  rmSync(`${resolvedInputPath}.js`, { force: true });
  rmSync(`${resolvedInputPath}.js.map`, { force: true });
  rmSync(`${resolvedInputPath}.bundle.js`, { force: true });
  rmSync(`${resolvedInputPath}.bundle.js.map`, { force: true });
}

function isExtensionFunctionCatalogPath(path: string): boolean {
  return basename(path) === 'functions.ts';
}

function readExtensionFunctionCatalogSource(resolvedInputPath: string): string | undefined {
  return tryReadSource(resolve(join(dirname(resolvedInputPath), 'functions.ts')));
}

function canonicalizePath(path: string): string {
  const resolvedPath = resolve(path);
  try {
    return realpathSync.native(resolvedPath);
  } catch {
    try {
      return join(realpathSync.native(dirname(resolvedPath)), basename(resolvedPath));
    } catch {
      return resolvedPath;
    }
  }
}

function replaceFileContents(targetPath: string, contents: string): void {
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tempPath, contents, 'utf8');

  try {
    rmSync(targetPath, { force: true });
    renameSync(tempPath, targetPath);
  } catch (error) {
    rmSync(tempPath, { force: true });
    throw error;
  }
}

function writeDiagnostics(
  diagnostics: readonly import('./diagnostics/index.js').DiagnosticReport[],
  stylesheet: string,
  io: CliIo,
): void {
  if (diagnostics.length === 0) {
    return;
  }

  // Track if any error-level diagnostics were emitted so callers can decide to
  // fail the process when requested.
  if (diagnostics.some((d) => d.severity === 'error')) {
    cliEmittedErrorDiagnostics = true;
  }

  if (cliDiagnosticsFormat === 'json') {
    // Emit a stable, machine-readable diagnostics payload suitable for MSBuild
    // or other automation that consumes JSON. Use projectDiagnosticReports to
    // preserve structured fields and spans.
    const jsonReports = projectDiagnosticReports(diagnostics as any);
    const output = { source: { path: stylesheet }, diagnostics: jsonReports };

    if (cliDiagnosticsOutPath !== undefined) {
      try {
        writeFileSync(cliDiagnosticsOutPath, JSON.stringify(output, null, 2), 'utf8');
      } catch (error) {
        // Fall back to writing JSON to stdout if we cannot write to file
        io.stderr(`weaver: failed to write diagnostics to ${cliDiagnosticsOutPath}: ${String(error)}\n`);
        io.stdout(`${JSON.stringify(output, null, 2)}\n`);
      }
    } else {
      io.stdout(`${JSON.stringify(output, null, 2)}\n`);
    }

    // Also emit MSBuild-friendly lines to stderr so MSBuild picks up file/line/col
    for (const report of diagnostics) {
      const sev = report.severity === 'error' ? 'error' : 'warning';
      if (report.primary !== undefined) {
        const file = report.primary.uri ?? '<unknown>';
        const line = report.primary.lineStart ?? 1;
        const col = report.primary.columnStart ?? 1;
        io.stderr(`${file}(${line},${col}): ${sev} ${report.code}: ${report.message}\n`);
      } else {
        io.stderr(`${sev} ${report.code}: ${report.message}\n`);
      }
    }

    return;
  }

  const rendered = formatDiagnostics(diagnostics, stylesheet);
  if (rendered.length > 0) {
    io.stderr(rendered);
  }
}

function globSync(
  inputPattern: string,
  _options: { readonly absolute: true; readonly nodir: true; readonly windowsPathsNoEscape: true },
): string[] {
  const resolvedPattern = resolve(inputPattern);
  if (!hasGlobMagic(resolvedPattern)) {
    return existsSync(resolvedPattern) ? [resolvedPattern] : [];
  }

  const baseDirectory = findGlobBaseDirectory(resolvedPattern);
  if (!existsSync(baseDirectory)) {
    return [];
  }

  const matcher = createGlobMatcher(resolvedPattern);
  const matches: string[] = [];

  collectFiles(baseDirectory, matches);
  return matches.filter((filePath) => matcher(testPath(filePath)));
}

function collectFiles(directoryPath: string, files: string[]): void {
  for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
    const childPath = resolve(directoryPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(childPath, files);
      continue;
    }

    if (entry.isFile()) {
      files.push(childPath);
    }
  }
}

function createGlobMatcher(pattern: string): (candidatePath: string) => boolean {
  const normalizedPattern = testPath(pattern);
  let regexSource = '';

  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const character = normalizedPattern[index];
    if (character === undefined) {
      continue;
    }

    if (character === '*') {
      if (normalizedPattern[index + 1] === '*') {
        regexSource += '.*';
        index += 1;
      } else {
        regexSource += '[^/]*';
      }
      continue;
    }

    if (character === '?') {
      regexSource += '[^/]';
      continue;
    }

    regexSource += escapeRegexCharacter(character);
  }

  const matcher = new RegExp(`^${regexSource}$`, 'i');
  return (candidatePath: string) => matcher.test(candidatePath);
}

function findGlobBaseDirectory(pattern: string): string {
  const normalizedPattern = testPath(pattern);
  const segments = normalizedPattern.split('/');
  const baseSegments: string[] = [];

  for (const segment of segments) {
    if (segment.includes('*') || segment.includes('?')) {
      break;
    }

    baseSegments.push(segment);
  }

  if (baseSegments.length === 0) {
    return dirname(pattern);
  }

  return resolve(baseSegments.join('/'));
}

function hasGlobMagic(value: string): boolean {
  return value.includes('*') || value.includes('?');
}

function testPath(value: string): string {
  return value.replaceAll('\\', '/');
}

function escapeRegexCharacter(character: string): string {
  return /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character;
}
