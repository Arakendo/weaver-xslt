/**
 * Stylesheet compiler: DOM → StylesheetIR.
 *
 * Current MVP+3 slice: root and simple name-matching templates with literal
 * result elements, xsl:text, xsl:value-of, and xsl:apply-templates.
 */

import type { Attr, Element, Node } from '@xmldom/xmldom';

import { XTSE0010, XTSE0165, XTSE0500 } from '../../errors/codes.js';
import { XsltError, type ErrorContext, type ErrorSuggestion } from '../../errors/index.js';
import type { PathExpression, StepExpression, XPathAst } from '../../xpath/parse/ast.js';
import { parseXPath } from '../../xpath/parse/parser.js';
import { getAttributeValueSourceLocation, getElementNameSourceLocation, getNodeSourceLocation, parseXml } from '../../xml/parse.js';
import type { AttributeInstruction, ChooseWhenBranch, GlobalVariable, Instruction, StylesheetIR, TemplateParam, TemplateRule, WithParam } from './ir.js';

const XSLT_NAMESPACE = 'http://www.w3.org/1999/XSL/Transform';
const STYLESHEET_SOURCE_NAME = '<stylesheet>';
const SUPPORTED_XSLT_INSTRUCTION_NAMES = ['apply-templates', 'call-template', 'choose', 'comment', 'for-each', 'if', 'otherwise', 'text', 'value-of', 'variable', 'when'] as const;

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

  const templates: TemplateRule[] = [];
  const globalVariables: GlobalVariable[] = [];
  for (const child of childElements(root)) {
    const declaration = compileTopLevelDeclaration(child, stylesheetXml);
    if (declaration === undefined) {
      continue;
    }

    if ('body' in declaration && 'modes' in declaration) {
      templates.push(declaration);
      continue;
    }

    globalVariables.push(declaration);
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
    version: '3.0',
    namespaces,
    defaultElementNamespace,
    globalVariables,
    templates,
  };
}

function collectStylesheetStaticContext(root: Element): Pick<StylesheetIR, 'namespaces' | 'defaultElementNamespace'> {
  const namespaces: Record<string, string> = {};

  for (let index = 0; index < root.attributes.length; index += 1) {
    const attribute = root.attributes.item(index) as Attr | null;
    if (attribute === null) {
      continue;
    }

    if (attribute.prefix === 'xmlns' && attribute.localName !== null && attribute.localName.length > 0) {
      namespaces[attribute.localName] = attribute.value;
    }
  }

  return {
    namespaces,
    defaultElementNamespace: root.getAttribute('xpath-default-namespace') ?? '',
  };
}

function compileTopLevelDeclaration(element: Element, stylesheetXml: string): TemplateRule | GlobalVariable | undefined {
  if (isXsltElement(element, 'template')) {
    return compileTemplateRule(element, stylesheetXml);
  }

  if (isXsltElement(element, 'variable')) {
    return compileTopLevelVariable(element, stylesheetXml);
  }

  if (isXsltElement(element, 'strip-space')) {
    return undefined;
  }

  if (isXsltElement(element, 'output')) {
    return undefined;
  }

  if (isXsltElement(element, 'include') || isXsltElement(element, 'import')) {
    const href = element.getAttribute('href') ?? '';
    throw createXsltStaticError(
      `Stylesheet ${element.localName ?? element.nodeName} declarations are not yet implemented in the current MVP+3 slice.`,
      getAttributeValueSourceLocation(stylesheetXml, element, 'href', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        href,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: `inline or remove xsl:${element.localName ?? element.nodeName} in the current MVP+3 slice`,
          confidence: 1,
        }],
      },
      XTSE0165,
    );
  }

  if (element.namespaceURI === XSLT_NAMESPACE) {
    throw createXsltStaticError(
      `Unsupported top-level XSLT declaration ${element.nodeName} in current MVP+3 slice.`,
      getElementNameSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        declarationName: element.nodeName,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: `remove unsupported top-level declaration ${element.nodeName} in the current MVP+3 slice`,
          confidence: 1,
        }],
      },
    );
  }

  throw createXsltStaticError(
    `Unsupported top-level stylesheet element ${element.nodeName} in current MVP+3 slice.`,
    getElementNameSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
    {
      elementName: element.nodeName,
    },
    {
      suggestions: [{
        kind: 'fix',
        label: 'move result elements inside xsl:template bodies in the current MVP+3 slice',
        confidence: 1,
      }],
    },
  );
}

