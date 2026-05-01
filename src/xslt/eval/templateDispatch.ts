import type { Node } from '@xmldom/xmldom';

import type { ErrorSuggestion } from '../../errors/index.js';
import { computeLevenshteinDistance } from '../diagnostics.js';
import type { PathExpression, StepExpression } from '../../xpath/parse/ast.js';
import type { DynamicContext } from '../../xpath/eval/context.js';
import type { TemplateRule } from '../compile/ir.js';

const PREDEFINED_NAMESPACE_PREFIXES = new Map<string, string>([
  ['array', 'http://www.w3.org/2005/xpath-functions/array'],
  ['fn', 'http://www.w3.org/2005/xpath-functions'],
  ['map', 'http://www.w3.org/2005/xpath-functions/map'],
  ['math', 'http://www.w3.org/2005/xpath-functions/math'],
  ['xml', 'http://www.w3.org/XML/1998/namespace'],
  ['xs', 'http://www.w3.org/2001/XMLSchema'],
]);

type StaticContext = DynamicContext['staticContext'];

export function findNamedTemplate(name: string, templates: readonly TemplateRule[]): TemplateRule | undefined {
  for (let index = templates.length - 1; index >= 0; index -= 1) {
    const candidate = templates[index];
    if (candidate?.name === name) {
      return candidate;
    }
  }

  return undefined;
}

export function normalizeTemplateName(name: string, staticContext: StaticContext): string {
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

export function createInitialTemplateSuggestion(
  name: string,
  templates: readonly TemplateRule[],
): ErrorSuggestion | undefined {
  const candidates = templates
    .map((template) => template.name)
    .filter((candidate): candidate is string => candidate !== undefined)
    .map(formatTemplateSuggestionName);
  const nearest = candidates
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(name, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean initialTemplate "${nearest.candidate}"?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - (nearest.distance / nearest.candidate.length),
  };
}

export function createNamedTemplateCallSuggestion(
  name: string,
  templates: readonly TemplateRule[],
): ErrorSuggestion | undefined {
  const lookupName = formatTemplateSuggestionName(name);
  const candidates = templates
    .map((template) => template.name)
    .filter((candidate): candidate is string => candidate !== undefined)
    .map(formatTemplateSuggestionName);
  const nearest = candidates
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(lookupName, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean xsl:call-template name="${nearest.candidate}"?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - (nearest.distance / nearest.candidate.length),
  };
}

export function formatTemplateSuggestionName(name: string): string {
  if (!name.startsWith('{')) {
    return name;
  }

  const closingBrace = name.indexOf('}');
  return closingBrace < 0 ? name : name.slice(closingBrace + 1);
}

export function findBestMatchingTemplate(
  node: Node,
  templates: readonly TemplateRule[],
  staticContext: StaticContext,
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

function isRootTemplateRule(template: TemplateRule): boolean {
  if (template.match === undefined || template.match.kind !== 'path') {
    return false;
  }

  const match = template.match as PathExpression;
  return match.absolute && match.base === undefined && match.steps.length === 0;
}

function templateMatchesNode(template: TemplateRule, node: Node, staticContext: StaticContext): boolean {
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

function stepMatchesNode(step: StepExpression, node: Node, staticContext: StaticContext): boolean {
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

function matchesQualifiedNodeName(name: string, node: Node, staticContext: StaticContext): boolean {
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