import type { Node } from '@xmldom/xmldom';

import type {
  TransformOptions,
  TransformResult,
  XmlNodeHandle,
  XmlTraceEvent,
  XmlTraceInstructionInfo,
  XmlTracePause,
  XmlTraceTemplateInfo,
} from '../processor/types.js';
import { XTDE0040, XTDE0050, XTDE0640, XTDE0700, XTSE0010 } from '../errors/codes.js';
import {
  XdmError,
  XsltError,
  type ErrorFrame,
  type ErrorSuggestion,
  type RelatedLocation,
  type SourceLocation,
} from '../errors/index.js';
import { parseXml, type Document } from '../xml/parse.js';
import {
  createXmlNodeHandle,
  resolveXmlNodeHandle,
  resolveXmlNodeHandleAtOffset,
  resolveXmlNodeHandleInRange,
} from './xmlNodeHandles.js';
import {
  emitTraceEvent as publishTraceEvent,
  getRecordedTracePause,
  isTraceEnabled,
  resetRecordedTracePause,
} from './tracePause.js';
import { computeLevenshteinDistance } from '../xslt/diagnostics.js';
import { normalizeTemplateName } from '../xslt/eval/templateDispatch.js';
import { runTransform } from '../xslt/eval/transform.js';
import type { StylesheetIR } from '../xslt/compile/ir.js';

export type TransformContext = TransformOptions;

export type { TransformOptions, TransformResult, StylesheetIR, XmlNodeHandle, XmlTracePause };

export function createCompiledDocument(sourceXml: string): Document {
  return parseXml(sourceXml, { role: 'source-document', sourceName: '<source-xml>' });
}

export {
  createXmlNodeHandle,
  resolveXmlNodeHandle,
  resolveXmlNodeHandleAtOffset,
  resolveXmlNodeHandleInRange,
};

function getTraceDocumentUri(ctx: TransformContext): string {
  return ctx.trace?.documentUri ?? '<source-xml>';
}

function tryCreateTraceNodeHandle(node: Node, ctx: TransformContext): XmlNodeHandle | undefined {
  switch (node.nodeType) {
    case node.DOCUMENT_NODE:
    case node.ELEMENT_NODE:
    case node.ATTRIBUTE_NODE:
    case node.TEXT_NODE:
    case node.COMMENT_NODE:
    case node.PROCESSING_INSTRUCTION_NODE:
      return createXmlNodeHandle(node, getTraceDocumentUri(ctx));
    default:
      return undefined;
  }
}

function emitTraceEvent(ctx: TransformContext, event: XmlTraceEvent): void {
  publishTraceEvent(ctx.trace, event);
}

export { getRecordedTracePause, resetRecordedTracePause };

export function traceFocusEnter(node: Node, ctx: TransformContext): Node {
  if (!isTraceEnabled(ctx.trace)) {
    return node;
  }

  const handle = tryCreateTraceNodeHandle(node, ctx);
  if (handle === undefined) {
    return node;
  }

  emitTraceEvent(ctx, {
    kind: 'focus-enter',
    node: handle,
  });
  return node;
}

export function traceTemplateEnter(
  node: Node,
  ctx: TransformContext,
  template: XmlTraceTemplateInfo,
): Node {
  if (!isTraceEnabled(ctx.trace)) {
    return node;
  }

  const handle = tryCreateTraceNodeHandle(node, ctx);
  if (handle === undefined) {
    return node;
  }

  emitTraceEvent(ctx, {
    kind: 'template-enter',
    node: handle,
    template,
  });
  return node;
}

export function traceSelectedNodes(
  nodes: readonly Node[],
  ctx: TransformContext,
  instruction: XmlTraceInstructionInfo,
): readonly Node[] {
  if (!isTraceEnabled(ctx.trace)) {
    return nodes;
  }

  for (const node of nodes) {
    const handle = tryCreateTraceNodeHandle(node, ctx);
    if (handle === undefined) {
      continue;
    }

    emitTraceEvent(ctx, {
      kind: 'instruction-select',
      node: handle,
      instruction,
    });
  }

  return nodes;
}

export function traceStringValueOfNode(
  node: Node | null,
  ctx: TransformContext,
  instruction: XmlTraceInstructionInfo,
): string {
  if (node === null) {
    return '';
  }

  if (isTraceEnabled(ctx.trace)) {
    const handle = tryCreateTraceNodeHandle(node, ctx);
    if (handle !== undefined) {
      emitTraceEvent(ctx, {
        kind: 'instruction-select',
        node: handle,
        instruction,
      });
      emitTraceEvent(ctx, {
        kind: 'value-read',
        node: handle,
        instruction,
      });
    }
  }

  return stringValueOfNode(node);
}

