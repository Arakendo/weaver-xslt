/**
 * Transform evaluator: runs a compiled StylesheetIR against an input doc.
 *
 * Current MVP+3 slice: template dispatch for `/`, simple name matches, and the
 * built-in root/element/text behavior needed for early apply-templates flows.
 */

import { XMLSerializer, type Node } from '@xmldom/xmldom';

import {
  XTDE0040,
  XTDE0050,
  XTDE0640,
  XTDE0700,
  XTSE0010,
  XTSE0650,
  XPTY0004,
} from '../../errors/codes.js';
import {
  XsltError,
  type ErrorFrame,
  type ErrorSuggestion,
  type RelatedLocation,
} from '../../errors/index.js';
import type {
  TransformOptions,
  TransformResult,
  TransformTraceOptions,
  XmlTraceEvent,
} from '../../processor/types.js';
import { createXmlNodeHandle } from '../../runtime/xmlNodeHandles.js';
import {
  emitTraceEvent as publishTraceEvent,
  getRecordedTracePause,
  isTraceEnabled,
  resetRecordedTracePause,
} from '../../runtime/tracePause.js';
import { parseXml } from '../../xml/parse.js';
import {
  createXdmNode,
  createXdmString,
  type XdmAtomicValue,
  type XdmItem,
  type XdmNode,
} from '../../xdm/types.js';
import { evaluate, evaluateEffectiveBooleanValue } from '../../xpath/eval/evaluator.js';
import type { DynamicContext } from '../../xpath/eval/context.js';
import type { XPathAst } from '../../xpath/parse/ast.js';
import type {
  GlobalBinding,
  Instruction,
  StylesheetIR,
  TemplateParam,
  TemplateRule,
  WithParam,
} from '../compile/ir.js';
import {
  computeLevenshteinDistance,
  prependXsltErrorFrame as withPrependedFrame,
} from '../diagnostics.js';
import {
  createInitialTemplateSuggestion,
  createNamedTemplateCallSuggestion,
  findBestMatchingTemplate,
  findNamedTemplate,
  formatTemplateSuggestionName,
  normalizeTemplateName,
} from './templateDispatch.js';
import { buildTemporaryTree } from './temporaryTree.js';

const xmlSerializer = new XMLSerializer();

type DeferredVariableBinding = {
  readonly evaluate: () => unknown;
};

type AttributeCollector = Map<string, string>;

type ExternalParameters = {
  readonly values: ReadonlyMap<string, unknown>;
  readonly normalizedNames: readonly string[];
};

export function runTransform(
  ir: StylesheetIR,
  sourceXml: string,
  options: TransformOptions,
): TransformResult {
  const trace = options.trace;
  const sourceDocumentUri = trace?.documentUri ?? '<source-xml>';
  resetRecordedTracePause(trace);

  if (options.initialMode !== undefined) {
    throw new XsltError(
      XTDE0040,
      'Initial modes are not yet implemented in the current MVP+3 slice.',
      undefined,
      { mode: options.initialMode },
      {
        suggestions: [
          {
            kind: 'fix',
            label: 'omit initialMode and use the default mode in the current MVP+3 slice',
            confidence: 1,
          },
        ],
      },
    );
  }

  const sourceDocument = parseXml(sourceXml, {
    role: 'source-document',
    sourceName: '<source-xml>',
  });
  const staticContext = createStaticContext(ir, options);
  const globalVariables = evaluateGlobalBindings(
    ir,
    ir.globalBindings,
    staticContext,
    createXdmNode(sourceDocument),
    options.parameters,
  );

  if (options.initialTemplate !== undefined) {
    const initialContext = createContext(
      createXdmNode(sourceDocument),
      staticContext,
      1,
      1,
      globalVariables,
    );
    const output = renderInitialTemplate(
      options.initialTemplate,
      ir,
      initialContext,
      trace,
      sourceDocumentUri,
    );
    const pause = getRecordedTracePause(trace);
    return {
      output,
      ...(pause === undefined ? {} : { pause }),
    };
  }

  const output = applyTemplatesToItems(
    [createXdmNode(sourceDocument)],
    ir,
    staticContext,
    globalVariables,
    trace,
    sourceDocumentUri,
    undefined,
    [],
  );
  const pause = getRecordedTracePause(trace);
  return {
    output,
    ...(pause === undefined ? {} : { pause }),
  };
}

