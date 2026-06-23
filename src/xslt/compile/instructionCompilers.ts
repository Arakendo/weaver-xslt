import type { Element, Node } from '@xmldom/xmldom';

import type { ErrorContext } from '../../errors/index.js';
import type { XPathAst } from '../../xpath/parse/ast.js';
import {
  getAttributeValueSourceLocation,
  getElementNameSourceLocation,
  getNodeSourceLocation,
} from '../../xml/parse.js';
import type { CompileIrStatsRecorder } from './compiler.js';
import type { ChooseWhenBranch, Instruction, TemplateRule, WithParam } from './ir.js';

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

export type InstructionCompilerHelpers = {
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
  ): XPathAst;
  compileInstructions(nodes: NodeListLike, stylesheetXml: string): Instruction[];
  childElements(element: Element): Element[];
  compileWithParam(element: Element, stylesheetXml: string): WithParam;
  assertNoDuplicateWithParam(
    existingParams: readonly WithParam[],
    withParam: WithParam,
    stylesheetXml: string,
    element: Element,
    parentInstructionName: 'xsl:apply-templates' | 'xsl:call-template',
  ): void;
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
    ownerName: string,
    detailKey: string,
    detailValue: string,
  ): void;
  hasMeaningfulTemplateContent(element: Element): boolean;
};

export function compileApplyTemplatesInstruction(
  element: Element,
  stylesheetXml: string,
  helpers: InstructionCompilerHelpers,
): Extract<Instruction, { readonly kind: 'applyTemplates' }> {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:apply-templates', [
    'mode',
    'select',
  ]);

  const select = element.getAttribute('select') ?? undefined;
  const mode = element.getAttribute('mode');
  const withParams: WithParam[] = [];
  const location =
    select === undefined
      ? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName)
      : (getAttributeValueSourceLocation(
          stylesheetXml,
          element,
          'select',
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName));
  const modes =
    mode === null
      ? []
      : mode.trim() === '#default'
        ? []
        : mode
            .trim()
            .split(/\s+/)
            .filter((value) => value.length > 0);

  for (const child of helpers.childElements(element)) {
    if (!helpers.isXsltElement(child, 'with-param')) {
      throw helpers.createXsltStaticError(
        `xsl:apply-templates only supports xsl:with-param children; found ${child.nodeName}.`,
        getElementNameSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName) ??
          getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
        {
          suggestions: [
            {
              kind: 'fix',
              label: 'replace the child with xsl:with-param or remove it from xsl:apply-templates',
              confidence: 1,
            },
          ],
        },
      );
    }

    const withParam = helpers.compileWithParam(child, stylesheetXml);
    helpers.assertNoDuplicateWithParam(
      withParams,
      withParam,
      stylesheetXml,
      child,
      'xsl:apply-templates',
    );
    withParams.push(withParam);
  }

  return {
    kind: 'applyTemplates',
    withParams,
    modes,
    ...(location === undefined ? {} : { location }),
    ...(select === undefined ? {} : { selectText: select }),
    ...(select === undefined
      ? {}
      : { select: helpers.parseXPathInContext(select, location, 'xsl:apply-templates', 'select') }),
  };
}

export function compileNumberInstruction(
  element: Element,
  stylesheetXml: string,
  helpers: InstructionCompilerHelpers,
): Extract<Instruction, { readonly kind: 'number' }> {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:number', [
    'count',
    'format',
    'level',
  ]);

  const countText = element.getAttribute('count');
  if (countText === null || countText.length === 0) {
    throw helpers.createXsltStaticError(
      'xsl:number requires a count attribute in the current MVP+3 slice.',
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add count="..." to xsl:number',
            replacement: 'count="..."',
            confidence: 1,
          },
        ],
      },
    );
  }

  const countLocation =
    getAttributeValueSourceLocation(
      stylesheetXml,
      element,
      'count',
      helpers.stylesheetSourceName,
    ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const count = helpers.parseXPathInContext(countText, countLocation, 'xsl:number', 'count');

  const levelText = element.getAttribute('level') ?? 'single';
  if (levelText !== 'single' && levelText !== 'multiple' && levelText !== 'any') {
    throw helpers.createXsltStaticError(
      `xsl:number level ${JSON.stringify(levelText)} is not supported in the current MVP+3 slice.`,
      getAttributeValueSourceLocation(
        stylesheetXml,
        element,
        'level',
        helpers.stylesheetSourceName,
      ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'use level="single", level="multiple", or level="any"',
            confidence: 1,
          },
        ],
      },
    );
  }

  const format = element.getAttribute('format') ?? '1';
  const location = getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);

  return {
    kind: 'number',
    count,
    countText,
    level: levelText,
    format,
    ...(location === undefined ? {} : { location }),
  };
}

