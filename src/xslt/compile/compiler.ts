/**
 * Stylesheet compiler: DOM → StylesheetIR.
 *
 * Current MVP+3 slice: root and simple name-matching templates with literal
 * result elements, xsl:text, xsl:value-of, and xsl:apply-templates.
 */

import type { Element, Node } from '@xmldom/xmldom';

import { XTSE0500 } from '../../errors/codes.js';
import { getAttributeValueSourceLocation, getElementNameSourceLocation, getNodeSourceLocation, parseXml } from '../../xml/parse.js';
import { STYLESHEET_IR_VERSION } from './ir.js';
import {
  assertAllowedXsltAttributes,
  assertNoDuplicateWithParam,
  assertNoSelectAndContent,
  childElements,
  createAttributeSuggestion,
  createInstructionSuggestion,
  createXsltStaticError,
  hasMeaningfulTemplateContent,
  isSupportedTemplateMatch,
  isXsltElement,
  normalizeXsltQName,
  parseRequiredAttribute,
  parseXPathInContext,
  STYLESHEET_SOURCE_NAME,
  XMLNS_NAMESPACE,
  XSLT_NAMESPACE,
} from './compilerSupport.js';
import {
  compileApplyTemplatesInstruction,
  compileCallTemplateInstruction,
  compileChooseInstruction,
  compileForEachInstruction,
  compileIfInstruction,
  compileValueOfInstruction,
  compileVariableInstruction,
  type InstructionCompilerHelpers,
} from './instructionCompilers.js';
import type { GlobalBinding, GlobalParam, GlobalVariable, Instruction, StylesheetIR, TemplateRule, WithParam } from './ir.js';
import { compileLiteralResultElement } from './literalResult.js';
import {
  assertNoDuplicateGlobalBindings,
  assertNoDuplicateNamedTemplates,
  assertNoInvalidCallTemplateParams,
  assertNoUnknownCalledTemplates,
  collectStylesheetStaticContext,
  compileTopLevelDeclaration,
  validateStylesheetRootAttributes,
  type StylesheetCompilerHelpers,
} from './stylesheetCompilers.js';
import {
  compileTemplateRuleDeclaration,
  compileTopLevelParamDeclaration,
  compileTopLevelVariableDeclaration,
  type TopLevelCompilerHelpers,
} from './topLevelCompilers.js';

type NodeListLike = {
  readonly length: number;
  item(index: number): Node | null;
};

export function compileStylesheet(stylesheetXml: string): StylesheetIR {
  const stylesheetDocument = parseXml(stylesheetXml);
  const root = stylesheetDocument.documentElement;

  if (root === null) {
    throw createXsltStaticError('Stylesheet has no document element.');
  }

  if (!isXsltElement(root, 'stylesheet') && !isXsltElement(root, 'transform')) {
    throw createXsltStaticError(
      'Stylesheet document element must be xsl:stylesheet or xsl:transform.',
      getNodeSourceLocation(stylesheetXml, root, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'wrap the stylesheet in an xsl:stylesheet or xsl:transform document element',
          confidence: 1,
        }],
      },
    );
  }

  validateStylesheetRootAttributes(root, stylesheetXml, STYLESHEET_COMPILER_HELPERS);

  const version = root.getAttribute('version');
  if (version === null || version.length === 0) {
    throw createXsltStaticError(
      'Stylesheet module must declare a version attribute.',
      getAttributeValueSourceLocation(stylesheetXml, root, 'version', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, root, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add version="3.0" to the stylesheet document element',
          replacement: 'version="3.0"',
          confidence: 1,
        }],
      },
      XTSE0500,
    );
  }

  assertNoDuplicateNamedTemplates(root, stylesheetXml, STYLESHEET_COMPILER_HELPERS);
  assertNoDuplicateGlobalBindings(root, stylesheetXml, STYLESHEET_COMPILER_HELPERS);
  assertNoUnknownCalledTemplates(root, stylesheetXml, STYLESHEET_COMPILER_HELPERS);
  assertNoInvalidCallTemplateParams(root, stylesheetXml, STYLESHEET_COMPILER_HELPERS);

  const templates: TemplateRule[] = [];
  const globalBindings: GlobalBinding[] = [];
  const location = getNodeSourceLocation(stylesheetXml, root, STYLESHEET_SOURCE_NAME);
  for (const child of childElements(root)) {
    const declaration = compileTopLevelDeclaration(child, stylesheetXml, STYLESHEET_COMPILER_HELPERS);
    if (declaration === undefined) {
      continue;
    }

    if ('body' in declaration && 'modes' in declaration) {
      templates.push(declaration);
      continue;
    }

    globalBindings.push(declaration);
  }
  const { namespaces, defaultElementNamespace } = collectStylesheetStaticContext(root);

  if (templates.length === 0) {
    throw createXsltStaticError(
      'Stylesheet must declare at least one xsl:template.',
      getNodeSourceLocation(stylesheetXml, root, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add at least one xsl:template to the stylesheet',
          confidence: 1,
        }],
      },
    );
  }

  return {
    version: STYLESHEET_IR_VERSION,
    xsltVersion: '3.0',
    ...(location === undefined ? {} : { location }),
    namespaces,
    defaultElementNamespace,
    globalBindings,
    templates,
  };
}

