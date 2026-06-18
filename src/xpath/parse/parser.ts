/**
 * XPath 3.1 parser.
 *
 * Recursive-descent for path syntax plus precedence-based expression parsing
 * for the MVP+1 surface.
 */

import { XPST0003 } from '../../errors/codes.js';
import { XPathError } from '../../errors/XPathError.js';
import { tokenize, type SourceSpan, type Token, type TokenKind } from '../lex/lexer.js';
import type {
  ArrayConstructor,
  ForExpression,
  FilterExpression,
  FunctionCallExpression,
  IfExpression,
  KindTest,
  LetExpression,
  NameTest,
  NumberLiteral,
  PathSegment,
  PathExpression,
  QuantifiedExpression,
  SequenceExpression,
  StepExpression,
  StringLiteral,
  UnaryExpression,
  VariableReference,
  WildcardTest,
  XPathAst,
  XPathAxis,
  XPathBinaryOperator,
} from './ast.js';

export function parseXPath(expression: string): XPathAst {
  const parser = new Parser(tokenize(expression));
  const ast = parser.parseExpression();
  parser.expect('eof', 'Expected the end of the XPath expression.');
  return ast;
}

class Parser {
  readonly tokens: readonly Token[];
  index = 0;

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
  }

  parseExpression(): XPathAst {
    const first = this.parseExprSingle();
    if (this.match('comma') === undefined) {
      return first;
    }

    const items: XPathAst[] = [first];
    do {
      items.push(this.parseExprSingle());
    } while (this.match('comma') !== undefined);

    return {
      kind: 'sequence',
      items,
      span: mergeSpans(items[0]!.span, items[items.length - 1]!.span),
    };
  }

  private parseExprSingle(): XPathAst {
    if (
      (this.current().kind === 'some' || this.current().kind === 'every') &&
      this.peek().kind === 'dollar'
    ) {
      return this.parseQuantifiedExpression();
    }
    if (this.current().kind === 'for' && this.peek().kind === 'dollar') {
      return this.parseForExpression();
    }
    if (this.current().kind === 'if' && this.peek().kind === 'leftParen') {
      return this.parseIfExpression();
    }
    if (this.current().kind === 'let' && this.peek().kind === 'dollar') {
      return this.parseLetExpression();
    }
    return this.parseOrExpression();
  }

  current(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1]!;
  }

  expect(kind: TokenKind, message: string): Token {
    const token = this.current();
    if (token.kind !== kind) {
      throw createParseError(message, token.span);
    }
    this.index += 1;
    return token;
  }

  match(kind: TokenKind): Token | undefined {
    const token = this.current();
    if (token.kind !== kind) {
      return undefined;
    }
    this.index += 1;
    return token;
  }

  matchAny(kinds: readonly TokenKind[]): Token | undefined {
    const token = this.current();
    if (!kinds.includes(token.kind)) {
      return undefined;
    }
    this.index += 1;
    return token;
  }

  peek(offset = 1): Token {
    return this.tokens[this.index + offset] ?? this.tokens[this.tokens.length - 1]!;
  }

  private parseOrExpression(): XPathAst {
    return this.parseBinaryChain(this.parseAndExpression.bind(this), ['or']);
  }

  private parseAndExpression(): XPathAst {
    return this.parseBinaryChain(this.parseComparisonExpression.bind(this), ['and']);
  }

  private parseComparisonExpression(): XPathAst {
    const comparisonKinds: readonly TokenKind[] = [
      'equals',
      'eq',
      'ge',
      'is',
      'notEquals',
      'gt',
      'le',
      'lessThan',
      'lessThanOrEqual',
      'lt',
      'nodeAfter',
      'nodeBefore',
      'greaterThan',
      'greaterThanOrEqual',
      'ne',
    ];

    const left = this.parseStringConcatExpression();
    const operatorToken = this.matchAny(comparisonKinds);
    if (operatorToken === undefined) {
      return left;
    }

    const right = this.parseStringConcatExpression();
    if (comparisonKinds.includes(this.current().kind)) {
      throw createParseError(
        'Only one comparison operator is allowed per expression unless parenthesized.',
        this.current().span,
      );
    }

    return {
      kind: 'binary',
      operator: tokenKindToBinaryOperator(operatorToken.kind),
      left,
      right,
      span: mergeSpans(left.span, right.span),
    };
  }

  private parseRangeExpression(): XPathAst {
    return this.parseBinaryChain(this.parseAdditiveExpression.bind(this), ['to']);
  }

  private parseStringConcatExpression(): XPathAst {
    return this.parseBinaryChain(this.parseRangeExpression.bind(this), ['concat']);
  }

  private parseAdditiveExpression(): XPathAst {
    return this.parseBinaryChain(this.parseMultiplicativeExpression.bind(this), ['plus', 'minus']);
  }

  private parseMultiplicativeExpression(): XPathAst {
    return this.parseBinaryChain(this.parseUnaryExpression.bind(this), [
      'star',
      'div',
      'idiv',
      'mod',
    ]);
  }

  private parseSimpleMapExpression(): XPathAst {
    return this.parseBinaryChain(this.parseUnionExpression.bind(this), ['bang']);
  }

  private parseUnionExpression(): XPathAst {
    return this.parseBinaryChain(this.parseIntersectExceptExpression.bind(this), ['pipe', 'union']);
  }

  private parseIntersectExceptExpression(): XPathAst {
    return this.parseBinaryChain(this.parsePostfixExpression.bind(this), ['intersect', 'except']);
  }

  private parseBinaryChain(
    parseOperand: () => XPathAst,
    operatorKinds: readonly TokenKind[],
  ): XPathAst {
    let expression = parseOperand();

    while (true) {
      const operatorToken = this.matchAny(operatorKinds);
      if (operatorToken === undefined) {
        return expression;
      }

      const right = parseOperand();
      expression = {
        kind: 'binary',
        operator: tokenKindToBinaryOperator(operatorToken.kind),
        left: expression,
        right,
        span: mergeSpans(expression.span, right.span),
      };
    }
  }

  private parseUnaryExpression(): XPathAst {
    const operatorToken = this.matchAny(['plus', 'minus']);
    if (operatorToken === undefined) {
      return this.parseSimpleMapExpression();
    }

    const operand = this.parseUnaryExpression();
    const expression: UnaryExpression = {
      kind: 'unary',
      operator: operatorToken.kind === 'plus' ? '+' : '-',
      operand,
      span: mergeSpans(operatorToken.span, operand.span),
    };
    return expression;
  }

  private parseIfExpression(): IfExpression {
    const ifToken = this.expect('if', 'Expected if to start the conditional expression.');
    this.expect('leftParen', 'Expected ( after if.');
    const test = this.parseExpression();
    this.expect('rightParen', 'Expected ) after the if test expression.');
    this.expect('then', 'Expected then after the if test expression.');
    const thenBranch = this.parseExprSingle();
    this.expect('else', 'Expected else after the then branch.');
    const elseBranch = this.parseExprSingle();
    return {
      kind: 'if',
      test,
      thenBranch,
      elseBranch,
      span: mergeSpans(ifToken.span, elseBranch.span),
    };
  }

  private parseForExpression(): ForExpression {
    const forToken = this.expect('for', 'Expected for to start the iteration expression.');
    const bindings = this.parseFlowBindings('for');
    this.expect('return', 'Expected return after the for input expression.');
    const returnExpr = this.parseExprSingle();
    return {
      kind: 'for',
      bindings,
      returnExpr,
      span: mergeSpans(forToken.span, returnExpr.span),
    };
  }

  private parseQuantifiedExpression(): QuantifiedExpression {
    const quantifierToken = this.matchAny(['some', 'every']);
    if (quantifierToken === undefined) {
      throw createParseError(
        'Expected some or every to start the quantified expression.',
        this.current().span,
      );
    }

    const bindings = this.parseFlowBindings('quantified');
    this.expect('satisfies', 'Expected satisfies after the quantified input expression.');
    const satisfiesExpr = this.parseExprSingle();
    return {
      kind: 'quantified',
      quantifier: quantifierToken.kind === 'some' ? 'some' : 'every',
      bindings,
      satisfiesExpr,
      span: mergeSpans(quantifierToken.span, satisfiesExpr.span),
    };
  }

  private parseFlowBindings(
    kind: 'for' | 'quantified',
  ): Array<{ name: string; value: XPathAst; span: SourceSpan }> {
    const bindings: Array<{ name: string; value: XPathAst; span: SourceSpan }> = [];

    while (true) {
      this.expect('dollar', `Expected $ to start the ${kind} binding.`);
      const name = this.expect('name', `Expected a variable name in the ${kind} binding.`);
      this.expect('in', `Expected in after the ${kind} variable.`);
      const value = this.parseExprSingle();
      bindings.push({
        name: name.value,
        value,
        span: mergeSpans(name.span, value.span),
      });
      if (this.match('comma') === undefined) {
        break;
      }
    }

    return bindings;
  }

  private parseLetExpression(): LetExpression {
    const letToken = this.expect('let', 'Expected let to start the binding expression.');
    const bindings: Array<{ name: string; value: XPathAst; span: SourceSpan }> = [];

    while (true) {
      this.expect('dollar', 'Expected $ to start a let binding.');
      const name = this.expect('name', 'Expected a variable name in the let binding.');
      this.expect('assign', 'Expected := in the let binding.');
      const value = this.parseExprSingle();
      bindings.push({
        name: name.value,
        value,
        span: mergeSpans(name.span, value.span),
      });
      if (this.match('comma') === undefined) {
        break;
      }
    }

    this.expect('return', 'Expected return after the let bindings.');
    const returnExpr = this.parseExprSingle();
    return {
      kind: 'let',
      bindings,
      returnExpr,
      span: mergeSpans(letToken.span, returnExpr.span),
    };
  }

  private parsePostfixExpression(): XPathAst {
    let expression = isInitialPathExpressionStart(this.current(), this.peek())
      ? this.parsePathExpression()
      : this.parseSimplePrimaryExpression();

    while (true) {
      if (this.current().kind === 'leftBracket') {
        expression = this.parseFilterExpression(expression);
        continue;
      }

      if (this.current().kind === 'slash' || this.current().kind === 'slashSlash') {
        expression = this.parseRelativePathExpression(expression);
        continue;
      }

      return expression;
    }
  }

  private parseSimplePrimaryExpression(): XPathAst {
    const token = this.current();

    switch (token.kind) {
      case 'leftBracket':
        return this.parseArrayConstructor();
      case 'number':
        return this.parseNumberLiteral();
      case 'string':
        return this.parseStringLiteral();
      case 'dollar':
        return this.parseVariableReference();
      case 'for':
      case 'let':
      case 'some':
      case 'every':
      case 'then':
      case 'else':
      case 'if':
        return this.parsePathExpression();
      case 'name':
        if (this.peek().kind === 'leftParen' && !isKindTestName(token.value)) {
          return this.parseFunctionCallExpression();
        }
        return this.parsePathExpression();
      case 'leftParen':
        return this.parseSequenceExpression();
      case 'dot':
        this.index += 1;
        return { kind: 'contextItem', span: token.span };
      default:
        throw createParseError(`Unexpected token ${JSON.stringify(token.value)}.`, token.span);
    }
  }

  private parseNumberLiteral(): NumberLiteral {
    const token = this.expect('number', 'Expected a numeric literal.');
    return {
      kind: 'number',
      lexeme: token.value,
      value: Number(token.value),
      span: token.span,
    };
  }

  private parseStringLiteral(): StringLiteral {
    const token = this.expect('string', 'Expected a string literal.');
    return {
      kind: 'string',
      lexeme: token.value,
      value: unescapeStringLiteral(token.value),
      span: token.span,
    };
  }

  private parseVariableReference(): VariableReference {
    const start = this.expect('dollar', 'Expected a variable sigil.');
    const name = this.expect('name', 'Expected a variable name.');
    return {
      kind: 'variable',
      name: name.value,
      span: mergeSpans(start.span, name.span),
    };
  }

  private parseFunctionCallExpression(): FunctionCallExpression {
    const callee = this.expect('name', 'Expected a function name.');
    this.expect('leftParen', 'Expected ( after the function name.');

    const args: XPathAst[] = [];
    if (this.current().kind !== 'rightParen') {
      while (true) {
        args.push(this.parseExprSingle());
        if (this.match('comma') === undefined) {
          break;
        }
      }
    }

    const rightParen = this.expect('rightParen', 'Expected ) to close the function call.');
    return {
      kind: 'functionCall',
      callee: callee.value,
      arguments: args,
      span: mergeSpans(callee.span, rightParen.span),
    };
  }

  private parseSequenceExpression(): SequenceExpression {
    const leftParen = this.expect('leftParen', 'Expected ( to start the sequence constructor.');
    const items: XPathAst[] = [];

    if (this.current().kind !== 'rightParen') {
      while (true) {
        items.push(this.parseExprSingle());
        if (this.match('comma') === undefined) {
          break;
        }
      }
    }

    const rightParen = this.expect('rightParen', 'Expected ) to close the sequence constructor.');
    return {
      kind: 'sequence',
      items,
      span: mergeSpans(leftParen.span, rightParen.span),
    };
  }

  private parseArrayConstructor(): ArrayConstructor {
    const leftBracket = this.expect('leftBracket', 'Expected [ to start the array constructor.');
    const members: XPathAst[] = [];

    if (this.current().kind !== 'rightBracket') {
      while (true) {
        members.push(this.parseExprSingle());
        if (this.match('comma') === undefined) {
          break;
        }
      }
    }

    const rightBracket = this.expect('rightBracket', 'Expected ] to close the array constructor.');
    return {
      kind: 'array',
      members,
      span: mergeSpans(leftBracket.span, rightBracket.span),
    };
  }

  private parsePathExpression(): PathExpression {
    const startToken = this.current();
    const steps: PathSegment[] = [];
    let absolute = false;

    if (this.match('slashSlash') !== undefined) {
      absolute = true;
      steps.push(createSyntheticDescendantOrSelfStep(startToken.span));
      if (!isPathSegmentStart(this.current(), this.peek())) {
        throw createParseError('Expected a path segment after //.', this.current().span);
      }
      steps.push(this.parsePathSegment());
    } else if (this.match('slash') !== undefined) {
      absolute = true;
      if (isPathSegmentStart(this.current(), this.peek())) {
        steps.push(this.parsePathSegment());
      }
    } else {
      steps.push(this.parsePathSegment());
    }

    while (true) {
      const slashToken = this.match('slashSlash') ?? this.match('slash');
      if (slashToken === undefined) {
        break;
      }

      if (slashToken.kind === 'slashSlash') {
        steps.push(createSyntheticDescendantOrSelfStep(slashToken.span));
      }

      if (!isPathSegmentStart(this.current(), this.peek())) {
        throw createParseError('Expected a path segment after /.', slashToken.span);
      }

      steps.push(this.parsePathSegment());
    }

    const endSpan = steps[steps.length - 1]?.span ?? startToken.span;
    return {
      kind: 'path',
      absolute,
      steps,
      span: mergeSpans(startToken.span, endSpan),
    };
  }

  private parseRelativePathExpression(base: XPathAst): PathExpression {
    const startSpan = base.span;
    const steps: PathSegment[] = [];

    while (true) {
      const slashToken = this.match('slashSlash') ?? this.match('slash');
      if (slashToken === undefined) {
        break;
      }

      if (slashToken.kind === 'slashSlash') {
        steps.push(createSyntheticDescendantOrSelfStep(slashToken.span));
      }

      if (!isPathSegmentStart(this.current(), this.peek())) {
        throw createParseError('Expected a path segment after /.', slashToken.span);
      }

      steps.push(this.parsePathSegment());
    }

    const endSpan = steps[steps.length - 1]?.span ?? base.span;
    return {
      kind: 'path',
      absolute: false,
      base,
      steps,
      span: mergeSpans(startSpan, endSpan),
    };
  }

  private parseFilterExpression(base: XPathAst): FilterExpression {
    const predicates: XPathAst[] = [];
    let span = base.span;

    while (this.match('leftBracket') !== undefined) {
      const predicate = this.parseExpression();
      const rightBracket = this.expect('rightBracket', 'Expected ] to close the predicate.');
      predicates.push(predicate);
      span = mergeSpans(base.span, rightBracket.span);
    }

    return {
      kind: 'filter',
      base,
      predicates,
      span,
    };
  }

  private parseStepExpression(): StepExpression {
    const startToken = this.current();

    if (this.match('dot') !== undefined) {
      return this.finishStep(startToken.span, 'self', {
        kind: 'kindTest',
        name: 'node',
        span: startToken.span,
      });
    }

    if (this.match('dotDot') !== undefined) {
      return this.finishStep(startToken.span, 'parent', {
        kind: 'kindTest',
        name: 'node',
        span: startToken.span,
      });
    }

    let axis: XPathAxis = 'child';
    if (this.match('at') !== undefined) {
      axis = 'attribute';
    } else if (this.current().kind === 'name' && this.peek().kind === 'doubleColon') {
      const axisToken = this.expect('name', 'Expected an axis name.');
      this.expect('doubleColon', 'Expected :: after the axis name.');
      axis = parseAxisName(axisToken);
    }

    const nodeTest = this.parseNodeTest();
    return this.finishStep(startToken.span, axis, nodeTest);
  }

  private finishStep(
    startSpan: SourceSpan,
    axis: XPathAxis,
    nodeTest: KindTest | NameTest | WildcardTest,
  ): StepExpression {
    const predicates: XPathAst[] = [];
    let span = mergeSpans(startSpan, nodeTest.span);

    while (this.match('leftBracket') !== undefined) {
      const predicate = this.parseExpression();
      const rightBracket = this.expect('rightBracket', 'Expected ] to close the predicate.');
      predicates.push(predicate);
      span = mergeSpans(startSpan, rightBracket.span);
    }

    return {
      kind: 'step',
      axis,
      nodeTest,
      predicates,
      span,
    };
  }

  private parseNodeTest(): KindTest | NameTest | WildcardTest {
    const wildcard = this.match('star');
    if (wildcard !== undefined) {
      const colon = this.match('colon');
      if (colon !== undefined) {
        const localName = this.expect('name', 'Expected a local name after *:.');
        return {
          kind: 'wildcardTest',
          localName: localName.value,
          span: mergeSpans(wildcard.span, localName.span),
        };
      }

      return {
        kind: 'wildcardTest',
        span: wildcard.span,
      };
    }

    const token = this.current();
    if (
      token.kind !== 'name' &&
      token.kind !== 'if' &&
      token.kind !== 'for' &&
      token.kind !== 'let' &&
      token.kind !== 'some' &&
      token.kind !== 'every' &&
      token.kind !== 'then' &&
      token.kind !== 'else'
    ) {
      throw createParseError('Expected a node test.', token.span);
    }
    this.index += 1;
    const colon = this.match('colon');
    if (colon !== undefined) {
      this.expect('star', 'Expected * after the node-test prefix and colon.');
      return {
        kind: 'wildcardTest',
        prefix: token.value,
        span: mergeSpans(token.span, colon.span),
      };
    }

    if (this.match('leftParen') === undefined) {
      return {
        kind: 'nameTest',
        name: token.value,
        span: token.span,
      };
    }

    const rightParen = this.expect('rightParen', 'Expected ) to close the node test.');
    if (!isKindTestName(token.value)) {
      throw createParseError(`Unsupported kind test ${JSON.stringify(token.value)}.`, token.span);
    }

    return {
      kind: 'kindTest',
      name: token.value,
      span: mergeSpans(token.span, rightParen.span),
    };
  }

  private parsePathSegment(): PathSegment {
    if (this.current().kind === 'leftParen') {
      return this.parsePostfixExpression();
    }

    if (
      this.current().kind === 'name' &&
      this.peek().kind === 'leftParen' &&
      !isKindTestName(this.current().value)
    ) {
      return this.parseFunctionCallExpression();
    }

    return this.parseStepExpression();
  }
}

