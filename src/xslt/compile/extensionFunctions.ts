import { XPST0017, XPST0081, XPTY0004 } from '../../errors/codes.js';
import type { ErrorFrame, ErrorSuggestion, SourceLocation } from '../../errors/index.js';
import type { SourceSpan } from '../../xpath/lex/lexer.js';
import type {
  FilterExpression,
  FlowBinding,
  ForExpression,
  FunctionCallExpression,
  IfExpression,
  LetExpression,
  PathExpression,
  QuantifiedExpression,
  SequenceExpression,
  StepExpression,
  XPathAst,
} from '../../xpath/parse/ast.js';
import { createXsltStaticError } from './compilerSupport.js';
import {
  listKnownFunctionNames,
  lookupFunctionArityRequirement,
  matchesArityRequirement,
} from '../../xpath/eval/arityValidation.js';
import { computeLevenshteinDistance } from '../diagnostics.js';

const PREDEFINED_NAMESPACE_PREFIXES = new Map<string, string>([
  ['array', 'http://www.w3.org/2005/xpath-functions/array'],
  ['fn', 'http://www.w3.org/2005/xpath-functions'],
  ['map', 'http://www.w3.org/2005/xpath-functions/map'],
  ['math', 'http://www.w3.org/2005/xpath-functions/math'],
  ['msxsl', 'urn:schemas-microsoft-com:xslt'],
  ['xml', 'http://www.w3.org/XML/1998/namespace'],
  ['xs', 'http://www.w3.org/2001/XMLSchema'],
]);

type InferredXPathType = 'boolean' | 'number' | 'string' | 'unknown';

export interface ExtensionFunctionParameterSignature {
  readonly name: string;
  readonly typeText: string;
  readonly inferredTypes: readonly InferredXPathType[];
  readonly optional: boolean;
}

export interface ExtensionFunctionSignature {
  readonly namespaceUri: string;
  readonly localName: string;
  readonly signatureText: string;
  readonly minimumArity: number;
  readonly maximumArity?: number;
  readonly parameters: readonly ExtensionFunctionParameterSignature[];
}

export type ExtensionFunctionCatalog = ReadonlyMap<string, ExtensionFunctionSignature>;

export interface XPathFunctionValidationOptions {
  readonly expressionText: string;
  readonly expressionLocation?: SourceLocation;
  readonly ownerName: string;
  readonly attributeName: string;
  readonly frameKind?: ErrorFrame['kind'];
  readonly namespaces: Readonly<Record<string, string>>;
  readonly extensionFunctions: ExtensionFunctionCatalog;
}

export function validateXPathFunctionCalls(
  ast: XPathAst,
  options: XPathFunctionValidationOptions,
): void {
  walkXPathAst(ast, options);
}

function walkXPathAst(ast: XPathAst, options: XPathFunctionValidationOptions): void {
  switch (ast.kind) {
    case 'array':
      for (const member of ast.members) {
        walkXPathAst(member, options);
      }
      return;
    case 'binary':
      walkXPathAst(ast.left, options);
      walkXPathAst(ast.right, options);
      return;
    case 'contextItem':
    case 'number':
    case 'string':
    case 'variable':
      return;
    case 'filter':
      walkFilterExpression(ast, options);
      return;
    case 'for':
      walkForExpression(ast, options);
      return;
    case 'functionCall':
      validateFunctionCall(ast, options);
      for (const argument of ast.arguments) {
        walkXPathAst(argument, options);
      }
      return;
    case 'if':
      walkIfExpression(ast, options);
      return;
    case 'let':
      walkLetExpression(ast, options);
      return;
    case 'path':
      walkPathExpression(ast, options);
      return;
    case 'quantified':
      walkQuantifiedExpression(ast, options);
      return;
    case 'sequence':
      walkSequenceExpression(ast, options);
      return;
    case 'unary':
      walkXPathAst(ast.operand, options);
      return;
  }
}

function walkFilterExpression(
  ast: FilterExpression,
  options: XPathFunctionValidationOptions,
): void {
  walkXPathAst(ast.base, options);
  for (const predicate of ast.predicates) {
    walkXPathAst(predicate, options);
  }
}

function walkForExpression(ast: ForExpression, options: XPathFunctionValidationOptions): void {
  walkBindings(ast.bindings, options);
  walkXPathAst(ast.returnExpr, options);
}

function walkIfExpression(ast: IfExpression, options: XPathFunctionValidationOptions): void {
  walkXPathAst(ast.test, options);
  walkXPathAst(ast.thenBranch, options);
  walkXPathAst(ast.elseBranch, options);
}

