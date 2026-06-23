import type { Element, Node } from '@xmldom/xmldom';

import { XTSE0580 } from '../../errors/codes.js';
import type { ErrorContext, ErrorFrame } from '../../errors/index.js';
import type { XPathAst } from '../../xpath/parse/ast.js';
import {
  getAttributeValueSourceLocation,
  getElementNameSourceLocation,
  getNodeSourceLocation,
} from '../../xml/parse.js';
import type {
  GlobalParam,
  GlobalVariable,
  Instruction,
  TemplateParam,
  TemplateRule,
} from './ir.js';
import type { CompileIrStatsRecorder, CompileIrTemplateMetrics } from './compiler.js';

type StaticErrorFactory = (
  message: string,
  location?: TemplateRule['location'],
  detailsOrContext?: Readonly<Record<string, string | number | boolean>> | ErrorContext,
  contextOrCode?: ErrorContext | string,
  maybeCode?: string,
) => Error;

export type TopLevelCompilerHelpers = {
  readonly stylesheetSourceName: string;
  isXsltElement(element: Element, localName: string): boolean;
  assertAllowedXsltAttributes(
    element: Element,
    stylesheetXml: string,
    ownerName: string,
    allowedAttributes: readonly string[],
  ): void;
  createXsltStaticError: StaticErrorFactory;
  readonly irStats?: CompileIrStatsRecorder;
  parseXPathInContext(
    expression: string,
    location: TemplateRule['location'],
    ownerName: string,
    attributeName: string,
    frameKind?: ErrorFrame['kind'],
  ): XPathAst;
  normalizeXsltQName(
    name: string,
    element: Element,
    stylesheetXml: string,
    attributeName: string,
    ownerName: string,
  ): string;
  compileInstructions(nodes: NodeListLike, stylesheetXml: string): Instruction[];
  compileInstruction(node: Node, stylesheetXml: string): Instruction | undefined;
  isSupportedTemplateMatch(ast: XPathAst): boolean;
  assertNoSelectAndContent(
    element: Element,
    stylesheetXml: string,
    select: string | undefined,
    ownerName: 'xsl:param' | 'xsl:variable' | 'xsl:with-param',
    detailKey: 'paramName' | 'variableName',
    bindingName: string,
  ): void;
  hasMeaningfulTemplateContent(element: Element): boolean;
  parseRequiredAttribute(element: Element): boolean;
};

type NodeListLike = {
  readonly length: number;
  item(index: number): Node | null;
};

export function compileTopLevelVariableDeclaration(
  element: Element,
  stylesheetXml: string,
  helpers: TopLevelCompilerHelpers,
): GlobalVariable {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:variable', [
    'as',
    'name',
    'select',
  ]);

  const rawName = element.getAttribute('name');
  if (rawName === null || rawName.length === 0) {
    throw helpers.createXsltStaticError(
      'xsl:variable requires a name attribute.',
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add a name="..." attribute to xsl:variable',
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
    'xsl:variable',
    'variableName',
    rawName,
  );
  const body =
    select === undefined && helpers.hasMeaningfulTemplateContent(element)
      ? helpers.compileInstructions(element.childNodes, stylesheetXml)
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
    getAttributeValueSourceLocation(stylesheetXml, element, 'name', helpers.stylesheetSourceName) ??
    getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const name = helpers.normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:variable');
  helpers.irStats?.recordGlobalBinding('variable');

  return {
    kind: 'variable',
    name,
    ...(select === undefined
      ? {}
      : { select: helpers.parseXPathInContext(select, selectLocation, 'xsl:variable', 'select') }),
    ...(select === undefined ? {} : { selectText: select }),
    ...(body === undefined ? {} : { body }),
    ...(location === undefined ? {} : { location }),
  };
}

export function compileTopLevelParamDeclaration(
  element: Element,
  stylesheetXml: string,
  helpers: TopLevelCompilerHelpers,
): GlobalParam {
  const param = compileTemplateParamDeclaration(element, stylesheetXml, helpers);
  return {
    kind: 'param',
    ...param,
  };
}

