import { FORX0001, FORX0002, FORX0003, FORX0004 } from '../../errors/codes.js';
import { XPathError } from '../../errors/XPathError.js';

export const XML_NAME_START_CHAR_CLASS = ':A-Z_a-z\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\u{10000}-\\u{EFFFF}';

export const XML_NAME_CHAR_CLASS = `${XML_NAME_START_CHAR_CLASS}\\-.0-9\\xB7\\u0300-\\u036F\\u203F-\\u2040`;

const SCHEMA_PROPERTY_BLOCK_ALIAS_ENTRIES = [
  ['IsBasicLatin', '\\x00-\\x7F'],
  ['IsGreekandCoptic', '\\u0370-\\u03FF'],
  ['IsIPAExtensions', '\\u0250-\\u02AF'],
  ['IsSpacingModifierLetters', '\\u02B0-\\u02FF'],
  ['IsCyrillic', '\\u0400-\\u04FF'],
  ['IsArmenian', '\\u0530-\\u058F'],
  ['IsHebrew', '\\u0590-\\u05FF'],
  ['IsArabic', '\\u0600-\\u06FF'],
  ['IsSyriac', '\\u0700-\\u074F'],
  ['IsThaana', '\\u0780-\\u07BF'],
  ['IsDevanagari', '\\u0900-\\u097F'],
  ['IsBengali', '\\u0980-\\u09FF'],
  ['IsGurmukhi', '\\u0A00-\\u0A7F'],
  ['IsGujarati', '\\u0A80-\\u0AFF'],
  ['IsOriya', '\\u0B00-\\u0B7F'],
  ['IsTamil', '\\u0B80-\\u0BFF'],
  ['IsTelugu', '\\u0C00-\\u0C7F'],
  ['IsKannada', '\\u0C80-\\u0CFF'],
  ['IsMalayalam', '\\u0D00-\\u0D7F'],
  ['IsSinhala', '\\u0D80-\\u0DFF'],
  ['IsThai', '\\u0E00-\\u0E7F'],
  ['IsLao', '\\u0E80-\\u0EFF'],
  ['IsTibetan', '\\u0F00-\\u0FFF'],
  ['IsMyanmar', '\\u1000-\\u109F'],
  ['IsGeorgian', '\\u10A0-\\u10FF'],
  ['IsHangulJamo', '\\u1100-\\u11FF'],
  ['IsEthiopic', '\\u1200-\\u137F'],
  ['IsCherokee', '\\u13A0-\\u13FF'],
  ['IsUnifiedCanadianAboriginalSyllabics', '\\u1400-\\u167F'],
  ['IsGeneralPunctuation', '\\u2000-\\u206F'],
  ['IsSuperscriptsandSubscripts', '\\u2070-\\u209F'],
  ['IsCurrencySymbols', '\\u20A0-\\u20CF'],
  ['IsCombiningDiacriticalMarksforSymbols', '\\u20D0-\\u20FF'],
  ['IsLetterlikeSymbols', '\\u2100-\\u214F'],
  ['IsNumberForms', '\\u2150-\\u218F'],
  ['IsArrows', '\\u2190-\\u21FF'],
  ['IsMathematicalOperators', '\\u2200-\\u22FF'],
  ['IsMiscellaneousTechnical', '\\u2300-\\u23FF'],
  ['IsControlPictures', '\\u2400-\\u243F'],
  ['IsOpticalCharacterRecognition', '\\u2440-\\u245F'],
  ['IsEnclosedAlphanumerics', '\\u2460-\\u24FF'],
  ['IsBoxDrawing', '\\u2500-\\u257F'],
  ['IsBlockElements', '\\u2580-\\u259F'],
  ['IsGeometricShapes', '\\u25A0-\\u25FF'],
  ['IsMiscellaneousSymbols', '\\u2600-\\u26FF'],
  ['IsDingbats', '\\u2700-\\u27BF'],
  ['IsBraillePatterns', '\\u2800-\\u28FF'],
  ['IsCJKRadicalsSupplement', '\\u2E80-\\u2EFF'],
  ['IsKangxiRadicals', '\\u2F00-\\u2FDF'],
  ['IsIdeographicDescriptionCharacters', '\\u2FF0-\\u2FFF'],
  ['IsCJKSymbolsandPunctuation', '\\u3000-\\u303F'],
  ['IsHiragana', '\\u3040-\\u309F'],
  ['IsKatakana', '\\u30A0-\\u30FF'],
  ['IsBopomofo', '\\u3100-\\u312F'],
  ['IsHangulCompatibilityJamo', '\\u3130-\\u318F'],
  ['IsKanbun', '\\u3190-\\u319F'],
  ['IsBopomofoExtended', '\\u31A0-\\u31BF'],
  ['IsEnclosedCJKLettersandMonths', '\\u3200-\\u32FF'],
  ['IsCJKCompatibility', '\\u3300-\\u33FF'],
  ['IsCJKUnifiedIdeographsExtensionA', '\\u3400-\\u4DBF'],
  ['IsCJKUnifiedIdeographs', '\\u4E00-\\u9FFF'],
  ['IsYiSyllables', '\\uA000-\\uA48F'],
  ['IsYiRadicals', '\\uA490-\\uA4CF'],
  ['IsHangulSyllables', '\\uAC00-\\uD7A3'],
  ['IsPrivateUseArea', '\\uE000-\\uF8FF'],
  ['IsCJKCompatibilityIdeographs', '\\uF900-\\uFAFF'],
  ['IsAlphabeticPresentationForms', '\\uFB00-\\uFB4F'],
  ['IsArabicPresentationForms-A', '\\uFB50-\\uFDFF'],
  ['IsCombiningHalfMarks', '\\uFE20-\\uFE2F'],
  ['IsCJKCompatibilityForms', '\\uFE30-\\uFE4F'],
  ['IsSmallFormVariants', '\\uFE50-\\uFE6F'],
  ['IsArabicPresentationForms-B', '\\uFE70-\\uFEFF'],
  ['IsHalfwidthandFullwidthForms', '\\uFF00-\\uFFEF'],
  ['IsSpecials', '\\uFFF0-\\uFFFF'],
  ['IsLatin-1Supplement', '\\x80-\\xFF'],
  ['IsLatinExtended-A', '\\u0100-\\u017F'],
  ['IsLatinExtended-B', '\\u0180-\\u024F'],
  ['IsCombiningDiacriticalMarks', '\\u0300-\\u036F'],
  ['IsOgham', '\\u1680-\\u169F'],
  ['IsRunic', '\\u16A0-\\u16FF'],
  ['IsKhmer', '\\u1780-\\u17FF'],
  ['IsMongolian', '\\u1800-\\u18AF'],
  ['IsLatinExtendedAdditional', '\\u1E00-\\u1EFF'],
  ['IsGreekExtended', '\\u1F00-\\u1FFF'],
  ['IsHighSurrogates', '\\uD800-\\uDB7F'],
  ['IsLowSurrogates', '\\uDC00-\\uDFFF'],
  ['IsOldItalic', '\\u{10300}-\\u{1032F}'],
  ['IsGothic', '\\u{10330}-\\u{1034F}'],
  ['IsDeseret', '\\u{10400}-\\u{1044F}'],
  ['IsByzantineMusicalSymbols', '\\u{1D000}-\\u{1D0FF}'],
  ['IsMusicalSymbols', '\\u{1D100}-\\u{1D1FF}'],
  ['IsMathematicalAlphanumericSymbols', '\\u{1D400}-\\u{1D7FF}'],
  ['IsCJKUnifiedIdeographsExtensionB', '\\u{20000}-\\u{2A6DF}'],
  ['IsCJKCompatibilityIdeographsSupplement', '\\u{2F800}-\\u{2FA1F}'],
  ['IsTags', '\\u{E0000}-\\u{E007F}'],
  ['IsSupplementaryPrivateUseArea-A', '\\u{F0000}-\\u{FFFFD}'],
  ['IsSupplementaryPrivateUseArea-B', '\\u{100000}-\\u{10FFFD}'],
] as const;

