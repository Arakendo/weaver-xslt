import type { PathExpression, StepExpression, XPathAst } from '../../xpath/parse/ast.js';
import { tsCallExpression, tsRawExpression, tsStringLiteral, type TsExpression } from './ts-ir.js';

export function tryGetSimpleMatchPath(ast: PathExpression): readonly string[] | undefined {
  if (!ast.absolute || ast.base !== undefined || ast.steps.length === 0) {
    return undefined;
  }

  const path: string[] = [];
  for (const step of ast.steps) {
    if (
      step.kind !== 'step' ||
      step.axis !== 'child' ||
      step.predicates.length > 0 ||
      step.nodeTest.kind !== 'nameTest' ||
      step.nodeTest.name.includes(':')
    ) {
      return undefined;
    }

    path.push(step.nodeTest.name);
  }

  return path;
}

export function tryGetSimpleChildPath(
  ast: PathExpression | StepExpression | object,
): { readonly absolute: boolean; readonly segments: readonly string[] } | undefined {
  if (!('kind' in ast) || ast.kind !== 'path' || ast.base !== undefined) {
    return undefined;
  }

  const segments = tryGetSimpleChildSegments(ast);
  if (segments === undefined) {
    return undefined;
  }

  return {
    absolute: ast.absolute,
    segments,
  };
}

export function tryResolveSimpleChildPath(
  ast: PathExpression,
  contextNodeIdentifier: string,
  variableBindings: ReadonlyMap<string, TsExpression> | undefined,
):
  | { readonly startNodeExpression: TsExpression; readonly segments: readonly string[] }
  | undefined {
  const segments = tryGetSimpleChildSegments(ast);
  if (segments === undefined) {
    return undefined;
  }

  if (ast.base === undefined) {
    return {
      startNodeExpression: ast.absolute
        ? tsRawExpression('document')
        : tsRawExpression(contextNodeIdentifier),
      segments,
    };
  }

  if (ast.base.kind !== 'variable') {
    return undefined;
  }

  const variableExpression = resolveVariableBindingExpression(ast.base.name, variableBindings);
  if (variableExpression === undefined) {
    return undefined;
  }

  return {
    startNodeExpression: variableExpression,
    segments,
  };
}

function tryGetSimpleChildSegments(ast: PathExpression): readonly string[] | undefined {
  const names: string[] = [];
  for (const step of ast.steps) {
    if (step.kind !== 'step' || step.axis !== 'child' || step.predicates.length > 0) {
      return undefined;
    }

    if (step.nodeTest.kind === 'nameTest') {
      if (step.nodeTest.name.includes(':')) {
        return undefined;
      }

      names.push(step.nodeTest.name);
      continue;
    }

    if (step.nodeTest.kind === 'wildcardTest') {
      names.push('*');
      continue;
    }

    return undefined;
  }

  return names;
}

export function emitTracedValueOfPathStringExpression(
  ast: PathExpression,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  instructionInfoCode: string,
  variableBindings?: ReadonlyMap<string, TsExpression>,
): TsExpression | undefined {
  const documentDataValueNode = emitDocumentDataValueNodeExpression(
    ast,
    runtimeHelpers,
    variableBindings,
  );
  if (documentDataValueNode !== undefined) {
    runtimeHelpers.add('traceStringValueOfNode');
    return tsCallExpression('traceStringValueOfNode', [
      documentDataValueNode,
      tsRawExpression('ctx'),
      tsRawExpression(instructionInfoCode),
    ]);
  }

  if (variableBindings === undefined) {
    const simplePath = tryGetSimpleChildPath(ast);
    if (simplePath !== undefined) {
      runtimeHelpers.add('selectSimplePathNode');
      runtimeHelpers.add('traceStringValueOfNode');
      return tsCallExpression('traceStringValueOfNode', [
        tsCallExpression('selectSimplePathNode', [
          tsRawExpression(simplePath.absolute ? 'document' : contextNodeIdentifier),
          tsRawExpression(JSON.stringify(simplePath.segments)),
        ]),
        tsRawExpression('ctx'),
        tsRawExpression(instructionInfoCode),
      ]);
    }
  } else {
    const simplePath = tryResolveSimpleChildPath(ast, contextNodeIdentifier, variableBindings);
    if (simplePath !== undefined) {
      runtimeHelpers.add('selectSimplePathNode');
      runtimeHelpers.add('traceStringValueOfNode');
      return tsCallExpression('traceStringValueOfNode', [
        tsCallExpression('selectSimplePathNode', [
          simplePath.startNodeExpression,
          tsRawExpression(JSON.stringify(simplePath.segments)),
        ]),
        tsRawExpression('ctx'),
        tsRawExpression(instructionInfoCode),
      ]);
    }
  }

  const descendantPath = tryGetSimpleDescendantNamePath(ast);
  if (descendantPath === undefined) {
    return undefined;
  }

  runtimeHelpers.add('selectDescendantElementsByName');
  runtimeHelpers.add('traceStringValueOfNode');
  return tsCallExpression('traceStringValueOfNode', [
    tsRawExpression(
      `selectDescendantElementsByName(${descendantPath.absolute ? 'document' : contextNodeIdentifier}, ${JSON.stringify(descendantPath.localName)})[0] ?? null`,
    ),
    tsRawExpression('ctx'),
    tsRawExpression(instructionInfoCode),
  ]);
}