function createStaticContext(
  ir: StylesheetIR,
  options: TransformOptions,
): DynamicContext['staticContext'] {
  return {
    namespaces: new Map(Object.entries(ir.namespaces)),
    defaultElementNamespace: ir.defaultElementNamespace,
    ...(options.baseUri === undefined ? {} : { baseUri: options.baseUri }),
  };
}

function createContext(
  item: XdmItem,
  staticContext: DynamicContext['staticContext'],
  position: number,
  size: number,
  variables: ReadonlyMap<string, unknown> = new Map(),
): DynamicContext {
  return {
    staticContext,
    contextItem: item,
    contextPosition: position,
    contextSize: size,
    variables,
  };
}

function applyTemplatesToItems(
  items: readonly XdmItem[],
  ir: StylesheetIR,
  staticContext: DynamicContext['staticContext'],
  variables: ReadonlyMap<string, unknown> = new Map(),
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
  location?: TemplateRule['location'],
  withParams: readonly WithParam[] = [],
  modes: readonly string[] = [],
  attributeCollector?: AttributeCollector,
): string {
  if (items.some((item) => asXdmNode(item) === undefined)) {
    throw createApplyTemplatesNodeSequenceError(items, location);
  }

  return items
    .map((item, index) => {
      const nodeItem = item as XdmNode;
      const context = createContext(nodeItem, staticContext, index + 1, items.length, variables);
      const handle = tryCreateTraceNodeHandle(nodeItem.node, trace, sourceDocumentUri);
      if (handle !== undefined) {
        emitTraceEvent(trace, {
          kind: 'focus-enter',
          node: handle,
        });
      }
      return applyTemplateToNode(
        nodeItem.node,
        ir,
        context,
        withParams,
        trace,
        sourceDocumentUri,
        modes,
        attributeCollector,
      );
    })
    .join('');
}

function applyTemplateToNode(
  node: Node,
  ir: StylesheetIR,
  context: DynamicContext,
  withParams: readonly WithParam[] = [],
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
  modes: readonly string[] = [],
  attributeCollector?: AttributeCollector,
): string {
  const template = findBestMatchingTemplate(node, ir.templates, context.staticContext, modes);
  if (template !== undefined) {
    const handle = tryCreateTraceNodeHandle(node, trace, sourceDocumentUri);
    if (handle !== undefined) {
      emitTraceEvent(trace, {
        kind: 'template-enter',
        node: handle,
        template: {
          ...(template.matchText === undefined ? {} : { match: template.matchText }),
          ...(template.name === undefined ? {} : { name: template.name }),
          ...(template.location === undefined ? {} : { location: template.location }),
        },
      });
    }
    try {
      return renderTemplate(
        template,
        withParams,
        ir,
        context,
        trace,
        sourceDocumentUri,
        attributeCollector,
      );
    } catch (error) {
      throw withPrependedFrame(
        error,
        createTemplateFrame(template),
        createRelatedLocation('enclosing template', template.location),
      );
    }
  }

  return renderBuiltInTemplate(
    node,
    ir,
    context.staticContext,
    context.variables,
    trace,
    sourceDocumentUri,
    modes,
  );
}

function renderInitialTemplate(
  name: string,
  ir: StylesheetIR,
  context: DynamicContext,
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
): string {
  const normalizedName = normalizeTemplateName(name, context.staticContext);
  const template = findNamedTemplate(normalizedName, ir.templates);
  if (template === undefined) {
    const suggestion = createInitialTemplateSuggestion(name, ir.templates);
    throw new XsltError(
      XTSE0010,
      `Initial template ${name} is not declared in the current stylesheet.`,
      undefined,
      {
        initialTemplate: name,
      },
      suggestion === undefined
        ? {
            suggestions: [
              {
                kind: 'fix',
                label: `declare xsl:template name="${name}" or omit initialTemplate`,
                confidence: 1,
              },
            ],
          }
        : { suggestions: [suggestion] },
    );
  }

  const contextNode = asXdmNode(context.contextItem)?.node;
  if (contextNode !== undefined) {
    const handle = tryCreateTraceNodeHandle(contextNode, trace, sourceDocumentUri);
    if (handle !== undefined) {
      emitTraceEvent(trace, {
        kind: 'template-enter',
        node: handle,
        template: {
          ...(template.matchText === undefined ? {} : { match: template.matchText }),
          ...(template.name === undefined ? {} : { name: template.name }),
          ...(template.location === undefined ? {} : { location: template.location }),
        },
      });
    }
  }

  try {
    return renderTemplate(template, [], ir, context, trace, sourceDocumentUri);
  } catch (error) {
    throw withPrependedFrame(
      error,
      createTemplateFrame(template),
      createRelatedLocation('initial template', template.location),
    );
  }
}

