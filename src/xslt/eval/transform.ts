/**
 * Transform evaluator: runs a compiled StylesheetIR against an input doc.
 *
 * Current MVP+3 slice: template dispatch for `/`, simple name matches, and the
 * built-in root/element/text behavior needed for early apply-templates flows.
 */

import type { Node } from '@xmldom/xmldom';

import { WEAVER_XSLT_UNSUPPORTED_INITIAL_TEMPLATE, XTDE0040, XPTY0004 } from '../../errors/codes.js';
import { XdmError, XsltError, type ErrorFrame, type RelatedLocation } from '../../errors/index.js';
import type { PathExpression, StepExpression } from '../../xpath/parse/ast.js';
import type { TransformOptions, TransformResult } from '../../processor/types.js';
import { parseXml } from '../../xml/parse.js';
import { createXdmNode, type XdmAtomicValue, type XdmItem, type XdmNode } from '../../xdm/types.js';
import { evaluate } from '../../xpath/eval/evaluator.js';
import type { DynamicContext } from '../../xpath/eval/context.js';
import type { Instruction, StylesheetIR, TemplateRule } from '../compile/ir.js';

export function runTransform(
  ir: StylesheetIR,
  sourceXml: string,
  options: TransformOptions,
): TransformResult {
  if (options.initialMode !== undefined) {
    throw new XsltError(
      XTDE0040,
      'Initial modes are not yet implemented in the current MVP+3 slice.',
      undefined,
      { mode: options.initialMode },
      {
        suggestions: [{
          kind: 'fix',
          label: 'omit initialMode and use the default mode in the current MVP+3 slice',
          confidence: 1,
        }],
      },
    );
  }

  if (options.initialTemplate !== undefined) {
    throw new XsltError(
      WEAVER_XSLT_UNSUPPORTED_INITIAL_TEMPLATE,
      'Initial templates are not yet implemented in the current MVP+3 slice.',
      undefined,
      { initialTemplate: options.initialTemplate },
      {
        suggestions: [{
          kind: 'fix',
          label: 'omit initialTemplate and rely on match-based dispatch in the current MVP+3 slice',
          confidence: 1,
        }],
      },
    );
  }

  const sourceDocument = parseXml(sourceXml);

  return {
    output: applyTemplatesToItems(
      [createXdmNode(sourceDocument)],
      ir,
      createStaticContext(options),
    ),
  };
}

function createStaticContext(options: TransformOptions): DynamicContext['staticContext'] {
  return {
    namespaces: new Map(),
    defaultElementNamespace: '',
    ...(options.baseUri === undefined ? {} : { baseUri: options.baseUri }),
  };
}

function createContext(
  item: XdmItem,
  staticContext: DynamicContext['staticContext'],
  position: number,
  size: number,
): DynamicContext {
  return {
    staticContext,
    contextItem: item,
    contextPosition: position,
    contextSize: size,
    variables: new Map(),
  };
}

function applyTemplatesToItems(
  items: readonly XdmItem[],
  ir: StylesheetIR,
  staticContext: DynamicContext['staticContext'],
  location?: TemplateRule['location'],
): string {
  if (items.some((item) => asXdmNode(item) === undefined)) {
    throw createApplyTemplatesNodeSequenceError(items, location);
  }

  return items.map((item, index) => {
    const nodeItem = item as XdmNode;
    const context = createContext(nodeItem, staticContext, index + 1, items.length);
    return applyTemplateToNode(nodeItem.node, ir, context);
  }).join('');
}

function applyTemplateToNode(node: Node, ir: StylesheetIR, context: DynamicContext): string {
  const template = findBestMatchingTemplate(node, ir.templates);
  if (template !== undefined) {
    try {
      return renderInstructions(template.body, ir, context);
    } catch (error) {
      throw withPrependedFrame(
        error,
        createTemplateFrame(template),
        createRelatedLocation('enclosing template', template.location),
      );
    }
  }

  return renderBuiltInTemplate(node, ir, context.staticContext);
}

function findBestMatchingTemplate(node: Node, templates: readonly TemplateRule[]): TemplateRule | undefined {
  let bestTemplate: TemplateRule | undefined;
  let bestTemplateIndex = -1;

  for (let index = 0; index < templates.length; index += 1) {
    const candidate = templates[index]!;
    if (!templateMatchesNode(candidate, node)) {
      continue;
    }

    if (bestTemplate === undefined) {
      bestTemplate = candidate;
      bestTemplateIndex = index;
      continue;
    }

    const candidatePriority = getTemplatePriority(candidate);
    const bestPriority = getTemplatePriority(bestTemplate);
    if (candidatePriority > bestPriority || (candidatePriority === bestPriority && index > bestTemplateIndex)) {
      bestTemplate = candidate;
      bestTemplateIndex = index;
    }
  }

  return bestTemplate;
}

function isRootTemplateRule(template: TemplateRule): boolean {
  if (template.match === undefined || template.match.kind !== 'path') {
    return false;
  }

  const match = template.match as PathExpression;
  return match.absolute && match.base === undefined && match.steps.length === 0;
}

function templateMatchesNode(template: TemplateRule, node: Node): boolean {
  if (template.match === undefined || template.match.kind !== 'path') {
    return false;
  }

  if (isRootTemplateRule(template)) {
    return node.nodeType === node.DOCUMENT_NODE;
  }

  if (node.nodeType === node.DOCUMENT_NODE) {
    return false;
  }

  const match = template.match as PathExpression;
  if (match.base !== undefined || match.steps.length !== 1) {
    return false;
  }

  const step = match.steps[0];
  if (step?.kind !== 'step') {
    return false;
  }

  if (match.absolute && node.parentNode?.nodeType !== node.DOCUMENT_NODE) {
    return false;
  }

  return stepMatchesNode(step as StepExpression, node);
}

