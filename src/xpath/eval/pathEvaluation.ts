import type { Element, Node } from '@xmldom/xmldom';

import { XPTY0019 } from '../../errors/codes.js';
import type { XdmAtomicValue, XdmItem, XdmNode } from '../../xdm/types.js';
import { createXdmNode } from '../../xdm/types.js';
import type { DynamicContext } from './context.js';
import { getRootNode, normalizeNodeSequence, selectAxis } from './navigation.js';
import {
  getNamespaceDeclarationPrefix,
  getNamespaceNodePrefix,
  getNodeLocalName,
  getNodePrefix,
  matchesQualifiedNodeName,
} from './names.js';
import type {
  FilterExpression,
  PathExpression,
  PathSegment,
  StepExpression,
  XPathAst,
} from '../parse/ast.js';

type SpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

type PathEvaluationDependencies = {
  evaluateExpression(ast: XPathAst, context: DynamicContext): XdmItem[];
  effectiveBooleanValue(items: readonly XdmItem[], span: SpanLike): boolean;
  requireContextNode(context: DynamicContext, span: SpanLike): XdmNode;
  isXdmNode(value: unknown): value is XdmNode;
  describeItemsType(items: readonly XdmItem[]): string;
  createXPathError(
    code: string,
    message: string,
    span: SpanLike,
    details?: Readonly<Record<string, unknown>>,
  ): Error;
  validateFunctionCallSignature(functionName: string, arity: number, span: SpanLike): void;
};