function compileTopLevelVariable(element: Element, stylesheetXml: string): GlobalVariable {
  const name = element.getAttribute('name');
  if (name === null || name.length === 0) {
    throw createXsltStaticError(
      'xsl:variable requires a name attribute.',
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add a name="..." attribute to xsl:variable',
          replacement: 'name="..."',
          confidence: 1,
        }],
      },
    );
  }

  const select = element.getAttribute('select') ?? undefined;
  if (select === undefined && hasMeaningfulTemplateContent(element)) {
    throw createXsltStaticError(
      'Top-level xsl:variable sequence-constructor values are not yet implemented in the current MVP+3 slice.',
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        variableName: name,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: 'replace top-level xsl:variable content with select="..." in the current MVP+3 slice',
          confidence: 1,
        }],
      },
    );
  }

  const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
    ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

  return {
    name,
    ...(select === undefined ? {} : { select: parseXPath(select) }),
    ...(select === undefined ? {} : { selectText: select }),
    ...(location === undefined ? {} : { location }),
  };
}

function compileTemplateRule(templateElement: Element, stylesheetXml: string): TemplateRule {
  const matchText = templateElement.getAttribute('match') ?? undefined;
  const name = templateElement.getAttribute('name') ?? undefined;
  const priorityText = templateElement.getAttribute('priority');
  const priority = priorityText === null ? undefined : Number(priorityText);

  if (matchText === undefined && name === undefined) {
    throw createXsltStaticError(
      'xsl:template must declare either match or name.',
      getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add match="..." or name="..." to xsl:template',
          confidence: 1,
        }],
      },
    );
  }

  const match = matchText === undefined ? undefined : parseXPath(matchText);
  if (match !== undefined && !isSupportedTemplateMatch(match)) {
    throw createXsltStaticError(
      `Unsupported template match pattern ${JSON.stringify(matchText)} in current MVP+3 slice.`,
      getAttributeValueSourceLocation(stylesheetXml, templateElement, 'match', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'use one of the currently supported simple match patterns: /, /name, name, *, node(), or text()',
          confidence: 1,
        }],
      },
    );
  }

  const location = matchText !== undefined
    ? getAttributeValueSourceLocation(stylesheetXml, templateElement, 'match', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME)
    : name !== undefined
      ? getAttributeValueSourceLocation(stylesheetXml, templateElement, 'name', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME)
      : getNodeSourceLocation(stylesheetXml, templateElement, STYLESHEET_SOURCE_NAME);
  const { params, body } = compileTemplateContent(templateElement, stylesheetXml);

  return {
    ...(match === undefined ? {} : { match }),
    ...(matchText === undefined ? {} : { matchText }),
    ...(location === undefined ? {} : { location }),
    ...(name === undefined ? {} : { name }),
    modes: [],
    ...(priority === undefined || Number.isNaN(priority) ? {} : { priority }),
    params,
    body,
  };
}