export function createTemporaryTreeNode(serializedContent: string): Node {
  const temporaryDocument = parseXml(`<temporary-root>${serializedContent}</temporary-root>`);
  const fragment = temporaryDocument.createDocumentFragment();
  const wrapper = temporaryDocument.documentElement;

  if (wrapper === null) {
    return fragment;
  }

  while (wrapper.firstChild !== null) {
    fragment.appendChild(wrapper.firstChild);
  }

  return fragment;
}

export function selectSimplePathNode(startNode: Node, path: readonly string[]): Node | null {
  let current: Node = startNode;

  for (const segment of path) {
    const next = findChildElement(current, segment);
    if (next === null) {
      return null;
    }

    current = next;
  }

  return current;
}

export function selectSimplePathNodes(startNode: Node, path: readonly string[]): readonly Node[] {
  let currentNodes: Node[] = [startNode];

  for (const segment of path) {
    const nextNodes: Node[] = [];

    for (const currentNode of currentNodes) {
      for (let index = 0; index < currentNode.childNodes.length; index += 1) {
        const child = currentNode.childNodes.item(index);
        if (child === null || child.nodeType !== child.ELEMENT_NODE) {
          continue;
        }

        const childLocalName = child.localName ?? child.nodeName;
        if ((segment === '*' || childLocalName === segment) && (child.namespaceURI ?? '') === '') {
          nextNodes.push(child);
        }
      }
    }

    if (nextNodes.length === 0) {
      return [];
    }

    currentNodes = nextNodes;
  }

  return currentNodes;
}

type SimplePathStepPositionPlan = {
  readonly position?: number | 'last';
  readonly positionTotalDivisor?: number;
  readonly positionTotalNumerator?: number;
  readonly positionTotalOffset?: number;
  readonly positionTotalPolynomialDenominator?: number;
  readonly positionTotalPolynomialQuadraticNumerator?: number;
  readonly positionTotalPolynomialLinearNumerator?: number;
  readonly positionTotalPolynomialConstantNumerator?: number;
  readonly excludedPositionTotalDivisors?: readonly number[];
  readonly excludedPositionTotalDivisorOffsets?: readonly {
    readonly divisor: number;
    readonly offset: number;
  }[];
  readonly excludedPositionTotalFractions?: readonly {
    readonly denominator: number;
    readonly numerator: number;
    readonly offset: number;
  }[];
  readonly excludedPositionTotalPolynomials?: readonly {
    readonly denominator: number;
    readonly quadraticNumerator: number;
    readonly linearNumerator: number;
    readonly constantNumerator: number;
  }[];
  readonly maximumPositionExclusiveTotalDivisors?: readonly number[];
  readonly maximumPositionExclusiveTotalDivisorOffsets?: readonly {
    readonly divisor: number;
    readonly offset: number;
  }[];
  readonly maximumPositionExclusiveTotalFractions?: readonly {
    readonly denominator: number;
    readonly numerator: number;
    readonly offset: number;
  }[];
  readonly maximumPositionExclusiveTotalPolynomials?: readonly {
    readonly denominator: number;
    readonly quadraticNumerator: number;
    readonly linearNumerator: number;
    readonly constantNumerator: number;
  }[];
  readonly maximumPositionInclusiveTotalDivisors?: readonly number[];
  readonly maximumPositionInclusiveTotalDivisorOffsets?: readonly {
    readonly divisor: number;
    readonly offset: number;
  }[];
  readonly maximumPositionInclusiveTotalFractions?: readonly {
    readonly denominator: number;
    readonly numerator: number;
    readonly offset: number;
  }[];
  readonly maximumPositionInclusiveTotalPolynomials?: readonly {
    readonly denominator: number;
    readonly quadraticNumerator: number;
    readonly linearNumerator: number;
    readonly constantNumerator: number;
  }[];
  readonly minimumPositionExclusiveTotalDivisors?: readonly number[];
  readonly minimumPositionExclusiveTotalDivisorOffsets?: readonly {
    readonly divisor: number;
    readonly offset: number;
  }[];
  readonly minimumPositionExclusiveTotalFractions?: readonly {
    readonly denominator: number;
    readonly numerator: number;
    readonly offset: number;
  }[];
  readonly minimumPositionExclusiveTotalPolynomials?: readonly {
    readonly denominator: number;
    readonly quadraticNumerator: number;
    readonly linearNumerator: number;
    readonly constantNumerator: number;
  }[];
  readonly minimumPositionInclusiveTotalDivisors?: readonly number[];
  readonly minimumPositionInclusiveTotalDivisorOffsets?: readonly {
    readonly divisor: number;
    readonly offset: number;
  }[];
  readonly minimumPositionInclusiveTotalFractions?: readonly {
    readonly denominator: number;
    readonly numerator: number;
    readonly offset: number;
  }[];
  readonly minimumPositionInclusiveTotalPolynomials?: readonly {
    readonly denominator: number;
    readonly quadraticNumerator: number;
    readonly linearNumerator: number;
    readonly constantNumerator: number;
  }[];
  readonly positionFromLastOffset?: number;
  readonly includedPositions?: readonly number[];
  readonly includedPositionFromLastOffsets?: readonly number[];
  readonly maximumPositionFromLastOffset?: number;
  readonly minimumPosition?: number;
  readonly maximumPosition?: number;
  readonly excludedPosition?: number;
  readonly excludedPositions?: readonly number[];
  readonly positionModuloDivisor?: number;
  readonly positionModuloRemainder?: number;
  readonly alternatives?: readonly SimplePathStepPositionPlan[];
};

