import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { Attr, Document, Element, Node } from '@xmldom/xmldom';

import { XsltProcessor, type TransformOptions } from '../../../src/index.js';
import { parseXml } from '../../../src/xml/parse.js';
import { tryCreateNativeTransformPlan } from '../../../src/xslt/codegen/nativeTransformPlan.js';
import { compileStylesheet } from '../../../src/xslt/compile/compiler.js';
import { compileAndLoadGeneratedModule } from '../../codegen/generated-module.support.js';
import type { ExecutionDisposition, VerificationBackend } from '../ledger.js';
import type { Xslt30OverlayCase } from './overlay.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const XSLT30_ROOT = join(REPO_ROOT, 'vendor', 'xslt30-test');

type LoadedXslt30Case = {
  readonly stylesheet: string;
  readonly source: string;
  readonly expected: Xslt30ExpectedResult;
  readonly options?: Omit<TransformOptions, 'execution'>;
};

type Xslt30ExpectedResult =
  | {
      readonly kind: 'xml';
      readonly xml: string;
    }
  | {
      readonly kind: 'error';
      readonly code: string;
    };

export type Xslt30CaseRunResult = {
  readonly execution: ExecutionDisposition;
  readonly detail: string;
};

export function hasXslt30Catalog(): boolean {
  return existsSync(join(XSLT30_ROOT, 'catalog.xml'));
}