export function emitPathStringValueExpression(
  ast: PathExpression,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  variableBindings?: ReadonlyMap<string, TsExpression>,
): TsExpression | undefined {
  const documentDataValueNode = emitDocumentDataValueNodeExpression(
    ast,
    runtimeHelpers,
    variableBindings,
  );
  if (documentDataValueNode !== undefined) {
    runtimeHelpers.add('stringValueOfNode');
    return tsCallExpression('stringValueOfNode', [documentDataValueNode]);
  }

  if (variableBindings === undefined) {
    const simplePath = tryGetSimpleChildPath(ast);
    if (simplePath !== undefined) {
      runtimeHelpers.add('selectSimplePathText');
      return tsCallExpression('selectSimplePathText', [
        tsRawExpression(simplePath.absolute ? 'document' : contextNodeIdentifier),
        tsRawExpression(JSON.stringify(simplePath.segments)),
      ]);
    }
  } else {
    const simplePath = tryResolveSimpleChildPath(ast, contextNodeIdentifier, variableBindings);
    if (simplePath !== undefined) {
      runtimeHelpers.add('selectSimplePathText');
      return tsCallExpression('selectSimplePathText', [
        simplePath.startNodeExpression,
        tsRawExpression(JSON.stringify(simplePath.segments)),
      ]);
    }
  }

  const descendantPath = tryGetSimpleDescendantNamePath(ast);
  if (descendantPath === undefined) {
    return undefined;
  }

  runtimeHelpers.add('selectDescendantElementTextByName');
  return tsCallExpression('selectDescendantElementTextByName', [
    tsRawExpression(descendantPath.absolute ? 'document' : contextNodeIdentifier),
    tsStringLiteral(descendantPath.localName),
  ]);
}

function tryGetSimpleDescendantNamePath(
  ast: PathExpression,
): { readonly absolute: boolean; readonly localName: string } | undefined {
  if (ast.base !== undefined || ast.steps.length !== 2) {
    return undefined;
  }

  const [leadingStep, terminalStep] = ast.steps;
  if (
    leadingStep === undefined ||
    leadingStep.kind !== 'step' ||
    leadingStep.axis !== 'descendant-or-self' ||
    leadingStep.predicates.length > 0 ||
    leadingStep.nodeTest.kind !== 'kindTest' ||
    leadingStep.nodeTest.name !== 'node' ||
    terminalStep === undefined ||
    terminalStep.kind !== 'step' ||
    terminalStep.axis !== 'child' ||
    terminalStep.predicates.length > 0 ||
    terminalStep.nodeTest.kind !== 'nameTest' ||
    terminalStep.nodeTest.name.includes(':')
  ) {
    return undefined;
  }

  return {
    absolute: ast.absolute,
    localName: terminalStep.nodeTest.name,
  };
}

function emitDocumentDataValueNodeExpression(
  ast: PathExpression,
  runtimeHelpers: Set<string>,
  variableBindings?: ReadonlyMap<string, TsExpression>,
): TsExpression | undefined {
  const documentLookup = tryGetDocumentDataValueLookup(ast, variableBindings);
  if (documentLookup === undefined) {
    return undefined;
  }

  runtimeHelpers.add('selectDocumentDataValueNode');
  return tsCallExpression('selectDocumentDataValueNode', [
    tsStringLiteral(documentLookup.documentUri),
    documentLookup.keyExpression,
    tsRawExpression('ctx'),
  ]);
}

