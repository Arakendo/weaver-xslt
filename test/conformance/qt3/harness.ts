import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Element, Node } from '@xmldom/xmldom';

import type { DynamicContext } from '../../../src/xpath/eval/context.js';
import { evaluate } from '../../../src/xpath/eval/evaluator.js';
import { parseXPath } from '../../../src/xpath/parse/parser.js';
import { parseXml, type Document } from '../../../src/xml/parse.js';
import { createXdmNode, type XdmAtomicValue, type XdmItem, type XdmNode } from '../../../src/xdm/types.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const QT3_ROOT = join(REPO_ROOT, 'vendor', 'qt3tests');

type Qt3Dependency = {
  readonly type: string;
  readonly value: string;
};

type Qt3Assertion =
  | {
      readonly kind: 'assert-string-value';
      readonly expected: string;
      readonly normalizeSpace: boolean;
    }
  | {
      readonly kind: 'assert-eq';
      readonly expectedExpression: string;
    }
  | {
      readonly kind: 'assert-true' | 'assert-false' | 'assert-empty';
    }
  | {
      readonly kind: 'assert-count';
      readonly expectedCount: number;
    }
  | {
      readonly kind: 'error';
      readonly expectedCode: string;
    };

type Qt3Environment = {
  readonly name: string;
  readonly namespaces: ReadonlyMap<string, string>;
  readonly defaultElementNamespace: string;
  readonly sources: readonly Qt3EnvironmentSource[];
  readonly hasUnsupportedConfig: boolean;
};

type Qt3EnvironmentSource = {
  readonly role: string;
  readonly file: string;
  readonly validation: string | null;
};

export type Qt3SliceCase = {
  readonly setFile: string;
  readonly setName: string;
  readonly caseName: string;
  readonly expression: string;
  readonly assertion: Qt3Assertion;
  readonly environmentRef?: string;
  readonly dependencies: readonly Qt3Dependency[];
  readonly hasUnsupportedEnvironment: boolean;
};

export type Qt3SliceFailure = {
  readonly setFile: string;
  readonly setName: string;
  readonly caseName: string;
  readonly message: string;
};

export type Qt3FailureCluster = {
  readonly setFile: string;
  readonly setName: string;
  readonly total: number;
  readonly failures: number;
  readonly sampleCase: string;
  readonly sampleMessage: string;
};

export type Qt3SliceRunReport = {
  readonly discovered: number;
  readonly included: number;
  readonly passed: number;
  readonly failed: number;
  readonly failures: readonly Qt3SliceFailure[];
  readonly clusters: readonly Qt3FailureCluster[];
};

const documentCache = new Map<string, Document>();
const globalEnvironmentIndex = loadEnvironmentIndex(requireDocumentElement(readXml('catalog.xml'), 'catalog.xml'));

export function loadQt3SliceCases(setFiles: readonly string[]): Qt3SliceCase[] {
  const cases: Qt3SliceCase[] = [];

  for (const setFile of setFiles) {
    const setDoc = readXml(setFile);
    const root = requireDocumentElement(setDoc, setFile);
    const setName = root.getAttribute('name') ?? setFile;
    const localEnvironments = loadEnvironmentIndex(root);

    for (const testCaseElement of directChildElements(root, 'test-case')) {
      const expression = directChildElements(testCaseElement, 'test')[0]?.textContent?.trim();
      if (expression === undefined || expression.length === 0) {
        continue;
      }

      const assertion = parseAssertion(directChildElements(testCaseElement, 'result')[0]);
      if (assertion === undefined) {
        continue;
      }

      const environmentRef = directChildElements(testCaseElement, 'environment')[0]?.getAttribute('ref') ?? undefined;
      const environment = resolveEnvironment(environmentRef, localEnvironments);
      const dependencies = directChildElements(testCaseElement, 'dependency').map((dependency) => ({
        type: dependency.getAttribute('type') ?? '',
        value: dependency.getAttribute('value') ?? '',
      }));

      cases.push({
        setFile,
        setName,
        caseName: testCaseElement.getAttribute('name') ?? '<unnamed>',
        expression,
        assertion,
        dependencies,
        hasUnsupportedEnvironment: environment?.hasUnsupportedConfig ?? false,
        ...(environmentRef === undefined ? {} : { environmentRef }),
      });
    }
  }

  return cases;
}

