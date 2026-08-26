import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

import type { Attr, Element } from '@xmldom/xmldom';

import { parseXml } from '../../../src/xml/parse.js';
import { XSLT30_REVISION, XSLT30_SUITE } from './overlay.js';

const SUPPORTED_ASSERTIONS = new Set(['assert-xml', 'error']);

export type Xslt30FamilyMetadata = {
  readonly name: string;
  readonly setFile: string;
  readonly testCases: number;
  readonly stylesheetReferences: number;
  readonly singleStylesheetCases: number;
  readonly supportedAssertionCases: number;
  readonly metadataShapes: number;
};

export type Xslt30MetadataInventory = {
  readonly suite: typeof XSLT30_SUITE;
  readonly revision: typeof XSLT30_REVISION;
  readonly testSets: number;
  readonly testCases: number;
  readonly stylesheetReferences: number;
  readonly distinctStylesheetFiles: number;
  readonly dependencyKinds: Readonly<Record<string, number>>;
  readonly specValues: Readonly<Record<string, number>>;
  readonly environmentBindings: Readonly<Record<string, number>>;
  readonly topLevelAssertions: Readonly<Record<string, number>>;
  readonly assertionElements: Readonly<Record<string, number>>;
  readonly metadataShapeCount: number;
  readonly metadataShapes?: Readonly<Record<string, number>>;
  readonly families: readonly Xslt30FamilyMetadata[];
};

export function inventoryXslt30Metadata(
  repositoryRoot: string,
  options: { readonly includeMetadataShapes?: boolean } = {},
): Xslt30MetadataInventory {
  const suiteRoot = resolve(repositoryRoot, 'vendor', 'xslt30-test');
  const catalogPath = resolve(suiteRoot, 'catalog.xml');
  const catalog = parseXml(readFileSync(catalogPath, 'utf8'));
  const catalogRoot = requireDocumentElement(catalog.documentElement, catalogPath);
  const setReferences = directChildElements(catalogRoot, 'test-set').map((element) => {
    const file = element.getAttribute('file');
    if (file === null || file.length === 0) {
      throw new Error('XSLT30 catalog contains a test-set without a file attribute.');
    }
    return file;
  });
  if (new Set(setReferences).size !== setReferences.length) {
    throw new Error('XSLT30 catalog contains duplicate test-set references.');
  }

  const dependencyKinds = new Map<string, number>();
  const specValues = new Map<string, number>();
  const environmentBindings = new Map<string, number>();
  const topLevelAssertions = new Map<string, number>();
  const assertionElements = new Map<string, number>();
  const metadataShapes = new Map<string, number>();
  const stylesheetFiles = new Set<string>();
  const families: Xslt30FamilyMetadata[] = [];
  let testCases = 0;
  let stylesheetReferences = 0;

  for (const setFile of setReferences) {
    const setPath = resolve(suiteRoot, setFile);
    assertPathWithin(suiteRoot, setPath, `XSLT30 test-set reference ${setFile}`);
    const document = parseXml(readFileSync(setPath, 'utf8'));
    const root = requireDocumentElement(document.documentElement, setPath);
    const familyName = root.getAttribute('name') ?? setFile;
    const familyShapes = new Set<string>();
    let familyCases = 0;
    let familyStylesheets = 0;
    let singleStylesheetCases = 0;
    let supportedAssertionCases = 0;

    for (const testCase of directChildElements(root, 'test-case')) {
      testCases += 1;
      familyCases += 1;

      const environment = directChildElements(testCase, 'environment')[0];
      const environmentBinding =
        environment === undefined
          ? 'absent'
          : environment.getAttribute('ref') === null
            ? 'inline'
            : 'referenced';
      increment(environmentBindings, environmentBinding);

      const dependencyLabels: string[] = [];
      const dependencies = directChildElements(testCase, 'dependencies')[0];
      if (dependencies !== undefined) {
        for (const dependency of childElements(dependencies)) {
          increment(dependencyKinds, localNameOf(dependency));
          dependencyLabels.push(elementFingerprint(dependency));
          if (localNameOf(dependency) === 'spec') {
            increment(specValues, dependency.getAttribute('value') || '<missing>');
          }
        }
      }

      const result = directChildElements(testCase, 'result')[0];
      const assertions = result === undefined ? [] : childElements(result);
      const assertionNames = assertions.map(localNameOf);
      for (const assertion of assertions) {
        increment(topLevelAssertions, localNameOf(assertion));
      }
      if (result !== undefined) {
        for (const assertionElement of descendantElements(result)) {
          increment(assertionElements, localNameOf(assertionElement));
        }
      }
      if (assertionNames.length === 1 && SUPPORTED_ASSERTIONS.has(assertionNames[0] ?? '')) {
        supportedAssertionCases += 1;
      }

      const stylesheets = descendantElements(testCase).filter(
        (element) => element.localName === 'stylesheet',
      );
      familyStylesheets += stylesheets.length;
      if (stylesheets.length === 1 && (stylesheets[0]?.getAttribute('file')?.length ?? 0) > 0) {
        singleStylesheetCases += 1;
      }
      for (const stylesheet of stylesheets) {
        const file = stylesheet.getAttribute('file');
        if (file === null || file.length === 0) {
          continue;
        }

        stylesheetReferences += 1;
        const stylesheetPath = resolve(dirname(setPath), file);
        assertPathWithin(
          suiteRoot,
          stylesheetPath,
          `XSLT30 stylesheet reference ${setFile} -> ${file}`,
        );
        if (!existsSync(stylesheetPath)) {
          throw new Error(`XSLT30 stylesheet reference is missing: ${setFile} -> ${file}`);
        }
        stylesheetFiles.add(relative(suiteRoot, stylesheetPath).replaceAll('\\', '/'));
      }

      const dependencyShape =
        dependencyLabels.length === 0 ? '<none>' : [...new Set(dependencyLabels)].sort().join(';');
      const assertionShape =
        assertionNames.length === 0 ? '<none>' : [...new Set(assertionNames)].sort().join('+');
      const stylesheetShape =
        stylesheets.length === 0 ? 'none' : stylesheets.length === 1 ? 'one' : 'multiple';
      const shape = `dependencies=${dependencyShape}|environment=${environmentBinding}|stylesheets=${stylesheetShape}|assertions=${assertionShape}`;
      increment(metadataShapes, shape);
      familyShapes.add(shape);
    }

    families.push({
      name: familyName,
      setFile,
      testCases: familyCases,
      stylesheetReferences: familyStylesheets,
      singleStylesheetCases,
      supportedAssertionCases,
      metadataShapes: familyShapes.size,
    });
  }

  return {
    suite: XSLT30_SUITE,
    revision: XSLT30_REVISION,
    testSets: setReferences.length,
    testCases,
    stylesheetReferences,
    distinctStylesheetFiles: stylesheetFiles.size,
    dependencyKinds: sortedRecord(dependencyKinds),
    specValues: sortedRecord(specValues),
    environmentBindings: sortedRecord(environmentBindings),
    topLevelAssertions: sortedRecord(topLevelAssertions),
    assertionElements: sortedRecord(assertionElements),
    metadataShapeCount: metadataShapes.size,
    ...(options.includeMetadataShapes === true
      ? { metadataShapes: sortedRecord(metadataShapes) }
      : {}),
    families,
  };
}