function tryGetDocumentDataValueLookup(
  ast: PathExpression,
  variableBindings?: ReadonlyMap<string, TsExpression>,
):
  | {
      readonly documentUri: string;
      readonly keyExpression: TsExpression;
    }
  | undefined {
  if (
    ast.base === undefined ||
    ast.base.kind !== 'functionCall' ||
    ast.base.callee !== 'document' ||
    ast.base.arguments.length !== 1 ||
    ast.base.arguments[0]?.kind !== 'string'
  ) {
    return undefined;
  }

  const [documentUriExpression] = ast.base.arguments;
  if (documentUriExpression === undefined) {
    return undefined;
  }

  const steps = ast.steps;
  let index = 0;

  {
    const step = steps[index];
    if (
      step !== undefined &&
      step.kind === 'step' &&
      step.axis === 'descendant-or-self' &&
      step.predicates.length === 0 &&
      step.nodeTest.kind === 'kindTest' &&
      step.nodeTest.name === 'node'
    ) {
      index += 1;
    }
  }

  {
    const step = steps[index];
    if (
      step === undefined ||
      step.kind !== 'step' ||
      step.axis !== 'child' ||
      step.predicates.length > 0 ||
      step.nodeTest.kind !== 'nameTest' ||
      step.nodeTest.name !== 'root'
    ) {
      return undefined;
    }
  }
  index += 1;

  {
    const step = steps[index];
    if (
      step === undefined ||
      step.kind !== 'step' ||
      step.axis !== 'child' ||
      step.predicates.length !== 1 ||
      step.nodeTest.kind !== 'nameTest' ||
      step.nodeTest.name !== 'data'
    ) {
      return undefined;
    }
  }

  const dataStep = steps[index];
  if (dataStep === undefined || dataStep.kind !== 'step') {
    return undefined;
  }

  const keyExpression = tryGetDataNameLookupKeyExpression(
    dataStep.predicates[0]!,
    variableBindings,
  );
  if (keyExpression === undefined) {
    return undefined;
  }
  index += 1;

  {
    const step = steps[index];
    if (
      step !== undefined &&
      step.kind === 'step' &&
      step.axis === 'descendant-or-self' &&
      step.predicates.length === 0 &&
      step.nodeTest.kind === 'kindTest' &&
      step.nodeTest.name === 'node'
    ) {
      index += 1;
    }
  }

  {
    const step = steps[index];
    if (
      step === undefined ||
      step.kind !== 'step' ||
      step.axis !== 'child' ||
      step.predicates.length > 0 ||
      step.nodeTest.kind !== 'nameTest' ||
      step.nodeTest.name !== 'value' ||
      index !== steps.length - 1
    ) {
      return undefined;
    }
  }

  return {
    documentUri: documentUriExpression.value,
    keyExpression,
  };
}

function tryGetDataNameLookupKeyExpression(
  predicate: XPathAst,
  variableBindings?: ReadonlyMap<string, TsExpression>,
): TsExpression | undefined {
  if (predicate.kind !== 'binary' || predicate.operator !== '=') {
    return undefined;
  }

  if (tryGetDataNameAttributeExpression(predicate.left)) {
    return tryGetLookupKeyScalarExpression(predicate.right, variableBindings);
  }

  if (tryGetDataNameAttributeExpression(predicate.right)) {
    return tryGetLookupKeyScalarExpression(predicate.left, variableBindings);
  }

  return undefined;
}

function tryGetDataNameAttributeExpression(ast: XPathAst): boolean {
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

function tryGetLookupKeyScalarExpression(
  ast: XPathAst,
  variableBindings?: ReadonlyMap<string, TsExpression>,
): TsExpression | undefined {
  switch (ast.kind) {
    case 'string':
      return tsStringLiteral(ast.value);
    case 'variable':
      return resolveVariableBindingExpression(ast.name, variableBindings);
    default:
      return undefined;
  }
}

export function resolveVariableBindingExpression(
  name: string,
  variableBindings: ReadonlyMap<string, TsExpression> | undefined,
): TsExpression | undefined {
  if (variableBindings === undefined) {
    return undefined;
  }

  return (
    variableBindings.get(name) ??
    (name.startsWith('{}') ? undefined : variableBindings.get(`{}${name}`))
  );
}
