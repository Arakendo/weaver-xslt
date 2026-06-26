import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import { XMLSerializer, type Element, type Node } from '@xmldom/xmldom';

import { loadExtensionFunctionCatalog } from './extensionFunctions.js';
import { parseXml } from '../xml/parse.js';
import { normalizeXsltQName } from '../xslt/compile/xsltNameResolution.js';
import {
  compileStylesheetRuntimeArtifacts as compileStylesheetRuntimeArtifactsCore,
  createStylesheetDigest,
  type CompileStylesheetArtifacts,
  type CompilePerformancePhase,
  type CompileStylesheetRuntimeArtifacts,
  type EmitTarget,
} from './runtimeArtifacts.js';

export { createStylesheetDigest };
export type {
  CompileIrStats,
  CompileMemoryUsageSnapshot,
  CompilePerformancePhase,
  CompilePerformanceProfile,
  CompileStylesheetArtifacts,
  CompileStylesheetRuntimeArtifacts,
  EmitTarget,
} from './runtimeArtifacts.js';

const XSLT_NAMESPACE = 'http://www.w3.org/1999/XSL/Transform';

type ImportPrecedence = readonly number[];

interface ComposedTopLevelEntry {
  readonly xml: string;
  readonly precedence: ImportPrecedence;
  readonly duplicateKey?: string;
  readonly summaryKey?: string;
}

export interface ComposedStylesheetDuplicateSummary {
  readonly key: string;
  readonly occurrencesBeforePrune: number;
  readonly occurrencesAfterPrune: number;
  readonly droppedOccurrences: number;
}

export interface ComposedStylesheetSummary {
  readonly stylesheetPath: string;
  readonly topLevelEntriesBeforePrune: number;
  readonly topLevelEntriesAfterPrune: number;
  readonly droppedDuplicateEntries: number;
  readonly duplicateSummaries: readonly ComposedStylesheetDuplicateSummary[];
}

export interface CompileStylesheetToTsOptions {
  readonly path?: string;
  readonly filePath?: string;
  readonly runtimeModuleSpecifier?: string;
  readonly sampleDocument?: string;
  readonly onProgress?: (message: string) => void;
  readonly captureProfile?: boolean;
  readonly captureIrStats?: boolean;
  /** Additional emit targets beyond the default TS module. e.g. ['js'] for JS emission. */
  readonly emitTargets?: EmitTarget[];
}

export interface CompileStylesheetArtifactsFromFileOptions {
  readonly runtimeModuleSpecifier?: string;
  readonly sampleDocumentPath?: string;
  readonly onProgress?: (message: string) => void;
  readonly captureProfile?: boolean;
  readonly captureIrStats?: boolean;
  /** Additional emit targets beyond the default TS module. e.g. ['js'] for JS emission. */
  readonly emitTargets?: EmitTarget[];
}

export function compileStylesheetToTs(
  stylesheetSource: string,
  options: CompileStylesheetToTsOptions = {},
): string {
  return compileStylesheetArtifacts(stylesheetSource, options).module;
}

export function compileStylesheetToDts(
  stylesheetSource: string,
  options: CompileStylesheetToTsOptions = {},
): string {
  return compileStylesheetArtifacts(stylesheetSource, options).declaration;
}

export function compileStylesheetArtifacts(
  stylesheetSource: string,
  options: CompileStylesheetToTsOptions = {},
): CompileStylesheetArtifacts {
  const artifacts = compileStylesheetRuntimeArtifacts(stylesheetSource, options);
  return {
    module: artifacts.module,
    declaration: artifacts.declaration,
    digest: artifacts.digest,
    sourceMap: artifacts.sourceMap,
    diagnostics: artifacts.diagnostics,
    ...(artifacts.profile === undefined ? {} : { profile: artifacts.profile }),
    ...(artifacts.irStats === undefined ? {} : { irStats: artifacts.irStats }),
  };
}

export function compileStylesheetRuntimeArtifacts(
  stylesheetSource: string,
  options: CompileStylesheetToTsOptions = {},
): CompileStylesheetRuntimeArtifacts {
  return compileStylesheetRuntimeArtifactsCore(stylesheetSource, {
    ...(options.path === undefined ? {} : { path: options.path }),
    ...(options.filePath === undefined ? {} : { filePath: options.filePath }),
    ...(options.path === undefined && options.filePath === undefined
      ? {}
      : { sourceName: options.path ?? basename(options.filePath!) }),
    ...(options.runtimeModuleSpecifier === undefined
      ? {}
      : { runtimeModuleSpecifier: options.runtimeModuleSpecifier }),
    ...(options.sampleDocument === undefined ? {} : { sampleDocument: options.sampleDocument }),
    ...(options.filePath === undefined
      ? {}
      : { extensionFunctions: loadExtensionFunctionCatalog(options.filePath) }),
    ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
    ...(options.captureProfile === undefined ? {} : { captureProfile: options.captureProfile }),
    ...(options.captureIrStats === undefined ? {} : { captureIrStats: options.captureIrStats }),
    ...(options.emitTargets === undefined ? {} : { emitTargets: options.emitTargets }),
  });
}