function compileTemplateContent(templateElement: Element, stylesheetXml: string): {
  readonly params: readonly TemplateParam[];
  readonly body: readonly Instruction[];
} {
  const params: TemplateParam[] = [];
  const body: Instruction[] = [];
  let seenBodyInstruction = false;

  for (let index = 0; index < templateElement.childNodes.length; index += 1) {
    const node = templateElement.childNodes.item(index);
    if (node === null) {
      continue;
    }

    if (node.nodeType === node.ELEMENT_NODE) {
      const element = node as Element;
      if (isXsltElement(element, 'param')) {
        if (seenBodyInstruction) {
          throw createXsltStaticError(
            'xsl:param must appear before other template content.',
            getElementNameSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME)
              ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
          );
        }

        params.push(compileTemplateParam(element, stylesheetXml));
        continue;
      }
    }

    const instruction = compileInstruction(node, stylesheetXml);
    if (instruction !== undefined) {
      seenBodyInstruction = true;
      body.push(instruction);
    }
  }

  return { params, body };
}

function compileTemplateParam(element: Element, stylesheetXml: string): TemplateParam {
  const name = element.getAttribute('name');
  if (name === null || name.length === 0) {
    throw createXsltStaticError(
      'xsl:param requires a name attribute.',
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        suggestions: [{
          kind: 'fix',
          label: 'add a name="..." attribute to xsl:param',
          replacement: 'name="..."',
          confidence: 1,
        }],
      },
    );
  }

  const select = element.getAttribute('select') ?? undefined;
  if (select === undefined && hasMeaningfulTemplateContent(element)) {
    throw createXsltStaticError(
      'xsl:param sequence-constructor defaults are not yet implemented in the current MVP+3 slice.',
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        paramName: name,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: 'replace xsl:param content with select="..." in the current MVP+3 slice',
          confidence: 1,
        }],
      },
    );
  }

  const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
    ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

  return {
    name,
    ...(select === undefined ? {} : { select: parseXPath(select) }),
    ...(select === undefined ? {} : { selectText: select }),
    ...(location === undefined ? {} : { location }),
  };
}

