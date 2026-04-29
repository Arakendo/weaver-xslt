import { describe, expect, it } from 'vitest';

import { parseXPath } from '../../src/xpath/parse/parser.js';

describe('XPath parser coverage', () => {
  it('parses every MVP+1 expression kind', () => {
    expect(parseXPath('1')).toMatchObject({ kind: 'number' });
    expect(parseXPath('1.0e0')).toMatchObject({ kind: 'number', value: 1 });
    expect(parseXPath('"tea"')).toMatchObject({ kind: 'string', value: 'tea' });
    expect(parseXPath('.')).toMatchObject({ kind: 'contextItem' });
    expect(parseXPath('$item')).toMatchObject({ kind: 'variable', name: 'item' });
    expect(parseXPath('-1')).toMatchObject({ kind: 'unary', operator: '-' });
    expect(parseXPath('foo/bar[1]')).toMatchObject({ kind: 'path', absolute: false });
  });

  it('parses the initial MVP+2 expression kinds', () => {
    expect(parseXPath('position()')).toMatchObject({
      kind: 'functionCall',
      callee: 'position',
      arguments: [],
    });
    expect(parseXPath('last()')).toMatchObject({
      kind: 'functionCall',
      callee: 'last',
      arguments: [],
    });
    expect(parseXPath('1 eq 2')).toMatchObject({
      kind: 'binary',
      operator: 'eq',
    });
    expect(parseXPath('1 to 3')).toMatchObject({
      kind: 'binary',
      operator: 'to',
    });
    expect(parseXPath('(1, 2, 3)')).toMatchObject({
      kind: 'sequence',
    });
    expect(parseXPath('if (1 eq 1) then 2 else 3')).toMatchObject({
      kind: 'if',
    });
    expect(parseXPath('let $x := 1 return $x')).toMatchObject({
      kind: 'let',
    });
    expect(parseXPath('for $x in (1, 2) return $x')).toMatchObject({
      kind: 'for',
    });
    expect(parseXPath('for $x in (1, 2), $y in (3, 4) return ($x, $y)')).toMatchObject({
      kind: 'for',
    });
    expect(parseXPath('some $x in (1, 2) satisfies $x eq 2')).toMatchObject({
      kind: 'quantified',
    });
    expect(parseXPath('$items/item')).toMatchObject({
      kind: 'path',
      base: { kind: 'variable', name: 'items' },
    });
    expect(parseXPath('/root/item/string(@name)')).toMatchObject({
      kind: 'path',
      steps: [
        { kind: 'step' },
        { kind: 'step' },
        { kind: 'functionCall', callee: 'string' },
      ],
    });
    expect(parseXPath('(1 to 25)[. mod 2 eq 0]')).toMatchObject({
      kind: 'filter',
    });
  });
});