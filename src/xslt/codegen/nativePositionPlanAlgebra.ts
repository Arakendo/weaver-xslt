import type {
  SupportedLastDivisorPolynomialValue,
  SupportedStepPositionPlan,
} from './nativePositionPlan.js';

export function mergeSupportedStepPositionPlans(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): SupportedStepPositionPlan | undefined {
  if (left.alternatives !== undefined || right.alternatives !== undefined) {
    const leftAlternatives = getSupportedStepPositionAlternatives(left);
    const rightAlternatives = getSupportedStepPositionAlternatives(right);
    if (leftAlternatives === undefined || rightAlternatives === undefined) {
      return undefined;
    }

    const mergedAlternatives: SupportedStepPositionPlan[] = [];
    for (const leftAlternative of leftAlternatives) {
      for (const rightAlternative of rightAlternatives) {
        const mergedAlternative = mergeSupportedStepPositionPlans(
          leftAlternative,
          rightAlternative,
        );
        if (mergedAlternative === undefined) {
          return undefined;
        }

        mergedAlternatives.push(mergedAlternative);
      }
    }

    return mergedAlternatives.length === 1
      ? mergedAlternatives[0]
      : { alternatives: mergedAlternatives };
  }

  if (left.includedPositions !== undefined || right.includedPositions !== undefined) {
    return undefined;
  }

  const position = getMergedExactPosition(left, right);
  if (position === undefined && (left.position !== undefined || right.position !== undefined)) {
    return undefined;
  }

  const positionTotalConstraint = getMergedPositionTotalConstraint(left, right);
  if (
    positionTotalConstraint === undefined &&
    (left.positionTotalDivisor !== undefined ||
      right.positionTotalDivisor !== undefined ||
      left.positionTotalPolynomialDenominator !== undefined ||
      right.positionTotalPolynomialDenominator !== undefined)
  ) {
    return undefined;
  }

  const positionFromLastOffset = getMergedPositionFromLastOffset(left, right);
  if (
    positionFromLastOffset === undefined &&
    (left.positionFromLastOffset !== undefined || right.positionFromLastOffset !== undefined)
  ) {
    return undefined;
  }

  const excludedPositions = getMergedExcludedPositions(left, right);
  const excludedPositionTotalDivisors = getMergedExcludedPositionTotalDivisors(left, right);
  const excludedPositionTotalDivisorOffsets = getMergedExcludedPositionTotalDivisorOffsets(
    left,
    right,
  );
  const excludedPositionTotalFractions = getMergedExcludedPositionTotalFractions(left, right);
  const excludedPositionTotalPolynomials = getMergedExcludedPositionTotalPolynomials(left, right);
  const maximumPositionExclusiveTotalDivisors = getMergedDivisorConstraintValues(
    left,
    right,
    'maximumPositionExclusiveTotalDivisors',
  );
  const maximumPositionExclusiveTotalDivisorOffsets = getMergedDivisorOffsetConstraintValues(
    left,
    right,
    'maximumPositionExclusiveTotalDivisorOffsets',
  );
  const maximumPositionExclusiveTotalFractions = getMergedFractionConstraintValues(
    left,
    right,
    'maximumPositionExclusiveTotalFractions',
  );
  const maximumPositionExclusiveTotalPolynomials = getMergedPolynomialConstraintValues(
    left,
    right,
    'maximumPositionExclusiveTotalPolynomials',
  );
  const maximumPositionInclusiveTotalDivisors = getMergedDivisorConstraintValues(
    left,
    right,
    'maximumPositionInclusiveTotalDivisors',
  );
  const maximumPositionInclusiveTotalDivisorOffsets = getMergedDivisorOffsetConstraintValues(
    left,
    right,
    'maximumPositionInclusiveTotalDivisorOffsets',
  );
  const maximumPositionInclusiveTotalFractions = getMergedFractionConstraintValues(
    left,
    right,
    'maximumPositionInclusiveTotalFractions',
  );
  const maximumPositionInclusiveTotalPolynomials = getMergedPolynomialConstraintValues(
    left,
    right,
    'maximumPositionInclusiveTotalPolynomials',
  );
  const minimumPositionExclusiveTotalDivisors = getMergedDivisorConstraintValues(
    left,
    right,
    'minimumPositionExclusiveTotalDivisors',
  );
  const minimumPositionExclusiveTotalDivisorOffsets = getMergedDivisorOffsetConstraintValues(
    left,
    right,
    'minimumPositionExclusiveTotalDivisorOffsets',
  );
  const minimumPositionExclusiveTotalFractions = getMergedFractionConstraintValues(
    left,
    right,
    'minimumPositionExclusiveTotalFractions',
  );
  const minimumPositionExclusiveTotalPolynomials = getMergedPolynomialConstraintValues(
    left,
    right,
    'minimumPositionExclusiveTotalPolynomials',
  );
  const minimumPositionInclusiveTotalDivisors = getMergedDivisorConstraintValues(
    left,
    right,
    'minimumPositionInclusiveTotalDivisors',
  );
  const minimumPositionInclusiveTotalDivisorOffsets = getMergedDivisorOffsetConstraintValues(
    left,
    right,
    'minimumPositionInclusiveTotalDivisorOffsets',
  );
  const minimumPositionInclusiveTotalFractions = getMergedFractionConstraintValues(
    left,
    right,
    'minimumPositionInclusiveTotalFractions',
  );
  const minimumPositionInclusiveTotalPolynomials = getMergedPolynomialConstraintValues(
    left,
    right,
    'minimumPositionInclusiveTotalPolynomials',
  );
  const excludedPosition = excludedPositions.length === 1 ? excludedPositions[0]! : undefined;
  const includedPositionFromLastOffsets = getMergedIncludedPositionFromLastOffsets(left, right);

  const sharedConstraints: SupportedStepPositionPlan = {
    ...(position === undefined ? {} : { position }),
    ...(positionTotalConstraint === undefined
      ? {}
      : positionTotalConstraint.quadraticNumerator === 0 &&
          positionTotalConstraint.linearNumerator > 0 &&
          positionTotalConstraint.constantNumerator % positionTotalConstraint.denominator === 0
        ? {
            positionTotalDivisor: positionTotalConstraint.denominator,
            ...(positionTotalConstraint.linearNumerator === 1
              ? {}
              : { positionTotalNumerator: positionTotalConstraint.linearNumerator }),
            ...(positionTotalConstraint.constantNumerator / positionTotalConstraint.denominator ===
            0
              ? {}
              : {
                  positionTotalOffset:
                    positionTotalConstraint.constantNumerator / positionTotalConstraint.denominator,
                }),
          }
        : {
            positionTotalPolynomialDenominator: positionTotalConstraint.denominator,
            positionTotalPolynomialQuadraticNumerator: positionTotalConstraint.quadraticNumerator,
            ...(positionTotalConstraint.linearNumerator === 0
              ? {}
              : {
                  positionTotalPolynomialLinearNumerator: positionTotalConstraint.linearNumerator,
                }),
            ...(positionTotalConstraint.constantNumerator === 0
              ? {}
              : {
                  positionTotalPolynomialConstantNumerator:
                    positionTotalConstraint.constantNumerator,
                }),
          }),
    ...(positionFromLastOffset === undefined ? {} : { positionFromLastOffset }),
    ...(left.minimumPosition === undefined && right.minimumPosition === undefined
      ? {}
      : { minimumPosition: Math.max(left.minimumPosition ?? 1, right.minimumPosition ?? 1) }),
    ...(left.maximumPosition === undefined && right.maximumPosition === undefined
      ? {}
      : {
          maximumPosition: Math.min(
            left.maximumPosition ?? Number.POSITIVE_INFINITY,
            right.maximumPosition ?? Number.POSITIVE_INFINITY,
          ),
        }),
    ...(left.maximumPositionFromLastOffset === undefined &&
    right.maximumPositionFromLastOffset === undefined
      ? {}
      : {
          maximumPositionFromLastOffset: Math.max(
            left.maximumPositionFromLastOffset ?? 0,
            right.maximumPositionFromLastOffset ?? 0,
          ),
        }),
    ...(excludedPositions.length === 0
      ? {}
      : excludedPosition !== undefined
        ? { excludedPosition }
        : { excludedPositions }),
    ...(excludedPositionTotalDivisors.length === 0 ? {} : { excludedPositionTotalDivisors }),
    ...(excludedPositionTotalDivisorOffsets.length === 0
      ? {}
      : { excludedPositionTotalDivisorOffsets }),
    ...(excludedPositionTotalFractions.length === 0 ? {} : { excludedPositionTotalFractions }),
    ...(excludedPositionTotalPolynomials.length === 0 ? {} : { excludedPositionTotalPolynomials }),
    ...(maximumPositionExclusiveTotalDivisors.length === 0
      ? {}
      : { maximumPositionExclusiveTotalDivisors }),
    ...(maximumPositionExclusiveTotalDivisorOffsets.length === 0
      ? {}
      : { maximumPositionExclusiveTotalDivisorOffsets }),
    ...(maximumPositionExclusiveTotalFractions.length === 0
      ? {}
      : { maximumPositionExclusiveTotalFractions }),
    ...(maximumPositionExclusiveTotalPolynomials.length === 0
      ? {}
      : { maximumPositionExclusiveTotalPolynomials }),
    ...(maximumPositionInclusiveTotalDivisors.length === 0
      ? {}
      : { maximumPositionInclusiveTotalDivisors }),
    ...(maximumPositionInclusiveTotalDivisorOffsets.length === 0
      ? {}
      : { maximumPositionInclusiveTotalDivisorOffsets }),
    ...(maximumPositionInclusiveTotalFractions.length === 0
      ? {}
      : { maximumPositionInclusiveTotalFractions }),
    ...(maximumPositionInclusiveTotalPolynomials.length === 0
      ? {}
      : { maximumPositionInclusiveTotalPolynomials }),
    ...(minimumPositionExclusiveTotalDivisors.length === 0
      ? {}
      : { minimumPositionExclusiveTotalDivisors }),
    ...(minimumPositionExclusiveTotalDivisorOffsets.length === 0
      ? {}
      : { minimumPositionExclusiveTotalDivisorOffsets }),
    ...(minimumPositionExclusiveTotalFractions.length === 0
      ? {}
      : { minimumPositionExclusiveTotalFractions }),
    ...(minimumPositionExclusiveTotalPolynomials.length === 0
      ? {}
      : { minimumPositionExclusiveTotalPolynomials }),
    ...(minimumPositionInclusiveTotalDivisors.length === 0
      ? {}
      : { minimumPositionInclusiveTotalDivisors }),
    ...(minimumPositionInclusiveTotalDivisorOffsets.length === 0
      ? {}
      : { minimumPositionInclusiveTotalDivisorOffsets }),
    ...(minimumPositionInclusiveTotalFractions.length === 0
      ? {}
      : { minimumPositionInclusiveTotalFractions }),
    ...(minimumPositionInclusiveTotalPolynomials.length === 0
      ? {}
      : { minimumPositionInclusiveTotalPolynomials }),
    ...(includedPositionFromLastOffsets === undefined ? {} : { includedPositionFromLastOffsets }),
  };

  const mergedModuloPlan = mergeSupportedStepPositionModuloPlans(left, right);
  if (mergedModuloPlan === undefined) {
    return undefined;
  }

  if (mergedModuloPlan.alternatives === undefined) {
    return {
      ...sharedConstraints,
      ...mergedModuloPlan,
    };
  }

  return {
    alternatives: mergedModuloPlan.alternatives.map((alternative) => ({
      ...sharedConstraints,
      ...alternative,
    })),
  };
}

