import type { XPathAst, XPathBinaryOperator } from '../../xpath/parse/ast.js';

import {
  getGreatestCommonDivisor,
  getLeastCommonMultiple,
  mergeSupportedStepPositionPlans,
  unionSupportedStepPositionPlans,
} from './nativePositionPlanAlgebra.js';
import type {
  SimpleSelectPathStepPlan,
  SupportedLastDivisorPolynomialValue,
  SupportedPositionComparisonOperator,
  SupportedStepPositionPlan,
} from './nativePositionPlan.js';
export function tryGetSupportedStepPositionPredicate(
  predicate: XPathAst,
): SupportedStepPositionPlan | undefined {
  if (predicate.kind === 'number') {
    return Number.isInteger(predicate.value) && predicate.value >= 1
      ? { position: predicate.value }
      : undefined;
  }

  if (isZeroArgFunctionCall(predicate, 'last')) {
    return { position: 'last' };
  }

  if (
    predicate.kind === 'functionCall' &&
    predicate.callee === 'not' &&
    predicate.arguments.length === 1
  ) {
    const [argument] = predicate.arguments;
    return argument === undefined
      ? undefined
      : tryGetSupportedNegatedStepPositionPredicate(argument);
  }

  if (predicate.kind !== 'binary') {
    return undefined;
  }

  if (predicate.operator === 'and') {
    const leftPlan = tryGetSupportedStepPositionPredicate(predicate.left);
    const rightPlan = tryGetSupportedStepPositionPredicate(predicate.right);
    return leftPlan === undefined || rightPlan === undefined
      ? undefined
      : mergeSupportedStepPositionPlans(leftPlan, rightPlan);
  }

  if (predicate.operator === 'or') {
    const leftPlan = tryGetSupportedStepPositionPredicate(predicate.left);
    const rightPlan = tryGetSupportedStepPositionPredicate(predicate.right);
    return leftPlan === undefined || rightPlan === undefined
      ? undefined
      : unionSupportedStepPositionPlans(leftPlan, rightPlan);
  }

  const leftPosition = isZeroArgFunctionCall(predicate.left, 'position');
  const rightPosition = isZeroArgFunctionCall(predicate.right, 'position');
  const leftLast = isZeroArgFunctionCall(predicate.left, 'last');
  const rightLast = isZeroArgFunctionCall(predicate.right, 'last');
  const leftNumber = predicate.left.kind === 'number' ? predicate.left.value : undefined;
  const rightNumber = predicate.right.kind === 'number' ? predicate.right.value : undefined;
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  const moduloPlan = tryGetSupportedPositionModuloComparison(predicate);
  const lastDivisorPlan = tryGetSupportedPositionLastDivisorComparison(predicate);
  const lastDivisorRangePlan = tryGetSupportedPositionLastDivisorRangeComparison(predicate);
  const lastOffsetPlan = tryGetSupportedPositionLastOffsetComparison(predicate);
  const lastRangePlan = tryGetSupportedPositionLastRangeComparison(predicate);

  if (moduloPlan !== undefined) {
    return moduloPlan;
  }

  if (lastDivisorPlan !== undefined) {
    return lastDivisorPlan;
  }

  if (lastDivisorRangePlan !== undefined) {
    return lastDivisorRangePlan;
  }

  if (lastOffsetPlan !== undefined) {
    return lastOffsetPlan;
  }

  if (lastRangePlan !== undefined) {
    return lastRangePlan;
  }

  if (operator !== undefined && leftPosition && rightNumber !== undefined) {
    return createSupportedStepPositionComparison(operator, rightNumber);
  }

  if (operator !== undefined && rightPosition && leftNumber !== undefined) {
    return createSupportedStepPositionComparison(reverseComparisonOperator(operator), leftNumber);
  }

  if ((leftPosition && rightLast) || (leftLast && rightPosition)) {
    return operator === undefined ? undefined : createSupportedPositionLastComparison(operator);
  }

  return undefined;
}
function createSupportedStepPositionComparison(
  operator: SupportedPositionComparisonOperator | undefined,
  value: number,
): SupportedStepPositionPlan | undefined {
  if (!Number.isInteger(value) || value < 1) {
    return undefined;
  }

  switch (operator) {
    case '=':
    case 'eq':
      return { position: value };
    case '>':
    case 'gt':
      return { minimumPosition: value + 1 };
    case '>=':
    case 'ge':
      return { minimumPosition: value };
    case '<':
    case 'lt':
      return value === 1 ? { maximumPosition: 0 } : { maximumPosition: value - 1 };
    case '<=':
    case 'le':
      return { maximumPosition: value };
    case '!=':
    case 'ne':
      return { excludedPosition: value };
    default:
      return undefined;
  }
}