export function compileTemplateRuleDeclaration(
  templateElement: Element,
  stylesheetXml: string,
  helpers: TopLevelCompilerHelpers,
): TemplateRule {
  const templateStartTime = helpers.irStats === undefined ? 0 : performance.now();
  helpers.assertAllowedXsltAttributes(templateElement, stylesheetXml, 'xsl:template', [
    'exclude-result-prefixes',
    'match',
    'mode',
    'name',
    'priority',
  ]);

  const modeText = templateElement.getAttribute('mode');
  const modes =
    modeText === null
      ? []
      : modeText.trim() === '#default'
        ? []
        : modeText
            .trim()
            .split(/\s+/)
            .filter((value) => value.length > 0);

  const matchText = templateElement.getAttribute('match') ?? undefined;
  const rawName = templateElement.getAttribute('name') ?? undefined;
  const priorityText = templateElement.getAttribute('priority');
  const priority = priorityText === null ? undefined : Number(priorityText);
  helpers.irStats?.beginTemplateLowering(rawName, matchText, templateElement.childNodes.length);

  if (matchText === undefined && rawName === undefined) {
    throw helpers.createXsltStaticError(
      'xsl:template must declare either match or name.',
      getNodeSourceLocation(stylesheetXml, templateElement, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add match="..." or name="..." to xsl:template',
            confidence: 1,
          },
        ],
      },
    );
  }

  const matchLocation =
    matchText === undefined
      ? undefined
      : (getAttributeValueSourceLocation(
          stylesheetXml,
          templateElement,
          'match',
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, templateElement, helpers.stylesheetSourceName));
  const match =
    matchText === undefined
      ? undefined
      : helpers.parseXPathInContext(matchText, matchLocation, 'xsl:template', 'match', 'template');
  if (match !== undefined && !helpers.isSupportedTemplateMatch(match)) {
    throw helpers.createXsltStaticError(
      `Unsupported template match pattern ${JSON.stringify(matchText)} in current MVP+3 slice.`,
      matchLocation,
      {
        suggestions: [
          {
            kind: 'fix',
            label:
              'use one of the currently supported child-only match patterns: /, /name, name, section/item, *, node(), or text()',
            confidence: 1,
          },
        ],
      },
    );
  }

  const location =
    matchText !== undefined
      ? matchLocation
      : rawName !== undefined
        ? (getAttributeValueSourceLocation(
            stylesheetXml,
            templateElement,
            'name',
            helpers.stylesheetSourceName,
          ) ?? getNodeSourceLocation(stylesheetXml, templateElement, helpers.stylesheetSourceName))
        : getNodeSourceLocation(stylesheetXml, templateElement, helpers.stylesheetSourceName);
  const name =
    rawName === undefined
      ? undefined
      : helpers.normalizeXsltQName(rawName, templateElement, stylesheetXml, 'name', 'xsl:template');
  const { params, body } = compileTemplateContentDeclaration(
    templateElement,
    stylesheetXml,
    helpers,
  );
  const templateMetrics = collectTemplateMetrics(body);

  helpers.irStats?.recordTemplateRule();
  helpers.irStats?.endTemplateLowering(
    templateMetrics,
    helpers.irStats === undefined ? 0 : performance.now() - templateStartTime,
  );

  return {
    ...(match === undefined ? {} : { match }),
    ...(matchText === undefined ? {} : { matchText }),
    ...(location === undefined ? {} : { location }),
    ...(name === undefined ? {} : { name }),
    modes,
    ...(priority === undefined || Number.isNaN(priority) ? {} : { priority }),
    params,
    body,
  };
}

export function compileTemplateContentDeclaration(
  templateElement: Element,
  stylesheetXml: string,
  helpers: TopLevelCompilerHelpers,
): {
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
      if (helpers.isXsltElement(element, 'param')) {
        if (seenBodyInstruction) {
          throw helpers.createXsltStaticError(
            'xsl:param must appear before other template content.',
            getElementNameSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName) ??
              getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
          );
        }

        const param = compileTemplateParamDeclaration(element, stylesheetXml, helpers);
        if (params.some((existing) => existing.name === param.name)) {
          throw helpers.createXsltStaticError(
            `xsl:template cannot declare duplicate xsl:param name ${param.name}.`,
            param.location ??
              getAttributeValueSourceLocation(
                stylesheetXml,
                element,
                'name',
                helpers.stylesheetSourceName,
              ) ??
              getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
            {
              paramName: param.name,
            },
            {
              suggestions: [
                {
                  kind: 'fix',
                  label: `rename or remove one of the duplicate xsl:param declarations for ${param.name}`,
                  confidence: 1,
                },
              ],
            },
            XTSE0580,
          );
        }

        params.push(param);
        continue;
      }
    }

    const instruction = helpers.compileInstruction(node, stylesheetXml);
    if (instruction !== undefined) {
      seenBodyInstruction = true;
      body.push(instruction);
    }
  }

  return { params, body };
}

