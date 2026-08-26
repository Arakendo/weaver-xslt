import { describe, expect, it } from 'vitest';

import { tryGetSupportedStepPositionPredicate } from '../../src/xslt/codegen/nativePositionPredicate.js';
import { parseXPath } from '../../src/xpath/parse/parser.js';

describe('native positional predicate planning', () => {
  it.each([
    ['3', { position: 3 }],
    ['last()', { position: 'last' }],
    ['position() = 1', { position: 1 }],
    ['position() mod 2 = 0', { positionModuloDivisor: 2, positionModuloRemainder: 0 }],
  ])('plans %s', (expression, expected) => {
    expect(tryGetSupportedStepPositionPredicate(parseXPath(expression))).toEqual(expected);
  });

  it('merges conjunction constraints without renderer state', () => {
    expect(
      tryGetSupportedStepPositionPredicate(parseXPath('position() > 1 and position() < last()')),
    ).toEqual({
      maximumPositionFromLastOffset: 1,
      minimumPositionExclusiveTotalPolynomials: [
        {
          denominator: 1,
          quadraticNumerator: 0,
          linearNumerator: 0,
          constantNumerator: 1,
        },
      ],
    });
  });

  it('retains alternatives for disjunction constraints', () => {
    expect(
      tryGetSupportedStepPositionPredicate(parseXPath('position() = 1 or position() = last()')),
    ).toEqual({
      alternatives: [{ position: 1 }, { positionFromLastOffset: 0 }],
    });
  });

  it('returns undefined outside the supported positional subset', () => {
    expect(tryGetSupportedStepPositionPredicate(parseXPath("name() = 'item'"))).toBeUndefined();
  });
});