export function selectSimplePathNodesByStepPlan(
  startNode: Node,
  path: readonly ({ readonly name: string } & SimplePathStepPositionPlan)[],
): readonly Node[] {
  let currentNodes: Node[] = [startNode];

  for (const step of path) {
    const nextNodes: Node[] = [];

    for (const currentNode of currentNodes) {
      const matchingChildren: Node[] = [];

      for (let index = 0; index < currentNode.childNodes.length; index += 1) {
        const child = currentNode.childNodes.item(index);
        if (child === null || child.nodeType !== child.ELEMENT_NODE) {
          continue;
        }

        const childLocalName = child.localName ?? child.nodeName;
        if (
          (step.name === '*' || childLocalName === step.name) &&
          (child.namespaceURI ?? '') === ''
        ) {
          matchingChildren.push(child);
        }
      }

      if (!hasSimplePathStepPositionConstraints(step)) {
        nextNodes.push(...matchingChildren);
        continue;
      }

      nextNodes.push(
        ...matchingChildren.filter((_, index) =>
          matchesSimplePathStepPositionPlan(step, index + 1, matchingChildren.length),
        ),
      );
    }

    if (nextNodes.length === 0) {
      return [];
    }

    currentNodes = nextNodes;
  }

  return currentNodes;
}

function hasSimplePathStepPositionConstraints(plan: SimplePathStepPositionPlan): boolean {
  return (
    plan.position !== undefined ||
    plan.positionTotalDivisor !== undefined ||
    plan.positionTotalNumerator !== undefined ||
    plan.positionTotalOffset !== undefined ||
    plan.positionTotalPolynomialDenominator !== undefined ||
    plan.positionTotalPolynomialQuadraticNumerator !== undefined ||
    plan.positionTotalPolynomialLinearNumerator !== undefined ||
    plan.positionTotalPolynomialConstantNumerator !== undefined ||
    plan.excludedPositionTotalDivisors !== undefined ||
    plan.excludedPositionTotalDivisorOffsets !== undefined ||
    plan.excludedPositionTotalFractions !== undefined ||
    plan.excludedPositionTotalPolynomials !== undefined ||
    plan.maximumPositionExclusiveTotalDivisors !== undefined ||
    plan.maximumPositionExclusiveTotalDivisorOffsets !== undefined ||
    plan.maximumPositionExclusiveTotalFractions !== undefined ||
    plan.maximumPositionExclusiveTotalPolynomials !== undefined ||
    plan.maximumPositionInclusiveTotalDivisors !== undefined ||
    plan.maximumPositionInclusiveTotalDivisorOffsets !== undefined ||
    plan.maximumPositionInclusiveTotalFractions !== undefined ||
    plan.maximumPositionInclusiveTotalPolynomials !== undefined ||
    plan.minimumPositionExclusiveTotalDivisors !== undefined ||
    plan.minimumPositionExclusiveTotalDivisorOffsets !== undefined ||
    plan.minimumPositionExclusiveTotalFractions !== undefined ||
    plan.minimumPositionExclusiveTotalPolynomials !== undefined ||
    plan.minimumPositionInclusiveTotalDivisors !== undefined ||
    plan.minimumPositionInclusiveTotalDivisorOffsets !== undefined ||
    plan.minimumPositionInclusiveTotalFractions !== undefined ||
    plan.minimumPositionInclusiveTotalPolynomials !== undefined ||
    plan.positionFromLastOffset !== undefined ||
    plan.includedPositions !== undefined ||
    plan.includedPositionFromLastOffsets !== undefined ||
    plan.maximumPositionFromLastOffset !== undefined ||
    plan.minimumPosition !== undefined ||
    plan.maximumPosition !== undefined ||
    plan.excludedPosition !== undefined ||
    plan.excludedPositions !== undefined ||
    plan.positionModuloDivisor !== undefined ||
    plan.positionModuloRemainder !== undefined ||
    plan.alternatives !== undefined
  );
}