export function rankXslt30CandidateFamilies(
  inventory: Xslt30MetadataInventory,
): readonly Xslt30FamilyMetadata[] {
  return inventory.families
    .filter(
      (family) =>
        family.testCases > 0 &&
        family.testCases <= 20 &&
        family.singleStylesheetCases === family.testCases &&
        family.supportedAssertionCases === family.testCases,
    )
    .sort(
      (left, right) =>
        left.testCases - right.testCases ||
        left.metadataShapes - right.metadataShapes ||
        left.setFile.localeCompare(right.setFile),
    );
}

export function loadXslt30FamilyCaseNames(
  repositoryRoot: string,
  setFile: string,
): readonly string[] {
  const suiteRoot = resolve(repositoryRoot, 'vendor', 'xslt30-test');
  const setPath = resolve(suiteRoot, setFile);
  assertPathWithin(suiteRoot, setPath, `XSLT30 test-set reference ${setFile}`);
  const document = parseXml(readFileSync(setPath, 'utf8'));
  const root = requireDocumentElement(document.documentElement, setPath);

  return directChildElements(root, 'test-case').map(
    (testCase) => testCase.getAttribute('name') ?? '<unnamed>',
  );
}

function requireDocumentElement(element: Element | null, path: string): Element {
  if (element === null) {
    throw new Error(`XML document has no root element: ${path}`);
  }
  return element;
}

function childElements(parent: Element): Element[] {
  return Array.from(parent.childNodes).filter(
    (node): node is Element => node.nodeType === node.ELEMENT_NODE,
  );
}

function directChildElements(parent: Element, localName: string): Element[] {
  return childElements(parent).filter((element) => element.localName === localName);
}

function descendantElements(parent: Element): Element[] {
  return Array.from(parent.getElementsByTagName('*')) as Element[];
}

function elementFingerprint(element: Element): string {
  const attributes = Array.from(element.attributes)
    .map((attribute) => attribute as Attr)
    .sort((left, right) => localNameOf(left).localeCompare(localNameOf(right)))
    .map((attribute) => `${localNameOf(attribute)}=${attribute.value}`);

  return attributes.length === 0
    ? localNameOf(element)
    : `${localNameOf(element)}(${attributes.join(',')})`;
}

function localNameOf(node: Element | Attr): string {
  return node.localName ?? node.nodeName;
}

function increment(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function sortedRecord(counts: ReadonlyMap<string, number>): Readonly<Record<string, number>> {
  return Object.fromEntries(
    [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function assertPathWithin(root: string, candidate: string, label: string): void {
  const relativePath = relative(resolve(root), resolve(candidate));
  if (
    relativePath === '..' ||
    relativePath.startsWith('..\\') ||
    relativePath.startsWith('../') ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`${label} escapes the pinned suite root.`);
  }
}