function tryGetSupportedNegatedStepPositionPredicate(
  predicate: XPathAst,
): SupportedStepPositionPlan | undefined {
  if (
    predicate.kind === 'functionCall' &&
    predicate.callee === 'not' &&
    predicate.arguments.length === 1
  ) {
    const [argument] = predicate.arguments;
    return argument === undefined ? undefined : tryGetSupportedStepPositionPredicate(argument);
  }

  if (predicate.kind === 'binary' && predicate.operator === 'or') {
    const leftPlan = tryGetSupportedNegatedStepPositionPredicate(predicate.left);
    const rightPlan = tryGetSupportedNegatedStepPositionPredicate(predicate.right);
    return leftPlan === undefined || rightPlan === undefined
      ? undefined
      : mergeSupportedStepPositionPlans(leftPlan, rightPlan);
  }

  if (predicate.kind === 'binary' && predicate.operator === 'and') {
    const leftPlan = tryGetSupportedNegatedStepPositionPredicate(predicate.left);
    const rightPlan = tryGetSupportedNegatedStepPositionPredicate(predicate.right);
    return leftPlan === undefined || rightPlan === undefined
      ? undefined
      : unionSupportedStepPositionPlans(leftPlan, rightPlan);
  }

  const negatedLastOffsetPlan = tryGetSupportedNegatedPositionLastOffsetComparison(predicate);
  if (negatedLastOffsetPlan !== undefined) {
    return negatedLastOffsetPlan;
  }

  const negatedLastDivisorPlan = tryGetSupportedNegatedPositionLastDivisorComparison(predicate);
  if (negatedLastDivisorPlan !== undefined) {
    return negatedLastDivisorPlan;
  }

  const negatedLastDivisorRangePlan =
    tryGetSupportedNegatedPositionLastDivisorRangeComparison(predicate);
  if (negatedLastDivisorRangePlan !== undefined) {
    return negatedLastDivisorRangePlan;
  }

  const negatedLastRangePlan = tryGetSupportedNegatedPositionLastRangeComparison(predicate);
  if (negatedLastRangePlan !== undefined) {
    return negatedLastRangePlan;
  }

  const negatedModuloPlan = tryGetSupportedNegatedPositionModuloComparison(predicate);
  if (negatedModuloPlan !== undefined) {
    return negatedModuloPlan;
  }

  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const leftPosition = isZeroArgFunctionCall(predicate.left, 'position');
  const rightPosition = isZeroArgFunctionCall(predicate.right, 'position');
  const leftLast = isZeroArgFunctionCall(predicate.left, 'last');
  const rightLast = isZeroArgFunctionCall(predicate.right, 'last');
  const leftNumber = predicate.left.kind === 'number' ? predicate.left.value : undefined;
  const rightNumber = predicate.right.kind === 'number' ? predicate.right.value : undefined;
  const operator = getSupportedPositionComparisonOperator(predicate.operator);

  if (operator !== undefined && leftPosition && rightNumber !== undefined) {
    return createSupportedStepPositionComparison(negateComparisonOperator(operator), rightNumber);
  }

  if (operator !== undefined && rightPosition && leftNumber !== undefined) {
    return createSupportedStepPositionComparison(
      reverseComparisonOperator(negateComparisonOperator(operator)),
      leftNumber,
    );
  }

  if (operator !== undefined && ((leftPosition && rightLast) || (leftLast && rightPosition))) {
    return createSupportedPositionLastComparison(negateComparisonOperator(operator));
  }

  return undefined;
}

function negateComparisonOperator(
  operator: SupportedPositionComparisonOperator,
): SupportedPositionComparisonOperator {
  switch (operator) {
    case '=':
      return '!=';
    case 'eq':
      return 'ne';
    case '!=':
      return '=';
    case 'ne':
      return 'eq';
    case '<':
      return '>=';
    case 'lt':
      return 'ge';
    case '<=':
      return '>';
    case 'le':
      return 'gt';
    case '>':
      return '<=';
    case 'gt':
      return 'le';
    case '>=':
      return '<';
    case 'ge':
      return 'lt';
  }
}

function createSupportedPositionLastComparison(
  operator: SupportedPositionComparisonOperator,
): SupportedStepPositionPlan | undefined {
  switch (operator) {
    case '=':
    case 'eq':
      return { position: 'last' };
    case '!=':
    case 'ne':
    case '<':
    case 'lt':
      return { maximumPositionFromLastOffset: 1 };
    case '>=':
    case 'ge':
      return { position: 'last' };
    case '<=':
    case 'le':
      return {};
    case '>':
    case 'gt':
      return { maximumPosition: 0 };
  }
}