function matchesSimplePathStepPositionPlan(
  plan: SimplePathStepPositionPlan,
  position: number,
  totalPositions: number,
): boolean {
  if (plan.alternatives !== undefined) {
    return plan.alternatives.some((alternative) =>
      matchesSimplePathStepPositionPlan(alternative, position, totalPositions),
    );
  }

  const maximumPosition = Math.min(
    plan.maximumPosition ?? totalPositions,
    plan.maximumPositionFromLastOffset === undefined
      ? totalPositions
      : totalPositions - plan.maximumPositionFromLastOffset,
  );
  const matchesExactPosition =
    plan.position === undefined
      ? true
      : plan.position === 'last'
        ? position === totalPositions
        : position === plan.position;
  const positionTotalNumerator =
    plan.positionTotalNumerator ?? (plan.positionTotalDivisor === undefined ? undefined : 1);
  const matchesPositionTotalDivisor =
    plan.positionTotalDivisor === undefined
      ? true
      : positionTotalNumerator !== undefined &&
        position * plan.positionTotalDivisor ===
          totalPositions * positionTotalNumerator +
            (plan.positionTotalOffset ?? 0) * plan.positionTotalDivisor;
  const matchesPositionTotalPolynomial =
    plan.positionTotalPolynomialDenominator === undefined
      ? true
      : position * plan.positionTotalPolynomialDenominator ===
        totalPositions * totalPositions * (plan.positionTotalPolynomialQuadraticNumerator ?? 0) +
          totalPositions * (plan.positionTotalPolynomialLinearNumerator ?? 0) +
          (plan.positionTotalPolynomialConstantNumerator ?? 0);
  const matchesPositionFromLastOffset =
    plan.positionFromLastOffset === undefined
      ? true
      : position === totalPositions - plan.positionFromLastOffset;
  const matchesIncludedPositions =
    plan.includedPositions === undefined && plan.includedPositionFromLastOffsets === undefined
      ? true
      : (plan.includedPositions?.includes(position) ?? false) ||
        (plan.includedPositionFromLastOffsets?.some(
          (offset) => position === totalPositions - offset,
        ) ??
          false);
  const matchesExcludedPositionTotalDivisors = !(
    plan.excludedPositionTotalDivisors?.some((divisor) => position * divisor === totalPositions) ??
    false
  );
  const matchesExcludedPositionTotalDivisorOffsets = !(
    plan.excludedPositionTotalDivisorOffsets?.some(
      ({ divisor, offset }) => position * divisor === totalPositions + offset * divisor,
    ) ?? false
  );
  const matchesExcludedPositionTotalFractions = !(
    plan.excludedPositionTotalFractions?.some(
      ({ denominator, numerator, offset }) =>
        position * denominator === totalPositions * numerator + offset * denominator,
    ) ?? false
  );
  const matchesExcludedPositionTotalPolynomials = !(
    plan.excludedPositionTotalPolynomials?.some(
      ({ denominator, quadraticNumerator, linearNumerator, constantNumerator }) =>
        position * denominator ===
        totalPositions * totalPositions * quadraticNumerator +
          totalPositions * linearNumerator +
          constantNumerator,
    ) ?? false
  );
  const matchesMaximumPositionExclusiveTotalDivisors =
    plan.maximumPositionExclusiveTotalDivisors?.every(
      (divisor) => position * divisor < totalPositions,
    ) ?? true;
  const matchesMaximumPositionExclusiveTotalDivisorOffsets =
    plan.maximumPositionExclusiveTotalDivisorOffsets?.every(
      ({ divisor, offset }) => position * divisor < totalPositions + offset * divisor,
    ) ?? true;
  const matchesMaximumPositionExclusiveTotalFractions =
    plan.maximumPositionExclusiveTotalFractions?.every(
      ({ denominator, numerator, offset }) =>
        position * denominator < totalPositions * numerator + offset * denominator,
    ) ?? true;
  const matchesMaximumPositionExclusiveTotalPolynomials =
    plan.maximumPositionExclusiveTotalPolynomials?.every(
      ({ denominator, quadraticNumerator, linearNumerator, constantNumerator }) =>
        position * denominator <
        totalPositions * totalPositions * quadraticNumerator +
          totalPositions * linearNumerator +
          constantNumerator,
    ) ?? true;
  const matchesMaximumPositionInclusiveTotalDivisors =
    plan.maximumPositionInclusiveTotalDivisors?.every(
      (divisor) => position * divisor <= totalPositions,
    ) ?? true;
  const matchesMaximumPositionInclusiveTotalDivisorOffsets =
    plan.maximumPositionInclusiveTotalDivisorOffsets?.every(
      ({ divisor, offset }) => position * divisor <= totalPositions + offset * divisor,
    ) ?? true;
  const matchesMaximumPositionInclusiveTotalFractions =
    plan.maximumPositionInclusiveTotalFractions?.every(
      ({ denominator, numerator, offset }) =>
        position * denominator <= totalPositions * numerator + offset * denominator,
    ) ?? true;
  const matchesMaximumPositionInclusiveTotalPolynomials =
    plan.maximumPositionInclusiveTotalPolynomials?.every(
      ({ denominator, quadraticNumerator, linearNumerator, constantNumerator }) =>
        position * denominator <=
        totalPositions * totalPositions * quadraticNumerator +
          totalPositions * linearNumerator +
          constantNumerator,
    ) ?? true;
  const matchesMinimumPositionExclusiveTotalDivisors =
    plan.minimumPositionExclusiveTotalDivisors?.every(
      (divisor) => position * divisor > totalPositions,
    ) ?? true;
  const matchesMinimumPositionExclusiveTotalDivisorOffsets =
    plan.minimumPositionExclusiveTotalDivisorOffsets?.every(
      ({ divisor, offset }) => position * divisor > totalPositions + offset * divisor,
    ) ?? true;
  const matchesMinimumPositionExclusiveTotalFractions =
    plan.minimumPositionExclusiveTotalFractions?.every(
      ({ denominator, numerator, offset }) =>
        position * denominator > totalPositions * numerator + offset * denominator,
    ) ?? true;
  const matchesMinimumPositionExclusiveTotalPolynomials =
    plan.minimumPositionExclusiveTotalPolynomials?.every(
      ({ denominator, quadraticNumerator, linearNumerator, constantNumerator }) =>
        position * denominator >
        totalPositions * totalPositions * quadraticNumerator +
          totalPositions * linearNumerator +
          constantNumerator,
    ) ?? true;
  const matchesMinimumPositionInclusiveTotalDivisors =
    plan.minimumPositionInclusiveTotalDivisors?.every(
      (divisor) => position * divisor >= totalPositions,
    ) ?? true;
  const matchesMinimumPositionInclusiveTotalDivisorOffsets =
    plan.minimumPositionInclusiveTotalDivisorOffsets?.every(
      ({ divisor, offset }) => position * divisor >= totalPositions + offset * divisor,
    ) ?? true;
  const matchesMinimumPositionInclusiveTotalFractions =
    plan.minimumPositionInclusiveTotalFractions?.every(
      ({ denominator, numerator, offset }) =>
        position * denominator >= totalPositions * numerator + offset * denominator,
    ) ?? true;
  const matchesMinimumPositionInclusiveTotalPolynomials =
    plan.minimumPositionInclusiveTotalPolynomials?.every(
      ({ denominator, quadraticNumerator, linearNumerator, constantNumerator }) =>
        position * denominator >=
        totalPositions * totalPositions * quadraticNumerator +
          totalPositions * linearNumerator +
          constantNumerator,
    ) ?? true;
  const matchesModulo =
    plan.positionModuloDivisor === undefined || plan.positionModuloRemainder === undefined
      ? true
      : position % plan.positionModuloDivisor === plan.positionModuloRemainder;

  return (
    matchesExactPosition &&
    matchesPositionTotalDivisor &&
    matchesPositionTotalPolynomial &&
    matchesPositionFromLastOffset &&
    position >= (plan.minimumPosition ?? 1) &&
    position <= maximumPosition &&
    matchesIncludedPositions &&
    matchesExcludedPositionTotalDivisors &&
    matchesExcludedPositionTotalDivisorOffsets &&
    matchesExcludedPositionTotalFractions &&
    matchesExcludedPositionTotalPolynomials &&
    matchesMaximumPositionExclusiveTotalDivisors &&
    matchesMaximumPositionExclusiveTotalDivisorOffsets &&
    matchesMaximumPositionExclusiveTotalFractions &&
    matchesMaximumPositionExclusiveTotalPolynomials &&
    matchesMaximumPositionInclusiveTotalDivisors &&
    matchesMaximumPositionInclusiveTotalDivisorOffsets &&
    matchesMaximumPositionInclusiveTotalFractions &&
    matchesMaximumPositionInclusiveTotalPolynomials &&
    matchesMinimumPositionExclusiveTotalDivisors &&
    matchesMinimumPositionExclusiveTotalDivisorOffsets &&
    matchesMinimumPositionExclusiveTotalFractions &&
    matchesMinimumPositionExclusiveTotalPolynomials &&
    matchesMinimumPositionInclusiveTotalDivisors &&
    matchesMinimumPositionInclusiveTotalDivisorOffsets &&
    matchesMinimumPositionInclusiveTotalFractions &&
    matchesMinimumPositionInclusiveTotalPolynomials &&
    position !== plan.excludedPosition &&
    !(plan.excludedPositions?.includes(position) ?? false) &&
    matchesModulo
  );
}

