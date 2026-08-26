import type { Node } from '@xmldom/xmldom';

const simplePathNodesByStepPlanCache = new WeakMap<Node, Map<string, readonly Node[]>>();

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
  const pathKey = JSON.stringify(path);
  const cachedStartNodeEntries = simplePathNodesByStepPlanCache.get(startNode);
  const cachedNodes = cachedStartNodeEntries?.get(pathKey);
  if (cachedNodes !== undefined) {
    return cachedNodes;
  }

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
      const emptyResult: readonly Node[] = [];
      const pathEntries = cachedStartNodeEntries ?? new Map<string, readonly Node[]>();
      if (cachedStartNodeEntries === undefined) {
        simplePathNodesByStepPlanCache.set(startNode, pathEntries);
      }
      pathEntries.set(pathKey, emptyResult);
      return emptyResult;
    }

    currentNodes = nextNodes;
  }

  const resolvedNodes = currentNodes;
  const pathEntries = cachedStartNodeEntries ?? new Map<string, readonly Node[]>();
  if (cachedStartNodeEntries === undefined) {
    simplePathNodesByStepPlanCache.set(startNode, pathEntries);
  }
  pathEntries.set(pathKey, resolvedNodes);
  return resolvedNodes;
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