function mergeSupportedStepPositionModuloPlans(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): SupportedStepPositionPlan | undefined {
  const leftHasModulo =
    left.positionModuloDivisor !== undefined || left.positionModuloRemainder !== undefined;
  const rightHasModulo =
    right.positionModuloDivisor !== undefined || right.positionModuloRemainder !== undefined;

  if (!leftHasModulo && !rightHasModulo) {
    return {};
  }

  if (!leftHasModulo) {
    return {
      ...(right.positionModuloDivisor === undefined
        ? {}
        : { positionModuloDivisor: right.positionModuloDivisor }),
      ...(right.positionModuloRemainder === undefined
        ? {}
        : { positionModuloRemainder: right.positionModuloRemainder }),
    };
  }

  if (!rightHasModulo) {
    return {
      ...(left.positionModuloDivisor === undefined
        ? {}
        : { positionModuloDivisor: left.positionModuloDivisor }),
      ...(left.positionModuloRemainder === undefined
        ? {}
        : { positionModuloRemainder: left.positionModuloRemainder }),
    };
  }

  if (
    left.positionModuloDivisor === undefined ||
    left.positionModuloRemainder === undefined ||
    right.positionModuloDivisor === undefined ||
    right.positionModuloRemainder === undefined
  ) {
    return undefined;
  }

  const moduloDivisor = getLeastCommonMultiple(
    left.positionModuloDivisor,
    right.positionModuloDivisor,
  );
  const alternatives: SupportedStepPositionPlan[] = [];

  for (let remainder = 0; remainder < moduloDivisor; remainder += 1) {
    if (
      remainder % left.positionModuloDivisor === left.positionModuloRemainder &&
      remainder % right.positionModuloDivisor === right.positionModuloRemainder
    ) {
      alternatives.push({
        positionModuloDivisor: moduloDivisor,
        positionModuloRemainder: remainder,
      });
    }
  }

  if (alternatives.length === 0) {
    return { maximumPosition: 0 };
  }

  return alternatives.length === 1 ? alternatives[0] : { alternatives };
}

