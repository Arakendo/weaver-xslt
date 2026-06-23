import type { Element, Node } from '@xmldom/xmldom';

import type { ErrorContext, ErrorSuggestion } from '../../errors/index.js';
import type { XPathAst } from '../../xpath/parse/ast.js';
import {
  getAttributeValueSourceLocation,
  getElementNameSourceLocation,
  getNodeSourceLocation,
} from '../../xml/parse.js';
import {
  compileAttributeInstruction,
  compileApplyTemplatesInstruction,
  compileCallTemplateInstruction,
  compileChooseInstruction,
  compileCopyOfInstruction,
  compileForEachInstruction,
  compileIfInstruction,
  compileNumberInstruction,
  compileValueOfInstruction,
  compileVariableInstruction,
  type InstructionCompilerHelpers,
} from './instructionCompilers.js';
import type { Instruction, TemplateRule, WithParam } from './ir.js';
import type { CompileIrStatsRecorder } from './compiler.js';
import { compileLiteralResultElement } from './literalResult.js';

type NodeListLike = {
  readonly length: number;
  item(index: number): Node | null;
};

type StaticErrorFactory = (
  message: string,
  location?: TemplateRule['location'],
  detailsOrContext?: Readonly<Record<string, string | number | boolean>> | ErrorContext,
  contextOrCode?: ErrorContext | string,
  maybeCode?: string,
) => Error;

export type InstructionEntrypointHelpers = {
  readonly stylesheetSourceName: string;
  readonly xsltNamespace: string;
  isXsltElement(element: Element, localName: string): boolean;
  assertAllowedXsltAttributes(
    element: Element,
    stylesheetXml: string,
    ownerName: string,
    allowedAttributes: readonly string[],
  ): void;
  createInstructionSuggestion(element: Element): ErrorSuggestion | undefined;
  createXsltStaticError: StaticErrorFactory;
  readonly irStats?: CompileIrStatsRecorder;
  parseXPathInContext(
    expression: string,
    location: TemplateRule['location'],
    ownerName: string,
    attributeName: string,
  ): XPathAst;
  normalizeXsltQName(
    name: string,
    element: Element,
    stylesheetXml: string,
    attributeName: string,
    ownerName: string,
  ): string;
  assertNoSelectAndContent(
    element: Element,
    stylesheetXml: string,
    select: string | undefined,
    ownerName: 'xsl:param' | 'xsl:variable' | 'xsl:with-param',
    detailKey: 'paramName' | 'variableName',
    bindingName: string,
  ): void;
  hasMeaningfulTemplateContent(element: Element): boolean;
  childElements(element: Element): Element[];
  assertNoDuplicateWithParam(
    existingParams: readonly WithParam[],
    withParam: WithParam,
    stylesheetXml: string,
    element: Element,
    parentInstructionName: 'xsl:apply-templates' | 'xsl:call-template',
  ): void;
};

