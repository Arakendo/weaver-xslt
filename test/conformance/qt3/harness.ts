import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

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
  readonly environment?: Qt3Environment;
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

export type Qt3SliceRunHeartbeat = {
  readonly label: string;
  readonly everyMs: number;
  readonly logger?: (message: string) => void;
  readonly now?: () => number;
};

export type Qt3SliceRunOptions = {
  readonly heartbeat?: Qt3SliceRunHeartbeat;
};

const documentCache = new Map<string, Document>();
const catalogRoot = requireDocumentElement(readXml('catalog.xml'), 'catalog.xml');
const globalEnvironmentIndex = loadEnvironmentIndex(catalogRoot, '.');
const catalogSetFiles = directChildElements(catalogRoot, 'test-set')
  .map((testSet) => testSet.getAttribute('file'))
  .filter((file): file is string => file !== null && file.length > 0);
const SUPPORTED_MVP2_FUNCTIONS = new Set([
  'abs',
  'avg',
  'boolean',
  'ceiling',
  'codepoints-to-string',
  'concat',
  'contains',
  'count',
  'data',
  'deep-equal',
  'distinct-values',
  'empty',
  'ends-with',
  'error',
  'exactly-one',
  'exists',
  'false',
  'floor',
  'head',
  'last',
  'local-name',
  'local-name-from-qname',
  'lower-case',
  'matches',
  'max',
  'min',
  'name',
  'node-name',
  'normalize-space',
  'not',
  'number',
  'position',
  'replace',
  'remove',
  'reverse',
  'root',
  'round',
  'starts-with',
  'string',
  'string-join',
  'string-length',
  'string-to-codepoints',
  'subsequence',
  'substring',
  'sum',
  'tail',
  'tokenize',
  'trace',
  'true',
  'upper-case',
  'qname',
]);
const NON_FUNCTION_CALL_TOKENS = new Set([
  'and',
  'array',
  'attribute',
  'comment',
  'document-node',
  'element',
  'empty-sequence',
  'else',
  'eq',
  'every',
  'except',
  'for',
  'function',
  'ge',
  'gt',
  'if',
  'in',
  'intersect',
  'item',
  'is',
  'le',
  'let',
  'lt',
  'map',
  'namespace-node',
  'ne',
  'node',
  'or',
  'processing-instruction',
  'return',
  'satisfies',
  'schema-attribute',
  'schema-element',
  'some',
  'text',
  'then',
  'to',
  'union',
]);
const FUNCTION_CALL_PATTERN = /(^|[^A-Za-z0-9_.:-])((?:[A-Za-z_][\w.-]*:)?[A-Za-z_][\w.-]*)\s*\(/g;

export function loadQt3CatalogSetFiles(): string[] {
  return [...catalogSetFiles];
}

export function loadQt3SliceCases(setFiles: readonly string[]): Qt3SliceCase[] {
  const cases: Qt3SliceCase[] = [];

  for (const setFile of setFiles) {
    const setDoc = readXml(setFile);
    const root = requireDocumentElement(setDoc, setFile);
    const setName = root.getAttribute('name') ?? setFile;
    const localEnvironments = loadEnvironmentIndex(root, dirname(setFile));

    for (const testCaseElement of directChildElements(root, 'test-case')) {
      const expression = directChildElements(testCaseElement, 'test')[0]?.textContent?.trim();
      if (expression === undefined || expression.length === 0) {
        continue;
      }

      const assertion = parseAssertion(directChildElements(testCaseElement, 'result')[0]);
      if (assertion === undefined) {
        continue;
      }

      const environmentElement = directChildElements(testCaseElement, 'environment')[0];
      const environmentRef = environmentElement?.getAttribute('ref') ?? undefined;
      const environment = environmentRef !== undefined
        ? resolveEnvironment(environmentRef, localEnvironments)
        : environmentElement === undefined
          ? undefined
          : parseEnvironmentElement(environmentElement, dirname(setFile), `${setName}:${testCaseElement.getAttribute('name') ?? '<unnamed>'}`);
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
        ...(environment === undefined ? {} : { environment }),
        ...(environmentRef === undefined ? {} : { environmentRef }),
      });
    }
  }

  return cases;
}