function tryGetSupportedNegatedPositionLastOffsetComparison(
  predicate: XPathAst,
): SupportedStepPositionPlan | undefined {
  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== '=' && operator !== 'eq' && operator !== '!=' && operator !== 'ne') {
    return undefined;
  }

  if (isZeroArgFunctionCall(predicate.left, 'position')) {
    const lastOffset = tryGetLastOffsetValue(predicate.right);
    return lastOffset === undefined
      ? undefined
      : createSupportedNegatedPositionLastOffsetComparison(operator, lastOffset);
  }

  if (isZeroArgFunctionCall(predicate.right, 'position')) {
    const lastOffset = tryGetLastOffsetValue(predicate.left);
    return lastOffset === undefined
      ? undefined
      : createSupportedNegatedPositionLastOffsetComparison(operator, lastOffset);
  }

  return undefined;
}

function createSupportedNegatedPositionLastOffsetComparison(
  operator: SupportedPositionComparisonOperator,
  lastOffset: number,
): SupportedStepPositionPlan | undefined {
  switch (operator) {
    case '=':
    case 'eq':
      return createSupportedNegatedPositionLastOffsetPlan(lastOffset);
    case '!=':
    case 'ne':
      return { positionFromLastOffset: lastOffset };
  }

  return undefined;
}

function createSupportedNegatedPositionLastOffsetPlan(
  lastOffset: number,
): SupportedStepPositionPlan {
  if (lastOffset === 0) {
    return { maximumPositionFromLastOffset: 1 };
  }

  return {
    alternatives: [
      { maximumPositionFromLastOffset: lastOffset + 1 },
      { includedPositionFromLastOffsets: Array.from({ length: lastOffset }, (_, index) => index) },
    ],
  };
}

function tryGetSupportedNegatedPositionLastRangeComparison(
  predicate: XPathAst,
): SupportedStepPositionPlan | undefined {
  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator === undefined) {
    return undefined;
  }

  if (isZeroArgFunctionCall(predicate.left, 'position')) {
    return createSupportedNegatedPositionLastRangePlan(operator, predicate.right);
  }

  if (isZeroArgFunctionCall(predicate.right, 'position')) {
    return createSupportedNegatedPositionLastRangePlan(
      reverseComparisonOperator(operator),
      predicate.left,
    );
  }

  return undefined;
}

function createSupportedNegatedPositionLastRangePlan(
  operator: SupportedPositionComparisonOperator,
  ast: XPathAst,
): SupportedStepPositionPlan | undefined {
  const lastOffset = tryGetLastOffsetValue(ast);
  if (lastOffset === undefined) {
    return undefined;
  }

  switch (operator) {
    case '<':
    case 'lt':
      return {
        includedPositionFromLastOffsets: Array.from(
          { length: lastOffset + 1 },
          (_, index) => index,
        ),
      };
    case '<=':
    case 'le':
      return lastOffset === 0
        ? { maximumPosition: 0 }
        : {
            includedPositionFromLastOffsets: Array.from(
              { length: lastOffset },
              (_, index) => index,
            ),
          };
    case '>':
    case 'gt':
      return { maximumPositionFromLastOffset: lastOffset };
    case '>=':
    case 'ge':
      return { maximumPositionFromLastOffset: lastOffset + 1 };
    default:
      return undefined;
  }
}

function tryGetSupportedNegatedPositionModuloComparison(
  predicate: XPathAst,
): SupportedStepPositionPlan | undefined {
  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== '=' && operator !== 'eq') {
    return undefined;
  }

  const leftModuloDivisor = tryGetPositionModuloDivisor(predicate.left);
  const rightModuloDivisor = tryGetPositionModuloDivisor(predicate.right);
  const leftNumber = predicate.left.kind === 'number' ? predicate.left.value : undefined;
  const rightNumber = predicate.right.kind === 'number' ? predicate.right.value : undefined;

  if (leftModuloDivisor !== undefined && rightNumber !== undefined) {
    return createSupportedNegatedModuloPlan(leftModuloDivisor, rightNumber);
  }

  if (rightModuloDivisor !== undefined && leftNumber !== undefined) {
    return createSupportedNegatedModuloPlan(rightModuloDivisor, leftNumber);
  }

  return undefined;
}

function createSupportedNegatedModuloPlan(
  divisor: number,
  remainder: number,
): SupportedStepPositionPlan | undefined {
  if (!Number.isInteger(remainder) || remainder < 0 || remainder >= divisor) {
    return undefined;
  }

  const alternatives: SupportedStepPositionPlan[] = [];
  for (let candidateRemainder = 0; candidateRemainder < divisor; candidateRemainder += 1) {
    if (candidateRemainder === remainder) {
      continue;
    }

    alternatives.push({
      positionModuloDivisor: divisor,
      positionModuloRemainder: candidateRemainder,
    });
  }

  return alternatives.length === 0 ? { maximumPosition: 0 } : { alternatives };
}

