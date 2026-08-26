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
  compileSequenceInstruction,
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

  function compileInstructions(
    nodes: NodeListLike,
    stylesheetXml: string,
    parentInstructionName?: 'xsl:for-each',
  ): Instruction[] {
    const instructions: Instruction[] = [];

    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes.item(index);
      if (node === null) {
        continue;
      }

      const instruction = compileInstruction(node, stylesheetXml, parentInstructionName);
      if (instruction !== undefined) {
        instructions.push(instruction);
      }
    }

    const onEmptyIndex = instructions.findIndex(
      (instruction) =>
        instruction.kind === 'conditionalContent' && instruction.condition === 'empty',
    );
    if (onEmptyIndex >= 0 && onEmptyIndex !== instructions.length - 1) {
      const instruction = instructions[onEmptyIndex]!;
      throw helpers.createXsltStaticError(
        'xsl:on-empty must be the last instruction in its sequence constructor.',
        instruction.location,
        { instructionName: 'xsl:on-empty' },
      );
    }

    return instructions;
  }

  function compileConditionalContentInstruction(
    element: Element,
    stylesheetXml: string,
    condition: 'empty' | 'non-empty',
  ): Extract<Instruction, { readonly kind: 'conditionalContent' }> {
    const instructionName = condition === 'empty' ? 'xsl:on-empty' : 'xsl:on-non-empty';
    helpers.assertAllowedXsltAttributes(element, stylesheetXml, instructionName, ['select']);

    const select = element.getAttribute('select') ?? undefined;
    const body: Instruction[] = [];
    for (let index = 0; index < element.childNodes.length; index += 1) {
      const child = element.childNodes.item(index);
      if (child === null) {
        continue;
      }
      if (
        child.nodeType === child.ELEMENT_NODE &&
        helpers.isXsltElement(child as Element, 'fallback')
      ) {
        continue;
      }
      const childInstruction = compileInstruction(child, stylesheetXml);
      if (childInstruction !== undefined) {
        body.push(childInstruction);
      }
    }

    const location =
      (select === undefined
        ? undefined
        : getAttributeValueSourceLocation(
            stylesheetXml,
            element,
            'select',
            helpers.stylesheetSourceName,
          )) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
    if (select !== undefined && body.length > 0) {
      throw helpers.createXsltStaticError(
        `${instructionName} cannot specify both select and sequence-constructor content.`,
        location,
        { instructionName },
      );
    }

    return {
      kind: 'conditionalContent',
      condition,
      ...(select === undefined
        ? {}
        : {
            select: helpers.parseXPathInContext(select, location, instructionName, 'select'),
            selectText: select,
          }),
      ...(select === undefined ? { body } : {}),
      ...(location === undefined ? {} : { location }),
    };
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

  function compileInstruction(
    node: Node,
    stylesheetXml: string,
    parentInstructionName?: 'xsl:for-each',
  ): Instruction | undefined {
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
    if (helpers.isXsltElement(element, 'sort')) {
      const location =
        getAttributeValueSourceLocation(
          stylesheetXml,
          element,
          'select',
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
      if (parentInstructionName !== 'xsl:for-each') {
        throw helpers.createXsltStaticError(
          'xsl:sort is only supported as a leading child of xsl:for-each.',
          location,
          { instructionName: 'xsl:sort' },
        );
      }
      helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:sort', ['select']);
      if (helpers.hasMeaningfulTemplateContent(element)) {
        throw helpers.createXsltStaticError(
          'Sequence-constructor sort keys are not supported; use the select attribute.',
          location,
          { instructionName: 'xsl:sort' },
        );
      }
      const select = element.getAttribute('select') ?? '.';
      const instruction: Extract<Instruction, { readonly kind: 'sort' }> = {
        kind: 'sort',
        select: helpers.parseXPathInContext(select, location, 'xsl:sort', 'select'),
        selectText: select,
        ...(location === undefined ? {} : { location }),
      };
      helpers.irStats?.recordInstruction('sort');
      return instruction;
    }

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

    if (helpers.isXsltElement(element, 'sequence')) {
      const instruction = compileSequenceInstruction(
        element,
        stylesheetXml,
        instructionCompilerHelpers,
      );
      helpers.irStats?.recordInstruction('sequence');
      return instruction;
    }

    if (
      helpers.isXsltElement(element, 'on-empty') ||
      helpers.isXsltElement(element, 'on-non-empty')
    ) {
      const condition = helpers.isXsltElement(element, 'on-empty') ? 'empty' : 'non-empty';
      const instruction = compileConditionalContentInstruction(element, stylesheetXml, condition);
      helpers.irStats?.recordInstruction('conditionalContent');
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

    if (helpers.isXsltElement(element, 'fallback')) {
      helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:fallback', []);
      return undefined;
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