const SCHEMA_PROPERTY_CLASS_ALIASES: Record<string, string> = Object.fromEntries(SCHEMA_PROPERTY_BLOCK_ALIAS_ENTRIES);

export type RegexSpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

export function compileRegex(pattern: string, flags: string, span: RegexSpanLike, global = false): RegExp {
  validateXPathRegexPattern(pattern, flags, span);
  const translatedPattern = translateRegexPattern(pattern, flags, span);
  const ecmaFlags = toEcmaRegexFlags(flags, span, global, translatedPattern);
  try {
    return new RegExp(translatedPattern, ecmaFlags);
  } catch {
    throw createRegexError(FORX0002, 'Invalid regular expression for the current ECMAScript-compatible regex slice.', span);
  }
}

export function compileRegexRejectingZeroLengthMatches(pattern: string, flags: string, span: RegexSpanLike): RegExp {
  const regex = compileRegex(pattern, flags, span, true);
  if (matchesZeroLength(regex)) {
    throw createRegexError(FORX0003, 'Regular expressions for this function must not match a zero-length string.', span);
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

export function toEcmaRegexFlags(flags: string, span: RegexSpanLike, global = false, translatedPattern?: string): string {
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

  if (translatedPattern !== undefined && needsUnicodeRegexFlag(translatedPattern) && !result.includes('u')) {
    result += 'u';
  }

  return result;
}

function needsUnicodeRegexFlag(translatedPattern: string): boolean {
  return translatedPattern.includes('\\u{') || translatedPattern.includes('\\p{') || translatedPattern.includes('\\P{');
}

function validateXPathRegexPattern(pattern: string, flags: string, span: RegexSpanLike): void {
  if (flags.includes('q')) {
    return;
  }

  let inCharacterClass = false;
  let escaped = false;
  let groupCount = 0;
  const openGroups: number[] = [];

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]!;

    if (escaped) {
      if (!inCharacterClass && /[1-9]/.test(char)) {
        let endIndex = index + 1;
        while (endIndex < pattern.length && /[0-9]/.test(pattern[endIndex]!)) {
          endIndex += 1;
        }

        const reference = Number(pattern.slice(index, endIndex));
        if (reference >= groupCount + 1 || openGroups.includes(reference)) {
          throw createRegexError(
            FORX0002,
            `Invalid back-reference \\\\${reference} to a group that is not yet closed.`,
            span,
          );
        }

        index = endIndex - 1;
      }

      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (inCharacterClass) {
      if (char === ']') {
        inCharacterClass = false;
      }
      continue;
    }

    if (char === '[') {
      inCharacterClass = true;
      continue;
    }

    if (char === '(') {
      if (pattern[index + 1] === '?') {
        continue;
      }

      groupCount += 1;
      openGroups.push(groupCount);
      continue;
    }

    if (char === ')' && openGroups.length > 0) {
      openGroups.pop();
    }
  }
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
  let nestedCharacterClassDepth = 0;

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

    if (char === '[') {
      nestedCharacterClassDepth += 1;
      index += 1;
      continue;
    }

    if (char === ']') {
      if (nestedCharacterClassDepth === 0) {
        break;
      }

      nestedCharacterClassDepth -= 1;
      index += 1;
      continue;
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
  const subtraction = splitTopLevelCharacterClassSubtraction(body);

  if (subtraction !== undefined) {
    const basePattern = translateCharacterClassContent(subtraction.base, span);
    const subtractPattern = translateCharacterClassContent(subtraction.subtract, span);
    const subtractedPattern = subtractSingleCharacterPattern(basePattern, subtractPattern);
    return outerNegated ? complementSingleCharacterPattern(subtractedPattern) : subtractedPattern;
  }

  return outerNegated
    ? complementSingleCharacterPattern(translateSimpleCharacterClass(body, span))
    : translateSimpleCharacterClass(body, span);
}

function translateSimpleCharacterClass(content: string, span: RegexSpanLike): string {
  const terms = tokenizeCharacterClassTerms(content, span);
  const hasComplementXmlEscape = terms.some((term) => term.kind === 'xml-complement');

  if (!hasComplementXmlEscape) {
    const translatedBody = terms.map((term) => characterClassTermToClassBody(term)).join('');
    return `[${translatedBody}]`;
  }

  const translatedTerms = terms.map((term) => characterClassTermToAlternationAtom(term));
  return `(?:${translatedTerms.join('|')})`;
}

function splitTopLevelCharacterClassSubtraction(content: string):
  | { base: string; subtract: string }
  | undefined {
  let escaped = false;
  let nestedCharacterClassDepth = 0;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '[') {
      nestedCharacterClassDepth += 1;
      continue;
    }

    if (char === ']') {
      if (nestedCharacterClassDepth > 0) {
        nestedCharacterClassDepth -= 1;
      }
      continue;
    }

    if (char !== '-' || nestedCharacterClassDepth !== 0 || content[index + 1] !== '[') {
      continue;
    }

    const nestedRange = findMatchingCharacterClassRange(content, index + 1);
    if (nestedRange === undefined || nestedRange.endIndex !== content.length - 1) {
      continue;
    }

    return {
      base: content.slice(0, index),
      subtract: nestedRange.content,
    };
  }

  return undefined;
}

