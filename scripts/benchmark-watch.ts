import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runCli } from '../src/cli.js';
import { compileStylesheetArtifacts } from '../src/processor/compile.js';

async function main(): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), 'weaver-watch-benchmark-'));

  try {
    const stylesheetPath = join(tempDir, 'benchmark.xsl');
    const outputPath = `${stylesheetPath}.ts`;
    const initialStylesheet = createBenchmarkStylesheet('initial');
    const updatedStylesheet = createBenchmarkStylesheet('updated');
    const expectedUpdatedModule = compileStylesheetArtifacts(updatedStylesheet, {
      path: 'benchmark.xsl',
      filePath: stylesheetPath,
    }).module;
    const io = {
      stdout: (_text: string) => {},
      stderr: (_text: string) => {},
    };
    const abortController = new AbortController();

    writeFileSync(stylesheetPath, initialStylesheet, 'utf8');

    const exitCodePromise = runCli(['watch', stylesheetPath], io, {
      signal: abortController.signal,
    });

    await waitFor(() => {
      return readFileSync(outputPath, 'utf8').includes('initial-100');
    }, 5000);

    const startedAt = performance.now();
    writeFileSync(stylesheetPath, updatedStylesheet, 'utf8');

    await waitFor(() => {
      return readFileSync(outputPath, 'utf8') === expectedUpdatedModule;
    }, 5000);

    const elapsedMilliseconds = performance.now() - startedAt;

    abortController.abort();
    const exitCode = await exitCodePromise;
    if (exitCode !== 0) {
      throw new Error(`watch command exited with code ${exitCode}`);
    }

    process.stdout.write(`watch round-trip: ${elapsedMilliseconds.toFixed(2)}ms\n`);

    if (elapsedMilliseconds > 500) {
      throw new Error(`Expected watch round-trip under 500ms, received ${elapsedMilliseconds.toFixed(2)}ms.`);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

function createBenchmarkStylesheet(label: string): string {
  const lines = [
    '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
    '  <xsl:template match="/">',
    '    <out>',
  ];

  for (let index = 1; index <= 194; index += 1) {
    lines.push(`      <line>${label}-${String(index).padStart(3, '0')}</line>`);
  }

  lines.push('    </out>');
  lines.push('  </xsl:template>');
  lines.push('</xsl:stylesheet>');

  return lines.join('\n');
}

async function waitFor(predicate: () => boolean, timeoutMilliseconds: number): Promise<void> {
  const deadline = performance.now() + timeoutMilliseconds;

  while (performance.now() < deadline) {
    try {
      if (predicate()) {
        return;
      }
    } catch {
      // Wait for the watch pipeline to produce the file.
    }

    await delay(10);
  }

  throw new Error(`Timed out after ${timeoutMilliseconds}ms.`);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});