export function createInstructionEntrypoints(helpers: InstructionEntrypointHelpers): {
  compileInstructions(nodes: NodeListLike, stylesheetXml: string): Instruction[];
  compileInstruction(node: Node, stylesheetXml: string): Instruction | undefined;
} {
  function compileWithParam(element: Element, stylesheetXml: string): WithParam {
    helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:with-param', [
      'as',
      'name',
      'select',
      'tunnel',
    ]);

    const rawName = element.getAttribute('name');
    if (rawName === null || rawName.length === 0) {
      throw helpers.createXsltStaticError(
        'xsl:with-param requires a name attribute.',
        getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
        {
          suggestions: [
            {
              kind: 'fix',
              label: 'add a name="..." attribute to xsl:with-param',
              replacement: 'name="..."',
              confidence: 1,
            },
          ],
        },
      );
    }

    const select = element.getAttribute('select') ?? undefined;
    helpers.assertNoSelectAndContent(
      element,
      stylesheetXml,
      select,
      'xsl:with-param',
      'paramName',
      rawName,
    );
    const body =
      select === undefined && helpers.hasMeaningfulTemplateContent(element)
        ? compileInstructions(element.childNodes, stylesheetXml)
        : undefined;
    const selectLocation =
      select === undefined
        ? undefined
        : (getAttributeValueSourceLocation(
            stylesheetXml,
            element,
            'select',
            helpers.stylesheetSourceName,
          ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName));

    const location =
      getAttributeValueSourceLocation(
        stylesheetXml,
        element,
        'name',
        helpers.stylesheetSourceName,
      ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
    const name = helpers.normalizeXsltQName(
      rawName,
      element,
      stylesheetXml,
      'name',
      'xsl:with-param',
    );

    return {
      name,
      ...(select === undefined
        ? {}
        : {
            select: helpers.parseXPathInContext(select, selectLocation, 'xsl:with-param', 'select'),
          }),
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

  const instructionCompilerHelpers: InstructionCompilerHelpers = {
    stylesheetSourceName: helpers.stylesheetSourceName,
    isXsltElement: helpers.isXsltElement,
    assertAllowedXsltAttributes: helpers.assertAllowedXsltAttributes,
    createXsltStaticError: helpers.createXsltStaticError,
    ...(helpers.irStats === undefined ? {} : { irStats: helpers.irStats }),
    parseXPathInContext: helpers.parseXPathInContext,
    compileInstructions,
    childElements: helpers.childElements,
    compileWithParam,
    assertNoDuplicateWithParam: helpers.assertNoDuplicateWithParam,
    normalizeXsltQName: helpers.normalizeXsltQName,
    assertNoSelectAndContent: helpers.assertNoSelectAndContent,
    hasMeaningfulTemplateContent: helpers.hasMeaningfulTemplateContent,
  };

  function compileInstruction(node: Node, stylesheetXml: string): Instruction | undefined {
    if (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE) {
      const text = node.nodeValue ?? '';
      const location = getNodeSourceLocation(stylesheetXml, node, helpers.stylesheetSourceName);
      const instruction: Extract<Instruction, { readonly kind: 'literalText' }> | undefined =
        text.trim().length === 0
          ? undefined
          : {
              kind: 'literalText',
              text,
              ...(location === undefined ? {} : { location }),
            };
      if (instruction !== undefined) {
        helpers.irStats?.recordInstruction('literalText');
      }
      return instruction;
    }

    if (node.nodeType !== node.ELEMENT_NODE) {
      return undefined;
    }

    const element = node as Element;
    if (helpers.isXsltElement(element, 'apply-templates')) {
      const instruction = compileApplyTemplatesInstruction(
        element,
        stylesheetXml,
        instructionCompilerHelpers,
      );
      helpers.irStats?.recordInstruction('applyTemplates');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'attribute')) {
      const instruction = compileAttributeInstruction(
        element,
        stylesheetXml,
        instructionCompilerHelpers,
      );
      helpers.irStats?.recordInstruction('attribute');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'call-template')) {
      const instruction = compileCallTemplateInstruction(
        element,
        stylesheetXml,
        instructionCompilerHelpers,
      );
      helpers.irStats?.recordInstruction('callTemplate');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'variable')) {
      const instruction = compileVariableInstruction(
        element,
        stylesheetXml,
        instructionCompilerHelpers,
      );
      helpers.irStats?.recordInstruction('variable');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'if')) {
      const instruction = compileIfInstruction(element, stylesheetXml, instructionCompilerHelpers);
      helpers.irStats?.recordInstruction('if');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'comment')) {
      helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:comment', []);

      const location = getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
      const instruction: Extract<Instruction, { readonly kind: 'comment' }> = {
        kind: 'comment',
        body: compileInstructions(element.childNodes, stylesheetXml),
        ...(location === undefined ? {} : { location }),
      };
      helpers.irStats?.recordInstruction('comment');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'choose')) {
      const instruction = compileChooseInstruction(
        element,
        stylesheetXml,
        instructionCompilerHelpers,
      );
      helpers.irStats?.recordInstruction('choose');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'for-each')) {
      const instruction = compileForEachInstruction(
        element,
        stylesheetXml,
        instructionCompilerHelpers,
      );
      helpers.irStats?.recordInstruction('forEach');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'value-of')) {
      const instruction = compileValueOfInstruction(
        element,
        stylesheetXml,
        instructionCompilerHelpers,
      );
      helpers.irStats?.recordInstruction('valueOf');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'copy-of')) {
      const instruction = compileCopyOfInstruction(
        element,
        stylesheetXml,
        instructionCompilerHelpers,
      );
      helpers.irStats?.recordInstruction('copyOf');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'number')) {
      const instruction = compileNumberInstruction(
        element,
        stylesheetXml,
        instructionCompilerHelpers,
      );
      helpers.irStats?.recordInstruction('number');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'element')) {
      helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:element', ['name']);

      const rawName = element.getAttribute('name');
      if (rawName === null || rawName.length === 0) {
        throw helpers.createXsltStaticError(
          'xsl:element requires a name attribute.',
          getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
          {
            suggestions: [
              {
                kind: 'fix',
                label: 'add name="..." to xsl:element',
                replacement: 'name="..."',
                confidence: 1,
              },
            ],
          },
        );
      }

      const location = getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
      const instruction: Extract<Instruction, { readonly kind: 'literalElement' }> = {
        kind: 'literalElement',
        name: rawName,
        attributes: [],
        body: compileInstructions(element.childNodes, stylesheetXml),
        ...(location === undefined ? {} : { location }),
      };
      helpers.irStats?.recordInstruction('literalElement');
      return instruction;
    }

    if (helpers.isXsltElement(element, 'text')) {
      helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:text', [
        'disable-output-escaping',
      ]);

      const location = getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
      const disableOutputEscaping = element.getAttribute('disable-output-escaping') === 'yes';
      const instruction: Extract<Instruction, { readonly kind: 'literalText' }> = {
        kind: 'literalText',
        text: element.textContent ?? '',
        ...(disableOutputEscaping ? { disableOutputEscaping: true } : {}),
        ...(location === undefined ? {} : { location }),
      };
      helpers.irStats?.recordInstruction('literalText');
      return instruction;
    }

    if (element.namespaceURI === helpers.xsltNamespace) {
      const suggestion = helpers.createInstructionSuggestion(element);
      throw helpers.createXsltStaticError(
        `Unsupported XSLT instruction ${element.nodeName} in current MVP+3 slice.`,
        getElementNameSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName) ??
          getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
        {
          instructionName: element.nodeName,
        },
        suggestion === undefined ? undefined : { suggestions: [suggestion] },
      );
    }

    const instruction = compileLiteralResultElement(
      element,
      stylesheetXml,
      compileInstructions,
      helpers.xsltNamespace,
      helpers.stylesheetSourceName,
      helpers.parseXPathInContext,
    );
    helpers.irStats?.recordInstruction('literalResult');
    return instruction;
  }

  return {
    compileInstructions,
    compileInstruction,
  };
}
