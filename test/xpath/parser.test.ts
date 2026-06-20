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
    expect(parseXPath('+.65535032')).toMatchObject({ kind: 'unary', operator: '+' });
    expect(parseXPath('foo/bar[1]')).toMatchObject({ kind: 'path', absolute: false });
    expect(parseXPath('./@to')).toMatchObject({
      kind: 'path',
      base: { kind: 'contextItem' },
      steps: [{ kind: 'step', axis: 'attribute', nodeTest: { kind: 'nameTest', name: 'to' } }],
    });
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
    expect(parseXPath('"a" || "b"')).toMatchObject({
      kind: 'binary',
      operator: '||',
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
    expect(parseXPath("let $d := codepoints-to-string(13) return ($d||$d||'a')")).toMatchObject({
      kind: 'let',
      returnExpr: {
        kind: 'sequence',
        items: [
          {
            kind: 'binary',
            operator: '||',
          },
        ],
      },
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
      steps: [{ kind: 'step' }, { kind: 'step' }, { kind: 'functionCall', callee: 'string' }],
    });
    expect(parseXPath('(1 to 25)[. mod 2 eq 0]')).toMatchObject({
      kind: 'filter',
    });
    expect(parseXPath('1!data()')).toMatchObject({
      kind: 'binary',
      operator: '!',
      left: { kind: 'number' },
      right: { kind: 'functionCall', callee: 'data', arguments: [] },
    });
    expect(parseXPath('employee/(status|overtime)/day')).toMatchObject({
      kind: 'path',
      steps: [
        { kind: 'step', nodeTest: { kind: 'nameTest', name: 'employee' } },
        {
          kind: 'path',
          base: {
            kind: 'sequence',
            items: [{ kind: 'binary', operator: '|' }],
          },
          steps: [{ kind: 'step', nodeTest: { kind: 'nameTest', name: 'day' } }],
        },
      ],
    });
    expect(parseXPath('employee/(status union overtime)/day')).toMatchObject({
      kind: 'path',
      steps: [
        { kind: 'step', nodeTest: { kind: 'nameTest', name: 'employee' } },
        {
          kind: 'path',
          base: {
            kind: 'sequence',
            items: [{ kind: 'binary', operator: '|' }],
          },
          steps: [{ kind: 'step', nodeTest: { kind: 'nameTest', name: 'day' } }],
        },
      ],
    });
    expect(parseXPath('(/root/a intersect /root/a)/@id')).toMatchObject({
      kind: 'path',
      base: {
        kind: 'sequence',
        items: [{ kind: 'binary', operator: 'intersect' }],
      },
    });
    expect(parseXPath('count((/root/a except /root/a))')).toMatchObject({
      kind: 'functionCall',
      callee: 'count',
      arguments: [{ kind: 'sequence', items: [{ kind: 'binary', operator: 'except' }] }],
    });
    expect(parseXPath('[3, 4, 5]')).toMatchObject({
      kind: 'array',
      members: [{ kind: 'number' }, { kind: 'number' }, { kind: 'number' }],
    });
    expect(parseXPath('//*:Open')).toMatchObject({
      kind: 'path',
      steps: [
        { kind: 'step' },
        { kind: 'step', nodeTest: { kind: 'wildcardTest', localName: 'Open' } },
      ],
    });
    expect(parseXPath('//namespace::*')).toMatchObject({
      kind: 'path',
      steps: [
        { kind: 'step' },
        { kind: 'step', axis: 'namespace', nodeTest: { kind: 'wildcardTest' } },
      ],
    });
    expect(parseXPath('//processing-instruction()')).toMatchObject({
      kind: 'path',
      steps: [
        { kind: 'step' },
        { kind: 'step', nodeTest: { kind: 'kindTest', name: 'processing-instruction' } },
      ],
    });
    expect(parseXPath('//comment()')).toMatchObject({
      kind: 'path',
      steps: [{ kind: 'step' }, { kind: 'step', nodeTest: { kind: 'kindTest', name: 'comment' } }],
    });
    expect(parseXPath('//@xml:*')).toMatchObject({
      kind: 'path',
      steps: [
        { kind: 'step' },
        { kind: 'step', axis: 'attribute', nodeTest: { kind: 'wildcardTest', prefix: 'xml' } },
      ],
    });
  });

  it('rejects chained comparison expressions without parentheses', () => {
    expect(() => parseXPath('2 < 3 < 4')).toThrowError(
      expect.objectContaining({ code: 'XPST0003' }),
    );
    expect(() => parseXPath('true() = true() = true() = true()')).toThrowError(
      expect.objectContaining({ code: 'XPST0003' }),
    );
  });
});