export function selectDescendantElementsByName(
  startNode: Node,
  localName: string,
): readonly Node[] {
  const matches: Node[] = [];
  collectDescendantElementsByName(startNode, localName, matches);
  return matches;
}

export function selectDescendantElementTextByName(startNode: Node, localName: string): string {
  const node = selectDescendantElementsByName(startNode, localName)[0];
  if (node === undefined) {
    return '';
  }

  return collectStringValue(node);
}

export function matchesTemplatePath(
  node: Node,
  path: readonly string[],
  absolute = false,
): boolean {
  let current: Node | null = node;

  for (let index = path.length - 1; index >= 0; index -= 1) {
    if (current === null || current.nodeType !== current.ELEMENT_NODE) {
      return false;
    }

    const segment = path[index];
    const currentLocalName = current.localName ?? current.nodeName;
    if (segment !== '*' && (currentLocalName !== segment || (current.namespaceURI ?? '') !== '')) {
      return false;
    }

    current = current.parentNode;
  }

  return !absolute || current?.nodeType === node.DOCUMENT_NODE;
}

export function applyBuiltInTemplatesByPath(
  startNode: Node,
  path: readonly string[],
  renderMatchedNode: (node: Node, index: number, nodes: readonly Node[]) => string,
  absolute = false,
  ctx?: TransformContext,
  instruction?: XmlTraceInstructionInfo,
): string {
  if (path.length === 0) {
    return '';
  }

  return renderBuiltInTemplateChildren(
    startNode,
    path,
    renderMatchedNode,
    absolute,
    ctx,
    instruction,
    true,
  );
}