function findMatchingCharacterClassRange(content: string, startIndex: number):
  | { content: string; endIndex: number }
  | undefined {
  let escaped = false;
  let nestedCharacterClassDepth = 0;

  for (let index = startIndex + 1; index < content.length; index += 1) {
    const char = content[index]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '[') {
      nestedCharacterClassDepth += 1;
      continue;
    }

    if (char === ']') {
      if (nestedCharacterClassDepth === 0) {
        return {
          content: content.slice(startIndex + 1, index),
          endIndex: index,
        };
      }

      nestedCharacterClassDepth -= 1;
    }
  }

  return undefined;
}

function subtractSingleCharacterPattern(basePattern: string, subtractPattern: string): string {
  return `(?:(?!${toLookaheadPattern(subtractPattern)})${basePattern})`;
}

function complementSingleCharacterPattern(pattern: string): string {
  return `(?:(?!${toLookaheadPattern(pattern)})[\\s\\S])`;
}

function toLookaheadPattern(pattern: string): string {
  return pattern.startsWith('(?:') && pattern.endsWith(')') ? pattern : `(?:${pattern})`;
}

type CharacterClassTerm =
  | { kind: 'raw'; raw: string }
  | { kind: 'range'; start: string; end: string }
  | { kind: 'xml-positive'; escape: 'i' | 'c' }
  | { kind: 'xml-complement'; escape: 'I' | 'C' };