function collectTemplateMetrics(instructions: readonly Instruction[]): CompileIrTemplateMetrics {
  let instructionCount = 0;
  let callTemplateCount = 0;
  let applyTemplatesCount = 0;
  let chooseCount = 0;
  let variableCount = 0;
  let literalResultCount = 0;
  const calledTemplateNames = new Set<string>();
  const applyTemplateModes = new Set<string>();

  const walkInstructions = (entries: readonly Instruction[]): void => {
    for (const instruction of entries) {
      instructionCount += 1;
      if (instruction.kind === 'callTemplate') {
        callTemplateCount += 1;
        calledTemplateNames.add(instruction.name);
      }
      if (instruction.kind === 'applyTemplates') {
        applyTemplatesCount += 1;
        for (const mode of instruction.modes) {
          applyTemplateModes.add(mode);
        }
      }
      if (instruction.kind === 'choose') {
        chooseCount += 1;
      }
      if (instruction.kind === 'variable') {
        variableCount += 1;
      }
      if (instruction.kind === 'literalElement') {
        literalResultCount += 1;
      }

      if ('body' in instruction && Array.isArray(instruction.body)) {
        walkInstructions(instruction.body);
      }
      if (instruction.kind === 'choose') {
        for (const clause of instruction.whenBranches) {
          walkInstructions(clause.body);
        }
        if (instruction.otherwiseBody !== undefined) {
          walkInstructions(instruction.otherwiseBody);
        }
      }
      if ('withParams' in instruction) {
        for (const withParam of instruction.withParams) {
          if (withParam.body !== undefined) {
            walkInstructions(withParam.body);
          }
        }
      }
    }
  };

  walkInstructions(instructions);

  return {
    instructionCount,
    callTemplateCount,
    applyTemplatesCount,
    chooseCount,
    variableCount,
    literalResultCount,
    calledTemplateNames: [...calledTemplateNames].sort(),
    applyTemplateModes: [...applyTemplateModes].sort(),
  };
}

export function compileTemplateParamDeclaration(
  element: Element,
  stylesheetXml: string,
  helpers: TopLevelCompilerHelpers,
): TemplateParam {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:param', [
    'as',
    'name',
    'required',
    'select',
    'tunnel',
  ]);

  const rawName = element.getAttribute('name');
  if (rawName === null || rawName.length === 0) {
    throw helpers.createXsltStaticError(
      'xsl:param requires a name attribute.',
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add a name="..." attribute to xsl:param',
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
    'xsl:param',
    'paramName',
    rawName,
  );
  const required = helpers.parseRequiredAttribute(element);
  const requiredLocation =
    getAttributeValueSourceLocation(
      stylesheetXml,
      element,
      'required',
      helpers.stylesheetSourceName,
    ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  if (required && select !== undefined) {
    throw helpers.createXsltStaticError(
      'xsl:param with required="yes" cannot also specify a select attribute.',
      requiredLocation,
      {
        paramName: rawName,
      },
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'remove required="yes" or remove select="..." from xsl:param',
            confidence: 1,
          },
        ],
      },
    );
  }

  if (required && helpers.hasMeaningfulTemplateContent(element)) {
    throw helpers.createXsltStaticError(
      'xsl:param with required="yes" cannot also specify a sequence constructor.',
      requiredLocation,
      {
        paramName: rawName,
      },
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'remove required="yes" or remove xsl:param content',
            confidence: 1,
          },
        ],
      },
    );
  }

  const body =
    select === undefined && helpers.hasMeaningfulTemplateContent(element)
      ? helpers.compileInstructions(element.childNodes, stylesheetXml)
      : undefined;
  const asType = element.getAttribute('as') ?? undefined;
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
    getAttributeValueSourceLocation(stylesheetXml, element, 'name', helpers.stylesheetSourceName) ??
    getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const name = helpers.normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:param');
  helpers.irStats?.recordGlobalBinding('param');

  return {
    name,
    ...(asType === undefined ? {} : { asType }),
    ...(required ? { required: true } : {}),
    ...(select === undefined
      ? {}
      : { select: helpers.parseXPathInContext(select, selectLocation, 'xsl:param', 'select') }),
    ...(select === undefined ? {} : { selectText: select }),
    ...(body === undefined ? {} : { body }),
    ...(location === undefined ? {} : { location }),
  };
}
