import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Attr, Document, Element, Node } from '@xmldom/xmldom';
import { describe, expect, it } from 'vitest';

import { XsltProcessor, type TransformOptions } from '../../../src/index.js';
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
  readonly options?: TransformOptions;
};

const MVP3_XSLT30_CASES: readonly Xslt30SliceCase[] = [
  {
    setFile: 'tests/decl/template/_template-test-set.xml',
    caseName: 'template-006',
  },
  {
    setFile: 'tests/insn/choose/_choose-test-set.xml',
    caseName: 'choose-0601',
  },
  {
    setFile: 'tests/insn/choose/_choose-test-set.xml',
    caseName: 'choose-0602',
  },
  {
    setFile: 'tests/insn/choose/_choose-test-set.xml',
    caseName: 'choose-0102',
  },
  {
    setFile: 'tests/attr/xpath-default-namespace/_xpath-default-namespace-test-set.xml',
    caseName: 'xpath-default-namespace-1101',
  },
  {
    setFile: 'tests/fn/position/_position-test-set.xml',
    caseName: 'position-1125',
  },
  {
    setFile: 'tests/insn/call-template/_call-template-test-set.xml',
    caseName: 'call-template-0101',
  },
  {
    setFile: 'tests/insn/call-template/_call-template-test-set.xml',
    caseName: 'call-template-0102',
  },
  {
    setFile: 'tests/insn/call-template/_call-template-test-set.xml',
    caseName: 'call-template-0103',
  },
  {
    setFile: 'tests/insn/call-template/_call-template-test-set.xml',
    caseName: 'call-template-0801',
  },
  {
    setFile: 'tests/decl/variable/_variable-test-set.xml',
    caseName: 'variable-1009',
  },
  {
    setFile: 'tests/decl/variable/_variable-test-set.xml',
    caseName: 'variable-0601',
  },
  {
    setFile: 'tests/decl/variable/_variable-test-set.xml',
    caseName: 'variable-0801',
  },
  {
    setFile: 'tests/decl/variable/_variable-test-set.xml',
    caseName: 'variable-2401',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-022',
  },
  {
    setFile: 'tests/expr/nodetest/_nodetest-test-set.xml',
    caseName: 'nodetest-001',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-011',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-012',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-013',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-015',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-016',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-017',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-018',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-019',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-020',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-021',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-023',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-024',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-025',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-026',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-027',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-028',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-029',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-030',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-032',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-033',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-034',
  },
  {
    setFile: 'tests/type/string/_string-test-set.xml',
    caseName: 'string-035',
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
      const { output } = proc.transform(loaded.source, loaded.options);

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
  const options = loadTransformOptions(testCaseElement);

  return {
    stylesheet,
    source,
    expectedXml,
    ...(options === undefined ? {} : { options }),
  };
}

function loadTransformOptions(testCaseElement: Element): TransformOptions | undefined {
  const testElement = testCaseElement.getElementsByTagName('test')[0];
  if (testElement === undefined) {
    return undefined;
  }

  const initialTemplateElement = testElement.getElementsByTagName('initial-template')[0];
  const initialTemplateName = initialTemplateElement?.getAttribute('name') ?? undefined;
  const initialTemplate = initialTemplateName === undefined || initialTemplateElement === undefined
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

function loadTransformParameters(testElement: Element): Readonly<Record<string, unknown>> | undefined {
  const entries = asElements(testElement.getElementsByTagName('param'))
    .filter((element) => (element.getAttribute('static') ?? 'no') !== 'yes');
  if (entries.length === 0) {
    return undefined;
  }

  const parameters: Record<string, unknown> = {};
  for (const entry of entries) {
    const name = entry.getAttribute('name');
    const select = entry.getAttribute('select');
    if (name === null || name.length === 0 || select === null || select.length === 0) {
      throw new Error('XSLT 3.0 transform parameter metadata requires both name and select attributes.');
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

  throw new Error(`Unsupported XSLT 3.0 transform parameter metadata expression ${JSON.stringify(select)} in current MVP+3 slice.`);
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