type PropertyEscape = {
  kind: 'property';
  escape: 'p' | 'P';
  name: string;
  source: string;
  endIndex: number;
};

function tokenizeCharacterClassTerms(content: string, span: RegexSpanLike): CharacterClassTerm[] {
  const rawTokens = tokenizeCharacterClassRawTokens(content);
  validateCharacterClassRawTokens(rawTokens, span);

  const terms: CharacterClassTerm[] = [];
  for (let index = 0; index < rawTokens.length; index += 1) {
    const current = rawTokens[index]!;
    const next = rawTokens[index + 1];
    const afterNext = rawTokens[index + 2];
    const rangeStart = next === '-' ? getCharacterClassRangeEndpointSource(current) : undefined;
    const rangeEnd = next === '-' && afterNext !== undefined
      ? getCharacterClassRangeEndpointSource(afterNext)
      : undefined;
    if (rangeStart !== undefined && rangeEnd !== undefined) {
      terms.push({ kind: 'range', start: rangeStart, end: rangeEnd });
      index += 2;
      continue;
    }

    terms.push(toCharacterClassTerm(current));
  }

  return terms;
}

function tokenizeCharacterClassRawTokens(content: string): string[] {
  const rawTokens: string[] = [];

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]!;
    const propertyEscape = char === '\\' ? parsePropertyEscape(content, index) : undefined;
    if (propertyEscape !== undefined) {
      rawTokens.push(translatePropertyEscape(propertyEscape, true));
      index = propertyEscape.endIndex;
      continue;
    }

    if (char === '\\' && index + 1 < content.length) {
      rawTokens.push(`\\${content[index + 1]!}`);
      index += 1;
      continue;
    }

    rawTokens.push(char);
  }

  return rawTokens;
}