function walkLetExpression(ast: LetExpression, options: XPathFunctionValidationOptions): void {
  walkBindings(ast.bindings, options);
  walkXPathAst(ast.returnExpr, options);
}

function walkQuantifiedExpression(
  ast: QuantifiedExpression,
  options: XPathFunctionValidationOptions,
): void {
  walkBindings(ast.bindings, options);
  walkXPathAst(ast.satisfiesExpr, options);
}

function walkSequenceExpression(
  ast: SequenceExpression,
  options: XPathFunctionValidationOptions,
): void {
  for (const item of ast.items) {
    walkXPathAst(item, options);
  }
}

function walkBindings(
  bindings: readonly FlowBinding[],
  options: XPathFunctionValidationOptions,
): void {
  for (const binding of bindings) {
    walkXPathAst(binding.value, options);
  }
}

function walkPathExpression(ast: PathExpression, options: XPathFunctionValidationOptions): void {
  if (ast.base !== undefined) {
    walkXPathAst(ast.base, options);
  }

  for (const step of ast.steps) {
    if (step.kind === 'step') {
      walkStepExpression(step, options);
      continue;
    }

    walkXPathAst(step, options);
  }
}

function walkStepExpression(step: StepExpression, options: XPathFunctionValidationOptions): void {
  for (const predicate of step.predicates) {
    walkXPathAst(predicate, options);
  }
}

function validateFunctionCall(
  ast: FunctionCallExpression,
  options: XPathFunctionValidationOptions,
): void {
  const resolved = resolveFunctionName(ast.callee, options);

  if (
    resolved.kind === 'extension' &&
    resolved.normalizedName === '{urn:schemas-microsoft-com:xslt}node-set'
  ) {
    if (ast.arguments.length !== 1) {
      throwFunctionValidationError(
        XPST0017,
        `Function ${ast.callee} expects 1 argument but got ${ast.arguments.length}.`,
        ast.span,
        options,
        {
          functionName: ast.callee,
          actualArity: ast.arguments.length,
          arityRequirement: '1',
        },
      );
    }

    return;
  }

  if (resolved.kind === 'builtin') {
    const arityRequirement = lookupFunctionArityRequirement(resolved.name);
    if (arityRequirement === undefined) {
      const suggestion = createFunctionNameSuggestion(ast.callee, resolved, options);
      throwFunctionValidationError(
        XPST0017,
        `Unknown function ${ast.callee} with arity ${ast.arguments.length}.`,
        ast.span,
        options,
        {
          functionName: ast.callee,
          actualArity: ast.arguments.length,
        },
        suggestion,
      );
    }

    if (!matchesArityRequirement(ast.arguments.length, arityRequirement)) {
      throwFunctionValidationError(
        XPST0017,
        `Function ${ast.callee} expects ${formatArityRequirement(arityRequirement)} arguments but got ${ast.arguments.length}.`,
        ast.span,
        options,
        {
          functionName: ast.callee,
          actualArity: ast.arguments.length,
          arityRequirement,
        },
      );
    }

    return;
  }

  const signature = options.extensionFunctions.get(resolved.normalizedName);
  if (signature === undefined) {
    const suggestion = createFunctionNameSuggestion(ast.callee, resolved, options);
    throwFunctionValidationError(
      XPST0017,
      `Unknown function ${ast.callee} with arity ${ast.arguments.length}.`,
      ast.span,
      options,
      {
        functionName: ast.callee,
        actualArity: ast.arguments.length,
      },
      suggestion,
    );
  }

  if (
    ast.arguments.length < signature.minimumArity ||
    (signature.maximumArity !== undefined && ast.arguments.length > signature.maximumArity)
  ) {
    const arityRequirement =
      signature.maximumArity === undefined
        ? `>=${signature.minimumArity}`
        : signature.minimumArity === signature.maximumArity
          ? String(signature.minimumArity)
          : `${signature.minimumArity}..${signature.maximumArity}`;
    throwFunctionValidationError(
      XPST0017,
      `Function ${ast.callee} expects ${formatArityRequirement(arityRequirement)} arguments but got ${ast.arguments.length}.`,
      ast.span,
      options,
      {
        functionName: ast.callee,
        actualArity: ast.arguments.length,
        arityRequirement,
        signature: signature.signatureText,
      },
    );
  }

  for (
    let index = 0;
    index < ast.arguments.length && index < signature.parameters.length;
    index += 1
  ) {
    const parameter = signature.parameters[index]!;
    if (parameter.inferredTypes.length === 0 || parameter.inferredTypes.includes('unknown')) {
      continue;
    }

    const actualType = inferXPathAstType(ast.arguments[index]!);
    if (actualType.kind === 'unknown' || parameter.inferredTypes.includes(actualType.kind)) {
      continue;
    }

    throwFunctionValidationError(
      XPTY0004,
      `Extension function ${ast.callee} argument ${index + 1} expects ${parameter.typeText} but got ${actualType.display}.`,
      ast.arguments[index]!.span,
      options,
      {
        expectedType: parameter.typeText,
        actualType: actualType.display,
        functionName: ast.callee,
        signature: signature.signatureText,
        argumentPosition: index + 1,
      },
    );
  }
}

