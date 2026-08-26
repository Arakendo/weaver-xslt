import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const WORKSPACE_ROOT = resolve(import.meta.dirname, '../..');
const SAMPLE_APP_PROJECT = join(WORKSPACE_ROOT, 'dotnet', 'sample-app', 'SampleApp.csproj');
const DIAGNOSTICS_FAIL_PROJECT = join(
  WORKSPACE_ROOT,
  'dotnet',
  'diagnostics-fail',
  'Project.csproj',
);
const DIST_CLI_PATH = join(WORKSPACE_ROOT, 'dist', 'cli.js');
const INTEGRATION_PACKAGE_VERSION = '0.0.1-integration';

const hasDotnet = commandAvailable('dotnet');
const hasNode = commandAvailable('node');
const hasBuiltCli = existsSync(DIST_CLI_PATH);
const describePackageReference = hasDotnet && hasNode && hasBuiltCli ? describe : describe.skip;

describePackageReference('integration Weaver.Build PackageReference consumers', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir !== undefined) {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      tempDir = undefined;
    }
  });

  it('builds the sample app through the packed Weaver.Build package', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'weaver-build-package-'));
    prepareFreshWeaverBuildPackage();

    const stdout = execDotnet(
      ['build', SAMPLE_APP_PROJECT, `-p:WeaverBuildVersion=${INTEGRATION_PACKAGE_VERSION}`],
      WORKSPACE_ROOT,
      isolatedNugetEnvironment(join(tempDir, 'packages')),
    );

    expect(stdout).toContain('Build succeeded');
    expect(stdout).toContain('SampleApp');
  });

  it('fails the diagnostics fixture with the expected structured Weaver error', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'weaver-build-package-'));
    prepareFreshWeaverBuildPackage();

    let buildError: Error | undefined;
    try {
      execDotnet(
        [
          'build',
          DIAGNOSTICS_FAIL_PROJECT,
          `-p:WeaverBuildVersion=${INTEGRATION_PACKAGE_VERSION}`,
        ],
        WORKSPACE_ROOT,
        isolatedNugetEnvironment(join(tempDir, 'packages')),
      );
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
    [
      'pack',
      'Weaver.Build.csproj',
      '-o',
      'artifacts',
      `-p:PackageVersion=${INTEGRATION_PACKAGE_VERSION}`,
    ],
    join(WORKSPACE_ROOT, 'dotnet', 'Weaver.Build'),
  );
}

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