function compileTopLevelVariable(element: Element, stylesheetXml: string): GlobalVariable {
  return compileTopLevelVariableDeclaration(element, stylesheetXml, TOP_LEVEL_COMPILER_HELPERS);
}

function compileTopLevelParam(element: Element, stylesheetXml: string): GlobalParam {
  return compileTopLevelParamDeclaration(element, stylesheetXml, TOP_LEVEL_COMPILER_HELPERS);
}

function compileTemplateRule(templateElement: Element, stylesheetXml: string): TemplateRule {
  return compileTemplateRuleDeclaration(templateElement, stylesheetXml, TOP_LEVEL_COMPILER_HELPERS);
}

function compileWithParam(element: Element, stylesheetXml: string): WithParam {
  assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:with-param', ['as', 'name', 'select', 'tunnel']);

  const rawName = element.getAttribute('name');
  if (rawName === null || rawName.length === 0) {
    throw createXsltStaticError(
      'xsl:with-param requires a name attribute.',
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add a name="..." attribute to xsl:with-param',
          replacement: 'name="..."',
          confidence: 1,
        }],
      },
    );
  }

  const select = element.getAttribute('select') ?? undefined;
  assertNoSelectAndContent(
    element,
    stylesheetXml,
    select,
    'xsl:with-param',
    'paramName',
    rawName,
  );
  const body = select === undefined && hasMeaningfulTemplateContent(element)
    ? compileInstructions(element.childNodes, stylesheetXml)
    : undefined;
  const selectLocation = select === undefined
    ? undefined
    : getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

  const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
    ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);
  const name = normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:with-param');

  return {
    name,
    ...(select === undefined ? {} : { select: parseXPathInContext(select, selectLocation, 'xsl:with-param', 'select') }),
    ...(select === undefined ? {} : { selectText: select }),
    ...(body === undefined ? {} : { body }),
    ...(location === undefined ? {} : { location }),
  };
}

function compileInstructions(nodes: NodeListLike, stylesheetXml: string): Instruction[] {
  const instructions: Instruction[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes.item(index);
    if (node === null) {
      continue;
    }

    const instruction = compileInstruction(node, stylesheetXml);
    if (instruction !== undefined) {
      instructions.push(instruction);
    }
  }

  return instructions;
}

