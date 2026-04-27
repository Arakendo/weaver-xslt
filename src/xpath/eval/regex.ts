import { FOCA0002 } from '../../errors/codes.js';
import { XPathError } from '../../errors/XPathError.js';

export const XML_NAME_START_CHAR_CLASS = ':A-Z_a-z\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\u{10000}-\\u{EFFFF}';

export const XML_NAME_CHAR_CLASS = `${XML_NAME_START_CHAR_CLASS}\\-.0-9\\xB7\\u0300-\\u036F\\u203F-\\u2040`;

export type RegexSpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

export function compileRegex(pattern: string, flags: string, span: RegexSpanLike, global = false): RegExp {
  const translatedPattern = translateRegexPattern(pattern, flags, span);
  const ecmaFlags = toEcmaRegexFlags(flags, span, global, translatedPattern);
  try {
    return new RegExp(translatedPattern, ecmaFlags);
  } catch {
    throw createRegexError(FOCA0002, 'Invalid regular expression for the current ECMAScript-compatible regex slice.', span);
  }
}

export function toEcmaRegexFlags(flags: string, span: RegexSpanLike, global = false, translatedPattern?: string): string {
  let result = global ? 'g' : '';

  for (const flag of flags) {
    if (flag === 'i' || flag === 'm' || flag === 's') {
      if (!result.includes(flag)) {
        result += flag;
      }
      continue;
    }

    if (flag === 'q' || flag === 'x') {
      continue;
    }

    throw createRegexError(
      FOCA0002,
      `Unsupported regular expression flag ${flag} in the current ECMAScript-compatible regex slice.`,
      span,
    );
  }

  if (translatedPattern?.includes('\\u{') && !result.includes('u')) {
    result += 'u';
  }

  return result;
}

export function translateRegexPattern(pattern: string, flags: string, span?: RegexSpanLike): string {
  if (flags.includes('q')) {
    return escapeRegexLiteral(pattern);
  }

  let translated = translateXmlNameEscapes(pattern, span);

  if (flags.includes('x')) {
    translated = stripExpandedWhitespace(translated);
  }

  return translated;
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripExpandedWhitespace(pattern: string): string {
  let result = '';
  let inCharacterClass = false;
  let escaped = false;
  let inComment = false;

  for (const char of pattern) {
    if (inComment) {
      if (char === '\n' || char === '\r') {
        inComment = false;
      }
      continue;
    }

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '[' && !inCharacterClass) {
      inCharacterClass = true;
      result += char;
      continue;
    }

    if (char === ']' && inCharacterClass) {
      inCharacterClass = false;
      result += char;
      continue;
    }

    if (!inCharacterClass && /\s/.test(char)) {
      continue;
    }

    if (!inCharacterClass && char === '#') {
      inComment = true;
      continue;
    }

    result += char;
  }

  return result;
}

function translateXmlNameEscapes(pattern: string, span?: RegexSpanLike): string {
  let result = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]!;

    if (char === '[') {
      const translatedClass = translateCharacterClass(pattern, index, span ?? DEFAULT_REGEX_SPAN);
      result += translatedClass.source;
      index = translatedClass.endIndex;
      continue;
    }

    if (char === '\\') {
      const next = pattern[index + 1];
      if (next === undefined) {
        result += '\\';
        continue;
      }

      if (next === 'i' || next === 'I' || next === 'c' || next === 'C') {
        result += translateXmlNameEscape(next);
      } else {
        result += `\\${next}`;
      }
      index += 1;
      continue;
    }

    result += char;
  }

  return result;
}

function translateCharacterClass(pattern: string, startIndex: number, span: RegexSpanLike): { source: string; endIndex: number } {
  let index = startIndex + 1;
  let escaped = false;

  while (index < pattern.length) {
    const char = pattern[index]!;
    if (escaped) {
      escaped = false;
      index += 1;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      index += 1;
      continue;
    }

    if (char === ']') {
      break;
    }

    index += 1;
  }

  if (index >= pattern.length || pattern[index] !== ']') {
    return {
      source: pattern.slice(startIndex),
      endIndex: pattern.length - 1,
    };
  }

  const content = pattern.slice(startIndex + 1, index);
  return {
    source: translateCharacterClassContent(content, span),
    endIndex: index,
  };
}

