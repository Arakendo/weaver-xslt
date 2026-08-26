import { FORX0001, FORX0002, FORX0003, FORX0004 } from '../../errors/codes.js';

import {
  parsePropertyEscape,
  translateCharacterClass,
  translatePropertyEscape,
  translateXmlNameEscape,
  translateXPathRegexEscape,
} from './regexCharacterClasses.js';
import { createRegexError, type RegexSpanLike } from './regexDiagnostics.js';

export { XML_NAME_CHAR_CLASS, XML_NAME_START_CHAR_CLASS } from './regexCharacterClasses.js';
export type { RegexSpanLike } from './regexDiagnostics.js';

export function compileRegex(
  pattern: string,
  flags: string,
  span: RegexSpanLike,
  global = false,
): RegExp {
  validateXPathRegexPattern(pattern, flags, span);
  const translatedPattern = translateRegexPattern(pattern, flags, span);
  const ecmaFlags = toEcmaRegexFlags(flags, span, global, translatedPattern);
  try {
    return new RegExp(translatedPattern, ecmaFlags);
  } catch {
    throw createRegexError(
      FORX0002,
      'Invalid regular expression for the current ECMAScript-compatible regex slice.',
      span,
    );
  }
}

export function compileRegexRejectingZeroLengthMatches(
  pattern: string,
  flags: string,
  span: RegexSpanLike,
): RegExp {
  const regex = compileRegex(pattern, flags, span, true);
  if (matchesZeroLength(regex)) {
    throw createRegexError(
      FORX0003,
      'Regular expressions for this function must not match a zero-length string.',
      span,
    );
  }

  return regex;
}

export function translateReplacementString(replacement: string, span: RegexSpanLike): string {
  let result = '';

  for (let index = 0; index < replacement.length; index += 1) {
    const char = replacement[index]!;

    if (char === '\\') {
      const escapedChar = replacement[index + 1];
      if (escapedChar === '\\') {
        result += '\\';
        index += 1;
        continue;
      }

      if (escapedChar === '$') {
        result += '$$';
        index += 1;
        continue;
      }

      throw createRegexError(FORX0004, 'Invalid replacement string for fn:replace.', span);
    }

    if (char === '$') {
      const next = replacement[index + 1];
      if (next === undefined || !/[0-9]/.test(next)) {
        throw createRegexError(FORX0004, 'Invalid replacement string for fn:replace.', span);
      }

      if (next === '0') {
        result += '$&';
        index += 1;
        continue;
      }

      result += '$';
      let digitIndex = index + 1;
      while (digitIndex < replacement.length && /[0-9]/.test(replacement[digitIndex]!)) {
        result += replacement[digitIndex]!;
        digitIndex += 1;
      }
      index = digitIndex - 1;
      continue;
    }

    result += char;
  }

  return result;
}

export function toEcmaRegexFlags(
  flags: string,
  span: RegexSpanLike,
  global = false,
  translatedPattern?: string,
): string {
  let result = global ? 'g' : '';

  for (const flag of flags) {
    if (flag === 'i' || flag === 's') {
      if (!result.includes(flag)) {
        result += flag;
      }
      continue;
    }

    if (flag === 'm') {
      continue;
    }

    if (flag === 'q' || flag === 'x') {
      continue;
    }

    throw createRegexError(
      FORX0001,
      `Unsupported regular expression flag ${flag} in the current ECMAScript-compatible regex slice.`,
      span,
    );
  }

  if (
    translatedPattern !== undefined &&
    (flags.includes('i') || needsUnicodeRegexFlag(translatedPattern)) &&
    !result.includes('u')
  ) {
    result += 'u';
  }

  return result;
}

function needsUnicodeRegexFlag(translatedPattern: string): boolean {
  return (
    translatedPattern.includes('\\u{') ||
    translatedPattern.includes('\\p{') ||
    translatedPattern.includes('\\P{') ||
    [...translatedPattern].some((character) => character.codePointAt(0)! > 0xffff)
  );
}