function compileWithParam(element: Element, stylesheetXml: string): WithParam {
  const name = element.getAttribute('name');
  if (name === null || name.length === 0) {
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
  if (select === undefined && hasMeaningfulTemplateContent(element)) {
    throw createXsltStaticError(
      'xsl:with-param sequence-constructor values are not yet implemented in the current MVP+3 slice.',
      getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        paramName: name,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: 'replace xsl:with-param content with select="..." in the current MVP+3 slice',
          confidence: 1,
        }],
      },
    );
  }

  const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
    ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

  return {
    name,
    ...(select === undefined ? {} : { select: parseXPath(select) }),
    ...(select === undefined ? {} : { selectText: select }),
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
    return text.trim().length === 0
      ? undefined
      : {
          kind: 'literalText',
          text,
        };
  }

  if (node.nodeType !== node.ELEMENT_NODE) {
    return undefined;
  }

  const element = node as Element;
  if (isXsltElement(element, 'apply-templates')) {
    const select = element.getAttribute('select') ?? undefined;
    const mode = element.getAttribute('mode');
    const location = select === undefined
      ? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME)
      : getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
        ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);
    if (mode !== null) {
      throw createXsltStaticError(
        'xsl:apply-templates mode is not yet implemented in the current MVP+3 slice.',
        getAttributeValueSourceLocation(stylesheetXml, element, 'mode', STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          suggestions: [{
            kind: 'fix',
            label: 'remove mode="..." and use the default mode in the current MVP+3 slice',
            replacement: 'mode',
            confidence: 1,
          }],
        },
      );
    }

    return {
      kind: 'applyTemplates',
      ...(location === undefined ? {} : { location }),
      ...(select === undefined ? {} : { selectText: select }),
      ...(select === undefined ? {} : { select: parseXPath(select) }),
    };
  }

  if (isXsltElement(element, 'call-template')) {
    const name = element.getAttribute('name');
    if (name === null || name.length === 0) {
      throw createXsltStaticError(
        'xsl:call-template requires a name attribute.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          suggestions: [{
            kind: 'fix',
            label: 'add a name="..." attribute to xsl:call-template',
            replacement: 'name="..."',
            confidence: 1,
          }],
        },
      );
    }

    const withParams: WithParam[] = [];
    for (const child of childElements(element)) {
      if (!isXsltElement(child, 'with-param')) {
        throw createXsltStaticError(
          `xsl:call-template only supports xsl:with-param children; found ${child.nodeName}.`,
          getElementNameSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME)
            ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
        );
      }

      withParams.push(compileWithParam(child, stylesheetXml));
    }

    const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    return {
      kind: 'callTemplate',
      name,
      withParams,
      ...(location === undefined ? {} : { location }),
    };
  }

  if (isXsltElement(element, 'variable')) {
    const name = element.getAttribute('name');
    if (name === null || name.length === 0) {
      throw createXsltStaticError(
        'xsl:variable requires a name attribute.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          suggestions: [{
            kind: 'fix',
            label: 'add a name="..." attribute to xsl:variable',
            replacement: 'name="..."',
            confidence: 1,
          }],
        },
      );
    }

    const select = element.getAttribute('select') ?? undefined;
    if (select === undefined && hasMeaningfulTemplateContent(element)) {
      throw createXsltStaticError(
        'xsl:variable sequence-constructor values are not yet implemented in the current MVP+3 slice.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          variableName: name,
        },
        {
          suggestions: [{
            kind: 'fix',
            label: 'replace xsl:variable content with select="..." in the current MVP+3 slice',
            confidence: 1,
          }],
        },
      );
    }

    const location = getAttributeValueSourceLocation(stylesheetXml, element, 'name', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    return {
      kind: 'variable',
      name,
      ...(select === undefined ? {} : { select: parseXPath(select) }),
      ...(select === undefined ? {} : { selectText: select }),
      ...(location === undefined ? {} : { location }),
    };
  }

  if (isXsltElement(element, 'if')) {
    const test = element.getAttribute('test');
    if (test === null || test.length === 0) {
      throw createXsltStaticError(
        'xsl:if requires a test attribute.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          suggestions: [{
            kind: 'fix',
            label: 'add a test="..." attribute to xsl:if',
            replacement: 'test="..."',
            confidence: 1,
          }],
        },
      );
    }

    const location = getAttributeValueSourceLocation(stylesheetXml, element, 'test', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    return {
      kind: 'if',
      test: parseXPath(test),
      testText: test,
      body: compileInstructions(element.childNodes, stylesheetXml),
      ...(location === undefined ? {} : { location }),
    };
  }

  if (isXsltElement(element, 'comment')) {
    return {
      kind: 'comment',
      body: compileInstructions(element.childNodes, stylesheetXml),
    };
  }

  if (isXsltElement(element, 'choose')) {
    const whenBranches: ChooseWhenBranch[] = [];
    let otherwiseBody: Instruction[] | undefined;
    let otherwiseLocation: TemplateRule['location'] | undefined;
    let seenOtherwise = false;

    for (const child of childElements(element)) {
      if (isXsltElement(child, 'when')) {
        if (seenOtherwise) {
          throw createXsltStaticError(
            'xsl:when cannot appear after xsl:otherwise within xsl:choose.',
            getElementNameSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME)
              ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
          );
        }

        const test = child.getAttribute('test');
        if (test === null || test.length === 0) {
          throw createXsltStaticError(
            'xsl:when requires a test attribute.',
            getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
            {
              suggestions: [{
                kind: 'fix',
                label: 'add a test="..." attribute to xsl:when',
                replacement: 'test="..."',
                confidence: 1,
              }],
            },
          );
        }

        const location = getAttributeValueSourceLocation(stylesheetXml, child, 'test', STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME);
        whenBranches.push({
          test: parseXPath(test),
          testText: test,
          body: compileInstructions(child.childNodes, stylesheetXml),
          ...(location === undefined ? {} : { location }),
        });
        continue;
      }

      if (isXsltElement(child, 'otherwise')) {
        if (seenOtherwise) {
          throw createXsltStaticError(
            'xsl:choose cannot contain more than one xsl:otherwise.',
            getElementNameSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME)
              ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
          );
        }

        seenOtherwise = true;
        otherwiseBody = compileInstructions(child.childNodes, stylesheetXml);
        otherwiseLocation = getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME);
        continue;
      }

      throw createXsltStaticError(
        `xsl:choose only supports xsl:when and xsl:otherwise children; found ${child.nodeName}.`,
        getElementNameSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME)
          ?? getNodeSourceLocation(stylesheetXml, child, STYLESHEET_SOURCE_NAME),
      );
    }

    if (whenBranches.length === 0) {
      throw createXsltStaticError(
        'xsl:choose requires at least one xsl:when child.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      );
    }

    return {
      kind: 'choose',
      whenBranches,
      ...(otherwiseBody === undefined ? {} : { otherwiseBody }),
      ...(otherwiseLocation === undefined ? {} : { otherwiseLocation }),
    };
  }

  if (isXsltElement(element, 'for-each')) {
    const select = element.getAttribute('select');
    if (select === null || select.length === 0) {
      throw createXsltStaticError(
        'xsl:for-each requires a select attribute.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          suggestions: [{
            kind: 'fix',
            label: 'add a select="..." attribute to xsl:for-each',
            replacement: 'select="..."',
            confidence: 1,
          }],
        },
      );
    }

    const location = getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    return {
      kind: 'forEach',
      select: parseXPath(select),
      selectText: select,
      body: compileInstructions(element.childNodes, stylesheetXml),
      ...(location === undefined ? {} : { location }),
    };
  }

  if (isXsltElement(element, 'value-of')) {
    const select = element.getAttribute('select');
    if (select === null || select.length === 0) {
      throw createXsltStaticError(
        'xsl:value-of requires a select attribute.',
        getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
        {
          suggestions: [{
            kind: 'fix',
            label: 'add a select="..." attribute to xsl:value-of',
            replacement: 'select="..."',
            confidence: 1,
          }],
        },
      );
    }

    const location = getAttributeValueSourceLocation(stylesheetXml, element, 'select', STYLESHEET_SOURCE_NAME)
      ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME);

    const separator = element.getAttribute('separator') ?? undefined;
    return {
      kind: 'valueOf',
      select: parseXPath(select),
      selectText: select,
      ...(location === undefined ? {} : { location }),
      ...(separator === undefined ? {} : { separator }),
    };
  }

  if (isXsltElement(element, 'text')) {
    return {
      kind: 'literalText',
      text: element.textContent ?? '',
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

  return {
    kind: 'literalElement',
    name: element.tagName,
    attributes: compileAttributes(element),
    body: compileInstructions(element.childNodes, stylesheetXml),
  };
}

function compileAttributes(element: Element): AttributeInstruction[] {
  const attributes: AttributeInstruction[] = collectInheritedNamespaceAttributes(element);

  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index) as Attr | null;
    if (attribute === null) {
      continue;
    }

    attributes.push({
      name: attribute.name,
      value: attribute.value,
    });
  }

  return attributes;
}