function renderInstructions(
  instructions: readonly Instruction[],
  ir: StylesheetIR,
  context: DynamicContext,
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
  attributeCollector?: AttributeCollector,
): string {
  let output = '';
  let currentContext = context;

  for (const instruction of instructions) {
    if (instruction.kind === 'variable') {
      currentContext = bindVariableInstruction(
        instruction,
        ir,
        currentContext,
        trace,
        sourceDocumentUri,
      );
      continue;
    }

    output += renderInstruction(
      instruction,
      ir,
      currentContext,
      trace,
      sourceDocumentUri,
      attributeCollector,
    );
  }

  return output;
}

function renderInstruction(
  instruction: Instruction,
  ir: StylesheetIR,
  context: DynamicContext,
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
  attributeCollector?: AttributeCollector,
): string {
  switch (instruction.kind) {
    case 'literalText':
      return instruction.disableOutputEscaping === true
        ? instruction.text
        : escapeText(instruction.text);
    case 'comment':
      return `<!--${renderInstructions(instruction.body, ir, context, trace, sourceDocumentUri)}-->`;
    case 'variable':
      return '';
    case 'literalElement': {
      const collectedAttributes = new Map<string, string>();
      for (const attribute of instruction.attributes) {
        collectedAttributes.set(attribute.name, attribute.value);
      }

      const body = renderInstructions(
        instruction.body,
        ir,
        context,
        trace,
        sourceDocumentUri,
        collectedAttributes,
      );
      const attributes = [...collectedAttributes.entries()]
        .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
        .join('');
      return `<${instruction.name}${attributes}>${body}</${instruction.name}>`;
    }
    case 'attribute': {
      if (attributeCollector === undefined) {
        throw new XsltError(
          XTSE0010,
          'xsl:attribute is only supported inside a literal result element in the current MVP+3 slice.',
          instruction.location,
          undefined,
          {
            suggestions: [
              {
                kind: 'fix',
                label: 'move xsl:attribute into a literal result element body',
                confidence: 1,
              },
            ],
          },
        );
      }

      const value =
        instruction.select === undefined
          ? renderInstructions(instruction.body ?? [], ir, context, trace, sourceDocumentUri)
          : [...evaluate(instruction.select, context)].map(itemToStringValue).join(' ');
      attributeCollector.set(instruction.name, value);
      return '';
    }
    case 'if': {
      try {
        return evaluateEffectiveBooleanValue(instruction.test, context)
          ? renderInstructions(
              instruction.body,
              ir,
              context,
              trace,
              sourceDocumentUri,
              attributeCollector,
            )
          : '';
      } catch (error) {
        throw withPrependedFrame(
          error,
          createInstructionFrame(`xsl:if test="${instruction.testText}"`, instruction.location),
          createRelatedLocation('containing instruction', instruction.location),
        );
      }
    }
    case 'choose': {
      for (const branch of instruction.whenBranches) {
        try {
          if (evaluateEffectiveBooleanValue(branch.test, context)) {
            return renderInstructions(
              branch.body,
              ir,
              context,
              trace,
              sourceDocumentUri,
              attributeCollector,
            );
          }
        } catch (error) {
          throw withPrependedFrame(
            error,
            createInstructionFrame(`xsl:when test="${branch.testText}"`, branch.location),
            createRelatedLocation('containing instruction', branch.location),
          );
        }
      }

      return instruction.otherwiseBody === undefined
        ? ''
        : renderInstructions(
            instruction.otherwiseBody,
            ir,
            context,
            trace,
            sourceDocumentUri,
            attributeCollector,
          );
    }
    case 'forEach': {
      try {
        const items = [...evaluate(instruction.select, context)];
        emitInstructionSelectEvents(
          items,
          trace,
          sourceDocumentUri,
          'xsl:for-each',
          instruction.location,
        );
        return items
          .map((item, index) =>
            renderInstructions(
              instruction.body,
              ir,
              {
                ...context,
                contextItem: item,
                contextPosition: index + 1,
                contextSize: items.length,
              },
              trace,
              sourceDocumentUri,
              attributeCollector,
            ),
          )
          .join('');
      } catch (error) {
        throw withPrependedFrame(
          error,
          createInstructionFrame(
            `xsl:for-each select="${instruction.selectText}"`,
            instruction.location,
          ),
          createRelatedLocation('containing instruction', instruction.location),
        );
      }
    }
    case 'callTemplate': {
      const template = findNamedTemplate(instruction.name, ir.templates);
      if (template === undefined) {
        const suggestion = createNamedTemplateCallSuggestion(instruction.name, ir.templates);
        throw new XsltError(
          XTSE0650,
          `Named template ${instruction.name} is not declared in the current stylesheet.`,
          instruction.location,
          {
            templateName: instruction.name,
          },
          suggestion === undefined ? undefined : { suggestions: [suggestion] },
        );
      }

      try {
        return renderTemplate(
          template,
          instruction.withParams,
          ir,
          context,
          trace,
          sourceDocumentUri,
          attributeCollector,
        );
      } catch (error) {
        throw withPrependedFrame(
          error,
          createTemplateFrame(template),
          createRelatedLocation('called template', template.location),
        );
      }
    }
    case 'valueOf': {
      try {
        const items = [...evaluate(instruction.select, context)];
        emitInstructionSelectEvents(
          items,
          trace,
          sourceDocumentUri,
          'xsl:value-of',
          instruction.location,
        );
        emitValueReadEvents(items, trace, sourceDocumentUri, instruction.location);
        const separator = instruction.separator ?? ' ';
        const output = items.map(itemToStringValue).join(separator);
        return instruction.disableOutputEscaping === true ? output : escapeText(output);
      } catch (error) {
        throw withPrependedFrame(
          error,
          createInstructionFrame(
            `xsl:value-of select="${instruction.selectText}"`,
            instruction.location,
          ),
          createRelatedLocation('containing instruction', instruction.location),
        );
      }
    }
    case 'copyOf': {
      try {
        const items = [...evaluate(instruction.select, context)];
        emitInstructionSelectEvents(
          items,
          trace,
          sourceDocumentUri,
          'xsl:copy-of',
          instruction.location,
        );
        return items
          .map((item) =>
            asXdmNode(item) !== undefined
              ? xmlSerializer.serializeToString(asXdmNode(item)!.node)
              : escapeText(itemToStringValue(item)),
          )
          .join('');
      } catch (error) {
        throw withPrependedFrame(
          error,
          createInstructionFrame(
            `xsl:copy-of select="${instruction.selectText}"`,
            instruction.location,
          ),
          createRelatedLocation('containing instruction', instruction.location),
        );
      }
    }
    case 'number': {
      try {
        return renderNumberInstruction(instruction, context);
      } catch (error) {
        throw withPrependedFrame(
          error,
          createInstructionFrame(
            `xsl:number count="${instruction.countText}"`,
            instruction.location,
          ),
          createRelatedLocation('containing instruction', instruction.location),
        );
      }
    }
    case 'applyTemplates': {
      try {
        const items =
          instruction.select === undefined
            ? getChildNodeItems(context.contextItem)
            : [...evaluate(instruction.select, context)];
        emitInstructionSelectEvents(
          items,
          trace,
          sourceDocumentUri,
          'xsl:apply-templates',
          instruction.location,
        );
        return applyTemplatesToItems(
          items,
          ir,
          context.staticContext,
          context.variables,
          trace,
          sourceDocumentUri,
          instruction.location,
          instruction.withParams,
          instruction.modes,
          attributeCollector,
        );
      } catch (error) {
        throw withPrependedFrame(
          error,
          createInstructionFrame(
            instruction.selectText === undefined
              ? 'xsl:apply-templates'
              : `xsl:apply-templates select="${instruction.selectText}"`,
            instruction.location,
          ),
          createRelatedLocation('caller instruction', instruction.location),
        );
      }
    }
  }
}