function stepMatchesNode(step: StepExpression, node: Node): boolean {
  if (step.axis !== 'child' || step.predicates.length > 0) {
    return false;
  }

  if (step.nodeTest.kind === 'wildcardTest') {
    return node.nodeType === node.ELEMENT_NODE;
  }

  if (step.nodeTest.kind === 'nameTest') {
    if (node.nodeType !== node.ELEMENT_NODE) {
      return false;
    }

    const elementName = (node as Node & { readonly localName?: string }).localName;
    return node.nodeName === step.nodeTest.name || elementName === step.nodeTest.name;
  }

  if (step.nodeTest.kind !== 'kindTest') {
    return false;
  }

  if (step.nodeTest.name === 'node') {
    return true;
  }

  return step.nodeTest.name === 'text'
    && (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE);
}

function getTemplatePriority(template: TemplateRule): number {
  if (template.priority !== undefined) {
    return template.priority;
  }

  return getDefaultTemplatePriority(template);
}

function getDefaultTemplatePriority(template: TemplateRule): number {
  if (template.match === undefined || template.match.kind !== 'path') {
    return Number.NEGATIVE_INFINITY;
  }

  if (isRootTemplateRule(template)) {
    return 0.5;
  }

  const match = template.match as PathExpression;
  if (match.base !== undefined || match.steps.length !== 1) {
    return Number.NEGATIVE_INFINITY;
  }

  if (match.absolute) {
    return 0.5;
  }

  const step = match.steps[0];
  if (step?.kind !== 'step') {
    return Number.NEGATIVE_INFINITY;
  }

  if (step.nodeTest.kind === 'nameTest') {
    return 0;
  }

  if (step.nodeTest.kind === 'wildcardTest') {
    return -0.5;
  }

  if (step.nodeTest.kind === 'kindTest' && (step.nodeTest.name === 'node' || step.nodeTest.name === 'text')) {
    return -0.5;
  }

  return Number.NEGATIVE_INFINITY;
}

function renderInstructions(instructions: readonly Instruction[], ir: StylesheetIR, context: DynamicContext): string {
  return instructions.map((instruction) => renderInstruction(instruction, ir, context)).join('');
}

function renderInstruction(instruction: Instruction, ir: StylesheetIR, context: DynamicContext): string {
  switch (instruction.kind) {
    case 'literalText':
      return escapeText(instruction.text);
    case 'literalElement': {
      const attributes = instruction.attributes.map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`).join('');
      const body = renderInstructions(instruction.body, ir, context);
      return `<${instruction.name}${attributes}>${body}</${instruction.name}>`;
    }
    case 'valueOf': {
      try {
        const items = [...evaluate(instruction.select, context)];
        const separator = instruction.separator ?? ' ';
        return escapeText(items.map(itemToStringValue).join(separator));
      } catch (error) {
        const frame = {
          kind: 'instruction',
          label: `xsl:value-of select="${instruction.selectText}"`,
          ...(instruction.location === undefined ? {} : { location: instruction.location }),
        } satisfies ErrorFrame;
        throw withPrependedFrame(
          error,
          frame,
          createRelatedLocation('containing instruction', instruction.location),
        );
      }
    }
    case 'applyTemplates': {
      try {
        const items = instruction.select === undefined
          ? getChildNodeItems(context.contextItem)
          : [...evaluate(instruction.select, context)];
        return applyTemplatesToItems(items, ir, context.staticContext, instruction.location);
      } catch (error) {
        const frame = {
          kind: 'instruction',
          label: instruction.selectText === undefined
            ? 'xsl:apply-templates'
            : `xsl:apply-templates select="${instruction.selectText}"`,
          ...(instruction.location === undefined ? {} : { location: instruction.location }),
        } satisfies ErrorFrame;
        throw withPrependedFrame(
          error,
          frame,
          createRelatedLocation('caller instruction', instruction.location),
        );
      }
    }
  }
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
): string {
  if (node.nodeType === node.DOCUMENT_NODE || node.nodeType === node.ELEMENT_NODE) {
    return applyTemplatesToItems(getChildNodeItems(createXdmNode(node)), ir, staticContext);
  }

  if (
    node.nodeType === node.TEXT_NODE
    || node.nodeType === node.CDATA_SECTION_NODE
    || node.nodeType === node.ATTRIBUTE_NODE
  ) {
    return escapeText(node.nodeValue ?? '');
  }

  return '';
}

function itemToStringValue(item: XdmItem): string {
  const nodeItem = asXdmNode(item);
  if (nodeItem !== undefined) {
    return nodeItem.node.textContent ?? '';
  }

  return String((item as XdmAtomicValue).value);
}

function asXdmNode(item: unknown): XdmNode | undefined {
  return typeof item === 'object' && item !== null && (item as XdmItem).xdmKind === 'node'
    ? item as XdmNode
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
      suggestions: [{
        kind: 'fix',
        label: 'use a node-selecting expression for xsl:apply-templates',
        confidence: 1,
      }],
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

function withPrependedFrame(error: unknown, frame: ErrorFrame, related?: RelatedLocation): unknown {
  if (!(error instanceof XdmError)) {
    return error;
  }

  return new XsltError(
    error.code,
    error.detailMessage,
    error.location,
    error.details,
    {
      related: related === undefined ? error.related : [related, ...error.related],
      frames: [frame, ...error.frames],
      suggestions: error.suggestions,
      causes: error.causes.length === 0 ? [error] : error.causes,
    },
  );
}

function createRelatedLocation(label: string, location: TemplateRule['location']): RelatedLocation | undefined {
  return location === undefined ? undefined : { label, location };
}

function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeText(value)
    .replaceAll('"', '&quot;');
}
