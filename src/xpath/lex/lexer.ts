/**
 * XPath 3.1 lexer.
 *
 * Hand-written tokenizer for the MVP+1 slice. Every token carries a full
 * source span so parser and diagnostics work can build on it directly.
 */

import { XPST0003 } from '../../errors/codes.js';
import { XPathError } from '../../errors/XPathError.js';

export type TokenKind =
  | 'eof'
  | 'name'
  | 'number'
  | 'string'
  | 'slash'
  | 'slashSlash'
  | 'leftParen'
  | 'rightParen'
  | 'leftBracket'
  | 'rightBracket'
  | 'dot'
  | 'dotDot'
  | 'comma'
  | 'at'
  | 'dollar'
  | 'plus'
  | 'minus'
  | 'star'
  | 'equals'
  | 'notEquals'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'doubleColon'
  | 'assign'
  | 'pipe'
  | 'and'
  | 'eq'
  | 'else'
  | 'every'
  | 'for'
  | 'ge'
  | 'gt'
  | 'if'
  | 'in'
  | 'is'
  | 'let'
  | 'le'
  | 'lt'
  | 'ne'
  | 'nodeAfter'
  | 'nodeBefore'
  | 'or'
  | 'return'
  | 'satisfies'
  | 'some'
  | 'then'
  | 'to'
  | 'div'
  | 'idiv'
  | 'mod';

export interface SourceSpan {
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  readonly span: SourceSpan;
}

const KEYWORD_KINDS = {
  and: 'and',
  div: 'div',
  eq: 'eq',
  else: 'else',
  every: 'every',
  for: 'for',
  ge: 'ge',
  gt: 'gt',
  if: 'if',
  idiv: 'idiv',
  in: 'in',
  is: 'is',
  let: 'let',
  le: 'le',
  lt: 'lt',
  mod: 'mod',
  ne: 'ne',
  or: 'or',
  return: 'return',
  satisfies: 'satisfies',
  some: 'some',
  then: 'then',
  to: 'to',
} as const satisfies Record<string, TokenKind>;

export function tokenize(expression: string): readonly Token[] {
  const state: LexerState = {
    expression,
    index: 0,
    line: 1,
    column: 1,
  };
  const tokens: Token[] = [];

  while (!isAtEnd(state)) {
    skipWhitespace(state);
    if (isAtEnd(state)) {
      break;
    }

    const start = capturePosition(state);
    const current = peekChar(state);

    if (current === undefined) {
      break;
    }

    if (isDigit(current) || (current === '.' && isDigit(peekChar(state, 1)))) {
      readNumber(state);
      tokens.push(makeToken(state, start, 'number'));
      continue;
    }

    if (current === '"' || current === "'") {
      readString(state, current);
      tokens.push(makeToken(state, start, 'string'));
      continue;
    }

    if (isNameStart(current)) {
      const name = readName(state);
      const kind =
        Object.prototype.hasOwnProperty.call(KEYWORD_KINDS, name)
          ? KEYWORD_KINDS[name as keyof typeof KEYWORD_KINDS]
          : 'name';
      tokens.push(makeToken(state, start, kind));
      continue;
    }

    switch (current) {
      case '/': {
        advanceChar(state);
        if (peekChar(state) === '/') {
          advanceChar(state);
          tokens.push(makeToken(state, start, 'slashSlash'));
        } else {
          tokens.push(makeToken(state, start, 'slash'));
        }
        break;
      }
      case '(': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'leftParen'));
        break;
      }
      case ')': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'rightParen'));
        break;
      }
      case '[': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'leftBracket'));
        break;
      }
      case ']': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'rightBracket'));
        break;
      }
      case '.': {
        advanceChar(state);
        if (peekChar(state) === '.') {
          advanceChar(state);
          tokens.push(makeToken(state, start, 'dotDot'));
        } else {
          tokens.push(makeToken(state, start, 'dot'));
        }
        break;
      }
      case ',': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'comma'));
        break;
      }
      case '@': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'at'));
        break;
      }
      case '$': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'dollar'));
        break;
      }
      case '+': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'plus'));
        break;
      }
      case '-': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'minus'));
        break;
      }
      case '*': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'star'));
        break;
      }
      case '=': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'equals'));
        break;
      }
      case '!': {
        advanceChar(state);
        if (peekChar(state) !== '=') {
          throw unexpectedCharacter(start, current);
        }
        advanceChar(state);
        tokens.push(makeToken(state, start, 'notEquals'));
        break;
      }
      case '<': {
        advanceChar(state);
        if (peekChar(state) === '<') {
          advanceChar(state);
          tokens.push(makeToken(state, start, 'nodeBefore'));
        } else if (peekChar(state) === '=') {
          advanceChar(state);
          tokens.push(makeToken(state, start, 'lessThanOrEqual'));
        } else {
          tokens.push(makeToken(state, start, 'lessThan'));
        }
        break;
      }
      case '>': {
        advanceChar(state);
        if (peekChar(state) === '>') {
          advanceChar(state);
          tokens.push(makeToken(state, start, 'nodeAfter'));
        } else if (peekChar(state) === '=') {
          advanceChar(state);
          tokens.push(makeToken(state, start, 'greaterThanOrEqual'));
        } else {
          tokens.push(makeToken(state, start, 'greaterThan'));
        }
        break;
      }
      case ':': {
        advanceChar(state);
        if (peekChar(state) === '=') {
          advanceChar(state);
          tokens.push(makeToken(state, start, 'assign'));
          break;
        }
        if (peekChar(state) !== ':') {
          throw unexpectedCharacter(start, current);
        }
        advanceChar(state);
        tokens.push(makeToken(state, start, 'doubleColon'));
        break;
      }
      case '|': {
        advanceChar(state);
        tokens.push(makeToken(state, start, 'pipe'));
        break;
      }
      default:
        throw unexpectedCharacter(start, current);
    }
  }

  const eofStart = capturePosition(state);
  tokens.push({
    kind: 'eof',
    value: '',
    span: {
      start: state.index,
      end: state.index,
      line: eofStart.line,
      column: eofStart.column,
      endLine: eofStart.line,
      endColumn: eofStart.column,
    },
  });

  return tokens;
}

