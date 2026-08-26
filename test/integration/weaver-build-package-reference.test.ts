import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const WORKSPACE_ROOT = resolve(import.meta.dirname, '../..');
const WEAVER_BUILD_PROJECT = join(WORKSPACE_ROOT, 'dotnet', 'Weaver.Build', 'Weaver.Build.csproj');
const SAMPLE_APP_PROJECT = join(WORKSPACE_ROOT, 'dotnet', 'sample-app', 'SampleApp.csproj');
const DIAGNOSTICS_FAIL_PROJECT = join(
  WORKSPACE_ROOT,
  'dotnet',
  'diagnostics-fail',
  'Project.csproj',
);
const DIST_CLI_PATH = join(WORKSPACE_ROOT, 'dist', 'cli.js');
const PACKAGE_VERSION = '0.0.1';

const hasDotnet = commandAvailable('dotnet');
const hasNode = commandAvailable('node');
const hasBuiltCli = existsSync(DIST_CLI_PATH);
const describePackageReference = hasDotnet && hasNode && hasBuiltCli ? describe : describe.skip;

describePackageReference('integration Weaver.Build PackageReference consumers', () => {
  it('builds the sample app through the packed Weaver.Build package', () => {
    prepareFreshWeaverBuildPackage();

    const stdout = execDotnet(['build', SAMPLE_APP_PROJECT], WORKSPACE_ROOT);

    expect(stdout).toContain('Build succeeded');
    expect(stdout).toContain('SampleApp');
  });

  it('fails the diagnostics fixture with the expected structured Weaver error', () => {
    prepareFreshWeaverBuildPackage();

    let buildError: Error | undefined;
    try {
      execDotnet(['build', DIAGNOSTICS_FAIL_PROJECT], WORKSPACE_ROOT);
    } catch (error) {
      const execError = error as Error & { stdout?: Buffer | string; stderr?: Buffer | string };
      const stdout = String(execError.stdout ?? '');
      const stderr = String(execError.stderr ?? '');
      buildError = new Error(
        [
          execError.message,
          stdout.length > 0 ? `stdout:\n${stdout}` : undefined,
          stderr.length > 0 ? `stderr:\n${stderr}` : undefined,
        ]
          .filter((part): part is string => part !== undefined)
          .join('\n\n'),
      );
    }

    expect(buildError).toBeDefined();
    expect(buildError?.message).toContain('XTSE0650');
    expect(buildError?.message).toContain('no-such-template');
  });
});

function prepareFreshWeaverBuildPackage(): void {
  execDotnet(
    ['pack', 'Weaver.Build.csproj', '-o', 'artifacts'],
    join(WORKSPACE_ROOT, 'dotnet', 'Weaver.Build'),
  );

  const globalPackagesPath = resolveGlobalPackagesPath();
  rmSync(join(globalPackagesPath, 'weaver.build', PACKAGE_VERSION), {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}

function commandAvailable(command: string): boolean {
  const probe = spawnSync(command, ['--version'], { stdio: 'ignore' });
  return probe.status === 0;
}

function execDotnet(args: readonly string[], cwd: string): string {
  return execFileSync('dotnet', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function resolveGlobalPackagesPath(): string {
  const output = execDotnet(['nuget', 'locals', 'global-packages', '--list'], WORKSPACE_ROOT);
  const match = output.match(/global-packages:\s*(.+)/i);
  if (match?.[1] === undefined) {
    return join(homedir(), '.nuget', 'packages');
  }

  return match[1].trim();
}