function tryGetSupportedPositionModuloComparison(
  predicate: XPathAst,
): Pick<SimpleSelectPathStepPlan, 'positionModuloDivisor' | 'positionModuloRemainder'> | undefined {
  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== '=' && operator !== 'eq') {
    return undefined;
  }

  const leftModuloDivisor = tryGetPositionModuloDivisor(predicate.left);
  const rightModuloDivisor = tryGetPositionModuloDivisor(predicate.right);
  const leftNumber = predicate.left.kind === 'number' ? predicate.left.value : undefined;
  const rightNumber = predicate.right.kind === 'number' ? predicate.right.value : undefined;

  if (leftModuloDivisor !== undefined && rightNumber !== undefined) {
    return createSupportedPositionModuloPlan(leftModuloDivisor, rightNumber);
  }

  if (rightModuloDivisor !== undefined && leftNumber !== undefined) {
    return createSupportedPositionModuloPlan(rightModuloDivisor, leftNumber);
  }

  return undefined;
}

function reverseComparisonOperator(
  operator: SupportedPositionComparisonOperator,
): SupportedPositionComparisonOperator {
  switch (operator) {
    case '>':
      return '<';
    case 'gt':
      return 'lt';
    case '>=':
      return '<=';
    case 'ge':
      return 'le';
    case '<':
      return '>';
    case 'lt':
      return 'gt';
    case '<=':
      return '>=';
    case 'le':
      return 'ge';
    default:
      return operator;
  }
}

function getSupportedPositionComparisonOperator(
  operator: XPathBinaryOperator,
): SupportedPositionComparisonOperator | undefined {
  switch (operator) {
    case '=':
    case 'eq':
    case '>':
    case 'gt':
    case '>=':
    case 'ge':
    case '<':
    case 'lt':
    case '<=':
    case 'le':
    case '!=':
    case 'ne':
      return operator;
    default:
      return undefined;
  }
}

function isZeroArgFunctionCall(ast: XPathAst, callee: string): boolean {
  return ast.kind === 'functionCall' && ast.callee === callee && ast.arguments.length === 0;
}

function tryGetPositionModuloDivisor(ast: XPathAst): number | undefined {
  if (ast.kind !== 'binary' || ast.operator !== 'mod') {
    return undefined;
  }

  if (!isZeroArgFunctionCall(ast.left, 'position') || ast.right.kind !== 'number') {
    return undefined;
  }

  const divisor = ast.right.value;
  if (!Number.isInteger(divisor) || divisor <= 0) {
    return undefined;
  }

  return divisor;
}

function createSupportedPositionModuloPlan(
  divisor: number,
  remainder: number,
): Pick<SimpleSelectPathStepPlan, 'positionModuloDivisor' | 'positionModuloRemainder'> | undefined {
  if (!Number.isInteger(remainder) || remainder < 0 || remainder >= divisor) {
    return undefined;
  }

  return {
    positionModuloDivisor: divisor,
    positionModuloRemainder: remainder,
  };
}

function tryGetSupportedPositionLastDivisorComparison(
  predicate: XPathAst,
): SupportedStepPositionPlan | undefined {
  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== '=' && operator !== 'eq' && operator !== '!=' && operator !== 'ne') {
    return undefined;
  }

  if (isZeroArgFunctionCall(predicate.left, 'position')) {
    const value = tryGetLastDivisorPolynomialValue(predicate.right);
    return value === undefined
      ? undefined
      : createSupportedPositionLastDivisorComparison(operator, value);
  }

  if (isZeroArgFunctionCall(predicate.right, 'position')) {
    const value = tryGetLastDivisorPolynomialValue(predicate.left);
    return value === undefined
      ? undefined
      : createSupportedPositionLastDivisorComparison(operator, value);
  }

  return undefined;
}

function tryGetSupportedPositionLastDivisorRangeComparison(
  predicate: XPathAst,
):
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalPolynomials'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalPolynomials'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalPolynomials'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalPolynomials'>
  | undefined {
  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (
    operator === undefined ||
    operator === '=' ||
    operator === 'eq' ||
    operator === '!=' ||
    operator === 'ne'
  ) {
    return undefined;
  }

  if (isZeroArgFunctionCall(predicate.left, 'position')) {
    const value = tryGetLastDivisorPolynomialValue(predicate.right);
    return value === undefined
      ? undefined
      : createSupportedPositionLastDivisorRangeComparison(operator, value);
  }

  if (isZeroArgFunctionCall(predicate.right, 'position')) {
    const value = tryGetLastDivisorPolynomialValue(predicate.left);
    return value === undefined
      ? undefined
      : createSupportedPositionLastDivisorRangeComparison(
          reverseComparisonOperator(operator),
          value,
        );
  }

  return undefined;
}

