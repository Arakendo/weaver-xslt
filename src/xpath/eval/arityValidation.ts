import { XPST0017 } from '../../errors/codes.js';
import type { ErrorContext, ErrorDetails, ErrorSuggestion } from '../../errors/XdmError.js';
import type { XPathAst } from '../parse/ast.js';

type SpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

type CreateXPathError = (
  code: string,
  message: string,
  span: SpanLike,
  details?: ErrorDetails,
  context?: ErrorContext,
) => Error;

const EXACT_ARITY_NAMES = new Map<string, readonly string[]>([
  ['0', ['fn:position', 'fn:last', 'fn:error', 'fn:true', 'fn:false']],
  ['1', [
    'fn:count',
    'fn:exists',
    'fn:empty',
    'fn:exactly-one',
    'fn:one-or-more',
    'fn:zero-or-one',
    'fn:boolean',
    'fn:not',
    'fn:codepoints-to-string',
    'fn:upper-case',
    'fn:lower-case',
    'fn:min',
    'fn:max',
    'fn:avg',
    'fn:distinct-values',
    'fn:data',
    'fn:reverse',
    'fn:head',
    'fn:tail',
  ]],
  ['2', ['fn:deep-equal', 'fn:QName', 'fn:trace', 'map:entry', 'fn:remove', 'fn:contains', 'fn:starts-with', 'fn:ends-with']],
  ['3', ['fn:translate']],
]);

const RANGE_ARITY_NAMES = new Map<string, readonly string[]>([
  ['>=2', ['fn:concat']],
  ['0..1', ['fn:string', 'fn:string-length', 'fn:normalize-space', 'fn:number', 'fn:name', 'fn:local-name', 'fn:namespace-uri', 'fn:generate-id', 'fn:node-name', 'fn:root']],
  ['1..2', ['fn:string-join', 'fn:sum']],
  ['1..3', ['fn:tokenize']],
  ['2..3', ['fn:substring', 'fn:subsequence', 'fn:matches']],
  ['3..4', ['fn:replace']],
]);

const FUNCTION_ARITY_REQUIREMENTS = new Map<string, string>();

for (const [requirement, names] of EXACT_ARITY_NAMES) {
  for (const name of names) {
    FUNCTION_ARITY_REQUIREMENTS.set(name, requirement);
  }
}

for (const [requirement, names] of RANGE_ARITY_NAMES) {
  for (const name of names) {
    FUNCTION_ARITY_REQUIREMENTS.set(name, requirement);
  }
}

export function createArityValidationHelpers(createXPathError: CreateXPathError): {
  requireArity(name: string, args: readonly XPathAst[], expected: number, span: SpanLike): void;
  validateFunctionCallSignature(name: string, actualArity: number, span: SpanLike): void;
  throwArityError(name: string, actualArity: number, arityRequirement: string, span: SpanLike): never;
} {
  function requireArity(name: string, args: readonly XPathAst[], expected: number, span: SpanLike): void {
    if (args.length !== expected) {
      throwArityError(name, args.length, String(expected), span);
    }
  }

  function validateFunctionCallSignature(name: string, actualArity: number, span: SpanLike): void {
    const arityRequirement = FUNCTION_ARITY_REQUIREMENTS.get(name);

    if (arityRequirement === undefined) {
      throw createXPathError(XPST0017, `Unknown function ${name}.`, span, {
        functionName: name,
        actualArity,
      }, createFunctionSuggestionContext(name));
    }

    if (!matchesArityRequirement(actualArity, arityRequirement)) {
      throwArityError(name, actualArity, arityRequirement, span);
    }
  }

  function throwArityError(name: string, actualArity: number, arityRequirement: string, span: SpanLike): never {
    const requirementLabel = arityRequirement.includes('..')
      ? arityRequirement.replace('..', ' or ')
      : arityRequirement === '>=2'
        ? 'at least 2'
        : arityRequirement;
    throw createXPathError(XPST0017, `Function ${name} expects ${requirementLabel} arguments but got ${actualArity}.`, span, {
      functionName: name,
      actualArity,
      arityRequirement,
    });
  }

  return {
    requireArity,
    validateFunctionCallSignature,
    throwArityError,
  };
}

export function lookupFunctionArityRequirement(name: string): string | undefined {
  return FUNCTION_ARITY_REQUIREMENTS.get(name);
}

export function listKnownFunctionNames(): readonly string[] {
  return [...FUNCTION_ARITY_REQUIREMENTS.keys()];
}

export function createFunctionNameSuggestion(name: string): ErrorSuggestion | undefined {
  const candidatePrefix = name.startsWith('map:') ? 'map:' : 'fn:';
  const hasExplicitPrefix = name.includes(':');
  const displayName = hasExplicitPrefix ? name : candidatePrefix === 'fn:' ? name : `${candidatePrefix}${name}`;

  const nearest = listKnownFunctionNames()
    .filter((candidate) => candidate.startsWith(candidatePrefix))
    .map((candidate) => {
      const displayCandidate = hasExplicitPrefix || candidatePrefix !== 'fn:'
        ? candidate
        : candidate.slice(3);
      return {
        displayCandidate,
        distance: computeLevenshteinDistance(displayName, displayCandidate),
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
    confidence: nearest.distance === 0 ? 1 : 1 - (nearest.distance / nearest.displayCandidate.length),
  };
}

function createFunctionSuggestionContext(name: string): ErrorContext | undefined {
  const suggestion = createFunctionNameSuggestion(name);
  return suggestion === undefined ? undefined : { suggestions: [suggestion] };
}

function computeLevenshteinDistance(left: string, right: string): number {
  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0] ?? 0;
    previousRow[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const temp = previousRow[rightIndex] ?? 0;
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previousRow[rightIndex] = Math.min(
        (previousRow[rightIndex] ?? 0) + 1,
        (previousRow[rightIndex - 1] ?? 0) + 1,
        previousDiagonal + substitutionCost,
      );
      previousDiagonal = temp;
    }
  }

  return previousRow[right.length] ?? right.length;
}

export function matchesArityRequirement(actualArity: number, arityRequirement: string): boolean {
  switch (arityRequirement) {
    case '0':
    case '1':
    case '2':
    case '3':
      return actualArity === Number(arityRequirement);
    case '>=2':
      return actualArity >= 2;
    case '0..1':
      return actualArity === 0 || actualArity === 1;
    case '1..2':
      return actualArity === 1 || actualArity === 2;
    case '1..3':
      return actualArity === 1 || actualArity === 2 || actualArity === 3;
    case '2..3':
      return actualArity === 2 || actualArity === 3;
    case '3..4':
      return actualArity === 3 || actualArity === 4;
    default:
      return false;
  }
}