import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

import type { Element, Node } from '@xmldom/xmldom';

import { parseXml } from '../../src/xml/parse.js';

export type ConformanceSourceDefinition = {
  readonly name: string;
  readonly relativePath: string;
  readonly revision: string;
  readonly expectedTestSets: number;
  readonly expectedTestCases: number;
};

export type ConformanceSourceInventory = ConformanceSourceDefinition & {
  readonly catalog: string;
  readonly testSetReferences: number;
  readonly distinctTestSets: number;
  readonly testCases: number;
};

export const CONFORMANCE_SOURCES: readonly ConformanceSourceDefinition[] = [
  {
    name: 'QT3',
    relativePath: 'vendor/qt3tests',
    revision: '83993587711dbd5c18ed846385ec37d079d6e492',
    expectedTestSets: 428,
    expectedTestCases: 31_821,
  },
  {
    name: 'XSLT 3.0',
    relativePath: 'vendor/xslt30-test',
    revision: '6f8fd9e966ae74a251a2604abef9d904c7bc5c9b',
    expectedTestSets: 234,
    expectedTestCases: 14_600,
  },
] as const;

export function verifyConformanceSources(repositoryRoot: string): void {
  for (const source of CONFORMANCE_SOURCES) {
    const sourceRoot = resolve(repositoryRoot, source.relativePath);
    const catalogPath = resolve(sourceRoot, 'catalog.xml');
    if (!existsSync(catalogPath)) {
      throw new Error(
        `${source.name} is not initialized at ${source.relativePath}; run git submodule update --init --recursive.`,
      );
    }

    const safeDirectory = sourceRoot.replaceAll('\\', '/');
    const actualRevision = runGit(sourceRoot, safeDirectory, ['rev-parse', 'HEAD']);
    if (actualRevision !== source.revision) {
      throw new Error(`${source.name} is at ${actualRevision}; expected ${source.revision}.`);
    }

    const changes = runGit(sourceRoot, safeDirectory, ['status', '--porcelain']);
    if (changes.length > 0) {
      throw new Error(
        `${source.name} contains local changes; keep upstream suites immutable and use Weaver overlays.`,
      );
    }
  }
}

export function inventoryConformanceSources(
  repositoryRoot: string,
  sources: readonly ConformanceSourceDefinition[] = CONFORMANCE_SOURCES,
): readonly ConformanceSourceInventory[] {
  return sources.map((source) => inventoryConformanceSource(repositoryRoot, source));
}

function inventoryConformanceSource(
  repositoryRoot: string,
  source: ConformanceSourceDefinition,
): ConformanceSourceInventory {
  const sourceRoot = resolve(repositoryRoot, source.relativePath);
  const catalogPath = resolve(sourceRoot, 'catalog.xml');
  if (!existsSync(catalogPath)) {
    throw new Error(`${source.name} catalog is missing: ${catalogPath}`);
  }

  const catalog = parseXml(readFileSync(catalogPath, 'utf8'));
  const catalogRoot = catalog.documentElement;
  if (catalogRoot === null) {
    throw new Error(`${source.name} catalog has no document element.`);
  }
  const references = directChildElements(catalogRoot, 'test-set').map((element) => {
    const file = element.getAttribute('file');
    if (file === null || file.length === 0) {
      throw new Error(`${source.name} catalog contains a test-set without a file attribute.`);
    }
    return file;
  });
  const distinctReferences = new Set(references);
  if (references.length === 0) {
    throw new Error(`${source.name} catalog contains no test-set references.`);
  }
  if (distinctReferences.size !== references.length) {
    throw new Error(`${source.name} catalog contains duplicate test-set references.`);
  }

  let testCases = 0;
  for (const reference of distinctReferences) {
    const testSetPath = resolve(dirname(catalogPath), reference);
    assertPathWithin(sourceRoot, testSetPath, `${source.name} test-set reference ${reference}`);
    if (!existsSync(testSetPath)) {
      throw new Error(`${source.name} catalog references missing test set ${reference}.`);
    }

    const testSet = parseXml(readFileSync(testSetPath, 'utf8'));
    testCases += testSet.getElementsByTagName('test-case').length;
  }

  if (distinctReferences.size !== source.expectedTestSets) {
    throw new Error(
      `${source.name} has ${distinctReferences.size} test sets; expected ${source.expectedTestSets}.`,
    );
  }
  if (testCases !== source.expectedTestCases) {
    throw new Error(`${source.name} has ${testCases} cases; expected ${source.expectedTestCases}.`);
  }

  return {
    ...source,
    catalog: `${source.relativePath}/catalog.xml`,
    testSetReferences: references.length,
    distinctTestSets: distinctReferences.size,
    testCases,
  };
}

function directChildElements(parent: Element, localName: string): Element[] {
  const elements: Element[] = [];
  for (const child of Array.from(parent.childNodes) as Node[]) {
    if (child.nodeType === child.ELEMENT_NODE && child.localName === localName) {
      elements.push(child as Element);
    }
  }
  return elements;
}

function assertPathWithin(root: string, candidate: string, label: string): void {
  const relativePath = relative(resolve(root), resolve(candidate));
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..\\`) ||
    relativePath.startsWith('../') ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`${label} escapes the pinned suite root.`);
  }
}

function runGit(sourceRoot: string, safeDirectory: string, arguments_: readonly string[]): string {
  return execFileSync(
    'git',
    ['-c', `safe.directory=${safeDirectory}`, '-C', sourceRoot, ...arguments_],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
}
