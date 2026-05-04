import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { diagnosticReportFromError, formatDiagnostic } from './diagnostics/index.js';
import { compileStylesheetToTs } from './index.js';

export interface CliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

export function runCli(args: readonly string[], io: CliIo = defaultIo): number {
  const [command, inputPath] = args;

  if (command !== 'compile' || inputPath === undefined || args.length !== 2) {
    io.stderr('Usage: weaver-xslt compile <file>\n');
    return 1;
  }

  const resolvedInputPath = resolve(inputPath);
  const outputPath = `${resolvedInputPath}.ts`;

  try {
    const stylesheet = readFileSync(resolvedInputPath, 'utf8');
    const output = compileStylesheetToTs(stylesheet, { path: basename(resolvedInputPath) });

    writeFileSync(outputPath, output, 'utf8');
    io.stdout(`Wrote ${outputPath}\n`);
    return 0;
  } catch (error) {
    const stylesheet = tryReadSource(resolvedInputPath);
    const report = diagnosticReportFromError(error);
    const message = stylesheet === undefined ? report.message : formatDiagnostic(report, stylesheet);

    io.stderr(`${message}\n`);
    return 1;
  }
}

const defaultIo: CliIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

function tryReadSource(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = runCli(process.argv.slice(2));
}