export function compileStylesheetArtifactsFromFile(
  stylesheetPath: string,
  options: CompileStylesheetArtifactsFromFileOptions = {},
): CompileStylesheetArtifacts {
  const totalStartTime = options.captureProfile ? performance.now() : undefined;
  const composeStartTime = options.captureProfile ? performance.now() : undefined;
  const composeMemoryBefore = options.captureProfile ? sampleMemoryUsage() : undefined;
  const resolvedStylesheetPath = resolve(stylesheetPath);
  options.onProgress?.(`Composing stylesheet source from ${resolvedStylesheetPath}`);
  const stylesheetSource = composeStylesheetSourceFromFile(resolvedStylesheetPath);
  const composeElapsedMs =
    composeStartTime === undefined ? undefined : performance.now() - composeStartTime;
  const composeMemoryAfter = options.captureProfile ? sampleMemoryUsage() : undefined;
  const sampleDocument =
    options.sampleDocumentPath === undefined
      ? undefined
      : readFileSync(resolve(options.sampleDocumentPath), 'utf8');

  const artifacts = compileStylesheetArtifacts(stylesheetSource, {
    path: basename(resolvedStylesheetPath),
    filePath: resolvedStylesheetPath,
    ...(options.runtimeModuleSpecifier === undefined
      ? {}
      : { runtimeModuleSpecifier: options.runtimeModuleSpecifier }),
    ...(sampleDocument === undefined ? {} : { sampleDocument }),
    ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
    ...(options.captureProfile === undefined ? {} : { captureProfile: options.captureProfile }),
    ...(options.captureIrStats === undefined ? {} : { captureIrStats: options.captureIrStats }),
    ...(options.emitTargets === undefined ? {} : { emitTargets: options.emitTargets }),
  });

  if (
    options.captureProfile !== true ||
    artifacts.profile === undefined ||
    composeElapsedMs === undefined ||
    totalStartTime === undefined
  ) {
    return artifacts;
  }

  const composePhase: CompilePerformancePhase = {
    key: 'compose',
    label: 'Composing stylesheet source',
    elapsedMs: composeElapsedMs,
    ...(composeMemoryBefore === undefined ? {} : { memoryBefore: composeMemoryBefore }),
    ...(composeMemoryAfter === undefined ? {} : { memoryAfter: composeMemoryAfter }),
  };

  return {
    ...artifacts,
    profile: {
      totalElapsedMs: performance.now() - totalStartTime,
      phases: [composePhase, ...artifacts.profile.phases],
    },
  };
}

function sampleMemoryUsage():
  | {
      readonly rss: number;
      readonly heapTotal: number;
      readonly heapUsed: number;
      readonly external: number;
      readonly arrayBuffers: number;
    }
  | undefined {
  const processValue = (
    globalThis as typeof globalThis & {
      process?: { memoryUsage?: () => NodeJS.MemoryUsage };
    }
  ).process;

  if (typeof processValue?.memoryUsage !== 'function') {
    return undefined;
  }

  const memoryUsage = processValue.memoryUsage();
  return {
    rss: memoryUsage.rss,
    heapTotal: memoryUsage.heapTotal,
    heapUsed: memoryUsage.heapUsed,
    external: memoryUsage.external,
    arrayBuffers: memoryUsage.arrayBuffers,
  };
}

export function composeStylesheetSourceFromFile(stylesheetPath: string): string {
  return composeStylesheetSourceDetailsFromFile(stylesheetPath).source;
}

export function summarizeComposedStylesheetFromFile(
  stylesheetPath: string,
): ComposedStylesheetSummary {
  const details = composeStylesheetSourceDetailsFromFile(stylesheetPath);
  return details.summary;
}

