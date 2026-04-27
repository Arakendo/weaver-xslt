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
  KindTest,
  NameTest,
  NumberLiteral,
  PathExpression,
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
    return this.parseBinaryChain(this.parseAdditiveExpression.bind(this), [
      'equals',
      'notEquals',
      'lessThan',
      'lessThanOrEqual',
      'greaterThan',
      'greaterThanOrEqual',
    ]);
  }

  private parseAdditiveExpression(): XPathAst {
    return this.parseBinaryChain(this.parseMultiplicativeExpression.bind(this), ['plus', 'minus']);
  }

  private parseMultiplicativeExpression(): XPathAst {
    return this.parseBinaryChain(this.parseUnaryExpression.bind(this), ['star', 'div', 'mod']);
  }

  private parseBinaryChain(parseOperand: () => XPathAst, operatorKinds: readonly TokenKind[]): XPathAst {
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
    const minus = this.match('minus');
    if (minus === undefined) {
      return this.parsePrimaryExpression();
    }

    const operand = this.parseUnaryExpression();
    const expression: UnaryExpression = {
      kind: 'unary',
      operator: '-',
      operand,
      span: mergeSpans(minus.span, operand.span),
    };
    return expression;
  }

  private parsePrimaryExpression(): XPathAst {
    const token = this.current();

    switch (token.kind) {
      case 'number':
        return this.parseNumberLiteral();
      case 'string':
        return this.parseStringLiteral();
      case 'dollar':
        return this.parseVariableReference();
      case 'dot':
        if (this.peek().kind !== 'slash' && this.peek().kind !== 'slashSlash') {
          this.index += 1;
          return { kind: 'contextItem', span: token.span };
        }
        return this.parsePathExpression();
      case 'slash':
      case 'slashSlash':
      case 'at':
      case 'name':
      case 'star':
        return this.parsePathExpression();
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

  private parsePathExpression(): PathExpression {
    const startToken = this.current();
    const steps: StepExpression[] = [];
    let absolute = false;

    if (this.match('slashSlash') !== undefined) {
      absolute = true;
      steps.push(createSyntheticDescendantOrSelfStep(startToken.span));
      if (!isStepStart(this.current())) {
        throw createParseError('Expected a step expression after //.', this.current().span);
      }
      steps.push(this.parseStepExpression());
    } else if (this.match('slash') !== undefined) {
      absolute = true;
      if (isStepStart(this.current())) {
        steps.push(this.parseStepExpression());
      }
    } else {
      steps.push(this.parseStepExpression());
    }

    while (true) {
      const slashToken = this.match('slashSlash') ?? this.match('slash');
      if (slashToken === undefined) {
        break;
      }

      if (slashToken.kind === 'slashSlash') {
        steps.push(createSyntheticDescendantOrSelfStep(slashToken.span));
      }

      if (!isStepStart(this.current())) {
        throw createParseError('Expected a step expression after /.', slashToken.span);
      }

      steps.push(this.parseStepExpression());
    }

    const endSpan = steps[steps.length - 1]?.span ?? startToken.span;
    return {
      kind: 'path',
      absolute,
      steps,
      span: mergeSpans(startToken.span, endSpan),
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
      return {
        kind: 'wildcardTest',
        span: wildcard.span,
      };
    }

    const token = this.expect('name', 'Expected a node test.');
    if (this.match('leftParen') === undefined) {
      return {
        kind: 'nameTest',
        name: token.value,
        span: token.span,
      };
    }

    const rightParen = this.expect('rightParen', 'Expected ) to close the node test.');
    if (token.value !== 'node' && token.value !== 'text') {
      throw createParseError(`Unsupported kind test ${JSON.stringify(token.value)}.`, token.span);
    }

    return {
      kind: 'kindTest',
      name: token.value,
      span: mergeSpans(token.span, rightParen.span),
    };
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
    token.value === 'child' ||
    token.value === 'descendant' ||
    token.value === 'descendant-or-self' ||
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
    case 'plus':
      return '+';
    case 'minus':
      return '-';
    case 'star':
      return '*';
    case 'div':
      return 'div';
    case 'mod':
      return 'mod';
    case 'equals':
      return '=';
    case 'notEquals':
      return '!=';
    case 'lessThan':
      return '<';
    case 'lessThanOrEqual':
      return '<=';
    case 'greaterThan':
      return '>';
    case 'greaterThanOrEqual':
      return '>=';
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

function isStepStart(token: Token): boolean {
  return token.kind === 'dot' || token.kind === 'at' || token.kind === 'name' || token.kind === 'star';
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