export function getLeastCommonMultiple(left: number, right: number): number {
  return (left / getGreatestCommonDivisor(left, right)) * right;
}

export function getGreatestCommonDivisor(left: number, right: number): number {
  let dividend = left;
  let divisor = right;

  while (divisor !== 0) {
    const remainder = dividend % divisor;
    dividend = divisor;
    divisor = remainder;
  }

  return dividend;
}

export function unionSupportedStepPositionPlans(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): SupportedStepPositionPlan | undefined {
  const leftAlternatives = getSupportedStepPositionAlternatives(left);
  const rightAlternatives = getSupportedStepPositionAlternatives(right);
  if (leftAlternatives === undefined || rightAlternatives === undefined) {
    return undefined;
  }

  return {
    alternatives: [...leftAlternatives, ...rightAlternatives],
  };
}

function getSupportedStepPositionAlternatives(
  plan: SupportedStepPositionPlan,
): readonly SupportedStepPositionPlan[] | undefined {
  return plan.alternatives ?? [plan];
}

function getMergedExcludedPositions(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): number[] {
  return [
    ...new Set([
      ...(left.excludedPosition === undefined ? [] : [left.excludedPosition]),
      ...(left.excludedPositions ?? []),
      ...(right.excludedPosition === undefined ? [] : [right.excludedPosition]),
      ...(right.excludedPositions ?? []),
    ]),
  ].sort((first, second) => first - second);
}

