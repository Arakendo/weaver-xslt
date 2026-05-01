/**
 * Transform evaluator: runs a compiled StylesheetIR against an input doc.
 *
 * Current MVP+3 slice: template dispatch for `/`, simple name matches, and the
 * built-in root/element/text behavior needed for early apply-templates flows.
 */

import type { Node } from '@xmldom/xmldom';

import { XTDE0040, XTDE0050, XTDE0640, XTDE0700, XTSE0010, XPTY0004 } from '../../errors/codes.js';
import { XdmError, XsltError, type ErrorFrame, type RelatedLocation } from '../../errors/index.js';
import type { PathExpression, StepExpression } from '../../xpath/parse/ast.js';
import type { TransformOptions, TransformResult } from '../../processor/types.js';
import { parseXml } from '../../xml/parse.js';
import { createXdmNode, type XdmAtomicValue, type XdmItem, type XdmNode } from '../../xdm/types.js';
import { evaluate, evaluateEffectiveBooleanValue } from '../../xpath/eval/evaluator.js';
import type { DynamicContext } from '../../xpath/eval/context.js';
import type { GlobalBinding, Instruction, StylesheetIR, TemplateParam, TemplateRule, WithParam } from '../compile/ir.js';

const PREDEFINED_NAMESPACE_PREFIXES = new Map<string, string>([
  ['array', 'http://www.w3.org/2005/xpath-functions/array'],
  ['fn', 'http://www.w3.org/2005/xpath-functions'],
  ['map', 'http://www.w3.org/2005/xpath-functions/map'],
  ['math', 'http://www.w3.org/2005/xpath-functions/math'],
  ['xml', 'http://www.w3.org/XML/1998/namespace'],
  ['xs', 'http://www.w3.org/2001/XMLSchema'],
]);

type DeferredVariableBinding = {
  readonly evaluate: () => unknown;
};

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

  const sourceDocument = parseXml(sourceXml);
  const staticContext = createStaticContext(ir, options);
  const globalVariables = evaluateGlobalBindings(
    ir,
    ir.globalBindings,
    staticContext,
    createXdmNode(sourceDocument),
    options.parameters,
  );

  if (options.initialTemplate !== undefined) {
    const initialContext = createContext(createXdmNode(sourceDocument), staticContext, 1, 1, globalVariables);
    return {
      output: renderInitialTemplate(options.initialTemplate, ir, initialContext),
    };
  }

  return {
    output: applyTemplatesToItems(
      [createXdmNode(sourceDocument)],
      ir,
      staticContext,
      globalVariables,
    ),
  };
}

function createStaticContext(ir: StylesheetIR, options: TransformOptions): DynamicContext['staticContext'] {
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
  location?: TemplateRule['location'],
): string {
  if (items.some((item) => asXdmNode(item) === undefined)) {
    throw createApplyTemplatesNodeSequenceError(items, location);
  }

  return items.map((item, index) => {
    const nodeItem = item as XdmNode;
    const context = createContext(nodeItem, staticContext, index + 1, items.length, variables);
    return applyTemplateToNode(nodeItem.node, ir, context);
  }).join('');
}

function applyTemplateToNode(node: Node, ir: StylesheetIR, context: DynamicContext): string {
  const template = findBestMatchingTemplate(node, ir.templates, context.staticContext);
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

  return renderBuiltInTemplate(node, ir, context.staticContext, context.variables);
}

function findNamedTemplate(name: string, templates: readonly TemplateRule[]): TemplateRule | undefined {
  for (let index = templates.length - 1; index >= 0; index -= 1) {
    const candidate = templates[index];
    if (candidate?.name === name) {
      return candidate;
    }
  }

  return undefined;
}

function renderInitialTemplate(name: string, ir: StylesheetIR, context: DynamicContext): string {
  const normalizedName = normalizeTemplateName(name, context.staticContext);
  const template = findNamedTemplate(normalizedName, ir.templates);
  if (template === undefined) {
    throw new XsltError(
      XTSE0010,
      `Initial template ${name} is not declared in the current stylesheet.`,
      undefined,
      {
        initialTemplate: name,
      },
      {
        suggestions: [{
          kind: 'fix',
          label: `declare xsl:template name="${name}" or omit initialTemplate`,
          confidence: 1,
        }],
      },
    );
  }

  try {
    return renderTemplate(template, [], ir, context);
  } catch (error) {
    throw withPrependedFrame(
      error,
      createTemplateFrame(template),
      createRelatedLocation('initial template', template.location),
    );
  }
}