function createSupportedPositionLastDivisorRangeComparison(
  operator: SupportedPositionComparisonOperator,
  value: SupportedLastDivisorPolynomialValue,
):
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalPolynomials'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalPolynomials'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalPolynomials'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalPolynomials'>
  | undefined {
  const linearOffset = value.constantNumerator / value.denominator;
  const canUseLinearConstraint =
    value.quadraticNumerator === 0 && value.linearNumerator > 0 && Number.isInteger(linearOffset);

  switch (operator) {
    case '<':
    case 'lt':
      return canUseLinearConstraint
        ? value.linearNumerator !== 1
          ? {
              maximumPositionExclusiveTotalFractions: [
                {
                  denominator: value.denominator,
                  numerator: value.linearNumerator,
                  offset: linearOffset,
                },
              ],
            }
          : linearOffset === 0
            ? { maximumPositionExclusiveTotalDivisors: [value.denominator] }
            : {
                maximumPositionExclusiveTotalDivisorOffsets: [
                  { divisor: value.denominator, offset: linearOffset },
                ],
              }
        : { maximumPositionExclusiveTotalPolynomials: [value] };
    case '<=':
    case 'le':
      return canUseLinearConstraint
        ? value.linearNumerator !== 1
          ? {
              maximumPositionInclusiveTotalFractions: [
                {
                  denominator: value.denominator,
                  numerator: value.linearNumerator,
                  offset: linearOffset,
                },
              ],
            }
          : linearOffset === 0
            ? { maximumPositionInclusiveTotalDivisors: [value.denominator] }
            : {
                maximumPositionInclusiveTotalDivisorOffsets: [
                  { divisor: value.denominator, offset: linearOffset },
                ],
              }
        : { maximumPositionInclusiveTotalPolynomials: [value] };
    case '>':
    case 'gt':
      return canUseLinearConstraint
        ? value.linearNumerator !== 1
          ? {
              minimumPositionExclusiveTotalFractions: [
                {
                  denominator: value.denominator,
                  numerator: value.linearNumerator,
                  offset: linearOffset,
                },
              ],
            }
          : linearOffset === 0
            ? { minimumPositionExclusiveTotalDivisors: [value.denominator] }
            : {
                minimumPositionExclusiveTotalDivisorOffsets: [
                  { divisor: value.denominator, offset: linearOffset },
                ],
              }
        : { minimumPositionExclusiveTotalPolynomials: [value] };
    case '>=':
    case 'ge':
      return canUseLinearConstraint
        ? value.linearNumerator !== 1
          ? {
              minimumPositionInclusiveTotalFractions: [
                {
                  denominator: value.denominator,
                  numerator: value.linearNumerator,
                  offset: linearOffset,
                },
              ],
            }
          : linearOffset === 0
            ? { minimumPositionInclusiveTotalDivisors: [value.denominator] }
            : {
                minimumPositionInclusiveTotalDivisorOffsets: [
                  { divisor: value.denominator, offset: linearOffset },
                ],
              }
        : { minimumPositionInclusiveTotalPolynomials: [value] };
    default:
      return undefined;
  }
}

function createSupportedPositionLastDivisorComparison(
  operator: SupportedPositionComparisonOperator,
  value: SupportedLastDivisorPolynomialValue,
): SupportedStepPositionPlan | undefined {
  const linearOffset = value.constantNumerator / value.denominator;
  const canUseLinearConstraint =
    value.quadraticNumerator === 0 && value.linearNumerator > 0 && Number.isInteger(linearOffset);

  if (value.quadraticNumerator === 0 && value.linearNumerator <= 0) {
    return undefined;
  }

  switch (operator) {
    case '=':
    case 'eq':
      return canUseLinearConstraint
        ? {
            positionTotalDivisor: value.denominator,
            ...(value.linearNumerator === 1
              ? {}
              : { positionTotalNumerator: value.linearNumerator }),
            ...(linearOffset === 0 ? {} : { positionTotalOffset: linearOffset }),
          }
        : {
            positionTotalPolynomialDenominator: value.denominator,
            positionTotalPolynomialQuadraticNumerator: value.quadraticNumerator,
            ...(value.linearNumerator === 0
              ? {}
              : { positionTotalPolynomialLinearNumerator: value.linearNumerator }),
            ...(value.constantNumerator === 0
              ? {}
              : { positionTotalPolynomialConstantNumerator: value.constantNumerator }),
          };
    case '!=':
    case 'ne':
      return canUseLinearConstraint
        ? value.linearNumerator !== 1
          ? {
              excludedPositionTotalFractions: [
                {
                  denominator: value.denominator,
                  numerator: value.linearNumerator,
                  offset: linearOffset,
                },
              ],
            }
          : linearOffset === 0
            ? { excludedPositionTotalDivisors: [value.denominator] }
            : {
                excludedPositionTotalDivisorOffsets: [
                  { divisor: value.denominator, offset: linearOffset },
                ],
              }
        : {
            excludedPositionTotalPolynomials: [
              {
                denominator: value.denominator,
                quadraticNumerator: value.quadraticNumerator,
                linearNumerator: value.linearNumerator,
                constantNumerator: value.constantNumerator,
              },
            ],
          };
    default:
      return undefined;
  }
}