export function runQt3Slice(testCases: readonly Qt3SliceCase[]): Qt3SliceRunReport {
  const failures: Qt3SliceFailure[] = [];
  let passed = 0;

  for (const testCase of testCases) {
    const outcome = executeQt3Case(testCase);
    if (outcome === undefined) {
      passed += 1;
      continue;
    }

    failures.push({
      setFile: testCase.setFile,
      setName: testCase.setName,
      caseName: testCase.caseName,
      message: outcome,
    });
  }

  return {
    discovered: testCases.length,
    included: testCases.length,
    passed,
    failed: failures.length,
    failures,
    clusters: summarizeFailureClusters(testCases, failures),
  };
}

export function isPotentiallySupportedXPathCase(testCase: Qt3SliceCase): boolean {
  if (testCase.hasUnsupportedEnvironment) {
    return false;
  }

  for (const dependency of testCase.dependencies) {
    if (dependency.type === 'spec' && /^XQ/i.test(dependency.value)) {
      return false;
    }

    if (dependency.type === 'xsd-version' && dependency.value !== '1.0') {
      return false;
    }

    if (dependency.type === 'feature' && /schemaValidation|staticTyping|higherOrderFunctions|moduleImport/i.test(dependency.value)) {
      return false;
    }
  }

  if (!isPotentiallySupportedXPathExpression(testCase.expression)) {
    return false;
  }

  return testCase.assertion.kind !== 'assert-eq'
    || isPotentiallySupportedXPathExpression(testCase.assertion.expectedExpression);
}

function executeQt3Case(testCase: Qt3SliceCase): string | undefined {
  try {
    const context = createContext(testCase);
    const actualItems = [...evaluate(parseXPath(testCase.expression), context)];

    switch (testCase.assertion.kind) {
      case 'assert-string-value': {
        const actual = actualItems.map(itemToComparableString).join(' ');
        const expected = testCase.assertion.normalizeSpace
          ? normalizeSpace(testCase.assertion.expected)
          : testCase.assertion.expected;
        const comparable = testCase.assertion.normalizeSpace ? normalizeSpace(actual) : actual;
        return comparable === expected
          ? undefined
          : `expected string ${JSON.stringify(expected)} but received ${JSON.stringify(comparable)}`;
      }
      case 'assert-eq': {
        const expected = evaluateToComparableString(testCase.assertion.expectedExpression, context);
        const actual = actualItems.map(itemToComparableString).join(' ');
        return actual === expected
          ? undefined
          : `expected eq ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`;
      }
      case 'assert-true': {
        const actual = actualItems.map(itemToComparableString).join(' ');
        return actual === 'true' ? undefined : `expected true but received ${JSON.stringify(actual)}`;
      }
      case 'assert-false': {
        const actual = actualItems.map(itemToComparableString).join(' ');
        return actual === 'false' ? undefined : `expected false but received ${JSON.stringify(actual)}`;
      }
      case 'assert-empty':
        return actualItems.length === 0 ? undefined : `expected empty sequence but received ${actualItems.length} item(s)`;
      case 'assert-count':
        return actualItems.length === testCase.assertion.expectedCount
          ? undefined
          : `expected count ${testCase.assertion.expectedCount} but received ${actualItems.length}`;
      case 'error':
        return `expected ${testCase.assertion.expectedCode} but evaluation succeeded`;
    }
  } catch (error) {
    if (testCase.assertion.kind === 'error') {
      const actualCode = error instanceof Error && 'code' in error ? String(error.code ?? '') : '';
      return actualCode === testCase.assertion.expectedCode
        ? undefined
        : `expected error ${testCase.assertion.expectedCode} but received ${actualCode || (error as Error).message}`;
    }

    return error instanceof Error ? error.message : String(error);
  }
}