export function selectSimplePathText(startNode: Node, path: readonly string[]): string {
  const node = selectSimplePathNode(startNode, path);
  if (node === null) {
    return '';
  }

  return collectStringValue(node);
}

export function selectSimplePathExists(startNode: Node, path: readonly string[]): boolean {
  return selectSimplePathNode(startNode, path) !== null;
}

export function stringValueOfNode(node: Node): string {
  return collectStringValue(node);
}

export function stringValueOfNativeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && 'nodeType' in value) {
    return stringValueOfNode(value as Node);
  }

  return String(value);
}

export function nameOfNode(node: Node | null): string {
  if (node === null || node.nodeType === node.DOCUMENT_NODE) {
    return '';
  }

  return node.nodeName ?? '';
}

export function localNameOfNode(node: Node | null): string {
  if (node === null || node.nodeType === node.DOCUMENT_NODE) {
    return '';
  }

  return node.localName ?? node.nodeName ?? '';
}

export function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;');
}

export function transformCompiledStylesheet(
  ir: StylesheetIR,
  sourceXml: string,
  context: TransformContext = {},
): TransformResult {
  return runTransform(ir, sourceXml, context);
}

export function normalizeNativeTemplateName(
  templateName: string,
  namespaces: Readonly<Record<string, string>>,
  defaultElementNamespace = '',
): string {
  return normalizeTemplateName(templateName, {
    namespaces: new Map(Object.entries(namespaces)),
    defaultElementNamespace,
  });
}