function tryGetSupportedNegatedPositionLastDivisorComparison(
  predicate: XPathAst,
): SupportedStepPositionPlan | undefined {
  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== '=' && operator !== 'eq' && operator !== '!=' && operator !== 'ne') {
    return undefined;
  }

  if (isZeroArgFunctionCall(predicate.left, 'position')) {
    const value = tryGetLastDivisorPolynomialValue(predicate.right);
    return value === undefined
      ? undefined
      : createSupportedPositionLastDivisorComparison(negateComparisonOperator(operator), value);
  }

  if (isZeroArgFunctionCall(predicate.right, 'position')) {
    const value = tryGetLastDivisorPolynomialValue(predicate.left);
    return value === undefined
      ? undefined
      : createSupportedPositionLastDivisorComparison(negateComparisonOperator(operator), value);
  }

  return undefined;
}

function tryGetSupportedNegatedPositionLastDivisorRangeComparison(
  predicate: XPathAst,
):
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionExclusiveTotalPolynomials'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'maximumPositionInclusiveTotalPolynomials'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionExclusiveTotalPolynomials'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalDivisors'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalDivisorOffsets'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalFractions'>
  | Pick<SimpleSelectPathStepPlan, 'minimumPositionInclusiveTotalPolynomials'>
  | undefined {
  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (
    operator === undefined ||
    operator === '=' ||
    operator === 'eq' ||
    operator === '!=' ||
    operator === 'ne'
  ) {
    return undefined;
  }

  if (isZeroArgFunctionCall(predicate.left, 'position')) {
    const value = tryGetLastDivisorPolynomialValue(predicate.right);
    return value === undefined
      ? undefined
      : createSupportedPositionLastDivisorRangeComparison(
          negateComparisonOperator(operator),
          value,
        );
  }

  if (isZeroArgFunctionCall(predicate.right, 'position')) {
    const value = tryGetLastDivisorPolynomialValue(predicate.left);
    return value === undefined
      ? undefined
      : createSupportedPositionLastDivisorRangeComparison(
          reverseComparisonOperator(negateComparisonOperator(operator)),
          value,
        );
  }

  return undefined;
}

function tryGetSupportedPositionLastOffsetComparison(
  predicate: XPathAst,
):
  | Pick<SimpleSelectPathStepPlan, 'positionFromLastOffset'>
  | SupportedStepPositionPlan
  | undefined {
  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== '=' && operator !== 'eq' && operator !== '!=' && operator !== 'ne') {
    return undefined;
  }

  if (isZeroArgFunctionCall(predicate.left, 'position')) {
    const lastOffset = tryGetLastOffsetValue(predicate.right);
    return lastOffset === undefined
      ? undefined
      : createSupportedPositionLastOffsetComparison(operator, lastOffset);
  }

  if (isZeroArgFunctionCall(predicate.right, 'position')) {
    const lastOffset = tryGetLastOffsetValue(predicate.left);
    return lastOffset === undefined
      ? undefined
      : createSupportedPositionLastOffsetComparison(operator, lastOffset);
  }

  return undefined;
}

function createSupportedPositionLastOffsetComparison(
  operator: SupportedPositionComparisonOperator,
  lastOffset: number,
): SupportedStepPositionPlan | undefined {
  switch (operator) {
    case '=':
    case 'eq':
      return { positionFromLastOffset: lastOffset };
    case '!=':
    case 'ne':
      return createSupportedNegatedPositionLastOffsetPlan(lastOffset);
  }

  return undefined;
}