function bindVariableInstruction(
  instruction: Extract<Instruction, { readonly kind: 'variable' }>,
  ir: StylesheetIR,
  context: DynamicContext,
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
): DynamicContext {
  try {
    const value = evaluateBindingValue(instruction, ir, context, trace, sourceDocumentUri);
    const variables = new Map(context.variables);
    variables.set(instruction.name, value);
    variables.set(`{}${instruction.name}`, value);
    return {
      ...context,
      variables,
    };
  } catch (error) {
    throw withPrependedFrame(
      error,
      createInstructionFrame(
        instruction.selectText === undefined
          ? `xsl:variable name="${instruction.name}"`
          : `xsl:variable name="${instruction.name}" select="${instruction.selectText}"`,
        instruction.location,
      ),
      createRelatedLocation('containing instruction', instruction.location),
    );
  }
}

function renderTemplate(
  template: TemplateRule,
  withParams: readonly WithParam[],
  ir: StylesheetIR,
  context: DynamicContext,
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
  attributeCollector?: AttributeCollector,
): string {
  const variables = bindTemplateParams(
    template.params,
    withParams,
    ir,
    context,
    trace,
    sourceDocumentUri,
  );
  return renderInstructions(
    template.body,
    ir,
    {
      ...context,
      variables,
    },
    trace,
    sourceDocumentUri,
    attributeCollector,
  );
}

