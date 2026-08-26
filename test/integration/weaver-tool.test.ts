import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const WORKSPACE_ROOT = resolve(import.meta.dirname, '../..');
const WEAVER_TOOL_PROJECT = join(WORKSPACE_ROOT, 'dotnet', 'Weaver.Tool', 'Weaver.Tool.csproj');
const SAMPLE_APP_PROJECT = join(WORKSPACE_ROOT, 'dotnet', 'sample-app', 'SampleApp.csproj');
const SAMPLE_STYLESHEET = join(
  WORKSPACE_ROOT,
  'dotnet',
  'sample-app',
  'Stylesheets',
  'invoice.xsl',
);
const LOCAL_DLL_PATH = join(
  WORKSPACE_ROOT,
  'dotnet',
  'Weaver.Tool',
  'bin',
  'Debug',
  'net8.0',
  'Weaver.Tool.dll',
);
const DIST_CLI_PATH = join(WORKSPACE_ROOT, 'dist', 'cli.js');
const INTEGRATION_PACKAGE_VERSION = '0.0.1-integration';

const hasDotnet = commandAvailable('dotnet');
const hasNode = commandAvailable('node');
const hasBuiltCli = existsSync(DIST_CLI_PATH);
const describeWeaverTool = hasDotnet && hasNode && hasBuiltCli ? describe : describe.skip;

describeWeaverTool('integration Weaver.Tool host', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir !== undefined) {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      tempDir = undefined;
    }
  });

  it('compiles a stylesheet through the local Weaver.Tool.dll host', () => {
    execDotnet(['build', WEAVER_TOOL_PROJECT], WORKSPACE_ROOT);

    tempDir = mkdtempSync(join(tmpdir(), 'weaver-tool-local-'));
    const stagedStylesheet = join(tempDir, 'invoice.xsl');
    cpSync(SAMPLE_STYLESHEET, stagedStylesheet);

    const stdout = execDotnet(
      [LOCAL_DLL_PATH, '--node-path', 'node', 'compile', stagedStylesheet, '--emit', 'bundle'],
      WORKSPACE_ROOT,
    );

    expect(stdout).toContain(`Wrote ${stagedStylesheet}.bundle.js`);
    expect(existsSync(`${stagedStylesheet}.bundle.js`)).toBe(true);
    expect(existsSync(`${stagedStylesheet}.bundle.js.map`)).toBe(true);
  });

  it('compiles a stylesheet through the packaged Weaver.Tool.dll carrier', () => {
    execDotnet(
      [
        'pack',
        'Weaver.Build.csproj',
        '-o',
        'artifacts',
        `-p:PackageVersion=${INTEGRATION_PACKAGE_VERSION}`,
      ],
      join(WORKSPACE_ROOT, 'dotnet', 'Weaver.Build'),
    );

    tempDir = mkdtempSync(join(tmpdir(), 'weaver-tool-packaged-'));
    const isolatedPackagesPath = join(tempDir, 'packages');
    execDotnet(
      ['restore', SAMPLE_APP_PROJECT, `-p:WeaverBuildVersion=${INTEGRATION_PACKAGE_VERSION}`],
      WORKSPACE_ROOT,
      isolatedNugetEnvironment(isolatedPackagesPath),
    );

    const packagedDllPath = join(
      isolatedPackagesPath,
      'weaver.build',
      INTEGRATION_PACKAGE_VERSION,
      'tools',
      'weaver',
      'Weaver.Tool.dll',
    );

    const stagedStylesheet = join(tempDir, 'invoice.xsl');
    cpSync(SAMPLE_STYLESHEET, stagedStylesheet);

    const stdout = execDotnet(
      [packagedDllPath, '--node-path', 'node', 'compile', stagedStylesheet, '--emit', 'bundle'],
      WORKSPACE_ROOT,
    );

    expect(stdout).toContain(`Wrote ${stagedStylesheet}.bundle.js`);
    expect(existsSync(`${stagedStylesheet}.bundle.js`)).toBe(true);
    expect(existsSync(`${stagedStylesheet}.bundle.js.map`)).toBe(true);
  });
});

function commandAvailable(command: string): boolean {
  const probe = spawnSync(command, ['--version'], { stdio: 'ignore' });
  return probe.status === 0;
}

function execDotnet(
  args: readonly string[],
  cwd: string,
  environment: Readonly<Record<string, string>> = {},
): string {
  return execFileSync('dotnet', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...environment },
  });
}

function isolatedNugetEnvironment(packagesPath: string): Readonly<Record<string, string>> {
  return {
    NUGET_PACKAGES: packagesPath,
    NUGET_FALLBACK_PACKAGES: join(homedir(), '.nuget', 'packages'),
  };
}