function composeStylesheetSourceDetailsFromFile(stylesheetPath: string): {
  readonly source: string;
  readonly summary: ComposedStylesheetSummary;
} {
  const { root, sourceName, source } = loadStylesheetRoot(stylesheetPath);
  const resolvedStylesheetPath = resolve(stylesheetPath);
  if (!isStylesheetRoot(root) || !hasCompositionChildren(root)) {
    return {
      source,
      summary: {
        stylesheetPath: resolvedStylesheetPath,
        topLevelEntriesBeforePrune: 0,
        topLevelEntriesAfterPrune: 0,
        droppedDuplicateEntries: 0,
        duplicateSummaries: [],
      },
    };
  }

  const serializer = new XMLSerializer();
  const activePaths = new Set<string>();
  activePaths.add(stylesheetPath);
  try {
    const entries = composeStylesheetChildren(
      root,
      source,
      dirname(stylesheetPath),
      serializer,
      activePaths,
      [],
    );
    const prunedEntries = pruneLowerPrecedenceDuplicates(entries);
    const children = prunedEntries.map((entry) => entry.xml).join('');
    return {
      source: `<${root.nodeName}${serializeAttributes(root)}>${children}</${root.nodeName}>`,
      summary: createComposedStylesheetSummary(resolvedStylesheetPath, entries, prunedEntries),
    };
  } catch (error) {
    if (error instanceof Error && error.message === '__WEAVER_COMPOSE_RECURSION__') {
      throw new Error(
        `Circular xsl:include/xsl:import reference detected while composing ${sourceName}.`,
      );
    }
    throw error;
  } finally {
    activePaths.delete(stylesheetPath);
  }
}

function composeStylesheetChildren(
  root: Element,
  stylesheetSource: string,
  baseDir: string,
  serializer: XMLSerializer,
  activePaths: Set<string>,
  precedence: ImportPrecedence,
): readonly ComposedTopLevelEntry[] {
  const entries: ComposedTopLevelEntry[] = [];
  let importOrdinal = 0;

  for (let index = 0; index < root.childNodes.length; index += 1) {
    const child = root.childNodes.item(index);
    if (child === null) {
      continue;
    }

    if (isCompositionElement(child)) {
      const href = child.getAttribute('href');
      if (href === null || href.length === 0) {
        entries.push(createComposedTopLevelEntry(child, stylesheetSource, serializer, precedence));
        continue;
      }

      const referencedPath = resolve(baseDir, href);
      if (activePaths.has(referencedPath)) {
        throw new Error('__WEAVER_COMPOSE_RECURSION__');
      }

      const referencedPrecedence = isImportElement(child)
        ? [...precedence, importOrdinal]
        : precedence;
      if (isImportElement(child)) {
        importOrdinal += 1;
      }

      activePaths.add(referencedPath);
      try {
        entries.push(
          ...composeImportedChildren(referencedPath, serializer, activePaths, referencedPrecedence),
        );
      } catch (error) {
        throw error;
      } finally {
        activePaths.delete(referencedPath);
      }
      continue;
    }

    entries.push(createComposedTopLevelEntry(child, stylesheetSource, serializer, precedence));
  }

  return entries;
}

function composeImportedChildren(
  stylesheetPath: string,
  serializer: XMLSerializer,
  activePaths: Set<string>,
  precedence: ImportPrecedence,
): readonly ComposedTopLevelEntry[] {
  const { root, source } = loadStylesheetRoot(stylesheetPath);
  if (!isStylesheetRoot(root)) {
    return [{ xml: source, precedence }];
  }

  return composeStylesheetChildren(
    root,
    source,
    dirname(stylesheetPath),
    serializer,
    activePaths,
    precedence,
  );
}

function loadStylesheetRoot(stylesheetPath: string): {
  root: Element;
  sourceName: string;
  source: string;
} {
  const sourceName = basename(stylesheetPath);
  const source = readFileSync(stylesheetPath, 'utf8');
  const stylesheetXml = parseXml(source, {
    role: 'stylesheet',
    sourceName,
  });
  return {
    root: stylesheetXml.documentElement!,
    sourceName,
    source,
  };
}

function isStylesheetRoot(root: Element): boolean {
  const localName = root.localName ?? root.nodeName;
  return (
    root.namespaceURI === XSLT_NAMESPACE &&
    (localName === 'stylesheet' || localName === 'transform')
  );
}

function isCompositionElement(node: Node): node is Element {
  if (node.nodeType !== 1) {
    return false;
  }

  const element = node as Element;
  const localName = element.localName ?? element.nodeName;
  return (
    element.namespaceURI === XSLT_NAMESPACE && (localName === 'include' || localName === 'import')
  );
}

function isImportElement(node: Element): boolean {
  const localName = node.localName ?? node.nodeName;
  return node.namespaceURI === XSLT_NAMESPACE && localName === 'import';
}

function hasCompositionChildren(root: Element): boolean {
  for (let index = 0; index < root.childNodes.length; index += 1) {
    const child = root.childNodes.item(index);
    if (child !== null && isCompositionElement(child)) {
      return true;
    }
  }

  return false;
}