function bindTemplateParams(
  params: readonly TemplateParam[],
  withParams: readonly WithParam[],
  ir: StylesheetIR,
  context: DynamicContext,
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
): ReadonlyMap<string, unknown> {
  if (params.length === 0 && withParams.length === 0) {
    return context.variables;
  }

  const provided = new Map<string, unknown>();
  for (const withParam of withParams) {
    provided.set(
      withParam.name,
      evaluateBindingValue(withParam, ir, context, trace, sourceDocumentUri),
    );
  }

  const variables = new Map(context.variables);
  for (const param of params) {
    const value = provided.has(param.name)
      ? provided.get(param.name)
      : param.required
        ? throwMissingTemplateParam(param, [...provided.keys()])
        : evaluateBindingValue(
            param,
            ir,
            {
              ...context,
              variables,
            },
            trace,
            sourceDocumentUri,
          );
    variables.set(param.name, value);
    variables.set(`{}${param.name}`, value);
  }

  return variables;
}

function evaluateBindingValue(
  binding:
    | Pick<TemplateParam, 'select' | 'body'>
    | Pick<WithParam, 'select' | 'body'>
    | Pick<Extract<Instruction, { readonly kind: 'variable' }>, 'select' | 'body'>
    | Pick<GlobalBinding, 'select' | 'body'>,
  ir: StylesheetIR,
  context: DynamicContext,
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
): unknown {
  if (binding.select !== undefined) {
    return [...evaluate(binding.select, context)];
  }

  if (binding.body === undefined) {
    return [createXdmString('')];
  }

  return evaluateTemporaryTree(binding.body, ir, context, trace, sourceDocumentUri);
}

function evaluateTemporaryTree(
  body: readonly Instruction[],
  ir: StylesheetIR,
  context: DynamicContext,
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
): readonly XdmItem[] {
  return [buildTemporaryTree(renderInstructions(body, ir, context, trace, sourceDocumentUri))];
}

function throwMissingTemplateParam(
  param: Pick<TemplateParam, 'name' | 'location'>,
  providedNames: readonly string[],
): never {
  const suggestion = createMissingTemplateParamSuggestion(param.name, providedNames);
  throw new XsltError(
    XTDE0700,
    `Required template parameter $${param.name} was not supplied.`,
    param.location,
    {
      parameterName: param.name,
    },
    suggestion === undefined ? undefined : { suggestions: [suggestion] },
  );
}

function getChildNodeItems(item: unknown): XdmItem[] {
  const nodeItem = asXdmNode(item);
  if (nodeItem === undefined) {
    return [];
  }

  const children: XdmItem[] = [];
  for (let index = 0; index < nodeItem.node.childNodes.length; index += 1) {
    const child = nodeItem.node.childNodes.item(index);
    if (child !== null) {
      children.push(createXdmNode(child));
    }
  }

  return children;
}

function renderBuiltInTemplate(
  node: Node,
  ir: StylesheetIR,
  staticContext: DynamicContext['staticContext'],
  variables: ReadonlyMap<string, unknown>,
  trace?: TransformTraceOptions,
  sourceDocumentUri = '<source-xml>',
  modes: readonly string[] = [],
): string {
  if (node.nodeType === node.DOCUMENT_NODE || node.nodeType === node.ELEMENT_NODE) {
    return applyTemplatesToItems(
      getChildNodeItems(createXdmNode(node)),
      ir,
      staticContext,
      variables,
      trace,
      sourceDocumentUri,
      undefined,
      [],
      modes,
    );
  }

  if (
    node.nodeType === node.TEXT_NODE ||
    node.nodeType === node.CDATA_SECTION_NODE ||
    node.nodeType === node.ATTRIBUTE_NODE
  ) {
    return escapeText(node.nodeValue ?? '');
  }

  return '';
}

function emitTraceEvent(trace: TransformTraceOptions | undefined, event: XmlTraceEvent): void {
  publishTraceEvent(trace, event);
}