export function createPathEvaluator(dependencies: PathEvaluationDependencies): {
  evaluateFilterExpression(ast: FilterExpression, context: DynamicContext): XdmItem[];
  evaluatePath(ast: PathExpression, context: DynamicContext): XdmItem[];
} {
  const documentDataValueIndexCache = new WeakMap<Node, Map<string, XdmNode | null>>();

  function evaluateFilterExpression(ast: FilterExpression, context: DynamicContext): XdmItem[] {
    let items = dependencies.evaluateExpression(ast.base, context);

    for (const predicate of ast.predicates) {
      const size = items.length;
      items = items.filter((item, index) => {
        const predicateResult = dependencies.evaluateExpression(predicate, {
          ...context,
          contextItem: item,
          contextPosition: index + 1,
          contextSize: size,
        });
        return predicateMatches(predicateResult, index + 1, predicate.span);
      });
    }

    return items;
  }

  function evaluatePath(ast: PathExpression, context: DynamicContext): XdmItem[] {
    let items: XdmItem[] = ast.absolute
      ? [getRootNode(dependencies.requireContextNode(context, ast.span))]
      : ast.base === undefined
        ? [dependencies.requireContextNode(context, ast.span)]
        : dependencies.evaluateExpression(ast.base, context);

    if (ast.absolute && ast.steps.length === 0) {
      return items;
    }

    const documentDataValueItems = trySelectDocumentDataValueItems(ast, items, context);
    if (documentDataValueItems !== undefined) {
      return documentDataValueItems;
    }

    for (const step of ast.steps) {
      items = applyPathSegment(step, items, context);
    }

    return items;
  }

  function trySelectDocumentDataValueItems(
    ast: PathExpression,
    input: readonly XdmItem[],
    context: DynamicContext,
  ): XdmItem[] | undefined {
    if (input.length !== 1) {
      return undefined;
    }

    const [rootItem] = input;
    if (rootItem?.xdmKind !== 'node') {
      return undefined;
    }

    const documentNode = (rootItem as XdmNode).node;
    if (documentNode.nodeType !== documentNode.DOCUMENT_NODE) {
      return undefined;
    }

    let index = 0;
    const rootStep = ast.steps[index];
    if (!matchesChildNameStep(rootStep, 'root')) {
      return undefined;
    }
    index += 1;

    if (matchesDescendantNodeStep(ast.steps[index])) {
      index += 1;
    }

    const dataStep = ast.steps[index];
    if (dataStep === undefined || !matchesDocumentDataLookupStep(dataStep)) {
      return undefined;
    }
    index += 1;

    if (matchesDescendantNodeStep(ast.steps[index])) {
      index += 1;
    }

    if (!matchesChildNameStep(ast.steps[index], 'value') || index !== ast.steps.length - 1) {
      return undefined;
    }

    const lookupKey = resolveDocumentDataLookupKey(dataStep.predicates[0]!, context);
    if (lookupKey === undefined) {
      return undefined;
    }

    const valueNode = selectDocumentDataValueNode(
      documentNode,
      lookupKey,
      documentDataValueIndexCache,
    );
    return valueNode === null ? [] : [valueNode];
  }

  function applyPathSegment(
    segment: PathSegment,
    input: readonly XdmItem[],
    context: DynamicContext,
  ): XdmItem[] {
    if (segment.kind === 'step') {
      return applyStep(segment, requireNodeSequence(input, segment.span), context);
    }

    if (segment.kind === 'functionCall') {
      dependencies.validateFunctionCallSignature(
        segment.callee.includes(':') ? segment.callee : `fn:${segment.callee}`,
        segment.arguments.length,
        segment.span,
      );
    }

    return applyExpressionPathSegment(segment, requireNodeSequence(input, segment.span), context);
  }

  function applyExpressionPathSegment(
    segment: XPathAst,
    input: readonly XdmNode[],
    context: DynamicContext,
  ): XdmItem[] {
    const size = input.length;
    return input.flatMap((item, index) =>
      dependencies.evaluateExpression(segment, {
        ...context,
        contextItem: item,
        contextPosition: index + 1,
        contextSize: size,
      }),
    );
  }

  function matchesDescendantNodeStep(step: PathSegment | undefined): boolean {
    return (
      step !== undefined &&
      step.kind === 'step' &&
      step.axis === 'descendant-or-self' &&
      step.predicates.length === 0 &&
      step.nodeTest.kind === 'kindTest' &&
      step.nodeTest.name === 'node'
    );
  }

  function matchesChildNameStep(step: PathSegment | undefined, localName: string): boolean {
    return (
      step !== undefined &&
      step.kind === 'step' &&
      step.axis === 'child' &&
      step.predicates.length === 0 &&
      step.nodeTest.kind === 'nameTest' &&
      step.nodeTest.name === localName
    );
  }

  function matchesDocumentDataLookupStep(step: PathSegment | undefined): step is StepExpression {
    return (
      step !== undefined &&
      step.kind === 'step' &&
      step.axis === 'child' &&
      step.predicates.length === 1 &&
      step.nodeTest.kind === 'nameTest' &&
      step.nodeTest.name === 'data'
    );
  }

  function resolveDocumentDataLookupKey(
    predicate: XPathAst,
    context: DynamicContext,
  ): string | undefined {
    if (predicate.kind !== 'binary' || predicate.operator !== '=') {
      return undefined;
    }

    if (matchesDataNameAttributePath(predicate.left)) {
      return resolveDocumentDataLookupScalarKey(predicate.right, context);
    }

    if (matchesDataNameAttributePath(predicate.right)) {
      return resolveDocumentDataLookupScalarKey(predicate.left, context);
    }

    return undefined;
  }

  function matchesDataNameAttributePath(ast: XPathAst): boolean {
    return (
      ast.kind === 'path' &&
      ast.base === undefined &&
      ast.steps.length === 1 &&
      ast.steps[0]?.kind === 'step' &&
      ast.steps[0]?.axis === 'attribute' &&
      ast.steps[0]?.predicates.length === 0 &&
      ast.steps[0]?.nodeTest.kind === 'nameTest' &&
      ast.steps[0]?.nodeTest.name === 'name'
    );
  }

  function resolveDocumentDataLookupScalarKey(
    ast: XPathAst,
    context: DynamicContext,
  ): string | undefined {
    if (ast.kind === 'string') {
      return ast.value;
    }

    if (ast.kind !== 'variable') {
      return undefined;
    }

    const value = dependencies.evaluateExpression(ast, context);
    if (value.length !== 1 || value[0]?.xdmKind !== 'atomic') {
      return undefined;
    }

    return String((value[0] as XdmAtomicValue).value);
  }

  function selectDocumentDataValueNode(
    documentNode: Node,
    dataName: string,
    cache: WeakMap<Node, Map<string, XdmNode | null>>,
  ): XdmNode | null {
    const cachedIndex = cache.get(documentNode);
    const index = cachedIndex ?? createDocumentDataValueIndex(documentNode);
    if (cachedIndex === undefined) {
      cache.set(documentNode, index);
    }

    const cachedValue = index.get(dataName);
    return cachedValue === undefined ? null : cachedValue;
  }

  function createDocumentDataValueIndex(documentNode: Node): Map<string, XdmNode | null> {
    const index = new Map<string, XdmNode | null>();
    const rootElement = findFirstElementChild(documentNode);
    if (rootElement === undefined || (rootElement.localName ?? rootElement.nodeName) !== 'root') {
      return index;
    }

    for (let childIndex = 0; childIndex < rootElement.childNodes.length; childIndex += 1) {
      const child = rootElement.childNodes.item(childIndex);
      if (
        child === null ||
        child.nodeType !== child.ELEMENT_NODE ||
        (child.localName ?? child.nodeName) !== 'data' ||
        (child.namespaceURI ?? '') !== ''
      ) {
        continue;
      }

      const dataName =
        child.nodeType === child.ELEMENT_NODE ? (child as Element).getAttribute('name') : null;
      if (dataName === null || dataName === undefined) {
        continue;
      }

      const valueNode = findFirstElementChildByName(child, 'value');
      index.set(dataName, valueNode === undefined ? null : createXdmNode(valueNode));
    }

    return index;
  }

  function findFirstElementChild(node: Node): Node | undefined {
    for (let index = 0; index < node.childNodes.length; index += 1) {
      const child = node.childNodes.item(index);
      if (child !== null && child.nodeType === child.ELEMENT_NODE) {
        return child;
      }
    }

    return undefined;
  }

  function findFirstElementChildByName(node: Node, localName: string): Node | undefined {
    for (let index = 0; index < node.childNodes.length; index += 1) {
      const child = node.childNodes.item(index);
      if (
        child !== null &&
        child.nodeType === child.ELEMENT_NODE &&
        (child.localName ?? child.nodeName) === localName &&
        (child.namespaceURI ?? '') === ''
      ) {
        return child;
      }
    }

    return undefined;
  }

  function requireNodeSequence(items: readonly XdmItem[], span: SpanLike): XdmNode[] {
    const nodes: XdmNode[] = [];

    for (const item of items) {
      if (!dependencies.isXdmNode(item)) {
        throw dependencies.createXPathError(
          XPTY0019,
          'Path expressions require node inputs.',
          span,
          {
            expectedType: 'node()*',
            actualType: dependencies.describeItemsType(items),
          },
        );
      }
      nodes.push(item);
    }

    return nodes;
  }

  function applyStep(
    step: StepExpression,
    input: readonly XdmNode[],
    context: DynamicContext,
  ): XdmNode[] {
    let selected = input.flatMap((item) => selectAxis(step, item.node));
    selected = selected.filter((item) => matchesNodeTest(step, item.node, context));

    for (const predicate of step.predicates) {
      const size = selected.length;
      selected = selected.filter((item, index) => {
        const predicateResult = dependencies.evaluateExpression(predicate, {
          ...context,
          contextItem: item,
          contextPosition: index + 1,
          contextSize: size,
        });
        return predicateMatches(predicateResult, index + 1, predicate.span);
      });
    }

    return normalizeNodeSequence(selected);
  }

  function matchesNodeTest(step: StepExpression, node: Node, context: DynamicContext): boolean {
    if (step.nodeTest.kind === 'wildcardTest') {
      if (step.axis === 'namespace') {
        if (step.nodeTest.prefix !== undefined) {
          return false;
        }
        return (
          step.nodeTest.localName === undefined ||
          getNamespaceNodePrefix(node) === step.nodeTest.localName
        );
      }
      if (!matchesPrincipalNodeKind(step, node)) {
        return false;
      }
      if (step.nodeTest.prefix !== undefined) {
        return getNodePrefix(node) === step.nodeTest.prefix;
      }
      return (
        step.nodeTest.localName === undefined || getNodeLocalName(node) === step.nodeTest.localName
      );
    }
    if (step.nodeTest.kind === 'kindTest') {
      if (step.nodeTest.name === 'node') {
        return true;
      }
      if (step.nodeTest.name === 'comment') {
        return node.nodeType === 8;
      }
      if (step.nodeTest.name === 'text') {
        return node.nodeType === 3;
      }
      return node.nodeType === 7;
    }
    if (step.axis === 'namespace') {
      return getNamespaceNodePrefix(node) === step.nodeTest.name;
    }
    if (!matchesPrincipalNodeKind(step, node)) {
      return false;
    }
    return matchesQualifiedNodeName(
      step.nodeTest.name,
      node,
      context.staticContext,
      step.axis === 'attribute',
    );
  }

  function matchesPrincipalNodeKind(step: StepExpression, node: Node): boolean {
    if (step.axis === 'attribute') {
      return node.nodeType === 2;
    }

    if (step.axis === 'namespace') {
      return getNamespaceDeclarationPrefix(node) !== undefined;
    }

    return node.nodeType === 1;
  }

  function predicateMatches(result: readonly XdmItem[], position: number, span: SpanLike): boolean {
    if (result.length === 0) {
      return false;
    }

    if (result.length === 1 && result[0]?.xdmKind === 'atomic') {
      const atomic = result[0] as XdmAtomicValue;
      if (atomic.type === 'xs:double' || atomic.type === 'xs:integer') {
        return atomic.value === position;
      }
      if (atomic.type === 'xs:boolean') {
        return atomic.value === true;
      }
    }

    return dependencies.effectiveBooleanValue(result, span);
  }

  return {
    evaluateFilterExpression,
    evaluatePath,
  };
}
