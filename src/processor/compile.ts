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
  type CompileStylesheetRuntimeArtifacts,
} from './runtimeArtifacts.js';

export { createStylesheetDigest };
export type { CompileStylesheetArtifacts, CompileStylesheetRuntimeArtifacts };

const XSLT_NAMESPACE = 'http://www.w3.org/1999/XSL/Transform';

type ImportPrecedence = readonly number[];

interface ComposedTopLevelEntry {
  readonly xml: string;
  readonly precedence: ImportPrecedence;
  readonly duplicateKey?: string;
}

export interface CompileStylesheetToTsOptions {
  readonly path?: string;
  readonly filePath?: string;
  readonly runtimeModuleSpecifier?: string;
  readonly sampleDocument?: string;
}

export interface CompileStylesheetArtifactsFromFileOptions {
  readonly runtimeModuleSpecifier?: string;
  readonly sampleDocumentPath?: string;
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
  };
}

export function compileStylesheetRuntimeArtifacts(
  stylesheetSource: string,
  options: CompileStylesheetToTsOptions = {},
): CompileStylesheetRuntimeArtifacts {
  return compileStylesheetRuntimeArtifactsCore(stylesheetSource, {
    ...(options.path === undefined ? {} : { path: options.path }),
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
  });
}

export function compileStylesheetArtifactsFromFile(
  stylesheetPath: string,
  options: CompileStylesheetArtifactsFromFileOptions = {},
): CompileStylesheetArtifacts {
  const resolvedStylesheetPath = resolve(stylesheetPath);
  const stylesheetSource = composeStylesheetSourceFromFile(resolvedStylesheetPath);
  const sampleDocument =
    options.sampleDocumentPath === undefined
      ? undefined
      : readFileSync(resolve(options.sampleDocumentPath), 'utf8');

  return compileStylesheetArtifacts(stylesheetSource, {
    path: basename(resolvedStylesheetPath),
    filePath: resolvedStylesheetPath,
    ...(options.runtimeModuleSpecifier === undefined
      ? {}
      : { runtimeModuleSpecifier: options.runtimeModuleSpecifier }),
    ...(sampleDocument === undefined ? {} : { sampleDocument }),
  });
}

function composeStylesheetSourceFromFile(stylesheetPath: string): string {
  const { root, sourceName, source } = loadStylesheetRoot(stylesheetPath);
  if (!isStylesheetRoot(root) || !hasCompositionChildren(root)) {
    return source;
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
    const children = pruneLowerPrecedenceDuplicates(entries)
      .map((entry) => entry.xml)
      .join('');
    return `<${root.nodeName}${serializeAttributes(root)}>${children}</${root.nodeName}>`;
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
  return {
    xml: serializer.serializeToString(node),
    precedence,
    ...(node.nodeType === 1 ? createDuplicateKey(node as Element, stylesheetSource) : {}),
  };
}

function createDuplicateKey(element: Element, stylesheetSource: string): { duplicateKey?: string } {
  if (element.namespaceURI !== XSLT_NAMESPACE) {
    return {};
  }

  const localName = element.localName ?? element.nodeName;
  if (localName !== 'template' && localName !== 'param' && localName !== 'variable') {
    return {};
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