function tryCreateTraceNodeHandle(
  node: Node,
  trace: TransformTraceOptions | undefined,
  sourceDocumentUri: string,
) {
  if (!isTraceEnabled(trace)) {
    return undefined;
  }

  switch (node.nodeType) {
    case node.DOCUMENT_NODE:
    case node.ELEMENT_NODE:
    case node.ATTRIBUTE_NODE:
    case node.TEXT_NODE:
    case node.COMMENT_NODE:
    case node.PROCESSING_INSTRUCTION_NODE:
      return createXmlNodeHandle(node, sourceDocumentUri);
    default:
      return undefined;
  }
}

function emitInstructionSelectEvents(
  items: readonly XdmItem[],
  trace: TransformTraceOptions | undefined,
  sourceDocumentUri: string,
  instructionKind: string,
  location: RelatedLocation['location'] | undefined,
): void {
  if (!isTraceEnabled(trace)) {
    return;
  }

  for (const item of items) {
    const nodeItem = asXdmNode(item);
    if (nodeItem === undefined) {
      continue;
    }

    const handle = tryCreateTraceNodeHandle(nodeItem.node, trace, sourceDocumentUri);
    if (handle === undefined) {
      continue;
    }

    emitTraceEvent(trace, {
      kind: 'instruction-select',
      node: handle,
      instruction: {
        kind: instructionKind,
        ...(location === undefined ? {} : { location }),
      },
    });
  }
}

function emitValueReadEvents(
  items: readonly XdmItem[],
  trace: TransformTraceOptions | undefined,
  sourceDocumentUri: string,
  location: RelatedLocation['location'] | undefined,
): void {
  if (!isTraceEnabled(trace)) {
    return;
  }

  for (const item of items) {
    const nodeItem = asXdmNode(item);
    if (nodeItem === undefined) {
      continue;
    }

    const handle = tryCreateTraceNodeHandle(nodeItem.node, trace, sourceDocumentUri);
    if (handle === undefined) {
      continue;
    }

    emitTraceEvent(trace, {
      kind: 'value-read',
      node: handle,
      instruction: {
        kind: 'xsl:value-of',
        ...(location === undefined ? {} : { location }),
      },
    });
  }
}

function itemToStringValue(item: XdmItem): string {
  const nodeItem = asXdmNode(item);
  if (nodeItem !== undefined) {
    return nodeItem.node.textContent ?? '';
  }

  return String((item as XdmAtomicValue).value);
}

function renderNumberInstruction(
  instruction: Extract<Instruction, { readonly kind: 'number' }>,
  context: DynamicContext,
): string {
  const node = asXdmNode(context.contextItem)?.node;
  if (node === undefined) {
    return '';
  }

  const counts = getNumberingCounts(
    node,
    instruction.count,
    context.staticContext,
    instruction.level,
  );
  if (counts.length === 0) {
    return '';
  }

  return formatNumberCounts(counts, instruction.format);
}

function getNumberingCounts(
  node: Node,
  countPattern: XPathAst,
  staticContext: DynamicContext['staticContext'],
  level: 'single' | 'multiple' | 'any',
): readonly number[] {
  if (level === 'any') {
    return [countAnyPreceding(node, countPattern, staticContext) + 1];
  }

  if (level === 'multiple') {
    const chain: Node[] = [];
    for (let current: Node | null = node; current !== null; current = current.parentNode) {
      if (matchesNumberPattern(current, countPattern, staticContext)) {
        chain.push(current);
      }
    }

    chain.reverse();
    return chain.map((current) => countSinglePosition(current, countPattern, staticContext));
  }

  return [countSinglePosition(node, countPattern, staticContext)];
}

function countSinglePosition(
  node: Node,
  countPattern: XPathAst,
  staticContext: DynamicContext['staticContext'],
): number {
  const parent = node.parentNode;
  if (parent === null) {
    return 1;
  }

  let position = 0;
  for (const sibling of getChildNodes(parent)) {
    if (!matchesNumberPattern(sibling, countPattern, staticContext)) {
      continue;
    }

    position += 1;
    if (sibling === node) {
      return position;
    }
  }

  return position === 0 ? 1 : position;
}

function countAnyPreceding(
  node: Node,
  countPattern: XPathAst,
  staticContext: DynamicContext['staticContext'],
): number {
  const root = node.nodeType === node.DOCUMENT_NODE ? node : (node.ownerDocument ?? node);
  let count = 0;
  let finished = false;

  const visit = (current: Node): void => {
    if (finished) {
      return;
    }

    if (current === node) {
      finished = true;
      return;
    }

    if (matchesNumberPattern(current, countPattern, staticContext)) {
      count += 1;
    }

    for (const child of getChildNodes(current)) {
      visit(child);
      if (finished) {
        return;
      }
    }
  };

  visit(root);
  return count;
}