function createContext(testCase: Qt3SliceCase): DynamicContext {
  const environment = resolveEnvironment(testCase.environmentRef);
  const variables = new Map<string, unknown>();
  let contextItem: unknown = null;
  let contextPosition = 0;
  let contextSize = 0;

  if (environment !== undefined) {
    for (const source of environment.sources) {
      const document = createXdmNode(readXml(source.file));
      if (source.role === '.') {
        contextItem = document;
        contextPosition = 1;
        contextSize = 1;
        continue;
      }

      if (source.role.startsWith('$')) {
        variables.set(source.role.slice(1), document);
      }
    }
  }

  return {
    staticContext: {
      namespaces: new Map(environment?.namespaces ?? []),
      defaultElementNamespace: environment?.defaultElementNamespace ?? '',
    },
    contextItem,
    contextPosition,
    contextSize,
    variables,
  };
}

function evaluateToComparableString(expression: string, context: DynamicContext): string {
  const items = [...evaluate(parseXPath(expression), context)];
  return items.map(itemToComparableString).join(' ');
}

function itemToComparableString(item: XdmItem): string {
  if ((item as XdmNode).xdmKind === 'node') {
    return ((item as XdmNode).node.textContent ?? '').trim();
  }

  const atomic = item as XdmAtomicValue;
  return String(atomic.value);
}

function parseAssertion(resultElement: Element | undefined): Qt3Assertion | undefined {
  const assertionElement = resultElement === undefined ? undefined : directChildElements(resultElement)[0];
  if (assertionElement === undefined) {
    return undefined;
  }

  switch (localNameOf(assertionElement)) {
    case 'assert-string-value':
      return {
        kind: 'assert-string-value',
        expected: assertionElement.textContent ?? '',
        normalizeSpace: assertionElement.getAttribute('normalize-space') === 'true',
      };
    case 'assert-eq': {
      const expectedExpression = assertionElement.textContent?.trim();
      return expectedExpression === undefined || expectedExpression.length === 0
        ? undefined
        : { kind: 'assert-eq', expectedExpression };
    }
    case 'assert-true':
      return { kind: 'assert-true' };
    case 'assert-false':
      return { kind: 'assert-false' };
    case 'assert-empty':
      return { kind: 'assert-empty' };
    case 'assert-count': {
      const rawCount = assertionElement.textContent?.trim();
      const expectedCount = rawCount === undefined ? Number.NaN : Number(rawCount);
      return Number.isInteger(expectedCount) ? { kind: 'assert-count', expectedCount } : undefined;
    }
    case 'error': {
      const expectedCode = assertionElement.getAttribute('code') ?? '';
      return expectedCode.length === 0 ? undefined : { kind: 'error', expectedCode };
    }
    default:
      return undefined;
  }
}

function readXml(relativePath: string): Document {
  const cached = documentCache.get(relativePath);
  if (cached !== undefined) {
    return cached;
  }

  const document = parseXml(readFileSync(join(QT3_ROOT, relativePath), 'utf8'));
  documentCache.set(relativePath, document);
  return document;
}

function requireDocumentElement(document: Document, relativePath: string): Element {
  if (document.documentElement === null) {
    throw new Error(`QT3 document ${relativePath} is missing a document element.`);
  }

  return document.documentElement;
}

function resolveEnvironment(
  environmentRef: string | undefined,
  localEnvironments?: ReadonlyMap<string, Qt3Environment>,
): Qt3Environment | undefined {
  if (environmentRef === undefined) {
    return undefined;
  }

  return localEnvironments?.get(environmentRef) ?? globalEnvironmentIndex.get(environmentRef);
}