export function compileCallTemplateInstruction(
  element: Element,
  stylesheetXml: string,
  helpers: InstructionCompilerHelpers,
): Extract<Instruction, { readonly kind: 'callTemplate' }> {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:call-template', ['name']);

  const rawName = element.getAttribute('name');
  if (rawName === null || rawName.length === 0) {
    throw helpers.createXsltStaticError(
      'xsl:call-template requires a name attribute.',
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add a name="..." attribute to xsl:call-template',
            replacement: 'name="..."',
            confidence: 1,
          },
        ],
      },
    );
  }

  const withParams: WithParam[] = [];
  for (const child of helpers.childElements(element)) {
    if (!helpers.isXsltElement(child, 'with-param')) {
      throw helpers.createXsltStaticError(
        `xsl:call-template only supports xsl:with-param children; found ${child.nodeName}.`,
        getElementNameSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName) ??
          getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
        {
          suggestions: [
            {
              kind: 'fix',
              label: 'replace the child with xsl:with-param or remove it from xsl:call-template',
              confidence: 1,
            },
          ],
        },
      );
    }

    const withParam = helpers.compileWithParam(child, stylesheetXml);
    helpers.assertNoDuplicateWithParam(
      withParams,
      withParam,
      stylesheetXml,
      child,
      'xsl:call-template',
    );
    withParams.push(withParam);
  }

  const location =
    getAttributeValueSourceLocation(stylesheetXml, element, 'name', helpers.stylesheetSourceName) ??
    getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const name = helpers.normalizeXsltQName(
    rawName,
    element,
    stylesheetXml,
    'name',
    'xsl:call-template',
  );

  return {
    kind: 'callTemplate',
    name,
    withParams,
    ...(location === undefined ? {} : { location }),
  };
}

export function compileAttributeInstruction(
  element: Element,
  stylesheetXml: string,
  helpers: InstructionCompilerHelpers,
): Extract<Instruction, { readonly kind: 'attribute' }> {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:attribute', ['name', 'select']);

  const rawName = element.getAttribute('name');
  if (rawName === null || rawName.length === 0) {
    throw helpers.createXsltStaticError(
      'xsl:attribute requires a name attribute.',
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add a name="..." attribute to xsl:attribute',
            replacement: 'name="..."',
            confidence: 1,
          },
        ],
      },
    );
  }

  const select = element.getAttribute('select') ?? undefined;
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
  const name = helpers.normalizeXsltQName(rawName, element, stylesheetXml, 'name', 'xsl:attribute');

  return {
    kind: 'attribute',
    name,
    ...(select === undefined
      ? {}
      : { select: helpers.parseXPathInContext(select, selectLocation, 'xsl:attribute', 'select') }),
    ...(select === undefined ? {} : { selectText: select }),
    ...(body === undefined ? {} : { body }),
    ...(location === undefined ? {} : { location }),
  };
}

export function compileVariableInstruction(
  element: Element,
  stylesheetXml: string,
  helpers: InstructionCompilerHelpers,
): Extract<Instruction, { readonly kind: 'variable' }> {
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

export function compileIfInstruction(
  element: Element,
  stylesheetXml: string,
  helpers: InstructionCompilerHelpers,
): Extract<Instruction, { readonly kind: 'if' }> {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:if', ['test']);

  const test = element.getAttribute('test');
  if (test === null || test.length === 0) {
    throw helpers.createXsltStaticError(
      'xsl:if requires a test attribute.',
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add a test="..." attribute to xsl:if',
            replacement: 'test="..."',
            confidence: 1,
          },
        ],
      },
    );
  }

  const location =
    getAttributeValueSourceLocation(stylesheetXml, element, 'test', helpers.stylesheetSourceName) ??
    getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);

  return {
    kind: 'if',
    test: helpers.parseXPathInContext(test, location, 'xsl:if', 'test'),
    testText: test,
    body: helpers.compileInstructions(element.childNodes, stylesheetXml),
    ...(location === undefined ? {} : { location }),
  };
}