function createSyntheticDescendantOrSelfStep(span: SourceSpan): StepExpression {
  return {
    kind: 'step',
    axis: 'descendant-or-self',
    nodeTest: { kind: 'kindTest', name: 'node', span },
    predicates: [],
    span,
  };
}

function parseAxisName(token: Token): XPathAxis {
  if (
    token.value === 'ancestor' ||
    token.value === 'ancestor-or-self' ||
    token.value === 'child' ||
    token.value === 'descendant' ||
    token.value === 'descendant-or-self' ||
    token.value === 'following' ||
    token.value === 'following-sibling' ||
    token.value === 'namespace' ||
    token.value === 'parent' ||
    token.value === 'preceding' ||
    token.value === 'preceding-sibling' ||
    token.value === 'self'
  ) {
    return token.value;
  }
  if (token.value === 'attribute') {
    return 'attribute';
  }

  throw createParseError(`Unsupported axis ${JSON.stringify(token.value)}.`, token.span);
}

function tokenKindToBinaryOperator(kind: TokenKind): XPathBinaryOperator {
  switch (kind) {
    case 'bang':
      return '!';
    case 'concat':
      return '||';
    case 'pipe':
    case 'union':
      return '|';
    case 'except':
      return 'except';
    case 'plus':
      return '+';
    case 'minus':
      return '-';
    case 'star':
      return '*';
    case 'div':
      return 'div';
    case 'idiv':
      return 'idiv';
    case 'intersect':
      return 'intersect';
    case 'mod':
      return 'mod';
    case 'equals':
      return '=';
    case 'eq':
      return 'eq';
    case 'ge':
      return 'ge';
    case 'is':
      return 'is';
    case 'notEquals':
      return '!=';
    case 'gt':
      return 'gt';
    case 'le':
      return 'le';
    case 'lessThan':
      return '<';
    case 'lessThanOrEqual':
      return '<=';
    case 'lt':
      return 'lt';
    case 'nodeAfter':
      return '>>';
    case 'nodeBefore':
      return '<<';
    case 'greaterThan':
      return '>';
    case 'greaterThanOrEqual':
      return '>=';
    case 'ne':
      return 'ne';
    case 'to':
      return 'to';
    case 'and':
      return 'and';
    case 'or':
      return 'or';
    default:
      throw new Error(`Unhandled binary token kind ${kind}.`);
  }
}