function getMergedIncludedPositionFromLastOffsets(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): readonly number[] | undefined {
  if (left.includedPositionFromLastOffsets === undefined) {
    return right.includedPositionFromLastOffsets;
  }

  if (right.includedPositionFromLastOffsets === undefined) {
    return left.includedPositionFromLastOffsets;
  }

  return left.includedPositionFromLastOffsets.filter((offset) =>
    right.includedPositionFromLastOffsets?.includes(offset),
  );
}

function getMergedExcludedPositionTotalDivisors(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): number[] {
  return [
    ...new Set([
      ...(left.excludedPositionTotalDivisors ?? []),
      ...(right.excludedPositionTotalDivisors ?? []),
    ]),
  ].sort((first, second) => first - second);
}

function getMergedExcludedPositionTotalDivisorOffsets(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): { readonly divisor: number; readonly offset: number }[] {
  return [
    ...new Map(
      [
        ...(left.excludedPositionTotalDivisorOffsets ?? []),
        ...(right.excludedPositionTotalDivisorOffsets ?? []),
      ].map((value) => [`${value.divisor}:${value.offset}`, value] as const),
    ).values(),
  ].sort((first, second) => first.divisor - second.divisor || first.offset - second.offset);
}

function getMergedExcludedPositionTotalFractions(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): { readonly denominator: number; readonly numerator: number; readonly offset: number }[] {
  return [
    ...new Map(
      [
        ...(left.excludedPositionTotalFractions ?? []),
        ...(right.excludedPositionTotalFractions ?? []),
      ].map((value) => [`${value.denominator}:${value.numerator}:${value.offset}`, value] as const),
    ).values(),
  ].sort(
    (first, second) =>
      first.denominator - second.denominator ||
      first.numerator - second.numerator ||
      first.offset - second.offset,
  );
}