export function runXslt30Case(
  testCase: Xslt30OverlayCase,
  backend: VerificationBackend = 'interpreter',
): Xslt30CaseRunResult {
  let loaded: LoadedXslt30Case;
  try {
    loaded = loadXslt30Case(testCase);
  } catch (error) {
    return {
      execution: 'harness-failure',
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  const actual = executeXslt30Case(loaded, backend, testCase.caseName);
  if (loaded.expected.kind === 'xml') {
    if (actual.kind === 'error') {
      return {
        execution: 'engine-failure',
        detail: `expected XML result but received ${actual.code}: ${actual.detail}`,
      };
    }

    let expectedXml: string;
    try {
      expectedXml = normalizeXml(loaded.expected.xml);
    } catch (error) {
      return {
        execution: 'harness-failure',
        detail: `expected result is not comparable XML: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }

    let actualXml: string;
    try {
      actualXml = normalizeXml(actual.output);
    } catch (error) {
      return {
        execution: 'semantic-mismatch',
        detail: `actual result is not XML: ${
          error instanceof Error ? error.message : String(error)
        }; raw output ${JSON.stringify(actual.output)}`,
      };
    }

    return expectedXml === actualXml
      ? { execution: 'passed', detail: 'XML comparison passed.' }
      : {
          execution: 'semantic-mismatch',
          detail: `expected ${JSON.stringify(expectedXml)} but received ${JSON.stringify(actualXml)}`,
        };
  }

  if (actual.kind === 'success') {
    return {
      execution: 'diagnostic-mismatch',
      detail: `expected error ${loaded.expected.code} but received output ${JSON.stringify(actual.output)}`,
    };
  }

  return actual.code === loaded.expected.code
    ? { execution: 'passed', detail: 'Expected diagnostic comparison passed.' }
    : {
        execution: 'diagnostic-mismatch',
        detail: `expected error ${loaded.expected.code} but received ${actual.code}: ${actual.detail}`,
      };
}

function loadXslt30Case(testCase: Xslt30OverlayCase): LoadedXslt30Case {
  const setPath = join(XSLT30_ROOT, testCase.setFile);
  const setDirectory = dirname(setPath);
  const setDocument = parseXml(readFileSync(setPath, 'utf8'));
  const testCaseElement = asElements(setDocument.getElementsByTagName('test-case')).find(
    (entry) => entry.getAttribute('name') === testCase.caseName,
  );
  if (testCaseElement === undefined) {
    throw new Error(`Unable to locate XSLT 3.0 case ${testCase.caseName} in ${testCase.setFile}.`);
  }

  const environment = resolveEnvironment(setDocument, testCaseElement);
  const source = loadSourceXml(environment, setDirectory);
  const stylesheetFile = testCaseElement
    .getElementsByTagName('stylesheet')[0]
    ?.getAttribute('file');
  if (stylesheetFile === undefined || stylesheetFile === null || stylesheetFile.length === 0) {
    throw new Error(`XSLT 3.0 case ${testCase.caseName} is missing a stylesheet file.`);
  }

  const expected = loadExpectedResult(testCaseElement, setDirectory);
  const stylesheetPath = join(setDirectory, stylesheetFile);
  const stylesheet = readFileSync(stylesheetPath, 'utf8');
  const options = {
    ...loadTransformOptions(testCaseElement),
    baseUri: stylesheetPath,
  };

  return {
    stylesheet,
    source,
    expected,
    options,
  };
}

function executeXslt30Case(
  loaded: LoadedXslt30Case,
  backend: VerificationBackend,
  caseName: string,
):
  | { readonly kind: 'success'; readonly output: string }
  | { readonly kind: 'error'; readonly code: string; readonly detail: string } {
  try {
    if (backend === 'native-emitted') {
      const sourcePath = `corpus/${caseName}.xsl`;
      const ir = compileStylesheet(loaded.stylesheet);
      if (tryCreateNativeTransformPlan(ir, sourcePath) === undefined) {
        return {
          kind: 'error',
          code: 'WEAVER_XSLT_NATIVE_UNSUPPORTED',
          detail: 'emission would use the generic transformCompiledStylesheet fallback',
        };
      }

      const generated = compileAndLoadGeneratedModule(loaded.stylesheet, sourcePath);
      if (generated.diagnostics.length > 0) {
        return {
          kind: 'error',
          code: 'WEAVER_EMITTED_COMPILE_FAILURE',
          detail: generated.diagnostics
            .map((diagnostic) => String(diagnostic.messageText))
            .join('; '),
        };
      }

      const generatedModule = generated.exports as {
        readonly transform: (
          source: string,
          options?: Omit<TransformOptions, 'execution'>,
        ) => { readonly output: string };
      };
      return {
        kind: 'success',
        output: generatedModule.transform(loaded.source, loaded.options).output,
      };
    }

    const proc = new XsltProcessor(loaded.stylesheet);
    const { output } = proc.transform(loaded.source, {
      ...loaded.options,
      execution: backend === 'native-direct' ? 'native' : 'interpreter',
    });
    return { kind: 'success', output };
  } catch (error) {
    return {
      kind: 'error',
      code: extractErrorCode(error),
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function extractErrorCode(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }

  if (error instanceof Error) {
    const match = /^\[([^\]]+)\]/.exec(error.message);
    if (match?.[1] !== undefined) {
      return match[1];
    }
  }

  return 'UNKNOWN';
}

function loadTransformOptions(
  testCaseElement: Element,
): Omit<TransformOptions, 'execution'> | undefined {
  const testElement = testCaseElement.getElementsByTagName('test')[0];
  if (testElement === undefined) {
    return undefined;
  }

  const initialTemplateElement = testElement.getElementsByTagName('initial-template')[0];
  const initialTemplateName = initialTemplateElement?.getAttribute('name') ?? undefined;
  const initialTemplate =
    initialTemplateName === undefined || initialTemplateElement === undefined
      ? undefined
      : normalizeQNameForTest(initialTemplateName, initialTemplateElement);
  const parameters = loadTransformParameters(testElement);

  if (initialTemplate === undefined && parameters === undefined) {
    return undefined;
  }

  return {
    ...(initialTemplate === undefined ? {} : { initialTemplate }),
    ...(parameters === undefined ? {} : { parameters }),
  };
}

function loadTransformParameters(
  testElement: Element,
): Readonly<Record<string, unknown>> | undefined {
  const entries = asElements(testElement.getElementsByTagName('param')).filter(
    (element) => (element.getAttribute('static') ?? 'no') !== 'yes',
  );
  if (entries.length === 0) {
    return undefined;
  }

  const parameters: Record<string, unknown> = {};
  for (const entry of entries) {
    const name = entry.getAttribute('name');
    const select = entry.getAttribute('select');
    if (name === null || name.length === 0 || select === null || select.length === 0) {
      throw new Error(
        'XSLT 3.0 transform parameter metadata requires both name and select attributes.',
      );
    }

    parameters[normalizeQNameForTest(name, entry)] = parseTransformParameterValue(select);
  }

  return parameters;
}

function parseTransformParameterValue(select: string): unknown {
  if (select === 'true()') {
    return true;
  }

  if (select === 'false()') {
    return false;
  }

  if (/^'([^']|'')*'$/.test(select)) {
    return select.slice(1, -1).replace(/''/g, "'");
  }

  if (/^-?\d+(?:\.\d+)?$/.test(select)) {
    return Number(select);
  }

  throw new Error(
    `Unsupported XSLT 3.0 transform parameter metadata expression ${JSON.stringify(select)} in current MVP+3 slice.`,
  );
}

function resolveEnvironment(setDocument: Document, testCaseElement: Element): Element | undefined {
  const localEnvironment = testCaseElement.getElementsByTagName('environment')[0];
  if (localEnvironment !== undefined) {
    const ref = localEnvironment.getAttribute('ref');
    if (ref === undefined || ref === null || ref.length === 0) {
      return localEnvironment;
    }

    return asElements(setDocument.getElementsByTagName('environment')).find(
      (entry) => entry.getAttribute('name') === ref,
    );
  }

  return undefined;
}

function loadSourceXml(environment: Element | undefined, setDirectory: string): string {
  if (environment === undefined) {
    return '<root/>';
  }

  const sourceElement = asElements(environment.getElementsByTagName('source')).find(
    (entry) => (entry.getAttribute('role') ?? '.') === '.',
  );
  if (sourceElement === undefined) {
    return '<root/>';
  }

  const sourceFile = sourceElement.getAttribute('file');
  if (sourceFile !== undefined && sourceFile !== null && sourceFile.length > 0) {
    return readFileSync(join(setDirectory, sourceFile), 'utf8');
  }

  const content = sourceElement.getElementsByTagName('content')[0]?.textContent;
  if (content === undefined || content === null) {
    throw new Error('XSLT 3.0 environment source is missing content.');
  }

  return content.trim();
}

function loadExpectedResult(testCaseElement: Element, setDirectory: string): Xslt30ExpectedResult {
  const assertXml = testCaseElement.getElementsByTagName('assert-xml')[0];
  if (assertXml !== undefined) {
    const file = assertXml.getAttribute('file');
    if (file !== undefined && file !== null && file.length > 0) {
      return {
        kind: 'xml',
        xml: readFileSync(join(setDirectory, file), 'utf8'),
      };
    }

    const text = assertXml.textContent;
    if (text === null) {
      throw new Error('XSLT 3.0 case assert-xml result is empty.');
    }

    return {
      kind: 'xml',
      xml: text.trim(),
    };
  }

  const errorElement = testCaseElement.getElementsByTagName('error')[0];
  const errorCode = errorElement?.getAttribute('code');
  if (errorCode !== undefined && errorCode !== null && errorCode.length > 0) {
    return {
      kind: 'error',
      code: errorCode,
    };
  }

  throw new Error('XSLT 3.0 case is missing an assert-xml or error result.');
}

function normalizeXml(xml: string): string {
  return serializeCanonicalXml(parseXml(xml.replace(/\r\n/g, '\n')));
}

function normalizeQNameForTest(name: string, element: Element): string {
  if (name.startsWith('{')) {
    return name;
  }

  const eqName = tryNormalizeEqName(name);
  if (eqName !== undefined) {
    return eqName;
  }

  const separator = name.indexOf(':');
  if (separator < 0) {
    return name;
  }

  const prefix = name.slice(0, separator);
  const localName = name.slice(separator + 1);
  const namespaceUri = lookupNamespaceUri(element, prefix);
  return namespaceUri === undefined ? name : `{${namespaceUri}}${localName}`;
}

function tryNormalizeEqName(name: string): string | undefined {
  if (!name.startsWith('Q{')) {
    return undefined;
  }

  const endBrace = name.indexOf('}');
  if (endBrace < 0) {
    return undefined;
  }

  const namespaceUri = name.slice(2, endBrace);
  const localName = name.slice(endBrace + 1);
  if (localName.length === 0) {
    return undefined;
  }

  return namespaceUri.length === 0 ? localName : `{${namespaceUri}}${localName}`;
}

function lookupNamespaceUri(element: Element, prefix: string): string | undefined {
  for (let current: Node | null = element; current !== null; current = current.parentNode) {
    if (current.nodeType !== current.ELEMENT_NODE) {
      continue;
    }

    const currentElement = current as Element;
    for (let index = 0; index < currentElement.attributes.length; index += 1) {
      const attribute = currentElement.attributes.item(index) as Attr | null;
      if (attribute?.prefix === 'xmlns' && attribute.localName === prefix) {
        return attribute.value;
      }
    }
  }

  return undefined;
}

function serializeCanonicalXml(node: Node): string {
  if (node.nodeType === 9) {
    const childParts: string[] = [];
    for (const child of Array.from(node.childNodes)) {
      const part = serializeCanonicalXml(child);
      if (part.length > 0) {
        childParts.push(part);
      }
    }
    return childParts.join('');
  }

  if (node.nodeType === 1) {
    const attributes = asAttributes((node as Element).attributes)
      .map((attribute) => `${attribute.name}=${JSON.stringify(attribute.value)}`)
      .sort();
    const attributeText = attributes.length === 0 ? '' : ` ${attributes.join(' ')}`;
    const childParts: string[] = [];
    for (const child of Array.from(node.childNodes)) {
      const part = serializeCanonicalXml(child);
      if (part.length > 0) {
        childParts.push(part);
      }
    }
    if (childParts.length === 0) {
      return `<${node.nodeName}${attributeText}/>`;
    }
    return `<${node.nodeName}${attributeText}>${childParts.join('')}</${node.nodeName}>`;
  }

  if (node.nodeType === 3) {
    const text = node.nodeValue ?? '';
    return text.trim().length === 0 ? '' : text;
  }

  return '';
}

function asElements(nodes: ArrayLike<Element>): Element[] {
  return Array.from(nodes) as Element[];
}

function asAttributes(nodes: ArrayLike<Attr>): Attr[] {
  return Array.from(nodes) as Attr[];
}
