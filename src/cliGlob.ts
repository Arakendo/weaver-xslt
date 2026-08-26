import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function globSync(
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

export function createGlobMatcher(pattern: string): (candidatePath: string) => boolean {
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

export function findGlobBaseDirectory(pattern: string): string {
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

export function hasGlobMagic(value: string): boolean {
  return value.includes('*') || value.includes('?');
}

export function testPath(value: string): string {
  return value.replaceAll('\\', '/');
}

function escapeRegexCharacter(character: string): string {
  return /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character;
}