export function throwCircularNativeGlobalBinding(
  bindingKind: 'param' | 'variable',
  variableName: string,
  location?: SourceLocation,
): never {
  throw new XsltError(
    XTDE0640,
    `Circular top-level ${bindingKind} dependency involving $${variableName}.`,
    location,
    { variableName },
  );
}

export function throwMissingNativeStylesheetParameter(
  parameterName: string,
  providedNames: readonly string[] = [],
  location?: SourceLocation,
): never {
  const suggestion = createMissingStylesheetParameterSuggestion(parameterName, providedNames);
  throw new XsltError(
    XTDE0050,
    `Required stylesheet parameter $${parameterName} was not supplied.`,
    location,
    { parameterName },
    suggestion === undefined ? undefined : { suggestions: [suggestion] },
  );
}

export function throwMissingNativeTemplateParameter(
  parameterName: string,
  providedNames: readonly string[] = [],
  location?: SourceLocation,
): never {
  const suggestion = createMissingTemplateParameterSuggestion(parameterName, providedNames);
  throw new XsltError(
    XTDE0700,
    `Required template parameter $${parameterName} was not supplied.`,
    location,
    { parameterName },
    suggestion === undefined ? undefined : { suggestions: [suggestion] },
  );
}

export function throwMissingNativeInitialTemplate(
  templateName: string,
  availableNames: readonly string[] = [],
): never {
  const suggestion = createMissingInitialTemplateSuggestion(templateName, availableNames);
  throw new XsltError(
    XTSE0010,
    `Initial template ${templateName} is not declared in the current stylesheet.`,
    undefined,
    { initialTemplate: templateName },
    suggestion === undefined
      ? {
          suggestions: [
            {
              kind: 'fix',
              label: `declare xsl:template name="${templateName}" or omit initialTemplate`,
              confidence: 1,
            },
          ],
        }
      : { suggestions: [suggestion] },
  );
}

export function throwUnsupportedNativeInitialMode(mode: string): never {
  throw new XsltError(
    XTDE0040,
    'Initial modes are not yet implemented in the current MVP+3 slice.',
    undefined,
    { mode },
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

export function prependNativeInitialTemplateError(
  error: unknown,
  templateName: string,
  location?: SourceLocation,
): unknown {
  if (!(error instanceof XdmError)) {
    return error;
  }

  const frame: ErrorFrame = {
    kind: 'template',
    label: `name="${templateName}"`,
    ...(location === undefined ? {} : { location }),
  };
  const related: RelatedLocation | undefined =
    location === undefined
      ? undefined
      : {
          label: 'initial template',
          location,
        };

  return new XsltError(error.code, error.detailMessage, error.location, error.details, {
    related: related === undefined ? error.related : [related, ...error.related],
    frames: [frame, ...error.frames],
    suggestions: error.suggestions,
    causes: error.causes.length === 0 ? [error] : error.causes,
  });
}

function createMissingStylesheetParameterSuggestion(
  expectedName: string,
  providedNames: readonly string[],
): ErrorSuggestion | undefined {
  const nearest = providedNames
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(expectedName, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean to pass parameters["${expectedName}"]?`,
    replacement: expectedName,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / expectedName.length,
  };
}

function createMissingTemplateParameterSuggestion(
  expectedName: string,
  providedNames: readonly string[],
): ErrorSuggestion | undefined {
  const nearest = providedNames
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(expectedName, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean xsl:with-param name="${expectedName}"?`,
    replacement: expectedName,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / expectedName.length,
  };
}

function createMissingInitialTemplateSuggestion(
  expectedName: string,
  availableNames: readonly string[],
): ErrorSuggestion | undefined {
  const nearest = availableNames
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(expectedName, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean initialTemplate "${nearest.candidate}"?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length,
  };
}

export function prependNativeGlobalBindingError(
  error: unknown,
  bindingKind: 'param' | 'variable',
  variableName: string,
  selectText?: string,
  location?: SourceLocation,
): unknown {
  if (!(error instanceof XdmError)) {
    return error;
  }

  const frame: ErrorFrame = {
    kind: 'instruction',
    label:
      selectText === undefined
        ? `xsl:${bindingKind} name="${variableName}"`
        : `xsl:${bindingKind} name="${variableName}" select="${selectText}"`,
    ...(location === undefined ? {} : { location }),
  };
  const related: RelatedLocation | undefined =
    location === undefined
      ? undefined
      : {
          label: `top-level ${bindingKind}`,
          location,
        };

  return new XsltError(error.code, error.detailMessage, error.location, error.details, {
    related: related === undefined ? error.related : [related, ...error.related],
    frames: [frame, ...error.frames],
    suggestions: error.suggestions,
    causes: error.causes.length === 0 ? [error] : error.causes,
  });
}

function findChildElement(node: Node, localName: string): Node | null {
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child === null || child.nodeType !== child.ELEMENT_NODE) {
      continue;
    }

    const childLocalName = child.localName ?? child.nodeName;
    if (childLocalName === localName && (child.namespaceURI ?? '') === '') {
      return child;
    }
  }

  return null;
}