function translateCharacterClassContent(content: string, span: RegexSpanLike): string {
  const outerNegated = content.startsWith('^');
  const body = outerNegated ? content.slice(1) : content;
  const terms = tokenizeCharacterClassTerms(body);
  const hasComplementXmlEscape = terms.some((term) => term.kind === 'xml-complement');

  if (outerNegated && hasComplementXmlEscape) {
    throw createRegexError(
      FOCA0002,
      'The current regex translator does not yet support XML name complement escapes inside negated character classes.',
      span,
    );
  }

  if (!hasComplementXmlEscape) {
    const translatedBody = terms.map((term) => characterClassTermToClassBody(term)).join('');
    return `[${outerNegated ? '^' : ''}${translatedBody}]`;
  }

  const translatedTerms = terms.map((term) => characterClassTermToAlternationAtom(term));
  return `(?:${translatedTerms.join('|')})`;
}

type CharacterClassTerm =
  | { kind: 'raw'; raw: string }
  | { kind: 'xml-positive'; escape: 'i' | 'c' }
  | { kind: 'xml-complement'; escape: 'I' | 'C' };

function tokenizeCharacterClassTerms(content: string): CharacterClassTerm[] {
  const rawTokens: string[] = [];

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]!;
    if (char === '\\' && index + 1 < content.length) {
      rawTokens.push(`\\${content[index + 1]!}`);
      index += 1;
      continue;
    }

    rawTokens.push(char);
  }

  const combinedTokens: string[] = [];
  for (let index = 0; index < rawTokens.length; index += 1) {
    const current = rawTokens[index]!;
    const next = rawTokens[index + 1];
    const afterNext = rawTokens[index + 2];
    if (next === '-' && afterNext !== undefined && canFormCharacterClassRange(current, afterNext)) {
      combinedTokens.push(`${current}-${afterNext}`);
      index += 2;
      continue;
    }

    combinedTokens.push(current);
  }

  return combinedTokens.map((token) => {
    if (token === '\\i' || token === '\\c') {
      return { kind: 'xml-positive', escape: token[1]! as 'i' | 'c' };
    }
    if (token === '\\I' || token === '\\C') {
      return { kind: 'xml-complement', escape: token[1]! as 'I' | 'C' };
    }
    return { kind: 'raw', raw: token };
  });
}

function canFormCharacterClassRange(start: string, end: string): boolean {
  return start.length === 1 && end.length === 1;
}

function characterClassTermToClassBody(term: CharacterClassTerm): string {
  switch (term.kind) {
    case 'raw':
      return term.raw;
    case 'xml-positive':
      return translateXmlNameEscapeInCharacterClass(term.escape);
    case 'xml-complement':
      return translateXmlNameEscape(term.escape);
  }
}

function characterClassTermToAlternationAtom(term: CharacterClassTerm): string {
  switch (term.kind) {
    case 'xml-positive':
      return `[${translateXmlNameEscapeInCharacterClass(term.escape)}]`;
    case 'xml-complement':
      return term.escape === 'I'
        ? `[^${XML_NAME_START_CHAR_CLASS}]`
        : `[^${XML_NAME_CHAR_CLASS}]`;
    case 'raw':
      return `[${toGeneratedCharacterClassSource(term.raw)}]`;
  }
}

function toGeneratedCharacterClassSource(raw: string): string {
  if (raw.length === 1) {
    return escapeGeneratedCharacterClassLiteral(raw);
  }

  if (raw.length === 3 && raw[1] === '-') {
    return `${escapeGeneratedCharacterClassLiteral(raw[0]!)}-${escapeGeneratedCharacterClassLiteral(raw[2]!)}`;
  }

  return raw;
}

function escapeGeneratedCharacterClassLiteral(char: string): string {
  return /[-\\\]^]/.test(char) ? `\\${char}` : char;
}

function translateXmlNameEscape(escape: 'i' | 'I' | 'c' | 'C'): string {
  switch (escape) {
    case 'i':
      return `[${XML_NAME_START_CHAR_CLASS}]`;
    case 'I':
      return `[^${XML_NAME_START_CHAR_CLASS}]`;
    case 'c':
      return `[${XML_NAME_CHAR_CLASS}]`;
    case 'C':
      return `[^${XML_NAME_CHAR_CLASS}]`;
  }
}

function translateXmlNameEscapeInCharacterClass(escape: 'i' | 'c'): string {
  switch (escape) {
    case 'i':
      return XML_NAME_START_CHAR_CLASS;
    case 'c':
      return XML_NAME_CHAR_CLASS;
  }
}

const DEFAULT_REGEX_SPAN: RegexSpanLike = {
  line: 1,
  column: 1,
  start: 0,
  endLine: 1,
  endColumn: 1,
  end: 0,
};

function createRegexError(code: string, message: string, span: RegexSpanLike): XPathError {
  return new XPathError(code, message, {
    source: '<xpath>',
    line: span.line,
    column: span.column,
    offset: span.start,
    endLine: span.endLine,
    endColumn: span.endColumn,
    endOffset: span.end,
  });
}