function matchesNumberPattern(
  node: Node,
  pattern: XPathAst,
  staticContext: DynamicContext['staticContext'],
): boolean {
  const contextNode =
    node.nodeType === node.DOCUMENT_NODE ? node : (node.parentNode ?? node.ownerDocument ?? node);
  const context = {
    staticContext,
    contextItem: createXdmNode(contextNode),
    contextPosition: 1,
    contextSize: 1,
    variables: new Map(),
  } satisfies DynamicContext;

  try {
    return [...evaluate(pattern, context)].some((item) => asXdmNode(item)?.node === node);
  } catch {
    return false;
  }
}

function formatNumberCounts(counts: readonly number[], format: string): string {
  if (counts.length === 0) {
    return '';
  }

  if (counts.length === 1) {
    return formatSingleCount(counts[0]!, format);
  }

  const formatParts = format.split('.').filter((part) => part.length > 0);
  const parts = counts.map((count, index) =>
    formatSingleCount(count, formatParts[index] ?? formatParts.at(-1) ?? '1'),
  );
  return parts.join('.');
}

function formatSingleCount(count: number, format: string): string {
  if (format === 'i') {
    return toRomanNumeral(count).toLowerCase();
  }

  if (format === 'I') {
    return toRomanNumeral(count).toUpperCase();
  }

  return String(count);
}

function toRomanNumeral(value: number): string {
  if (value <= 0) {
    return '';
  }

  const symbols: readonly [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let remaining = Math.floor(value);
  let result = '';
  for (const [threshold, symbol] of symbols) {
    while (remaining >= threshold) {
      result += symbol;
      remaining -= threshold;
    }
  }

  return result;
}

function getChildNodes(node: Node): readonly Node[] {
  const children: Node[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child !== null) {
      children.push(child);
    }
  }

  return children;
}

function evaluateGlobalBindings(
  ir: StylesheetIR,
  bindings: readonly GlobalBinding[],
  staticContext: DynamicContext['staticContext'],
  contextItem: XdmItem,
  parameters: TransformOptions['parameters'],
): ReadonlyMap<string, unknown> {
  if (bindings.length === 0 && parameters === undefined) {
    return new Map();
  }

  const externalParameters = normalizeExternalParameters(parameters, staticContext);
  const runtimeBindings = new Map<string, unknown>();
  for (const binding of bindings) {
    let state: 'pending' | 'evaluating' | 'done' = 'pending';
    let cachedValue: unknown;
    const deferredBinding: DeferredVariableBinding = {
      evaluate: () => {
        if (state === 'done') {
          return cachedValue;
        }

        if (state === 'evaluating') {
          throw new XsltError(
            XTDE0640,
            `Circular top-level ${binding.kind} dependency involving $${binding.name}.`,
            binding.location,
            { variableName: binding.name },
          );
        }

        state = 'evaluating';
        try {
          if (binding.kind === 'param' && externalParameters.values.has(binding.name)) {
            cachedValue = externalParameters.values.get(binding.name);
          } else if (binding.kind === 'param' && binding.required) {
            const suggestion = createMissingStylesheetParameterSuggestion(
              binding.name,
              externalParameters.normalizedNames,
            );
            throw new XsltError(
              XTDE0050,
              `Required stylesheet parameter $${binding.name} was not supplied.`,
              binding.location,
              {
                parameterName: binding.name,
              },
              suggestion === undefined ? undefined : { suggestions: [suggestion] },
            );
          } else {
            const context = createContext(contextItem, staticContext, 1, 1, runtimeBindings);
            cachedValue = evaluateBindingValue(binding, ir, context);
          }
          state = 'done';
          runtimeBindings.set(binding.name, cachedValue);
          runtimeBindings.set(`{}${binding.name}`, cachedValue);
          return cachedValue;
        } catch (error) {
          state = 'pending';
          throw withPrependedFrame(
            error,
            createInstructionFrame(
              binding.selectText === undefined
                ? `xsl:${binding.kind} name="${binding.name}"`
                : `xsl:${binding.kind} name="${binding.name}" select="${binding.selectText}"`,
              binding.location,
            ),
            createRelatedLocation(`top-level ${binding.kind}`, binding.location),
          );
        }
      },
    };
    runtimeBindings.set(binding.name, deferredBinding);
    runtimeBindings.set(`{}${binding.name}`, deferredBinding);
  }

  for (const binding of bindings) {
    const deferredBinding = runtimeBindings.get(binding.name) as DeferredVariableBinding | unknown;
    if (
      typeof deferredBinding === 'object' &&
      deferredBinding !== null &&
      'evaluate' in deferredBinding
    ) {
      (deferredBinding as DeferredVariableBinding).evaluate();
    }
  }

  return runtimeBindings;
}