function normalizeTemplateName(name: string, staticContext: DynamicContext['staticContext']): string {
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
  const namespaceUri = staticContext.namespaces.get(prefix) ?? PREDEFINED_NAMESPACE_PREFIXES.get(prefix);
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

function findBestMatchingTemplate(
  node: Node,
  templates: readonly TemplateRule[],
  staticContext: DynamicContext['staticContext'],
): TemplateRule | undefined {
  let bestTemplate: TemplateRule | undefined;
  let bestTemplateIndex = -1;

  for (let index = 0; index < templates.length; index += 1) {
    const candidate = templates[index]!;
    if (!templateMatchesNode(candidate, node, staticContext)) {
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

function templateMatchesNode(template: TemplateRule, node: Node, staticContext: DynamicContext['staticContext']): boolean {
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

  return stepMatchesNode(step as StepExpression, node, staticContext);
}

function stepMatchesNode(step: StepExpression, node: Node, staticContext: DynamicContext['staticContext']): boolean {
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

    return matchesQualifiedNodeName(step.nodeTest.name, node, staticContext);
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

function matchesQualifiedNodeName(name: string, node: Node, staticContext: DynamicContext['staticContext']): boolean {
  const separator = name.indexOf(':');
  const localName = (node.localName ?? node.nodeName).includes(':')
    ? (node.localName ?? node.nodeName)
    : (node.localName ?? node.nodeName);

  if (separator >= 0) {
    const prefix = name.slice(0, separator);
    const namespaceUri = staticContext.namespaces.get(prefix) ?? PREDEFINED_NAMESPACE_PREFIXES.get(prefix);
    if (namespaceUri === undefined) {
      return false;
    }

    return localName === name.slice(separator + 1) && (node.namespaceURI ?? '') === namespaceUri;
  }

  return localName === name && (node.namespaceURI ?? '') === staticContext.defaultElementNamespace;
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
  let output = '';
  let currentContext = context;

  for (const instruction of instructions) {
    if (instruction.kind === 'variable') {
      currentContext = bindVariableInstruction(instruction, ir, currentContext);
      continue;
    }

    output += renderInstruction(instruction, ir, currentContext);
  }

  return output;
}

function renderInstruction(instruction: Instruction, ir: StylesheetIR, context: DynamicContext): string {
  switch (instruction.kind) {
    case 'literalText':
      return escapeText(instruction.text);
    case 'comment':
      return `<!--${renderInstructions(instruction.body, ir, context)}-->`;
    case 'variable':
      return '';
    case 'literalElement': {
      const attributes = instruction.attributes.map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`).join('');
      const body = renderInstructions(instruction.body, ir, context);
      return `<${instruction.name}${attributes}>${body}</${instruction.name}>`;
    }
    case 'if': {
      try {
        return evaluateEffectiveBooleanValue(instruction.test, context)
          ? renderInstructions(instruction.body, ir, context)
          : '';
      } catch (error) {
        const frame = {
          kind: 'instruction',
          label: `xsl:if test="${instruction.testText}"`,
          ...(instruction.location === undefined ? {} : { location: instruction.location }),
        } satisfies ErrorFrame;
        throw withPrependedFrame(
          error,
          frame,
          createRelatedLocation('containing instruction', instruction.location),
        );
      }
    }
    case 'choose': {
      for (const branch of instruction.whenBranches) {
        try {
          if (evaluateEffectiveBooleanValue(branch.test, context)) {
            return renderInstructions(branch.body, ir, context);
          }
        } catch (error) {
          const frame = {
            kind: 'instruction',
            label: `xsl:when test="${branch.testText}"`,
            ...(branch.location === undefined ? {} : { location: branch.location }),
          } satisfies ErrorFrame;
          throw withPrependedFrame(
            error,
            frame,
            createRelatedLocation('containing instruction', branch.location),
          );
        }
      }

      return instruction.otherwiseBody === undefined
        ? ''
        : renderInstructions(instruction.otherwiseBody, ir, context);
    }
    case 'forEach': {
      try {
        const items = [...evaluate(instruction.select, context)];
        return items.map((item, index) => renderInstructions(
          instruction.body,
          ir,
          {
            ...context,
            contextItem: item,
            contextPosition: index + 1,
            contextSize: items.length,
          },
        )).join('');
      } catch (error) {
        const frame = {
          kind: 'instruction',
          label: `xsl:for-each select="${instruction.selectText}"`,
          ...(instruction.location === undefined ? {} : { location: instruction.location }),
        } satisfies ErrorFrame;
        throw withPrependedFrame(
          error,
          frame,
          createRelatedLocation('containing instruction', instruction.location),
        );
      }
    }
    case 'callTemplate': {
      const template = findNamedTemplate(instruction.name, ir.templates);
      if (template === undefined) {
        throw new XsltError(
          XTSE0010,
          `Named template ${instruction.name} is not declared in the current stylesheet.`,
          instruction.location,
          {
            templateName: instruction.name,
          },
        );
      }

      try {
        return renderTemplate(template, instruction.withParams, ir, context);
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
        return applyTemplatesToItems(items, ir, context.staticContext, context.variables, instruction.location);
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

function bindVariableInstruction(
  instruction: Extract<Instruction, { readonly kind: 'variable' }>,
  ir: StylesheetIR,
  context: DynamicContext,
): DynamicContext {
  try {
    const value = evaluateBindingValue(instruction, ir, context);
    const variables = new Map(context.variables);
    variables.set(instruction.name, value);
    variables.set(`{}${instruction.name}`, value);
    return {
      ...context,
      variables,
    };
  } catch (error) {
    const frame = {
      kind: 'instruction',
      label: instruction.selectText === undefined
        ? `xsl:variable name="${instruction.name}"`
        : `xsl:variable name="${instruction.name}" select="${instruction.selectText}"`,
      ...(instruction.location === undefined ? {} : { location: instruction.location }),
    } satisfies ErrorFrame;
    throw withPrependedFrame(
      error,
      frame,
      createRelatedLocation('containing instruction', instruction.location),
    );
  }
}

function renderTemplate(
  template: TemplateRule,
  withParams: readonly WithParam[],
  ir: StylesheetIR,
  context: DynamicContext,
): string {
  const variables = bindTemplateParams(template.params, withParams, ir, context);
  return renderInstructions(template.body, ir, {
    ...context,
    variables,
  });
}

function bindTemplateParams(
  params: readonly TemplateParam[],
  withParams: readonly WithParam[],
  ir: StylesheetIR,
  context: DynamicContext,
): ReadonlyMap<string, unknown> {
  if (params.length === 0 && withParams.length === 0) {
    return context.variables;
  }

  const provided = new Map<string, unknown>();
  for (const withParam of withParams) {
    provided.set(withParam.name, evaluateBindingValue(withParam, ir, context));
  }

  const variables = new Map(context.variables);
  for (const param of params) {
    const value = provided.has(param.name)
      ? provided.get(param.name)
      : param.required
        ? throwMissingTemplateParam(param)
        : evaluateBindingValue(param, ir, {
            ...context,
            variables,
          });
    variables.set(param.name, value);
    variables.set(`{}${param.name}`, value);
  }

  return variables;
}

function evaluateBindingValue(
  binding: Pick<TemplateParam, 'select' | 'body'>
    | Pick<WithParam, 'select' | 'body'>
    | Pick<Extract<Instruction, { readonly kind: 'variable' }>, 'select' | 'body'>
    | Pick<GlobalBinding, 'select' | 'body'>,
  ir: StylesheetIR,
  context: DynamicContext,
): unknown {
  if (binding.select !== undefined) {
    return [...evaluate(binding.select, context)];
  }

  if (binding.body === undefined) {
    return [];
  }

  return evaluateTemporaryTree(binding.body, ir, context);
}

function evaluateTemporaryTree(
  body: readonly Instruction[],
  ir: StylesheetIR,
  context: DynamicContext,
): readonly XdmItem[] {
  const serialized = renderInstructions(body, ir, context);
  const temporaryDocument = parseXml(`<temporary-root>${serialized}</temporary-root>`);
  const fragment = temporaryDocument.createDocumentFragment();
  const wrapper = temporaryDocument.documentElement;

  if (wrapper === null) {
    return [createXdmNode(fragment)];
  }

  while (wrapper.firstChild !== null) {
    fragment.appendChild(wrapper.firstChild);
  }

  return [createXdmNode(fragment)];
}

function throwMissingTemplateParam(param: Pick<TemplateParam, 'name' | 'location'>): never {
  throw new XsltError(
    XTDE0700,
    `Required template parameter $${param.name} was not supplied.`,
    param.location,
    {
      parameterName: param.name,
    },
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
): string {
  if (node.nodeType === node.DOCUMENT_NODE || node.nodeType === node.ELEMENT_NODE) {
    return applyTemplatesToItems(getChildNodeItems(createXdmNode(node)), ir, staticContext, variables);
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

  const resolvedParameters = normalizeExternalParameters(parameters, staticContext);
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
          if (binding.kind === 'param' && resolvedParameters.has(binding.name)) {
            cachedValue = resolvedParameters.get(binding.name);
          } else if (binding.kind === 'param' && binding.required) {
            throw new XsltError(
              XTDE0050,
              `Required stylesheet parameter $${binding.name} was not supplied.`,
              binding.location,
              {
                parameterName: binding.name,
              },
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
          const frame = {
            kind: 'instruction',
            label: binding.selectText === undefined
              ? `xsl:${binding.kind} name="${binding.name}"`
              : `xsl:${binding.kind} name="${binding.name}" select="${binding.selectText}"`,
            ...(binding.location === undefined ? {} : { location: binding.location }),
          } satisfies ErrorFrame;
          throw withPrependedFrame(
            error,
            frame,
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
    if (typeof deferredBinding === 'object' && deferredBinding !== null && 'evaluate' in deferredBinding) {
      (deferredBinding as DeferredVariableBinding).evaluate();
    }
  }

  return runtimeBindings;
}

function normalizeExternalParameters(
  parameters: TransformOptions['parameters'],
  staticContext: DynamicContext['staticContext'],
): ReadonlyMap<string, unknown> {
  if (parameters === undefined) {
    return new Map();
  }

  const bindings = new Map<string, unknown>();
  for (const [name, value] of Object.entries(parameters)) {
    const normalizedName = normalizeTemplateName(name, staticContext);
    bindings.set(normalizedName, value);
    if (!normalizedName.startsWith('{')) {
      bindings.set(`{}${normalizedName}`, value);
    }
  }

  return bindings;
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