interface LexerState {
  expression: string;
  index: number;
  line: number;
  column: number;
}

interface SourcePosition {
  readonly index: number;
  readonly line: number;
  readonly column: number;
}

function makeToken(state: LexerState, start: SourcePosition, kind: TokenKind): Token {
  return {
    kind,
    value: state.expression.slice(start.index, state.index),
    span: {
      start: start.index,
      end: state.index,
      line: start.line,
      column: start.column,
      endLine: state.line,
      endColumn: state.column,
    },
  };
}

function capturePosition(state: LexerState): SourcePosition {
  return {
    index: state.index,
    line: state.line,
    column: state.column,
  };
}

function isAtEnd(state: LexerState): boolean {
  return state.index >= state.expression.length;
}

function peekChar(state: LexerState, lookahead = 0): string | undefined {
  return state.expression[state.index + lookahead];
}

function advanceChar(state: LexerState): string | undefined {
  const current = state.expression[state.index];
  if (current === undefined) {
    return undefined;
  }

  state.index += 1;
  if (current === '\r') {
    if (state.expression[state.index] === '\n') {
      state.index += 1;
    }
    state.line += 1;
    state.column = 1;
    return current;
  }

  if (current === '\n') {
    state.line += 1;
    state.column = 1;
    return current;
  }

  state.column += 1;
  return current;
}

function skipWhitespace(state: LexerState): void {
  while (true) {
    const current = peekChar(state);
    if (current === undefined || !isWhitespace(current)) {
      return;
    }
    advanceChar(state);
  }
}

function readNumber(state: LexerState): void {
  if (peekChar(state) === '.') {
    advanceChar(state);
    readDigits(state);
    readExponentPart(state);
    return;
  }

  readDigits(state);
  if (peekChar(state) === '.' && peekChar(state, 1) !== '.') {
    advanceChar(state);
    readDigits(state);
  }

  readExponentPart(state);
}

function readExponentPart(state: LexerState): void {
  const current = peekChar(state);
  if (current !== 'e' && current !== 'E') {
    return;
  }

  const signOffset = peekChar(state, 1) === '+' || peekChar(state, 1) === '-' ? 2 : 1;
  if (!isDigit(peekChar(state, signOffset))) {
    return;
  }

  advanceChar(state);
  if (peekChar(state) === '+' || peekChar(state) === '-') {
    advanceChar(state);
  }
  readDigits(state);
}

function readDigits(state: LexerState): void {
  while (true) {
    const current = peekChar(state);
    if (current === undefined || !isDigit(current)) {
      return;
    }
    advanceChar(state);
  }
}

function readString(state: LexerState, quote: string): void {
  const start = capturePosition(state);
  advanceChar(state);

  while (true) {
    const current = peekChar(state);
    if (current === undefined) {
      throw new XPathError(XPST0003, 'Unterminated string literal.', {
        source: '<xpath>',
        line: start.line,
        column: start.column,
        offset: start.index,
        endLine: state.line,
        endColumn: state.column,
        endOffset: state.index,
      });
    }

    advanceChar(state);
    if (current !== quote) {
      continue;
    }

    if (peekChar(state) === quote) {
      advanceChar(state);
      continue;
    }

    return;
  }
}

function readName(state: LexerState): string {
  const startIndex = state.index;

  advanceChar(state);
  while (true) {
    const current = peekChar(state);
    if (current === undefined || !isNameChar(current)) {
      break;
    }
    advanceChar(state);
  }

  if (
    peekChar(state) === ':' &&
    peekChar(state, 1) !== ':' &&
    isNameStart(peekChar(state, 1))
  ) {
    advanceChar(state);
    advanceChar(state);
    while (true) {
      const current = peekChar(state);
      if (current === undefined || !isNameChar(current)) {
        break;
      }
      advanceChar(state);
    }
  }

  return state.expression.slice(startIndex, state.index);
}

function unexpectedCharacter(start: SourcePosition, character: string): XPathError {
  return new XPathError(XPST0003, `Unexpected character ${JSON.stringify(character)}.`, {
    source: '<xpath>',
    line: start.line,
    column: start.column,
    offset: start.index,
    endLine: start.line,
    endColumn: start.column + 1,
    endOffset: start.index + 1,
  });
}

function isWhitespace(character: string): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r';
}

function isDigit(character: string | undefined): character is string {
  return character !== undefined && character >= '0' && character <= '9';
}

function isNameStart(character: string | undefined): character is string {
  return character !== undefined && /[A-Za-z_]/.test(character);
}

function isNameChar(character: string): boolean {
  return /[A-Za-z0-9_.-]/.test(character);
}