function resolveFunctionName(
  callee: string,
  options: XPathFunctionValidationOptions,
):
  | { kind: 'builtin'; readonly name: string }
  | {
      kind: 'extension';
      readonly normalizedName: string;
      readonly prefix: string;
      readonly namespaceUri: string;
    } {
  if (!callee.includes(':')) {
    return { kind: 'builtin', name: `fn:${callee}` };
  }

  const separator = callee.indexOf(':');
  const prefix = callee.slice(0, separator);
  const localName = callee.slice(separator + 1);
  if (prefix === 'fn' || prefix === 'map') {
    return { kind: 'builtin', name: `${prefix}:${localName}` };
  }

  const namespaceUri = options.namespaces[prefix] ?? PREDEFINED_NAMESPACE_PREFIXES.get(prefix);
  if (namespaceUri === undefined) {
    throwFunctionValidationError(
      XPST0081,
      `Unknown namespace prefix ${JSON.stringify(prefix)} in function call ${callee}.`,
      createPrefixSpan(prefix),
      options,
      {
        namespacePrefix: prefix,
        qName: callee,
      },
    );
  }

  return {
    kind: 'extension',
    normalizedName: `{${namespaceUri}}${localName}`,
    prefix,
    namespaceUri,
  };
}

function createFunctionNameSuggestion(
  callee: string,
  resolved: ReturnType<typeof resolveFunctionName>,
  options: XPathFunctionValidationOptions,
): ErrorSuggestion | undefined {
  const candidateNames =
    resolved.kind === 'builtin'
      ? listKnownFunctionNames().filter((name) =>
          name.startsWith(resolved.name.startsWith('map:') ? 'map:' : 'fn:'),
        )
      : [...options.extensionFunctions.values()]
          .filter((signature) => signature.namespaceUri === resolved.namespaceUri)
          .map((signature) => `${resolved.prefix}:${signature.localName}`);

  const nearest = candidateNames
    .map((candidateName) => {
      const displayCandidate = toSuggestedFunctionDisplayName(candidateName, callee, resolved.kind);
      return {
        candidateName,
        displayCandidate,
        distance: computeLevenshteinDistance(callee, displayCandidate),
      };
    })
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  return {
    kind: 'fix',
    label: `did you mean ${nearest.displayCandidate}(...)?`,
    replacement: nearest.displayCandidate,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.displayCandidate.length,
  };
}

function toSuggestedFunctionDisplayName(
  candidateName: string,
  callee: string,
  kind: ReturnType<typeof resolveFunctionName>['kind'],
): string {
  if (kind === 'builtin' && !callee.includes(':') && candidateName.startsWith('fn:')) {
    return candidateName.slice(3);
  }

  return candidateName;
}