function tryGetLastOffsetValue(ast: XPathAst): number | undefined {
  if (isZeroArgFunctionCall(ast, 'last')) {
    return 0;
  }

  if (ast.kind !== 'binary' || ast.operator !== '-') {
    return undefined;
  }

  if (!isZeroArgFunctionCall(ast.left, 'last') || ast.right.kind !== 'number') {
    return undefined;
  }

  const offset = ast.right.value;
  return Number.isInteger(offset) && offset >= 0 ? offset : undefined;
}

function tryGetLastDivisorValue(ast: XPathAst): number | undefined {
  if (ast.kind !== 'binary' || ast.operator !== 'div') {
    return undefined;
  }

  if (!isZeroArgFunctionCall(ast.left, 'last') || ast.right.kind !== 'number') {
    return undefined;
  }

  const divisor = ast.right.value;
  return Number.isInteger(divisor) && divisor > 0 ? divisor : undefined;
}

function tryGetLastDivisorOffsetValue(
  ast: XPathAst,
): { readonly divisor: number; readonly offset: number } | undefined {
  const divisor = tryGetLastDivisorValue(ast);
  if (divisor !== undefined) {
    return { divisor, offset: 0 };
  }

  if (ast.kind !== 'binary' || (ast.operator !== '+' && ast.operator !== '-')) {
    return undefined;
  }

  const leftDivisor = tryGetLastDivisorValue(ast.left);
  if (
    leftDivisor === undefined ||
    ast.right.kind !== 'number' ||
    !Number.isInteger(ast.right.value)
  ) {
    return undefined;
  }

  return {
    divisor: leftDivisor,
    offset: ast.operator === '+' ? ast.right.value : -ast.right.value,
  };
}

function tryGetLastDivisorLinearValue(
  ast: XPathAst,
):
  | { readonly denominator: number; readonly numerator: number; readonly offset: number }
  | undefined {
  if (ast.kind === 'sequence' && ast.items.length === 1) {
    const [item] = ast.items;
    return item === undefined ? undefined : tryGetLastDivisorLinearValue(item);
  }

  if (ast.kind === 'number') {
    return Number.isInteger(ast.value)
      ? { denominator: 1, numerator: 0, offset: ast.value }
      : undefined;
  }

  const divisorOffset = tryGetLastDivisorOffsetValue(ast);
  if (divisorOffset !== undefined) {
    return { denominator: divisorOffset.divisor, numerator: 1, offset: divisorOffset.offset };
  }

  if (ast.kind !== 'binary') {
    return undefined;
  }

  if (ast.operator === '*') {
    if (ast.left.kind === 'number' && Number.isInteger(ast.left.value) && ast.left.value > 0) {
      const rightValue = tryGetLastDivisorLinearValue(ast.right);
      return rightValue === undefined
        ? undefined
        : scaleLastDivisorLinearValue(rightValue, ast.left.value);
    }

    if (ast.right.kind === 'number' && Number.isInteger(ast.right.value) && ast.right.value > 0) {
      const leftValue = tryGetLastDivisorLinearValue(ast.left);
      return leftValue === undefined
        ? undefined
        : scaleLastDivisorLinearValue(leftValue, ast.right.value);
    }

    return undefined;
  }

  if (ast.operator !== '+' && ast.operator !== '-') {
    return undefined;
  }

  const leftValue = tryGetLastDivisorLinearValue(ast.left);
  const rightValue = tryGetLastDivisorLinearValue(ast.right);
  if (leftValue === undefined || rightValue === undefined) {
    return undefined;
  }

  const denominator = getLeastCommonMultiple(leftValue.denominator, rightValue.denominator);
  const signedRightNumerator = ast.operator === '+' ? rightValue.numerator : -rightValue.numerator;
  const signedRightOffset = ast.operator === '+' ? rightValue.offset : -rightValue.offset;
  const numerator =
    leftValue.numerator * (denominator / leftValue.denominator) +
    signedRightNumerator * (denominator / rightValue.denominator);
  const offset = leftValue.offset + signedRightOffset;

  if (numerator === 0) {
    return { denominator: 1, numerator: 0, offset };
  }

  const greatestCommonDivisor = getGreatestCommonDivisor(Math.abs(numerator), denominator);
  return {
    denominator: denominator / greatestCommonDivisor,
    numerator: numerator / greatestCommonDivisor,
    offset,
  };
}

function scaleLastDivisorLinearValue(
  value: { readonly denominator: number; readonly numerator: number; readonly offset: number },
  factor: number,
): { readonly denominator: number; readonly numerator: number; readonly offset: number } {
  if (value.numerator === 0) {
    return {
      denominator: 1,
      numerator: 0,
      offset: value.offset * factor,
    };
  }

  const scaledNumerator = value.numerator * factor;
  const greatestCommonDivisor = getGreatestCommonDivisor(
    Math.abs(scaledNumerator),
    value.denominator,
  );
  return {
    denominator: value.denominator / greatestCommonDivisor,
    numerator: scaledNumerator / greatestCommonDivisor,
    offset: value.offset * factor,
  };
}