function createComposedTopLevelEntry(
  node: Node,
  stylesheetSource: string,
  serializer: XMLSerializer,
  precedence: ImportPrecedence,
): ComposedTopLevelEntry {
  const xml = serializer.serializeToString(node);
  return {
    xml,
    precedence,
    ...(node.nodeType === 1 ? createDuplicateKey(node as Element, stylesheetSource, xml) : {}),
  };
}

function createDuplicateKey(
  element: Element,
  stylesheetSource: string,
  serializedXml: string,
): { duplicateKey?: string; summaryKey?: string } {
  if (element.namespaceURI !== XSLT_NAMESPACE) {
    return {};
  }

  const localName = element.localName ?? element.nodeName;
  if (localName !== 'template' && localName !== 'param' && localName !== 'variable') {
    return {};
  }

  if (localName === 'template') {
    const rawName = element.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      const matchText = element.getAttribute('match');
      // Exact duplicate unnamed templates from repeated imports are semantically
      // redundant but extremely expensive to lower repeatedly.
      return {
        duplicateKey: `${localName}:xml:${serializedXml}`,
        summaryKey:
          matchText === null || matchText.length === 0
            ? 'template:(anonymous)'
            : `template:${matchText}`,
      };
    }
  }

  const rawName = element.getAttribute('name');
  if (rawName === null || rawName.length === 0) {
    return {};
  }

  const normalizedName = normalizeXsltQName(
    rawName,
    element,
    stylesheetSource,
    'name',
    `xsl:${localName}`,
  );
  return {
    duplicateKey: `${localName}:${normalizedName}`,
    summaryKey: `${localName}:${normalizedName}`,
  };
}

function createComposedStylesheetSummary(
  stylesheetPath: string,
  entries: readonly ComposedTopLevelEntry[],
  prunedEntries: readonly ComposedTopLevelEntry[],
): ComposedStylesheetSummary {
  const beforeCounts = new Map<string, number>();
  const afterCounts = new Map<string, number>();

  for (const entry of entries) {
    if (entry.duplicateKey === undefined || entry.summaryKey === undefined) {
      continue;
    }

    beforeCounts.set(entry.summaryKey, (beforeCounts.get(entry.summaryKey) ?? 0) + 1);
  }

  for (const entry of prunedEntries) {
    if (entry.duplicateKey === undefined || entry.summaryKey === undefined) {
      continue;
    }

    afterCounts.set(entry.summaryKey, (afterCounts.get(entry.summaryKey) ?? 0) + 1);
  }

  const duplicateSummaries = [...beforeCounts.entries()]
    .map(([key, occurrencesBeforePrune]) => {
      const occurrencesAfterPrune = afterCounts.get(key) ?? 0;
      return {
        key,
        occurrencesBeforePrune,
        occurrencesAfterPrune,
        droppedOccurrences: occurrencesBeforePrune - occurrencesAfterPrune,
      };
    })
    .filter((entry) => entry.occurrencesBeforePrune > 1)
    .sort(
      (left, right) =>
        right.droppedOccurrences - left.droppedOccurrences ||
        right.occurrencesBeforePrune - left.occurrencesBeforePrune ||
        left.key.localeCompare(right.key),
    );

  return {
    stylesheetPath,
    topLevelEntriesBeforePrune: entries.length,
    topLevelEntriesAfterPrune: prunedEntries.length,
    droppedDuplicateEntries: entries.length - prunedEntries.length,
    duplicateSummaries,
  };
}

function pruneLowerPrecedenceDuplicates(
  entries: readonly ComposedTopLevelEntry[],
): readonly ComposedTopLevelEntry[] {
  const strongestPrecedenceByKey = new Map<string, ImportPrecedence>();

  for (const entry of entries) {
    if (entry.duplicateKey === undefined) {
      continue;
    }

    const existing = strongestPrecedenceByKey.get(entry.duplicateKey);
    if (existing === undefined || compareImportPrecedence(entry.precedence, existing) > 0) {
      strongestPrecedenceByKey.set(entry.duplicateKey, entry.precedence);
    }
  }

  return entries.filter((entry) => {
    if (entry.duplicateKey === undefined) {
      return true;
    }

    const strongest = strongestPrecedenceByKey.get(entry.duplicateKey);
    return strongest !== undefined && compareImportPrecedence(entry.precedence, strongest) === 0;
  });
}

function compareImportPrecedence(left: ImportPrecedence, right: ImportPrecedence): number {
  const sharedLength = Math.min(left.length, right.length);

  for (let index = 0; index < sharedLength; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  if (left.length === right.length) {
    return 0;
  }

  return right.length - left.length;
}

function serializeAttributes(element: Element): string {
  const parts: string[] = [];

  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute === null) {
      continue;
    }

    parts.push(` ${attribute.name}="${escapeAttribute(attribute.value)}"`);
  }

  return parts.join('');
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