function validateCharacterClassRawTokens(rawTokens: readonly string[], span: RegexSpanLike): void {
  for (const token of rawTokens) {
    if (token === '[' || token === ']') {
      throw createRegexError(FORX0002, 'Invalid character class range syntax for the current regex slice.', span);
    }
  }

  const consumedRangeEndpoints = new Set<number>();

  for (let index = 0; index < rawTokens.length; index += 1) {
    if (rawTokens[index] !== '-') {
      continue;
    }

    if (index === 0 || index === rawTokens.length - 1) {
      continue;
    }

    const previousIndex = index - 1;
    const nextIndex = index + 1;
    const previous = getCharacterClassRangeEndpointSource(rawTokens[previousIndex]!);
    const next = getCharacterClassRangeEndpointSource(rawTokens[nextIndex]!);
    if (
      consumedRangeEndpoints.has(previousIndex)
      || consumedRangeEndpoints.has(nextIndex)
      || previous === undefined
      || next === undefined
    ) {
      throw createRegexError(FORX0002, 'Invalid character class range syntax for the current regex slice.', span);
    }

    consumedRangeEndpoints.add(previousIndex);
    consumedRangeEndpoints.add(nextIndex);
  }
}

function getCharacterClassRangeEndpointSource(token: string): string | undefined {
  if (token.length === 1) {
    return token === '-' ? undefined : token;
  }

  if (
    token.length === 2
    && token[0] === '\\'
    && !/^[iIcCpPsSdDwW]$/.test(token[1]!)
  ) {
    return token;
  }

  return undefined;
}

function toCharacterClassTerm(token: string): CharacterClassTerm {
  if (token === '\\i' || token === '\\c') {
    return { kind: 'xml-positive', escape: token[1]! as 'i' | 'c' };
  }
  if (token === '\\I' || token === '\\C') {
    return { kind: 'xml-complement', escape: token[1]! as 'I' | 'C' };
  }
  return { kind: 'raw', raw: token };
}

function characterClassTermToClassBody(term: CharacterClassTerm): string {
  switch (term.kind) {
    case 'raw':
      return term.raw;
    case 'range':
      return `${toGeneratedCharacterClassRangeEndpoint(term.start)}-${toGeneratedCharacterClassRangeEndpoint(term.end)}`;
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
    case 'range':
      return `[${toGeneratedCharacterClassRangeEndpoint(term.start)}-${toGeneratedCharacterClassRangeEndpoint(term.end)}]`;
    case 'raw':
      return `[${toGeneratedCharacterClassRawSource(term.raw)}]`;
  }
}

function toGeneratedCharacterClassRawSource(raw: string): string {
  if (raw.length === 1) {
    return escapeGeneratedCharacterClassLiteral(raw);
  }

  return raw;
}

function toGeneratedCharacterClassRangeEndpoint(endpoint: string): string {
  return endpoint.length === 1 ? escapeGeneratedCharacterClassLiteral(endpoint) : endpoint;
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

function parsePropertyEscape(pattern: string, startIndex: number): PropertyEscape | undefined {
  if (pattern[startIndex] !== '\\') {
    return undefined;
  }

  const escape = pattern[startIndex + 1];
  if ((escape !== 'p' && escape !== 'P') || pattern[startIndex + 2] !== '{') {
    return undefined;
  }

  const endIndex = pattern.indexOf('}', startIndex + 3);
  if (endIndex === -1) {
    return undefined;
  }

  return {
    kind: 'property',
    escape,
    name: pattern.slice(startIndex + 3, endIndex),
    source: pattern.slice(startIndex, endIndex + 1),
    endIndex,
  };
}

function translatePropertyEscape(propertyEscape: PropertyEscape, inCharacterClass: boolean): string {
  const classBodyAlias = SCHEMA_PROPERTY_CLASS_ALIASES[propertyEscape.name];
  if (classBodyAlias !== undefined) {
    if (inCharacterClass) {
      return propertyEscape.escape === 'p' ? classBodyAlias : `^${classBodyAlias}`;
    }

    return propertyEscape.escape === 'p' ? `[${classBodyAlias}]` : `[^${classBodyAlias}]`;
  }

  return propertyEscape.source;
}

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