function collectDescendantElementsByName(node: Node, localName: string, matches: Node[]): void {
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child === null || child.nodeType !== child.ELEMENT_NODE) {
      continue;
    }

    const childLocalName = child.localName ?? child.nodeName;
    if (childLocalName === localName && (child.namespaceURI ?? '') === '') {
      matches.push(child);
    }

    collectDescendantElementsByName(child, localName, matches);
  }
}

function renderBuiltInTemplateChildren(
  node: Node,
  path: readonly string[],
  renderMatchedNode: (node: Node, index: number, nodes: readonly Node[]) => string,
  absolute: boolean,
  ctx?: TransformContext,
  instruction?: XmlTraceInstructionInfo,
  emitSelectionEvents = false,
): string {
  const childNodes: Node[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child !== null) {
      childNodes.push(child);
    }
  }

  if (emitSelectionEvents && ctx !== undefined && instruction !== undefined) {
    traceSelectedNodes(childNodes, ctx, instruction);
  }

  let output = '';

  for (const [index, child] of childNodes.entries()) {
    if (child.nodeType !== child.ELEMENT_NODE) {
      if (child !== null) {
        output += renderBuiltInTemplateNode(
          child,
          path,
          renderMatchedNode,
          absolute,
          index,
          childNodes,
          ctx,
          instruction,
        );
      }

      continue;
    }

    output += renderBuiltInTemplateNode(
      child,
      path,
      renderMatchedNode,
      absolute,
      index,
      childNodes,
      ctx,
      instruction,
    );
  }

  return output;
}

function renderBuiltInTemplateNode(
  node: Node,
  path: readonly string[],
  renderMatchedNode: (node: Node, index: number, nodes: readonly Node[]) => string,
  absolute: boolean,
  index: number,
  nodes: readonly Node[],
  ctx?: TransformContext,
  instruction?: XmlTraceInstructionInfo,
): string {
  if (matchesSimplePath(node, path, absolute)) {
    return renderMatchedNode(node, index, nodes);
  }

  if (ctx !== undefined) {
    traceFocusEnter(node, ctx);
  }

  if (node.nodeType === node.DOCUMENT_NODE || node.nodeType === node.ELEMENT_NODE) {
    return renderBuiltInTemplateChildren(node, path, renderMatchedNode, absolute, ctx, instruction);
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

function matchesSimplePath(node: Node, path: readonly string[], absolute: boolean): boolean {
  let current: Node | null = node;

  for (let index = path.length - 1; index >= 0; index -= 1) {
    const segment = path[index];
    if (segment === undefined || !isUnqualifiedElementNamed(current, segment)) {
      return false;
    }

    current = current?.parentNode ?? null;
  }

  return !absolute || current?.nodeType === current?.DOCUMENT_NODE;
}

function isUnqualifiedElementNamed(node: Node | null, localName: string): boolean {
  if (node === null || node.nodeType !== node.ELEMENT_NODE) {
    return false;
  }

  const nodeLocalName = node.localName ?? node.nodeName;
  return nodeLocalName === localName && (node.namespaceURI ?? '') === '';
}

function collectStringValue(node: Node): string {
  if (
    node.nodeType === node.TEXT_NODE ||
    node.nodeType === node.CDATA_SECTION_NODE ||
    node.nodeType === node.ATTRIBUTE_NODE
  ) {
    return node.nodeValue ?? '';
  }

  let value = '';
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child !== null) {
      value += collectStringValue(child);
    }
  }

  return value;
}