function collectInheritedNamespaceAttributes(element: Element): AttributeInstruction[] {
  const namespaceAttributes = new Map<string, string>();
  const ancestors: Element[] = [];

  let current: Node | null = element.parentNode;
  while (current !== null) {
    if (current.nodeType === current.ELEMENT_NODE) {
      ancestors.unshift(current as Element);
    }
    current = current.parentNode;
  }

  for (const ancestor of ancestors) {
    for (let index = 0; index < ancestor.attributes.length; index += 1) {
      const attribute = ancestor.attributes.item(index) as Attr | null;
      if (attribute === null || !isNamespaceDeclaration(attribute) || attribute.value === XSLT_NAMESPACE) {
        continue;
      }

      if (!namespaceAttributes.has(attribute.name)) {
        namespaceAttributes.set(attribute.name, attribute.value);
      }
    }
  }

  const attributes: AttributeInstruction[] = [];

  for (const [name, value] of namespaceAttributes) {
    if (element.hasAttribute(name)) {
      continue;
    }

    attributes.push({ name, value });
  }

  return attributes;
}

function hasMeaningfulTemplateContent(element: Element): boolean {
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes.item(index);
    if (node === null) {
      continue;
    }

    if (node.nodeType === node.ELEMENT_NODE) {
      return true;
    }

    if ((node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE) && (node.nodeValue ?? '').trim().length > 0) {
      return true;
    }
  }

  return false;
}