function normalizeExternalParameters(
  parameters: TransformOptions['parameters'],
  staticContext: DynamicContext['staticContext'],
): ExternalParameters {
  if (parameters === undefined) {
    return {
      values: new Map(),
      normalizedNames: [],
    };
  }

  const bindings = new Map<string, unknown>();
  const normalizedNames: string[] = [];
  for (const [name, value] of Object.entries(parameters)) {
    const normalizedName = normalizeTemplateName(name, staticContext);
    normalizedNames.push(normalizedName);
    bindings.set(normalizedName, value);
    if (!normalizedName.startsWith('{')) {
      bindings.set(`{}${normalizedName}`, value);
    }
  }

  return {
    values: bindings,
    normalizedNames,
  };
}

function createMissingStylesheetParameterSuggestion(
  expectedName: string,
  providedNames: readonly string[],
): ErrorSuggestion | undefined {
  const expectedDisplayName = expectedName.startsWith('{')
    ? expectedName
    : formatTemplateSuggestionName(expectedName);
  const nearest = providedNames
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(
        formatTemplateSuggestionName(expectedDisplayName),
        formatTemplateSuggestionName(candidate),
      ),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean to pass parameters["${expectedDisplayName}"]?`,
    replacement: expectedDisplayName,
    confidence:
      nearest.distance === 0
        ? 1
        : 1 - nearest.distance / formatTemplateSuggestionName(expectedDisplayName).length,
  };
}

function createMissingTemplateParamSuggestion(
  expectedName: string,
  providedNames: readonly string[],
): ErrorSuggestion | undefined {
  const expectedDisplayName = formatTemplateSuggestionName(expectedName);
  const nearest = providedNames
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(
        expectedDisplayName,
        formatTemplateSuggestionName(candidate),
      ),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean xsl:with-param name="${expectedDisplayName}"?`,
    replacement: expectedDisplayName,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / expectedDisplayName.length,
  };
}

function asXdmNode(item: unknown): XdmNode | undefined {
  return typeof item === 'object' && item !== null && (item as XdmItem).xdmKind === 'node'
    ? (item as XdmNode)
    : undefined;
}

function createTemplateFrame(template: TemplateRule): ErrorFrame {
  if (template.matchText !== undefined) {
    return {
      kind: 'template',
      label: `match="${template.matchText}"`,
      ...(template.location === undefined ? {} : { location: template.location }),
    };
  }

  if (template.name !== undefined) {
    return {
      kind: 'template',
      label: `name="${template.name}"`,
      ...(template.location === undefined ? {} : { location: template.location }),
    };
  }

  return {
    kind: 'template',
    label: '<anonymous>',
    ...(template.location === undefined ? {} : { location: template.location }),
  };
}

function createInstructionFrame(label: string, location?: TemplateRule['location']): ErrorFrame {
  return {
    kind: 'instruction',
    label,
    ...(location === undefined ? {} : { location }),
  };
}

function createApplyTemplatesNodeSequenceError(
  items: readonly XdmItem[],
  location?: TemplateRule['location'],
): XsltError {
  return new XsltError(
    XPTY0004,
    'xsl:apply-templates requires a sequence of nodes.',
    location,
    {
      expectedType: 'node()*',
      actualType: describeItemsType(items),
    },
    {
      suggestions: [
        {
          kind: 'fix',
          label: 'use a node-selecting expression for xsl:apply-templates',
          confidence: 1,
        },
      ],
    },
  );
}

function describeItemsType(items: readonly XdmItem[]): string {
  if (items.length === 0) {
    return 'empty-sequence()';
  }

  if (items.length === 1) {
    return describeItemType(items[0]!);
  }

  const uniqueTypes = [...new Set(items.map((item) => describeItemType(item)))];
  return `sequence(${items.length}) of ${uniqueTypes.join(' | ')}`;
}

function describeItemType(item: XdmItem): string {
  if (item.xdmKind === 'node') {
    return 'node()';
  }

  if (item.xdmKind === 'map') {
    return 'map(*)';
  }

  if (item.xdmKind === 'array') {
    return 'array(*)';
  }

  return (item as XdmAtomicValue).type;
}

function createRelatedLocation(
  label: string,
  location: TemplateRule['location'],
): RelatedLocation | undefined {
  return location === undefined ? undefined : { label, location };
}

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;');
}