function unescapeStringLiteral(lexeme: string): string {
  const quote = lexeme[0] ?? '"';
  const body = lexeme.slice(1, -1);
  return body.split(`${quote}${quote}`).join(quote);
}

function isKindTestName(value: string): value is KindTest['name'] {
  return (
    value === 'comment' ||
    value === 'node' ||
    value === 'processing-instruction' ||
    value === 'text'
  );
}

function isStepStart(token: Token): boolean {
  return (
    token.kind === 'dot' ||
    token.kind === 'dotDot' ||
    token.kind === 'at' ||
    token.kind === 'name' ||
    token.kind === 'star'
  );
}

function isPathSegmentStart(token: Token, next: Token): boolean {
  return (
    token.kind === 'leftParen' ||
    isStepStart(token) ||
    (token.kind === 'name' && next.kind === 'leftParen')
  );
}

function isInitialPathExpressionStart(token: Token, next: Token): boolean {
  if (
    token.kind === 'slash' ||
    token.kind === 'slashSlash' ||
    token.kind === 'at' ||
    token.kind === 'star' ||
    token.kind === 'dotDot'
  ) {
    return true;
  }

  if (token.kind === 'name') {
    return next.kind !== 'leftParen' || token.value === 'node' || token.value === 'text';
  }

  return false;
}

function createParseError(message: string, span: SourceSpan): XPathError {
  return new XPathError(XPST0003, message, {
    source: '<xpath>',
    line: span.line,
    column: span.column,
    offset: span.start,
    endLine: span.endLine,
    endColumn: span.endColumn,
    endOffset: span.end,
  });
}

function mergeSpans(start: SourceSpan, end: SourceSpan): SourceSpan {
  return {
    start: start.start,
    end: end.end,
    line: start.line,
    column: start.column,
    endLine: end.endLine,
    endColumn: end.endColumn,
  };
}