export function runQt3Slice(testCases: readonly Qt3SliceCase[], options: Qt3SliceRunOptions = {}): Qt3SliceRunReport {
  const failures: Qt3SliceFailure[] = [];
  const heartbeat = options.heartbeat;
  const heartbeatIntervalMs = heartbeat === undefined ? 0 : Math.max(heartbeat.everyMs, 1);
  const now = heartbeat?.now ?? Date.now;
  const heartbeatLogger = heartbeat?.logger ?? defaultQt3HeartbeatLogger;
  const startedAt = heartbeat === undefined ? 0 : now();
  let nextHeartbeatAt = heartbeat === undefined ? Number.POSITIVE_INFINITY : startedAt + heartbeatIntervalMs;
  let passed = 0;

  for (const [index, testCase] of testCases.entries()) {
    const outcome = executeQt3Case(testCase);
    if (outcome === undefined) {
      passed += 1;
    } else {
      failures.push({
        setFile: testCase.setFile,
        setName: testCase.setName,
        caseName: testCase.caseName,
        message: outcome,
      });
    }

    if (heartbeat !== undefined) {
      const currentTime = now();
      if (currentTime >= nextHeartbeatAt && index + 1 < testCases.length) {
        emitQt3Heartbeat({
          label: heartbeat.label,
          processed: index + 1,
          total: testCases.length,
          passed,
          failed: failures.length,
          elapsedMs: currentTime - startedAt,
          logger: heartbeatLogger,
        });

        while (currentTime >= nextHeartbeatAt) {
          nextHeartbeatAt += heartbeatIntervalMs;
        }
      }
    }
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

function emitQt3Heartbeat(input: {
  readonly label: string;
  readonly processed: number;
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly elapsedMs: number;
  readonly logger: (message: string) => void;
}): void {
  input.logger(
    `  heartbeat ${input.label}: ${input.processed}/${input.total} cases, ${input.passed} passed, ${input.failed} failed, ${formatHeartbeatElapsed(input.elapsedMs)} elapsed`,
  );
}

function formatHeartbeatElapsed(elapsedMs: number): string {
  if (elapsedMs < 60_000) {
    return `${(elapsedMs / 1000).toFixed(1)}s`;
  }

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function defaultQt3HeartbeatLogger(message: string): void {
  // eslint-disable-next-line no-console
  console.log(message);
}

export function isPotentiallySupportedXPathCase(testCase: Qt3SliceCase): boolean {
  if (testCase.hasUnsupportedEnvironment) {
    return false;
  }

  for (const dependency of testCase.dependencies) {
    if (dependency.type === 'spec' && !supportsXPath31SpecDependency(dependency.value)) {
      return false;
    }

    if (dependency.type === 'xsd-version' && dependency.value !== '1.0') {
      return false;
    }

    if (dependency.type === 'xml-version' && dependency.value !== '1.0') {
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

function supportsXPath31SpecDependency(value: string): boolean {
  const tokens = value.split(/\s+/).filter((token) => token.length > 0);
  const xpathTokens = tokens.filter((token) => /^XP/i.test(token));

  if (xpathTokens.length === 0) {
    return !tokens.some((token) => /^XQ/i.test(token));
  }

  return xpathTokens.some((token) => {
    const match = /^XP(\d+)(\+)?$/i.exec(token);
    if (match === null) {
      return false;
    }

    const version = Number(match[1]);
    if (Number.isNaN(version)) {
      return false;
    }

    return match[2] === '+' ? version <= 31 : version === 31;
  });
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
  const environment = testCase.environment ?? resolveEnvironment(testCase.environmentRef);
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
  if (atomic.type === 'xs:double') {
    if (atomic.lexicalForm !== undefined) {
      return atomic.lexicalForm;
    }
    return formatComparableDouble(atomic.value as number);
  }

  return String(atomic.value);
}

function formatComparableDouble(value: number): string {
  if (Number.isNaN(value)) {
    return 'NaN';
  }

  if (value === Number.POSITIVE_INFINITY) {
    return 'INF';
  }

  if (value === Number.NEGATIVE_INFINITY) {
    return '-INF';
  }

  if (Object.is(value, -0) || value === 0) {
    return '0';
  }

  const absolute = Math.abs(value);
  if (absolute >= 1_000_000 || absolute < 0.000001) {
    return value
      .toExponential()
      .replace('e', 'E')
      .replace(/E\+/, 'E')
      .replace(/(\.\d*?)0+E/, '$1E')
      .replace(/\.E/, 'E')
      .replace(/E(-?)0+(\d+)/, 'E$1$2');
  }

  return String(value);
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

function loadEnvironmentIndex(root: Element, baseDirectory: string): ReadonlyMap<string, Qt3Environment> {
  const environments = new Map<string, Qt3Environment>();

  for (const environmentElement of directChildElements(root, 'environment')) {
    const name = environmentElement.getAttribute('name');
    if (name === null || name.length === 0) {
      continue;
    }

    environments.set(name, parseEnvironmentElement(environmentElement, baseDirectory, name));
  }

  return environments;
}

function parseEnvironmentElement(environmentElement: Element, baseDirectory: string, name: string): Qt3Environment {
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
        sources.push({ role, file: normalize(join(baseDirectory, file)), validation });
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

  return {
    name,
    namespaces,
    defaultElementNamespace,
    sources,
    hasUnsupportedConfig,
  };
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

  for (const callee of collectFunctionCallCandidates(expression)) {
    if (!isSupportedMvp2FunctionCall(callee)) {
      return false;
    }
  }

  return true;
}

function collectFunctionCallCandidates(expression: string): string[] {
  const candidates: string[] = [];
  const sanitizedExpression = stripXPathStringLiterals(expression);

  for (const match of sanitizedExpression.matchAll(FUNCTION_CALL_PATTERN)) {
    const callee = match[2];
    if (callee !== undefined) {
      candidates.push(callee);
    }
  }

  return candidates;
}

function isSupportedMvp2FunctionCall(callee: string): boolean {
  const normalized = callee.toLowerCase();

  if (NON_FUNCTION_CALL_TOKENS.has(normalized)) {
    return true;
  }

  const separatorIndex = normalized.indexOf(':');
  if (separatorIndex >= 0) {
    const prefix = normalized.slice(0, separatorIndex);
    const localName = normalized.slice(separatorIndex + 1);
    return prefix === 'fn' && SUPPORTED_MVP2_FUNCTIONS.has(localName);
  }

  return SUPPORTED_MVP2_FUNCTIONS.has(normalized);
}

function stripXPathStringLiterals(expression: string): string {
  let sanitized = '';
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];
    if (character === undefined) {
      break;
    }

    if (quote === null) {
      if (character === '"' || character === "'") {
        quote = character;
        sanitized += ' ';
        continue;
      }

      sanitized += character;
      continue;
    }

    if (character === quote) {
      const nextCharacter = expression[index + 1];
      if (nextCharacter === quote) {
        sanitized += '  ';
        index += 1;
        continue;
      }

      quote = null;
    }

    sanitized += ' ';
  }

  return sanitized;
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