export function compileChooseInstruction(
  element: Element,
  stylesheetXml: string,
  helpers: InstructionCompilerHelpers,
): Extract<Instruction, { readonly kind: 'choose' }> {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:choose', []);

  const whenBranches: ChooseWhenBranch[] = [];
  let otherwiseBody: Instruction[] | undefined;
  let otherwiseLocation: TemplateRule['location'] | undefined;
  let seenOtherwise = false;

  for (const child of helpers.childElements(element)) {
    if (helpers.isXsltElement(child, 'when')) {
      helpers.assertAllowedXsltAttributes(child, stylesheetXml, 'xsl:when', ['test']);

      if (seenOtherwise) {
        throw helpers.createXsltStaticError(
          'xsl:when cannot appear after xsl:otherwise within xsl:choose.',
          getElementNameSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName) ??
            getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
        );
      }

      const test = child.getAttribute('test');
      if (test === null || test.length === 0) {
        throw helpers.createXsltStaticError(
          'xsl:when requires a test attribute.',
          getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
          {
            suggestions: [
              {
                kind: 'fix',
                label: 'add a test="..." attribute to xsl:when',
                replacement: 'test="..."',
                confidence: 1,
              },
            ],
          },
        );
      }

      const location =
        getAttributeValueSourceLocation(
          stylesheetXml,
          child,
          'test',
          helpers.stylesheetSourceName,
        ) ?? getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName);
      whenBranches.push({
        test: helpers.parseXPathInContext(test, location, 'xsl:when', 'test'),
        testText: test,
        body: helpers.compileInstructions(child.childNodes, stylesheetXml),
        ...(location === undefined ? {} : { location }),
      });
      continue;
    }

    if (helpers.isXsltElement(child, 'otherwise')) {
      helpers.assertAllowedXsltAttributes(child, stylesheetXml, 'xsl:otherwise', []);

      if (seenOtherwise) {
        throw helpers.createXsltStaticError(
          'xsl:choose cannot contain more than one xsl:otherwise.',
          getElementNameSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName) ??
            getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
        );
      }

      seenOtherwise = true;
      otherwiseBody = helpers.compileInstructions(child.childNodes, stylesheetXml);
      otherwiseLocation = getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName);
      continue;
    }

    throw helpers.createXsltStaticError(
      `xsl:choose only supports xsl:when and xsl:otherwise children; found ${child.nodeName}.`,
      getElementNameSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName) ??
        getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
    );
  }

  if (whenBranches.length === 0) {
    throw helpers.createXsltStaticError(
      'xsl:choose requires at least one xsl:when child.',
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
    );
  }

  const location = getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);

  return {
    kind: 'choose',
    whenBranches,
    ...(otherwiseBody === undefined ? {} : { otherwiseBody }),
    ...(otherwiseLocation === undefined ? {} : { otherwiseLocation }),
    ...(location === undefined ? {} : { location }),
  };
}

export function compileForEachInstruction(
  element: Element,
  stylesheetXml: string,
  helpers: InstructionCompilerHelpers,
): Extract<Instruction, { readonly kind: 'forEach' }> {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:for-each', ['select']);

  const select = element.getAttribute('select');
  if (select === null || select.length === 0) {
    throw helpers.createXsltStaticError(
      'xsl:for-each requires a select attribute.',
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add a select="..." attribute to xsl:for-each',
            replacement: 'select="..."',
            confidence: 1,
          },
        ],
      },
    );
  }

  const location =
    getAttributeValueSourceLocation(
      stylesheetXml,
      element,
      'select',
      helpers.stylesheetSourceName,
    ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);

  return {
    kind: 'forEach',
    select: helpers.parseXPathInContext(select, location, 'xsl:for-each', 'select'),
    selectText: select,
    body: helpers.compileInstructions(element.childNodes, stylesheetXml),
    ...(location === undefined ? {} : { location }),
  };
}

export function compileValueOfInstruction(
  element: Element,
  stylesheetXml: string,
  helpers: InstructionCompilerHelpers,
): Extract<Instruction, { readonly kind: 'valueOf' }> {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:value-of', [
    'select',
    'separator',
    'disable-output-escaping',
  ]);

  const select = element.getAttribute('select');
  if (select === null || select.length === 0) {
    throw helpers.createXsltStaticError(
      'xsl:value-of requires a select attribute.',
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add a select="..." attribute to xsl:value-of',
            replacement: 'select="..."',
            confidence: 1,
          },
        ],
      },
    );
  }

  const location =
    getAttributeValueSourceLocation(
      stylesheetXml,
      element,
      'select',
      helpers.stylesheetSourceName,
    ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);

  const separator = element.getAttribute('separator') ?? undefined;
  const disableOutputEscaping = element.getAttribute('disable-output-escaping') === 'yes';
  return {
    kind: 'valueOf',
    select: helpers.parseXPathInContext(select, location, 'xsl:value-of', 'select'),
    selectText: select,
    ...(location === undefined ? {} : { location }),
    ...(separator === undefined ? {} : { separator }),
    ...(disableOutputEscaping ? { disableOutputEscaping: true } : {}),
  };
}

export function compileCopyOfInstruction(
  element: Element,
  stylesheetXml: string,
  helpers: InstructionCompilerHelpers,
): Extract<Instruction, { readonly kind: 'copyOf' }> {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, 'xsl:copy-of', ['select']);

  const select = element.getAttribute('select');
  if (select === null || select.length === 0) {
    throw helpers.createXsltStaticError(
      'xsl:copy-of requires a select attribute.',
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'add a select="..." attribute to xsl:copy-of',
            replacement: 'select="..."',
            confidence: 1,
          },
        ],
      },
    );
  }

  const location =
    getAttributeValueSourceLocation(
      stylesheetXml,
      element,
      'select',
      helpers.stylesheetSourceName,
    ) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);

  return {
    kind: 'copyOf',
    select: helpers.parseXPathInContext(select, location, 'xsl:copy-of', 'select'),
    selectText: select,
    ...(location === undefined ? {} : { location }),
  };
}
