export interface SimpleSelectPathStepPlan {
  readonly name: string;
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
  readonly alternatives?: readonly SupportedStepPositionPlan[];
}

export type SupportedStepPositionPlan = Pick<
  SimpleSelectPathStepPlan,
  | 'position'
  | 'positionTotalDivisor'
  | 'positionTotalNumerator'
  | 'positionTotalOffset'
  | 'positionTotalPolynomialDenominator'
  | 'positionTotalPolynomialQuadraticNumerator'
  | 'positionTotalPolynomialLinearNumerator'
  | 'positionTotalPolynomialConstantNumerator'
  | 'excludedPositionTotalDivisors'
  | 'excludedPositionTotalDivisorOffsets'
  | 'excludedPositionTotalFractions'
  | 'excludedPositionTotalPolynomials'
  | 'maximumPositionExclusiveTotalDivisors'
  | 'maximumPositionExclusiveTotalDivisorOffsets'
  | 'maximumPositionExclusiveTotalFractions'
  | 'maximumPositionExclusiveTotalPolynomials'
  | 'maximumPositionInclusiveTotalDivisors'
  | 'maximumPositionInclusiveTotalDivisorOffsets'
  | 'maximumPositionInclusiveTotalFractions'
  | 'maximumPositionInclusiveTotalPolynomials'
  | 'minimumPositionExclusiveTotalDivisors'
  | 'minimumPositionExclusiveTotalDivisorOffsets'
  | 'minimumPositionExclusiveTotalFractions'
  | 'minimumPositionExclusiveTotalPolynomials'
  | 'minimumPositionInclusiveTotalDivisors'
  | 'minimumPositionInclusiveTotalDivisorOffsets'
  | 'minimumPositionInclusiveTotalFractions'
  | 'minimumPositionInclusiveTotalPolynomials'
  | 'positionFromLastOffset'
  | 'includedPositions'
  | 'includedPositionFromLastOffsets'
  | 'maximumPositionFromLastOffset'
  | 'minimumPosition'
  | 'maximumPosition'
  | 'excludedPosition'
  | 'excludedPositions'
  | 'positionModuloDivisor'
  | 'positionModuloRemainder'
  | 'alternatives'
>;

export type SupportedLastDivisorPolynomialValue = {
  readonly denominator: number;
  readonly quadraticNumerator: number;
  readonly linearNumerator: number;
  readonly constantNumerator: number;
};

export type SupportedPositionComparisonOperator =
  | '='
  | 'eq'
  | '>'
  | 'gt'
  | '>='
  | 'ge'
  | '<'
  | 'lt'
  | '<='
  | 'le'
  | '!='
  | 'ne';