function isNamespaceDeclaration(attribute: Attr): boolean {
  return attribute.name === 'xmlns' || attribute.prefix === 'xmlns';
}

function childElements(element: Element): Element[] {
  const children: Element[] = [];

  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes.item(index);
    if (child !== null && child.nodeType === child.ELEMENT_NODE) {
      children.push(child as Element);
    }
  }

  return children;
}

function isXsltElement(element: Element, localName: string): boolean {
  return element.namespaceURI === XSLT_NAMESPACE && (element.localName ?? element.nodeName) === localName;
}

function isSupportedTemplateMatch(ast: XPathAst): boolean {
  if (ast.kind !== 'path') {
    return false;
  }

  const path = ast as PathExpression;
  if (path.base !== undefined) {
    return false;
  }

  if (path.absolute && path.steps.length === 0) {
    return true;
  }

  if (path.steps.length !== 1) {
    return false;
  }

  const step = path.steps[0];
  if (step?.kind !== 'step') {
    return false;
  }

  return isSupportedTemplateStep(step as StepExpression);
}

function isSupportedTemplateStep(step: StepExpression): boolean {
  if (step.axis !== 'child' || step.predicates.length > 0) {
    return false;
  }

  return step.nodeTest.kind === 'nameTest'
    || step.nodeTest.kind === 'wildcardTest'
    || (step.nodeTest.kind === 'kindTest' && step.nodeTest.name === 'node')
    || (step.nodeTest.kind === 'kindTest' && step.nodeTest.name === 'text');
}

function createInstructionSuggestion(element: Element): ErrorSuggestion | undefined {
  const localName = element.localName ?? element.nodeName;
  const nearest = SUPPORTED_XSLT_INSTRUCTION_NAMES
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(localName, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean xsl:${nearest.candidate}?`,
    replacement: `xsl:${nearest.candidate}`,
    confidence: nearest.distance === 0 ? 1 : 1 - (nearest.distance / nearest.candidate.length),
  };
}

function computeLevenshteinDistance(left: string, right: string): number {
  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0] ?? 0;
    previousRow[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const temp = previousRow[rightIndex] ?? 0;
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previousRow[rightIndex] = Math.min(
        (previousRow[rightIndex] ?? 0) + 1,
        (previousRow[rightIndex - 1] ?? 0) + 1,
        previousDiagonal + substitutionCost,
      );
      previousDiagonal = temp;
    }
  }

  return previousRow[right.length] ?? right.length;
}

function createXsltStaticError(
  message: string,
  location?: TemplateRule['location'],
  detailsOrContext?: Readonly<Record<string, string | number | boolean>> | ErrorContext,
  contextOrCode?: ErrorContext | string,
  maybeCode?: string,
): XsltError {
  const details = isErrorContext(detailsOrContext) ? undefined : detailsOrContext;
  const context = isErrorContext(detailsOrContext)
    ? detailsOrContext
    : isErrorContext(contextOrCode)
      ? contextOrCode
      : undefined;
  const code = typeof contextOrCode === 'string'
    ? contextOrCode
    : maybeCode ?? XTSE0010;

  return new XsltError(code, message, location, details, context);
}

function isErrorContext(value: unknown): value is ErrorContext {
  return typeof value === 'object' && value !== null && (
    'related' in value
    || 'frames' in value
    || 'suggestions' in value
    || 'causes' in value
  );
}