function validateXPathRegexPattern(pattern: string, flags: string, span: RegexSpanLike): void {
  if (flags.includes('q')) {
    return;
  }

  let inCharacterClass = false;
  let escaped = false;
  let canQuantify = false;
  let nestedCharacterClassDepth = 0;
  let groupCount = 0;
  const openGroups: Array<number | undefined> = [];

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]!;

    if (escaped) {
      const propertyEscape = parsePropertyEscape(pattern, index - 1);
      if (propertyEscape !== undefined) {
        index = propertyEscape.endIndex;
        escaped = false;
        if (!inCharacterClass) {
          canQuantify = true;
        }
        continue;
      }

      if (char === 'p' || char === 'P') {
        throw createRegexError(
          FORX0002,
          `Invalid Unicode property escape \\${char} in XPath regular expression syntax.`,
          span,
        );
      }

      if (inCharacterClass && /[0-9]/.test(char)) {
        throw createRegexError(
          FORX0002,
          `Invalid back-reference \\${char} inside a character class.`,
          span,
        );
      }

      if (char === '0') {
        throw createRegexError(
          FORX0002,
          'Invalid back-reference \\0 in XPath regular expression syntax.',
          span,
        );
      }

      if (!inCharacterClass && /[1-9]/.test(char)) {
        const backReference = resolveXPathNumericBackReference(
          pattern,
          index,
          groupCount,
          openGroups,
          span,
        );
        index = backReference.endIndex;
      }

      if (/[A-Za-z]/.test(char) && !isSupportedXPathRegexEscape(char)) {
        throw createRegexError(
          FORX0002,
          `Unsupported XPath regular expression escape \\${char}.`,
          span,
        );
      }

      escaped = false;
      if (!inCharacterClass) {
        canQuantify = true;
      }
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (inCharacterClass) {
      if (char === '[') {
        nestedCharacterClassDepth += 1;
        continue;
      }

      if (char === ']') {
        if (nestedCharacterClassDepth === 0) {
          inCharacterClass = false;
          canQuantify = true;
        } else {
          nestedCharacterClassDepth -= 1;
        }
      }
      continue;
    }

    if (char === '[') {
      inCharacterClass = true;
      nestedCharacterClassDepth = 0;
      canQuantify = false;
      continue;
    }

    if (char === ']') {
      throw createRegexError(
        FORX0002,
        'Invalid character class range syntax for the current regex slice.',
        span,
      );
    }

    if (char === '(') {
      if (pattern[index + 1] === '?') {
        if (pattern[index + 2] !== ':') {
          throw createRegexError(
            FORX0002,
            'Unsupported group construct in XPath regular expression syntax.',
            span,
          );
        }

        openGroups.push(undefined);
        canQuantify = false;
        index += 2;
        continue;
      }

      groupCount += 1;
      openGroups.push(groupCount);
      canQuantify = false;
      continue;
    }

    if (char === ')' && openGroups.length > 0) {
      openGroups.pop();
      canQuantify = true;
      continue;
    }

    if (char === '{') {
      const quantifier = parseXPathQuantifier(pattern, index, canQuantify, span);
      index = quantifier.endIndex;
      canQuantify = false;
      continue;
    }

    if (char === '?' || char === '*' || char === '+') {
      if (!canQuantify) {
        throw createRegexError(
          FORX0002,
          'Invalid quantifier syntax in XPath regular expression.',
          span,
        );
      }

      if (pattern[index + 1] === '?') {
        index += 1;
      }

      canQuantify = false;
      continue;
    }

    if (char === '|') {
      canQuantify = false;
      continue;
    }

    if (char === '^' || char === '$') {
      canQuantify = true;
      continue;
    }

    canQuantify = true;
  }
}

function resolveXPathNumericBackReference(
  pattern: string,
  startIndex: number,
  groupCount: number,
  openGroups: readonly (number | undefined)[],
  span: RegexSpanLike,
): { reference: number; suffix: string; endIndex: number } {
  let endIndex = startIndex + 1;
  while (endIndex < pattern.length && /[0-9]/.test(pattern[endIndex]!)) {
    endIndex += 1;
  }

  const digits = pattern.slice(startIndex, endIndex);
  for (let prefixLength = digits.length; prefixLength >= 1; prefixLength -= 1) {
    const reference = Number(digits.slice(0, prefixLength));
    if (reference === 0) {
      continue;
    }

    if (reference > groupCount) {
      continue;
    }

    if (openGroups.includes(reference)) {
      throw createRegexError(
        FORX0002,
        `Invalid back-reference \\\\${reference} to a group that is not yet closed.`,
        span,
      );
    }

    return {
      reference,
      suffix: digits.slice(prefixLength),
      endIndex: endIndex - 1,
    };
  }

  throw createRegexError(
    FORX0002,
    `Invalid back-reference \\\\${digits} to a group that is not yet closed.`,
    span,
  );
}

function matchesZeroLength(regex: RegExp): boolean {
  const probeFlags = regex.flags.replace('g', '');

  for (const sample of ['', 'a', '0', ' ', '\n', 'aa']) {
    const probeRegex = new RegExp(regex.source, probeFlags);
    const match = probeRegex.exec(sample);
    if (match !== null && match[0].length === 0) {
      return true;
    }
  }

  return false;
}

export function translateRegexPattern(pattern: string, flags: string, span: RegexSpanLike): string {
  if (flags.includes('q')) {
    return escapeRegexLiteral(pattern);
  }

  let translated = translateXmlNameEscapes(pattern, span);

  if (flags.includes('x')) {
    translated = stripExpandedWhitespace(translated);
  }

  if (flags.includes('m')) {
    translated = rewriteMultilineAnchors(translated);
  }

  return translated;
}