function getMergedExcludedPositionTotalPolynomials(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): {
  readonly denominator: number;
  readonly quadraticNumerator: number;
  readonly linearNumerator: number;
  readonly constantNumerator: number;
}[] {
  return [
    ...new Map(
      [
        ...(left.excludedPositionTotalPolynomials ?? []),
        ...(right.excludedPositionTotalPolynomials ?? []),
      ].map(
        (value) =>
          [
            `${value.denominator}:${value.quadraticNumerator}:${value.linearNumerator}:${value.constantNumerator}`,
            value,
          ] as const,
      ),
    ).values(),
  ].sort(
    (first, second) =>
      first.denominator - second.denominator ||
      first.quadraticNumerator - second.quadraticNumerator ||
      first.linearNumerator - second.linearNumerator ||
      first.constantNumerator - second.constantNumerator,
  );
}

function getMergedDivisorConstraintValues(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
  key:
    | 'maximumPositionExclusiveTotalDivisors'
    | 'maximumPositionInclusiveTotalDivisors'
    | 'minimumPositionExclusiveTotalDivisors'
    | 'minimumPositionInclusiveTotalDivisors',
): number[] {
  return [...new Set([...(left[key] ?? []), ...(right[key] ?? [])])].sort(
    (first, second) => first - second,
  );
}

function getMergedDivisorOffsetConstraintValues(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
  key:
    | 'maximumPositionExclusiveTotalDivisorOffsets'
    | 'maximumPositionInclusiveTotalDivisorOffsets'
    | 'minimumPositionExclusiveTotalDivisorOffsets'
    | 'minimumPositionInclusiveTotalDivisorOffsets',
): { readonly divisor: number; readonly offset: number }[] {
  return [
    ...new Map(
      [...(left[key] ?? []), ...(right[key] ?? [])].map(
        (value) => [`${value.divisor}:${value.offset}`, value] as const,
      ),
    ).values(),
  ].sort((first, second) => first.divisor - second.divisor || first.offset - second.offset);
}