function loadEnvironmentIndex(root: Element): ReadonlyMap<string, Qt3Environment> {
  const environments = new Map<string, Qt3Environment>();

  for (const environmentElement of directChildElements(root, 'environment')) {
    const name = environmentElement.getAttribute('name');
    if (name === null || name.length === 0) {
      continue;
    }

    const namespaces = new Map<string, string>();
    let defaultElementNamespace = '';
    const sources: Qt3EnvironmentSource[] = [];
    let hasUnsupportedConfig = false;

    for (const child of directChildElements(environmentElement)) {
      switch (localNameOf(child)) {
        case 'namespace': {
          const prefix = child.getAttribute('prefix') ?? '';
          const uri = child.getAttribute('uri') ?? '';
          namespaces.set(prefix, uri);
          if (prefix.length === 0) {
            defaultElementNamespace = uri;
          }
          break;
        }
        case 'source': {
          const role = child.getAttribute('role') ?? '';
          const file = child.getAttribute('file') ?? '';
          const validation = child.getAttribute('validation');
          if (role.length === 0 || file.length === 0) {
            hasUnsupportedConfig = true;
            break;
          }
          if (validation !== null && validation !== 'skip') {
            hasUnsupportedConfig = true;
          }
          sources.push({ role, file, validation });
          break;
        }
        case 'description':
        case 'created':
        case 'modified':
          break;
        default:
          hasUnsupportedConfig = true;
          break;
      }
    }

    environments.set(name, {
      name,
      namespaces,
      defaultElementNamespace,
      sources,
      hasUnsupportedConfig,
    });
  }

  return environments;
}

function summarizeFailureClusters(
  testCases: readonly Qt3SliceCase[],
  failures: readonly Qt3SliceFailure[],
): Qt3FailureCluster[] {
  const totals = new Map<string, { setName: string; total: number }>();
  for (const testCase of testCases) {
    const existing = totals.get(testCase.setFile);
    if (existing === undefined) {
      totals.set(testCase.setFile, { setName: testCase.setName, total: 1 });
      continue;
    }
    existing.total += 1;
  }

  const clusters = new Map<string, Qt3FailureCluster>();
  for (const failure of failures) {
    const total = totals.get(failure.setFile)?.total ?? 0;
    const existing = clusters.get(failure.setFile);
    if (existing === undefined) {
      clusters.set(failure.setFile, {
        setFile: failure.setFile,
        setName: failure.setName,
        total,
        failures: 1,
        sampleCase: failure.caseName,
        sampleMessage: failure.message,
      });
      continue;
    }

    clusters.set(failure.setFile, {
      ...existing,
      failures: existing.failures + 1,
    });
  }

  return [...clusters.values()].sort((left, right) => {
    if (right.failures !== left.failures) {
      return right.failures - left.failures;
    }
    return left.setFile.localeCompare(right.setFile);
  });
}

function isPotentiallySupportedXPathExpression(expression: string): boolean {
  if (/\bdeclare\b|\bimport\b/i.test(expression)) {
    return false;
  }

  if (/\bcurrent-(?:date|time|dateTime)\s*\(|\bimplicit-timezone\s*\(/i.test(expression)) {
    return false;
  }

  if (/collation\/|html-ascii-case-insensitive/i.test(expression)) {
    return false;
  }

  if (/\bxs:[A-Za-z_][\w.-]*\s*\(/.test(expression)) {
    return false;
  }

  if (/\bwhere\b|\border by\b|\bgroup by\b|\bstable order by\b/i.test(expression)) {
    return false;
  }

  if (/\btypeswitch\b|\bswitch\b|\btry\b|\bcatch\b|\bvalidate\b|\bcopy\b|\bmodify\b/i.test(expression)) {
    return false;
  }

  if (/=>|#\d+|\bfunction\s*\(/.test(expression)) {
    return false;
  }

  if (/\binstance of\b|\btreat as\b|\bcastable as\b|\bcast as\b/i.test(expression)) {
    return false;
  }

  if (/\$[A-Za-z_][\w.-]*\s+as\s+/i.test(expression)) {
    return false;
  }

  if (/<[A-Za-z!/]|\{[^}]*\}/.test(expression)) {
    return false;
  }

  return true;
}

function directChildElements(parent: Node, expectedLocalName?: string): Element[] {
  const elements: Element[] = [];

  for (let child = parent.firstChild; child !== null; child = child.nextSibling) {
    if (child.nodeType !== 1) {
      continue;
    }

    const element = child as Element;
    if (expectedLocalName === undefined || localNameOf(element) === expectedLocalName) {
      elements.push(element);
    }
  }

  return elements;
}

function localNameOf(element: Element): string {
  return element.localName ?? element.tagName.replace(/^.*:/, '');
}

function normalizeSpace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}