function tryGetLastDivisorPolynomialValue(
  ast: XPathAst,
): SupportedLastDivisorPolynomialValue | undefined {
  const linearValue = tryGetLastDivisorLinearValue(ast);
  if (linearValue !== undefined) {
    return {
      denominator: linearValue.denominator,
      quadraticNumerator: 0,
      linearNumerator: linearValue.numerator,
      constantNumerator: linearValue.offset * linearValue.denominator,
    };
  }

  if (ast.kind !== 'binary' || ast.operator !== '*') {
    return undefined;
  }

  const leftValue = tryGetLastDivisorPolynomialValue(ast.left);
  const rightValue = tryGetLastDivisorPolynomialValue(ast.right);
  if (
    leftValue === undefined ||
    rightValue === undefined ||
    leftValue.quadraticNumerator !== 0 ||
    rightValue.quadraticNumerator !== 0
  ) {
    return undefined;
  }

  return normalizeLastDivisorPolynomialValue({
    denominator: leftValue.denominator * rightValue.denominator,
    quadraticNumerator: leftValue.linearNumerator * rightValue.linearNumerator,
    linearNumerator:
      leftValue.linearNumerator * rightValue.constantNumerator +
      rightValue.linearNumerator * leftValue.constantNumerator,
    constantNumerator: leftValue.constantNumerator * rightValue.constantNumerator,
  });
}

function normalizeLastDivisorPolynomialValue(
  value: SupportedLastDivisorPolynomialValue,
): SupportedLastDivisorPolynomialValue {
  if (
    value.quadraticNumerator === 0 &&
    value.linearNumerator === 0 &&
    value.constantNumerator === 0
  ) {
    return {
      denominator: 1,
      quadraticNumerator: 0,
      linearNumerator: 0,
      constantNumerator: 0,
    };
  }

  const coefficients = [
    Math.abs(value.quadraticNumerator),
    Math.abs(value.linearNumerator),
    Math.abs(value.constantNumerator),
    value.denominator,
  ].filter((coefficient) => coefficient !== 0);
  const greatestCommonDivisor = coefficients.reduce((divisor, coefficient) =>
    getGreatestCommonDivisor(divisor, coefficient),
  );

  return greatestCommonDivisor === 1
    ? value
    : {
        denominator: value.denominator / greatestCommonDivisor,
        quadraticNumerator: value.quadraticNumerator / greatestCommonDivisor,
        linearNumerator: value.linearNumerator / greatestCommonDivisor,
        constantNumerator: value.constantNumerator / greatestCommonDivisor,
      };
}

function tryGetSupportedPositionLastRangeComparison(
  predicate: XPathAst,
):
  | Pick<
      SimpleSelectPathStepPlan,
      'maximumPositionFromLastOffset' | 'includedPositionFromLastOffsets'
    >
  | undefined {
  if (predicate.kind !== 'binary') {
    return undefined;
  }

  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator === undefined) {
    return undefined;
  }

  if (isZeroArgFunctionCall(predicate.left, 'position')) {
    return createSupportedPositionLastRangeComparison(operator, predicate.right);
  }

  if (isZeroArgFunctionCall(predicate.right, 'position')) {
    return createSupportedPositionLastRangeComparison(
      reverseComparisonOperator(operator),
      predicate.left,
    );
  }

  return undefined;
}

function createSupportedPositionLastRangeComparison(
  operator: SupportedPositionComparisonOperator,
  ast: XPathAst,
):
  | Pick<
      SimpleSelectPathStepPlan,
      'maximumPositionFromLastOffset' | 'includedPositionFromLastOffsets'
    >
  | undefined {
  const lastOffset = tryGetLastOffsetValue(ast);
  if (lastOffset === undefined) {
    return undefined;
  }

  switch (operator) {
    case '<':
    case 'lt':
      return { maximumPositionFromLastOffset: lastOffset + 1 };
    case '<=':
    case 'le':
      return { maximumPositionFromLastOffset: lastOffset };
    case '>':
    case 'gt':
      return {
        includedPositionFromLastOffsets: Array.from({ length: lastOffset }, (_, index) => index),
      };
    case '>=':
    case 'ge':
      return {
        includedPositionFromLastOffsets: Array.from(
          { length: lastOffset + 1 },
          (_, index) => index,
        ),
      };
    default:
      return undefined;
  }
}