function compileInstruction(node: Node, stylesheetXml: string): Instruction | undefined {
  if (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE) {
    const text = node.nodeValue ?? '';
    const location = getNodeSourceLocation(stylesheetXml, node, STYLESHEET_SOURCE_NAME);
    return text.trim().length === 0
      ? undefined
      : {
          kind: 'literalText',
          text,
          ...(location === undefined ? {} : { location }),
        };
  }

  if (node.nodeType !== node.ELEMENT_NODE) {
    return undefined;
  }

  const element = node as Element;
  if (isXsltElement(element, 'apply-templates')) {
    return compileApplyTemplatesInstruction(element, stylesheetXml, INSTRUCTION_COMPILER_HELPERS);
  }

  if (isXsltElement(element, 'call-template')) {
    return compileCallTemplateInstruction(element, stylesheetXml, INSTRUCTION_COMPILER_HELPERS);
  }

  if (isXsltElement(element, 'variable')) {
    return compileVariableInstruction(element, stylesheetXml, INSTRUCTION_COMPILER_HELPERS);
  }

  if (isXsltElement(element, 'if')) {
    return compileIfInstruction(element, stylesheetXml, INSTRUCTION_COMPILER_HELPERS);
  }

  if (isXsltElement(element, 'comment')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:comment', []);

    const location = getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    return {
      kind: 'comment',
      body: compileInstructions(element.childNodes, stylesheetXml),
      ...(location === undefined ? {} : { location }),
    };
  }

  if (isXsltElement(element, 'choose')) {
    return compileChooseInstruction(element, stylesheetXml, INSTRUCTION_COMPILER_HELPERS);
  }

  if (isXsltElement(element, 'for-each')) {
    return compileForEachInstruction(element, stylesheetXml, INSTRUCTION_COMPILER_HELPERS);
  }

  if (isXsltElement(element, 'value-of')) {
    return compileValueOfInstruction(element, stylesheetXml, INSTRUCTION_COMPILER_HELPERS);
  }

  if (isXsltElement(element, 'text')) {
    assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:text', []);

    const location = getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    return {
      kind: 'literalText',
      text: element.textContent ?? '',
      ...(location === undefined ? {} : { location }),
    };
  }

  if (element.namespaceURI === XSLT_NAMESPACE) {
    const suggestion = createInstructionSuggestion(element);
    throw createXsltStaticError(
      `Unsupported XSLT instruction ${element.nodeName} in current MVP+3 slice.`,
      getElementNameSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        instructionName: element.nodeName,
      },
      suggestion === undefined ? undefined : { suggestions: [suggestion] },
    );
  }

  return compileLiteralResultElement(
    element,
    stylesheetXml,
    compileInstructions,
    XSLT_NAMESPACE,
    STYLESHEET_SOURCE_NAME,
  );
}

const INSTRUCTION_COMPILER_HELPERS: InstructionCompilerHelpers = {
  stylesheetSourceName: STYLESHEET_SOURCE_NAME,
  isXsltElement,
  assertAllowedXsltAttributes,
  createXsltStaticError,
  parseXPathInContext,
  compileInstructions,
  childElements,
  compileWithParam,
  assertNoDuplicateWithParam,
  normalizeXsltQName,
  assertNoSelectAndContent,
  hasMeaningfulTemplateContent,
};

const TOP_LEVEL_COMPILER_HELPERS: TopLevelCompilerHelpers = {
  stylesheetSourceName: STYLESHEET_SOURCE_NAME,
  isXsltElement,
  assertAllowedXsltAttributes,
  createXsltStaticError,
  parseXPathInContext,
  normalizeXsltQName,
  compileInstructions,
  compileInstruction,
  isSupportedTemplateMatch,
  assertNoSelectAndContent,
  hasMeaningfulTemplateContent,
  parseRequiredAttribute,
};

const STYLESHEET_COMPILER_HELPERS: StylesheetCompilerHelpers = {
  stylesheetSourceName: STYLESHEET_SOURCE_NAME,
  xsltNamespace: XSLT_NAMESPACE,
  xmlnsNamespace: XMLNS_NAMESPACE,
  isXsltElement,
  normalizeXsltQName,
  createXsltStaticError,
  createAttributeSuggestion,
  childElements,
  hasMeaningfulTemplateContent,
  compileTemplateRule,
  compileTopLevelParam,
  compileTopLevelVariable,
};