function getMergedFractionConstraintValues(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
  key:
    | 'maximumPositionExclusiveTotalFractions'
    | 'maximumPositionInclusiveTotalFractions'
    | 'minimumPositionExclusiveTotalFractions'
    | 'minimumPositionInclusiveTotalFractions',
): { readonly denominator: number; readonly numerator: number; readonly offset: number }[] {
  return [
    ...new Map(
      [...(left[key] ?? []), ...(right[key] ?? [])].map(
        (value) => [`${value.denominator}:${value.numerator}:${value.offset}`, value] as const,
      ),
    ).values(),
  ].sort(
    (first, second) =>
      first.denominator - second.denominator ||
      first.numerator - second.numerator ||
      first.offset - second.offset,
  );
}

function getMergedPolynomialConstraintValues(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
  key:
    | 'maximumPositionExclusiveTotalPolynomials'
    | 'maximumPositionInclusiveTotalPolynomials'
    | 'minimumPositionExclusiveTotalPolynomials'
    | 'minimumPositionInclusiveTotalPolynomials',
): {
  readonly denominator: number;
  readonly quadraticNumerator: number;
  readonly linearNumerator: number;
  readonly constantNumerator: number;
}[] {
  return [
    ...new Map(
      [...(left[key] ?? []), ...(right[key] ?? [])].map(
        (value) =>
          [
            `${value.denominator}:${value.quadraticNumerator}:${value.linearNumerator}:${value.constantNumerator}`,
            value,
          ] as const,
      ),
    ).values(),
  ].sort(
    (first, second) =>
      first.denominator - second.denominator ||
      first.quadraticNumerator - second.quadraticNumerator ||
      first.linearNumerator - second.linearNumerator ||
      first.constantNumerator - second.constantNumerator,
  );
}

function getMergedExactPosition(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): number | 'last' | undefined {
  if (left.position === undefined) {
    return right.position;
  }

  if (right.position === undefined) {
    return left.position;
  }

  return left.position === right.position ? left.position : undefined;
}

function getMergedPositionFromLastOffset(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): number | undefined {
  if (left.positionFromLastOffset === undefined) {
    return right.positionFromLastOffset;
  }

  if (right.positionFromLastOffset === undefined) {
    return left.positionFromLastOffset;
  }

  return left.positionFromLastOffset === right.positionFromLastOffset
    ? left.positionFromLastOffset
    : undefined;
}

function getPositionTotalConstraint(
  plan: SupportedStepPositionPlan,
): SupportedLastDivisorPolynomialValue | undefined {
  if (plan.positionTotalPolynomialDenominator !== undefined) {
    return {
      denominator: plan.positionTotalPolynomialDenominator,
      quadraticNumerator: plan.positionTotalPolynomialQuadraticNumerator ?? 0,
      linearNumerator: plan.positionTotalPolynomialLinearNumerator ?? 0,
      constantNumerator: plan.positionTotalPolynomialConstantNumerator ?? 0,
    };
  }

  if (plan.positionTotalDivisor === undefined) {
    return undefined;
  }

  return {
    denominator: plan.positionTotalDivisor,
    quadraticNumerator: 0,
    linearNumerator: plan.positionTotalNumerator ?? 1,
    constantNumerator: (plan.positionTotalOffset ?? 0) * plan.positionTotalDivisor,
  };
}

function getMergedPositionTotalConstraint(
  left: SupportedStepPositionPlan,
  right: SupportedStepPositionPlan,
): SupportedLastDivisorPolynomialValue | undefined {
  const leftConstraint = getPositionTotalConstraint(left);
  if (leftConstraint === undefined) {
    return getPositionTotalConstraint(right);
  }

  const rightConstraint = getPositionTotalConstraint(right);
  if (rightConstraint === undefined) {
    return leftConstraint;
  }

  return leftConstraint.denominator === rightConstraint.denominator &&
    leftConstraint.quadraticNumerator === rightConstraint.quadraticNumerator &&
    leftConstraint.linearNumerator === rightConstraint.linearNumerator &&
    leftConstraint.constantNumerator === rightConstraint.constantNumerator
    ? leftConstraint
    : undefined;
}
