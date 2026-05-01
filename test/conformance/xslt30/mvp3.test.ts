import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Attr, Document, Element, Node } from '@xmldom/xmldom';
import { describe, expect, it } from 'vitest';

import { XsltProcessor } from '../../../src/index.js';
import { parseXml } from '../../../src/xml/parse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const XSLT30_ROOT = join(REPO_ROOT, 'vendor', 'xslt30-test');

type Xslt30SliceCase = {
  readonly setFile: string;
  readonly caseName: string;
};

type LoadedXslt30Case = {
  readonly stylesheet: string;
  readonly source: string;
  readonly expectedXml: string;
};

const MVP3_XSLT30_CASES: readonly Xslt30SliceCase[] = [
  {
    setFile: 'tests/decl/template/_template-test-set.xml',
    caseName: 'template-006',
  },
  {
    setFile: 'tests/expr/nodetest/_nodetest-test-set.xml',
    caseName: 'nodetest-001',
  },
  {
    setFile: 'tests/insn/lre/_lre-test-set.xml',
    caseName: 'lre-001',
  },
  {
    setFile: 'tests/insn/lre/_lre-test-set.xml',
    caseName: 'lre-002',
  },
  {
    setFile: 'tests/insn/apply-templates/_apply-templates-test-set.xml',
    caseName: 'conflict-resolution-0102c',
  },
  {
    setFile: 'tests/insn/apply-templates/_apply-templates-test-set.xml',
    caseName: 'conflict-resolution-0104c',
  },
];

describe('W3C conformance — XSLT 3.0 MVP+3 slice', () => {
  if (!existsSync(join(XSLT30_ROOT, 'catalog.xml'))) {
    it.skip('suite not present — run: git submodule update --init', () => {});
    return;
  }

  it('executes a real filtered XSLT 3.0 slice and reports a pass rate', () => {
    let passed = 0;

    for (const testCase of MVP3_XSLT30_CASES) {
      const loaded = loadXslt30Case(testCase);
      const proc = new XsltProcessor(loaded.stylesheet);
      const { output } = proc.transform(loaded.source);

      try {
        expect(normalizeXml(output)).toBe(normalizeXml(loaded.expectedXml));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`XSLT 3.0 case ${testCase.caseName} failed: ${detail}\nactual=${JSON.stringify(output)}\nexpected=${JSON.stringify(loaded.expectedXml)}`);
      }
      passed += 1;
    }

    // eslint-disable-next-line no-console
    console.log(`  XSLT 3.0 MVP+3 slice: ${passed}/${MVP3_XSLT30_CASES.length} passed`);
    expect(passed).toBe(MVP3_XSLT30_CASES.length);
  });
});

function loadXslt30Case(testCase: Xslt30SliceCase): LoadedXslt30Case {
  const setPath = join(XSLT30_ROOT, testCase.setFile);
  const setDirectory = dirname(setPath);
  const setDocument = parseXml(readFileSync(setPath, 'utf8'));
  const testCaseElement = asElements(setDocument.getElementsByTagName('test-case'))
    .find((entry) => entry.getAttribute('name') === testCase.caseName);
  if (testCaseElement === undefined) {
    throw new Error(`Unable to locate XSLT 3.0 case ${testCase.caseName} in ${testCase.setFile}.`);
  }

  const environment = resolveEnvironment(setDocument, testCaseElement);
  const source = loadSourceXml(environment, setDirectory);
  const stylesheetFile = testCaseElement.getElementsByTagName('stylesheet')[0]?.getAttribute('file');
  if (stylesheetFile === undefined || stylesheetFile === null || stylesheetFile.length === 0) {
    throw new Error(`XSLT 3.0 case ${testCase.caseName} is missing a stylesheet file.`);
  }

  const expectedXml = loadExpectedXml(testCaseElement, setDirectory);
  const stylesheet = readFileSync(join(setDirectory, stylesheetFile), 'utf8');

  return {
    stylesheet,
    source,
    expectedXml,
  };
}

function resolveEnvironment(setDocument: Document, testCaseElement: Element): Element | undefined {
  const localEnvironment = testCaseElement.getElementsByTagName('environment')[0];
  if (localEnvironment !== undefined) {
    const ref = localEnvironment.getAttribute('ref');
    if (ref === undefined || ref === null || ref.length === 0) {
      return localEnvironment;
    }

    return asElements(setDocument.getElementsByTagName('environment'))
      .find((entry) => entry.getAttribute('name') === ref);
  }

  return undefined;
}

function loadSourceXml(environment: Element | undefined, setDirectory: string): string {
  if (environment === undefined) {
    return '<root/>';
  }

  const sourceElement = asElements(environment.getElementsByTagName('source'))
    .find((entry) => (entry.getAttribute('role') ?? '.') === '.');
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

function loadExpectedXml(testCaseElement: Element, setDirectory: string): string {
  const assertXml = testCaseElement.getElementsByTagName('assert-xml')[0];
  if (assertXml === undefined) {
    throw new Error('XSLT 3.0 case is missing an assert-xml result.');
  }

  const file = assertXml.getAttribute('file');
  if (file !== undefined && file !== null && file.length > 0) {
    return readFileSync(join(setDirectory, file), 'utf8');
  }

  const text = assertXml.textContent;
  if (text === null) {
    throw new Error('XSLT 3.0 case assert-xml result is empty.');
  }

  return text.trim();
}

function normalizeXml(xml: string): string {
  return serializeCanonicalXml(parseXml(xml.replace(/\r\n/g, '\n')));
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