function inferXPathAstType(ast: XPathAst): { kind: InferredXPathType; display: string } {
  switch (ast.kind) {
    case 'number':
      return { kind: 'number', display: 'number' };
    case 'string':
      return { kind: 'string', display: 'string' };
    case 'binary':
      if (
        ast.operator === '+' ||
        ast.operator === '-' ||
        ast.operator === '*' ||
        ast.operator === 'div' ||
        ast.operator === 'idiv' ||
        ast.operator === 'mod' ||
        ast.operator === 'to'
      ) {
        return { kind: 'number', display: 'number' };
      }
      if (
        ast.operator === 'and' ||
        ast.operator === 'or' ||
        ast.operator === '=' ||
        ast.operator === '!=' ||
        ast.operator === '<' ||
        ast.operator === '<=' ||
        ast.operator === '>' ||
        ast.operator === '>=' ||
        ast.operator === 'eq' ||
        ast.operator === 'ne' ||
        ast.operator === 'lt' ||
        ast.operator === 'le' ||
        ast.operator === 'gt' ||
        ast.operator === 'ge' ||
        ast.operator === 'is' ||
        ast.operator === '<<' ||
        ast.operator === '>>'
      ) {
        return { kind: 'boolean', display: 'boolean' };
      }
      if (ast.operator === '||') {
        return { kind: 'string', display: 'string' };
      }
      return { kind: 'unknown', display: 'unknown' };
    case 'functionCall': {
      const normalized = ast.callee.includes(':') ? ast.callee : `fn:${ast.callee}`;
      if (
        normalized === 'fn:true' ||
        normalized === 'fn:false' ||
        normalized === 'fn:boolean' ||
        normalized === 'fn:not' ||
        normalized === 'fn:exists' ||
        normalized === 'fn:empty' ||
        normalized === 'fn:deep-equal'
      ) {
        return { kind: 'boolean', display: 'boolean' };
      }
      if (
        normalized === 'fn:count' ||
        normalized === 'fn:last' ||
        normalized === 'fn:position' ||
        normalized === 'fn:string-length' ||
        normalized === 'fn:number' ||
        normalized === 'fn:sum' ||
        normalized === 'fn:min' ||
        normalized === 'fn:max' ||
        normalized === 'fn:avg'
      ) {
        return { kind: 'number', display: 'number' };
      }
      if (
        normalized === 'fn:string' ||
        normalized === 'fn:normalize-space' ||
        normalized === 'fn:upper-case' ||
        normalized === 'fn:lower-case' ||
        normalized === 'fn:concat' ||
        normalized === 'fn:substring' ||
        normalized === 'fn:translate' ||
        normalized === 'fn:name' ||
        normalized === 'fn:local-name' ||
        normalized === 'fn:namespace-uri'
      ) {
        return { kind: 'string', display: 'string' };
      }
      return { kind: 'unknown', display: 'unknown' };
    }
    case 'if': {
      const thenType = inferXPathAstType(ast.thenBranch);
      const elseType = inferXPathAstType(ast.elseBranch);
      return thenType.kind === elseType.kind ? thenType : { kind: 'unknown', display: 'unknown' };
    }
    case 'unary':
      return { kind: 'number', display: 'number' };
    default:
      return { kind: 'unknown', display: 'unknown' };
  }
}

function throwFunctionValidationError(
  code: string,
  message: string,
  span: SourceSpan,
  options: XPathFunctionValidationOptions,
  details: Readonly<Record<string, string | number | boolean>>,
  suggestion?: ErrorSuggestion,
): never {
  const primaryLocation = mapXPathSpanToSourceLocation(options.expressionLocation, span);
  const frameKind = options.frameKind ?? 'instruction';
  const frameLabel =
    frameKind === 'template'
      ? `${options.attributeName}="${options.expressionText}"`
      : `${options.ownerName} ${options.attributeName}="${options.expressionText}"`;

  throw createXsltStaticError(
    message,
    primaryLocation ?? options.expressionLocation,
    details,
    {
      frames: [
        {
          kind: frameKind,
          label: frameLabel,
          ...(options.expressionLocation === undefined
            ? {}
            : { location: options.expressionLocation }),
        },
      ],
      ...(suggestion === undefined ? {} : { suggestions: [suggestion] }),
      ...(primaryLocation !== undefined &&
      options.expressionLocation !== undefined &&
      primaryLocation.offset !== options.expressionLocation.offset
        ? {
            related: [
              {
                label: frameKind === 'template' ? 'containing template' : 'containing instruction',
                location: options.expressionLocation,
              },
            ],
          }
        : {}),
    },
    code,
  );
}

function mapXPathSpanToSourceLocation(
  expressionLocation: SourceLocation | undefined,
  span: SourceSpan,
): SourceLocation | undefined {
  if (
    expressionLocation?.line === undefined ||
    expressionLocation.column === undefined ||
    expressionLocation.offset === undefined
  ) {
    return undefined;
  }

  const source = expressionLocation.source;
  return {
    ...(source === undefined ? {} : { source }),
    line: expressionLocation.line + span.line - 1,
    column: span.line === 1 ? expressionLocation.column + span.column - 1 : span.column,
    offset: expressionLocation.offset + span.start,
    endLine: expressionLocation.line + span.endLine - 1,
    endColumn: span.endLine === 1 ? expressionLocation.column + span.endColumn - 1 : span.endColumn,
    endOffset: expressionLocation.offset + span.end,
  };
}

function formatArityRequirement(arityRequirement: string): string {
  if (arityRequirement.includes('..')) {
    return arityRequirement.replace('..', ' or ');
  }

  if (arityRequirement.startsWith('>=')) {
    return `at least ${arityRequirement.slice(2)}`;
  }

  return arityRequirement;
}

function createPrefixSpan(prefix: string): SourceSpan {
  return {
    start: 0,
    end: prefix.length,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: prefix.length + 1,
  };
}