function rewriteMultilineAnchors(pattern: string): string {
  let result = '';
  let inCharacterClass = false;
  let escaped = false;

  for (const char of pattern) {
    if (escaped) {
      if (!inCharacterClass && /\s/.test(char)) {
        escaped = false;
        continue;
      }

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

    if (!inCharacterClass && char === '^') {
      result += '(?:^|(?<=\\n)(?!$))';
      continue;
    }

    if (!inCharacterClass && char === '$') {
      result += '(?:$|(?=\\n))';
      continue;
    }

    result += char;
  }

  return result;
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
      if (!inCharacterClass && /\s/.test(char)) {
        escaped = false;
        continue;
      }

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

function translateXmlNameEscapes(pattern: string, span: RegexSpanLike): string {
  let result = '';
  let groupCount = 0;
  const openGroups: number[] = [];

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]!;

    if (char === '[') {
      const translatedClass = translateCharacterClass(pattern, index, span);
      result += translatedClass.source;
      index = translatedClass.endIndex;
      continue;
    }

    if (char === '\\') {
      const propertyEscape = parsePropertyEscape(pattern, index);
      if (propertyEscape !== undefined) {
        result += translatePropertyEscape(propertyEscape, false);
        index = propertyEscape.endIndex;
        continue;
      }

      const next = pattern[index + 1];
      if (next === undefined) {
        result += '\\';
        continue;
      }

      if (/[1-9]/.test(next)) {
        const backReference = resolveXPathNumericBackReference(
          pattern,
          index + 1,
          groupCount,
          openGroups,
          span,
        );
        result += `\\${backReference.reference}`;
        if (backReference.suffix.length > 0) {
          result += `(?:${escapeRegexLiteral(backReference.suffix)})`;
        }
        index = backReference.endIndex;
        continue;
      }

      if (next === 'i' || next === 'I' || next === 'c' || next === 'C') {
        result += translateXmlNameEscape(next);
      } else if (next === 'd' || next === 'D' || next === 'w' || next === 'W') {
        result += translateXPathRegexEscape(next, false);
      } else if (next === '-') {
        result += '-';
      } else {
        result += `\\${next}`;
      }
      index += 1;
      continue;
    }

    if (char === '(') {
      if (pattern[index + 1] !== '?') {
        groupCount += 1;
        openGroups.push(groupCount);
      }
      result += char;
      continue;
    }

    if (char === '^' || char === '$') {
      result += `(?:${char})`;
      continue;
    }

    if (char === ')' && openGroups.length > 0) {
      openGroups.pop();
      result += char;
      continue;
    }

    result += char;
  }

  return result;
}

function isSupportedXPathRegexEscape(escape: string): boolean {
  return ['C', 'D', 'I', 'P', 'S', 'W', 'c', 'd', 'i', 'n', 'p', 'r', 's', 't', 'w'].includes(
    escape,
  );
}

function parseXPathQuantifier(
  pattern: string,
  startIndex: number,
  canQuantify: boolean,
  span: RegexSpanLike,
): { endIndex: number } {
  if (!canQuantify) {
    throw createRegexError(
      FORX0002,
      'Invalid quantifier syntax in XPath regular expression.',
      span,
    );
  }

  let index = startIndex + 1;
  let lowerBound = '';
  while (index < pattern.length && /[0-9]/.test(pattern[index]!)) {
    lowerBound += pattern[index]!;
    index += 1;
  }

  if (lowerBound.length === 0) {
    throw createRegexError(
      FORX0002,
      'Invalid quantifier syntax in XPath regular expression.',
      span,
    );
  }

  if (pattern[index] === '}') {
    return { endIndex: pattern[index + 1] === '?' ? index + 1 : index };
  }

  if (pattern[index] !== ',') {
    throw createRegexError(
      FORX0002,
      'Invalid quantifier syntax in XPath regular expression.',
      span,
    );
  }

  index += 1;
  let upperBound = '';
  while (index < pattern.length && /[0-9]/.test(pattern[index]!)) {
    upperBound += pattern[index]!;
    index += 1;
  }

  if (pattern[index] !== '}') {
    throw createRegexError(
      FORX0002,
      'Invalid quantifier syntax in XPath regular expression.',
      span,
    );
  }

  if (upperBound.length > 0 && Number(upperBound) < Number(lowerBound)) {
    throw createRegexError(
      FORX0002,
      'Invalid quantifier syntax in XPath regular expression.',
      span,
    );
  }

  return { endIndex: pattern[index + 1] === '?' ? index + 1 : index };
}
