import { describe, expect, it } from 'vitest';

import { XPathError } from '../../../src/errors/XPathError.js';
import {
  XML_NAME_CHAR_CLASS,
  XML_NAME_START_CHAR_CLASS,
  compileRegex,
  toEcmaRegexFlags,
  translateRegexPattern,
  type RegexSpanLike,
} from '../../../src/xpath/eval/regex.js';

const TEST_SPAN: RegexSpanLike = {
  line: 1,
  column: 1,
  start: 0,
  endLine: 1,
  endColumn: 1,
  end: 0,
};

describe('XPath regex translator fixtures', () => {
  it('translates the current regex-pattern fixtures to ECMAScript source strings', () => {
    const fixtures = [
      { pattern: 'abc', flags: '', expected: 'abc' },
      { pattern: 'a b c', flags: 'x', expected: 'abc' },
      { pattern: 'a # skip\n b c', flags: 'x', expected: 'abc' },
      { pattern: '[a # ]', flags: 'x', expected: '[a # ]' },
      { pattern: 'a.c', flags: 'q', expected: 'a\\.c' },
      { pattern: 'a b', flags: 'qx', expected: 'a b' },
      { pattern: 'a#b', flags: 'qx', expected: 'a#b' },
      { pattern: '\\i\\c*', flags: '', expected: `[${XML_NAME_START_CHAR_CLASS}][${XML_NAME_CHAR_CLASS}]*` },
      { pattern: '\\I+', flags: '', expected: `[^${XML_NAME_START_CHAR_CLASS}]+` },
      { pattern: '[\\s\\i]*', flags: '', expected: `[\\s${XML_NAME_START_CHAR_CLASS}]*` },
      { pattern: '[\\c\\?a-c\\?]+', flags: '', expected: `[${XML_NAME_CHAR_CLASS}\\?a-c\\?]+` },
      { pattern: '[\\I]+', flags: '', expected: `(?:[^${XML_NAME_START_CHAR_CLASS}])+` },
      { pattern: '[\\C\\?a-c\\?]+', flags: '', expected: `(?:[^${XML_NAME_CHAR_CLASS}]|[\\?]|[a-c]|[\\?])+` },
      { pattern: '[^\\I]+', flags: '', expected: `(?:(?!(?:[^${XML_NAME_START_CHAR_CLASS}]))[\\s\\S])+` },
      { pattern: '[^\\C\\?a-c\\?]+', flags: '', expected: `(?:(?!(?:[^${XML_NAME_CHAR_CLASS}]|[\\?]|[a-c]|[\\?]))[\\s\\S])+` },
      { pattern: '[a-d-[b-c]]+', flags: '', expected: `(?:(?!(?:[b-c]))[a-d])+` },
      { pattern: '[\\d-[357]]+', flags: '', expected: `(?:(?!(?:[357]))[\\d])+` },
      { pattern: '[a-c-[^a-c]]+', flags: '', expected: `(?:(?!(?:(?!(?:[a-c]))[\\s\\S]))[a-c])+` },
      { pattern: '[\\w-[^aeiou]]+', flags: '', expected: `(?:(?!(?:(?!(?:[aeiou]))[\\s\\S]))[\\w])+` },
      { pattern: '[^cde-[ag]]+', flags: '', expected: `(?:(?!(?:(?!(?:[ag]))[cde]))[\\s\\S])+` },
      {
        pattern: '[\\c-[^\\i]]+',
        flags: '',
        expected: `(?:(?!(?:(?!(?:[${XML_NAME_START_CHAR_CLASS}]))[\\s\\S]))[${XML_NAME_CHAR_CLASS}])+`,
      },
      {
        pattern: '[\\i-[^\\c]]+',
        flags: '',
        expected: `(?:(?!(?:(?!(?:[${XML_NAME_CHAR_CLASS}]))[\\s\\S]))[${XML_NAME_START_CHAR_CLASS}])+`,
      },
      {
        pattern: '[\\c-[\\I]]+',
        flags: '',
        expected: `(?:(?!(?:[^${XML_NAME_START_CHAR_CLASS}]))[${XML_NAME_CHAR_CLASS}])+`,
      },
      {
        pattern: '[\\i-[\\C]]+',
        flags: '',
        expected: `(?:(?!(?:[^${XML_NAME_CHAR_CLASS}]))[${XML_NAME_START_CHAR_CLASS}])+`,
      },
      {
        pattern: '[\\c-[\\i\\C]]+',
        flags: '',
        expected: `(?:(?!(?:[${XML_NAME_START_CHAR_CLASS}]|[^${XML_NAME_CHAR_CLASS}]))[${XML_NAME_CHAR_CLASS}])+`,
      },
      {
        pattern: '[\\i-[\\c\\I]]+',
        flags: '',
        expected: `(?:(?!(?:[${XML_NAME_CHAR_CLASS}]|[^${XML_NAME_START_CHAR_CLASS}]))[${XML_NAME_START_CHAR_CLASS}])+`,
      },
      {
        pattern: '[^\\c-[\\i\\C]]+',
        flags: '',
        expected: `(?:(?!(?:(?!(?:[${XML_NAME_START_CHAR_CLASS}]|[^${XML_NAME_CHAR_CLASS}]))[${XML_NAME_CHAR_CLASS}]))[\\s\\S])+`,
      },
      {
        pattern: '[^\\i-[\\c\\I]]+',
        flags: '',
        expected: `(?:(?!(?:(?!(?:[${XML_NAME_CHAR_CLASS}]|[^${XML_NAME_START_CHAR_CLASS}]))[${XML_NAME_START_CHAR_CLASS}]))[\\s\\S])+`,
      },
      { pattern: '[\\p{Ll}-[ae-z]]+', flags: '', expected: `(?:(?!(?:[ae-z]))[\\p{Ll}])+` },
      { pattern: '[\\p{Nd}-[2468]]+', flags: '', expected: `(?:(?!(?:[2468]))[\\p{Nd}])+` },
      { pattern: '[\\P{Lu}-[ae-z]]+', flags: '', expected: `(?:(?!(?:[ae-z]))[\\P{Lu}])+` },
      { pattern: '[\\w-[\\p{Ll}]]+', flags: '', expected: `(?:(?!(?:[\\p{Ll}]))[\\w])+` },
      { pattern: '\\p{IsBasicLatin}+', flags: '', expected: `[\\x00-\\x7F]+` },
      { pattern: '\\P{IsBasicLatin}+', flags: '', expected: `[^\\x00-\\x7F]+` },
      { pattern: '[\\p{IsBasicLatin}]', flags: '', expected: `[\\x00-\\x7F]` },
      { pattern: '[\\P{IsBasicLatin}]', flags: '', expected: `[^\\x00-\\x7F]` },
      { pattern: '[^\\p{IsBasicLatin}]+', flags: '', expected: `(?:(?!(?:[\\x00-\\x7F]))[\\s\\S])+` },
      { pattern: '[^\\P{IsBasicLatin}]', flags: '', expected: `(?:(?!(?:[^\\x00-\\x7F]))[\\s\\S])` },
      { pattern: '[\\p{IsBasicLatin}-[\\P{Lu}]]+', flags: '', expected: `(?:(?!(?:[\\P{Lu}]))[\\x00-\\x7F])+` },
      { pattern: '[\\p{IsGreekandCoptic}-[\\P{Lu}]]+', flags: '', expected: `(?:(?!(?:[\\P{Lu}]))[\\u0370-\\u03FF])+` },
      { pattern: '\\p{IsIPAExtensions}+', flags: '', expected: `[\\u0250-\\u02AF]+` },
      { pattern: '\\p{IsIPAExtensions}?', flags: '', expected: `[\\u0250-\\u02AF]?` },
      { pattern: '\\p{IsSpacingModifierLetters}+', flags: '', expected: `[\\u02B0-\\u02FF]+` },
      { pattern: '\\p{IsSpacingModifierLetters}?', flags: '', expected: `[\\u02B0-\\u02FF]?` },
      { pattern: '\\p{IsCyrillic}', flags: '', expected: `[\\u0400-\\u04FF]` },
      { pattern: '\\p{IsCyrillic}+', flags: '', expected: `[\\u0400-\\u04FF]+` },
      { pattern: '\\p{IsCyrillic}?', flags: '', expected: `[\\u0400-\\u04FF]?` },
      { pattern: '\\p{IsArmenian}', flags: '', expected: `[\\u0530-\\u058F]` },
      { pattern: '\\p{IsArmenian}+', flags: '', expected: `[\\u0530-\\u058F]+` },
      { pattern: '\\p{IsArmenian}?', flags: '', expected: `[\\u0530-\\u058F]?` },
      { pattern: '\\p{IsHebrew}', flags: '', expected: `[\\u0590-\\u05FF]` },
      { pattern: '\\p{IsHebrew}+', flags: '', expected: `[\\u0590-\\u05FF]+` },
      { pattern: '\\p{IsHebrew}?', flags: '', expected: `[\\u0590-\\u05FF]?` },
      { pattern: '\\p{IsArabic}', flags: '', expected: `[\\u0600-\\u06FF]` },
      { pattern: '\\p{IsArabic}+', flags: '', expected: `[\\u0600-\\u06FF]+` },
      { pattern: '\\p{IsArabic}?', flags: '', expected: `[\\u0600-\\u06FF]?` },
      { pattern: '\\p{IsSyriac}', flags: '', expected: `[\\u0700-\\u074F]` },
      { pattern: '\\p{IsSyriac}+', flags: '', expected: `[\\u0700-\\u074F]+` },
      { pattern: '\\p{IsSyriac}?', flags: '', expected: `[\\u0700-\\u074F]?` },
      { pattern: '\\p{IsThaana}', flags: '', expected: `[\\u0780-\\u07BF]` },
      { pattern: '\\p{IsThaana}+', flags: '', expected: `[\\u0780-\\u07BF]+` },
      { pattern: '\\p{IsThaana}?', flags: '', expected: `[\\u0780-\\u07BF]?` },
      { pattern: '\\p{IsDevanagari}', flags: '', expected: `[\\u0900-\\u097F]` },
      { pattern: '\\p{IsDevanagari}+', flags: '', expected: `[\\u0900-\\u097F]+` },
      { pattern: '\\p{IsDevanagari}?', flags: '', expected: `[\\u0900-\\u097F]?` },
      { pattern: '\\p{IsBengali}', flags: '', expected: `[\\u0980-\\u09FF]` },
      { pattern: '\\p{IsBengali}+', flags: '', expected: `[\\u0980-\\u09FF]+` },
      { pattern: '\\p{IsBengali}?', flags: '', expected: `[\\u0980-\\u09FF]?` },
      { pattern: '\\p{IsGurmukhi}', flags: '', expected: `[\\u0A00-\\u0A7F]` },
      { pattern: '\\p{IsGurmukhi}+', flags: '', expected: `[\\u0A00-\\u0A7F]+` },
      { pattern: '\\p{IsGurmukhi}?', flags: '', expected: `[\\u0A00-\\u0A7F]?` },
      { pattern: '\\p{IsGujarati}', flags: '', expected: `[\\u0A80-\\u0AFF]` },
      { pattern: '\\p{IsGujarati}+', flags: '', expected: `[\\u0A80-\\u0AFF]+` },
      { pattern: '\\p{IsGujarati}?', flags: '', expected: `[\\u0A80-\\u0AFF]?` },
      { pattern: '\\p{IsOriya}', flags: '', expected: `[\\u0B00-\\u0B7F]` },
      { pattern: '\\p{IsOriya}+', flags: '', expected: `[\\u0B00-\\u0B7F]+` },
      { pattern: '\\p{IsOriya}?', flags: '', expected: `[\\u0B00-\\u0B7F]?` },
      { pattern: '\\p{IsTamil}', flags: '', expected: `[\\u0B80-\\u0BFF]` },
      { pattern: '\\p{IsTamil}+', flags: '', expected: `[\\u0B80-\\u0BFF]+` },
      { pattern: '\\p{IsTamil}?', flags: '', expected: `[\\u0B80-\\u0BFF]?` },
      { pattern: '\\p{IsTelugu}', flags: '', expected: `[\\u0C00-\\u0C7F]` },
      { pattern: '\\p{IsTelugu}+', flags: '', expected: `[\\u0C00-\\u0C7F]+` },
      { pattern: '\\p{IsTelugu}?', flags: '', expected: `[\\u0C00-\\u0C7F]?` },
      { pattern: '\\p{IsKannada}', flags: '', expected: `[\\u0C80-\\u0CFF]` },
      { pattern: '\\p{IsKannada}+', flags: '', expected: `[\\u0C80-\\u0CFF]+` },
      { pattern: '\\p{IsKannada}?', flags: '', expected: `[\\u0C80-\\u0CFF]?` },
      { pattern: '\\p{IsMalayalam}', flags: '', expected: `[\\u0D00-\\u0D7F]` },
      { pattern: '\\p{IsMalayalam}+', flags: '', expected: `[\\u0D00-\\u0D7F]+` },
      { pattern: '\\p{IsMalayalam}?', flags: '', expected: `[\\u0D00-\\u0D7F]?` },
      { pattern: '\\p{IsSinhala}', flags: '', expected: `[\\u0D80-\\u0DFF]` },
      { pattern: '\\p{IsSinhala}+', flags: '', expected: `[\\u0D80-\\u0DFF]+` },
      { pattern: '\\p{IsSinhala}?', flags: '', expected: `[\\u0D80-\\u0DFF]?` },
      { pattern: '\\p{IsThai}', flags: '', expected: `[\\u0E00-\\u0E7F]` },
      { pattern: '\\p{IsThai}+', flags: '', expected: `[\\u0E00-\\u0E7F]+` },
      { pattern: '\\p{IsThai}?', flags: '', expected: `[\\u0E00-\\u0E7F]?` },
      { pattern: '\\p{IsLao}', flags: '', expected: `[\\u0E80-\\u0EFF]` },
      { pattern: '\\p{IsLao}+', flags: '', expected: `[\\u0E80-\\u0EFF]+` },
      { pattern: '\\p{IsLao}?', flags: '', expected: `[\\u0E80-\\u0EFF]?` },
      { pattern: '\\p{IsTibetan}', flags: '', expected: `[\\u0F00-\\u0FFF]` },
      { pattern: '\\p{IsTibetan}+', flags: '', expected: `[\\u0F00-\\u0FFF]+` },
      { pattern: '\\p{IsTibetan}?', flags: '', expected: `[\\u0F00-\\u0FFF]?` },
      { pattern: '\\p{IsMyanmar}', flags: '', expected: `[\\u1000-\\u109F]` },
      { pattern: '\\p{IsMyanmar}+', flags: '', expected: `[\\u1000-\\u109F]+` },
      { pattern: '\\p{IsMyanmar}?', flags: '', expected: `[\\u1000-\\u109F]?` },
      { pattern: '\\p{IsGeorgian}', flags: '', expected: `[\\u10A0-\\u10FF]` },
      { pattern: '\\p{IsGeorgian}+', flags: '', expected: `[\\u10A0-\\u10FF]+` },
      { pattern: '\\p{IsGeorgian}?', flags: '', expected: `[\\u10A0-\\u10FF]?` },
      { pattern: '\\p{IsHangulJamo}', flags: '', expected: `[\\u1100-\\u11FF]` },
      { pattern: '\\p{IsHangulJamo}+', flags: '', expected: `[\\u1100-\\u11FF]+` },
      { pattern: '\\p{IsHangulJamo}?', flags: '', expected: `[\\u1100-\\u11FF]?` },
      { pattern: '\\p{IsEthiopic}', flags: '', expected: `[\\u1200-\\u137F]` },
      { pattern: '\\p{IsEthiopic}+', flags: '', expected: `[\\u1200-\\u137F]+` },
      { pattern: '\\p{IsEthiopic}?', flags: '', expected: `[\\u1200-\\u137F]?` },
      { pattern: '\\p{IsCherokee}', flags: '', expected: `[\\u13A0-\\u13FF]` },
      { pattern: '\\p{IsCherokee}+', flags: '', expected: `[\\u13A0-\\u13FF]+` },
      { pattern: '\\p{IsCherokee}?', flags: '', expected: `[\\u13A0-\\u13FF]?` },
      { pattern: '\\p{IsUnifiedCanadianAboriginalSyllabics}', flags: '', expected: `[\\u1400-\\u167F]` },
      { pattern: '\\p{IsUnifiedCanadianAboriginalSyllabics}+', flags: '', expected: `[\\u1400-\\u167F]+` },
      { pattern: '\\p{IsUnifiedCanadianAboriginalSyllabics}?', flags: '', expected: `[\\u1400-\\u167F]?` },
      { pattern: '\\p{IsGeneralPunctuation}', flags: '', expected: `[\\u2000-\\u206F]` },
      { pattern: '\\p{IsGeneralPunctuation}+', flags: '', expected: `[\\u2000-\\u206F]+` },
      { pattern: '\\p{IsGeneralPunctuation}?', flags: '', expected: `[\\u2000-\\u206F]?` },
      { pattern: '\\p{IsSuperscriptsandSubscripts}', flags: '', expected: `[\\u2070-\\u209F]` },
      { pattern: '\\p{IsSuperscriptsandSubscripts}+', flags: '', expected: `[\\u2070-\\u209F]+` },
      { pattern: '\\p{IsSuperscriptsandSubscripts}?', flags: '', expected: `[\\u2070-\\u209F]?` },
      { pattern: '\\p{IsCurrencySymbols}', flags: '', expected: `[\\u20A0-\\u20CF]` },
      { pattern: '\\p{IsCurrencySymbols}+', flags: '', expected: `[\\u20A0-\\u20CF]+` },
      { pattern: '\\p{IsCurrencySymbols}?', flags: '', expected: `[\\u20A0-\\u20CF]?` },
      { pattern: '\\p{IsCombiningDiacriticalMarksforSymbols}', flags: '', expected: `[\\u20D0-\\u20FF]` },
      { pattern: '\\p{IsCombiningDiacriticalMarksforSymbols}+', flags: '', expected: `[\\u20D0-\\u20FF]+` },
      { pattern: '\\p{IsCombiningDiacriticalMarksforSymbols}?', flags: '', expected: `[\\u20D0-\\u20FF]?` },
      { pattern: '\\p{IsLetterlikeSymbols}', flags: '', expected: `[\\u2100-\\u214F]` },
      { pattern: '\\p{IsLetterlikeSymbols}+', flags: '', expected: `[\\u2100-\\u214F]+` },
      { pattern: '\\p{IsLetterlikeSymbols}?', flags: '', expected: `[\\u2100-\\u214F]?` },
      { pattern: '\\p{IsNumberForms}', flags: '', expected: `[\\u2150-\\u218F]` },
      { pattern: '\\p{IsNumberForms}+', flags: '', expected: `[\\u2150-\\u218F]+` },
      { pattern: '\\p{IsNumberForms}?', flags: '', expected: `[\\u2150-\\u218F]?` },
      { pattern: '\\p{IsArrows}', flags: '', expected: `[\\u2190-\\u21FF]` },
      { pattern: '\\p{IsArrows}+', flags: '', expected: `[\\u2190-\\u21FF]+` },
      { pattern: '\\p{IsArrows}?', flags: '', expected: `[\\u2190-\\u21FF]?` },
      { pattern: '\\p{IsMathematicalOperators}', flags: '', expected: `[\\u2200-\\u22FF]` },
      { pattern: '\\p{IsMathematicalOperators}+', flags: '', expected: `[\\u2200-\\u22FF]+` },
      { pattern: '\\p{IsMathematicalOperators}?', flags: '', expected: `[\\u2200-\\u22FF]?` },
      { pattern: '\\p{IsMiscellaneousTechnical}', flags: '', expected: `[\\u2300-\\u23FF]` },
      { pattern: '\\p{IsMiscellaneousTechnical}+', flags: '', expected: `[\\u2300-\\u23FF]+` },
      { pattern: '\\p{IsMiscellaneousTechnical}?', flags: '', expected: `[\\u2300-\\u23FF]?` },
      { pattern: '\\p{IsControlPictures}', flags: '', expected: `[\\u2400-\\u243F]` },
      { pattern: '\\p{IsControlPictures}+', flags: '', expected: `[\\u2400-\\u243F]+` },
      { pattern: '\\p{IsControlPictures}?', flags: '', expected: `[\\u2400-\\u243F]?` },
      { pattern: '\\p{IsOpticalCharacterRecognition}', flags: '', expected: `[\\u2440-\\u245F]` },
      { pattern: '\\p{IsOpticalCharacterRecognition}+', flags: '', expected: `[\\u2440-\\u245F]+` },
      { pattern: '\\p{IsOpticalCharacterRecognition}?', flags: '', expected: `[\\u2440-\\u245F]?` },
      { pattern: '\\p{IsEnclosedAlphanumerics}', flags: '', expected: `[\\u2460-\\u24FF]` },
      { pattern: '\\p{IsEnclosedAlphanumerics}+', flags: '', expected: `[\\u2460-\\u24FF]+` },
      { pattern: '\\p{IsEnclosedAlphanumerics}?', flags: '', expected: `[\\u2460-\\u24FF]?` },
      { pattern: '\\p{IsBoxDrawing}', flags: '', expected: `[\\u2500-\\u257F]` },
      { pattern: '\\p{IsBoxDrawing}+', flags: '', expected: `[\\u2500-\\u257F]+` },
      { pattern: '\\p{IsBoxDrawing}?', flags: '', expected: `[\\u2500-\\u257F]?` },
      { pattern: '\\p{IsBlockElements}', flags: '', expected: `[\\u2580-\\u259F]` },
      { pattern: '\\p{IsBlockElements}+', flags: '', expected: `[\\u2580-\\u259F]+` },
      { pattern: '\\p{IsBlockElements}?', flags: '', expected: `[\\u2580-\\u259F]?` },
      { pattern: '\\p{IsGeometricShapes}', flags: '', expected: `[\\u25A0-\\u25FF]` },
      { pattern: '\\p{IsGeometricShapes}+', flags: '', expected: `[\\u25A0-\\u25FF]+` },
      { pattern: '\\p{IsGeometricShapes}?', flags: '', expected: `[\\u25A0-\\u25FF]?` },
      { pattern: '\\p{IsMiscellaneousSymbols}', flags: '', expected: `[\\u2600-\\u26FF]` },
      { pattern: '\\p{IsMiscellaneousSymbols}+', flags: '', expected: `[\\u2600-\\u26FF]+` },
      { pattern: '\\p{IsMiscellaneousSymbols}?', flags: '', expected: `[\\u2600-\\u26FF]?` },
      { pattern: '\\p{IsDingbats}', flags: '', expected: `[\\u2700-\\u27BF]` },
      { pattern: '\\p{IsDingbats}+', flags: '', expected: `[\\u2700-\\u27BF]+` },
      { pattern: '\\p{IsDingbats}?', flags: '', expected: `[\\u2700-\\u27BF]?` },
      { pattern: '\\p{IsBraillePatterns}', flags: '', expected: `[\\u2800-\\u28FF]` },
      { pattern: '\\p{IsBraillePatterns}+', flags: '', expected: `[\\u2800-\\u28FF]+` },
      { pattern: '\\p{IsBraillePatterns}?', flags: '', expected: `[\\u2800-\\u28FF]?` },
      { pattern: '\\p{IsCJKRadicalsSupplement}', flags: '', expected: `[\\u2E80-\\u2EFF]` },
      { pattern: '\\p{IsCJKRadicalsSupplement}+', flags: '', expected: `[\\u2E80-\\u2EFF]+` },
      { pattern: '\\p{IsCJKRadicalsSupplement}?', flags: '', expected: `[\\u2E80-\\u2EFF]?` },
      { pattern: '\\p{IsKangxiRadicals}', flags: '', expected: `[\\u2F00-\\u2FDF]` },
      { pattern: '\\p{IsKangxiRadicals}+', flags: '', expected: `[\\u2F00-\\u2FDF]+` },
      { pattern: '\\p{IsKangxiRadicals}?', flags: '', expected: `[\\u2F00-\\u2FDF]?` },
      { pattern: '\\p{IsIdeographicDescriptionCharacters}', flags: '', expected: `[\\u2FF0-\\u2FFF]` },
      { pattern: '\\p{IsIdeographicDescriptionCharacters}+', flags: '', expected: `[\\u2FF0-\\u2FFF]+` },
      { pattern: '\\p{IsIdeographicDescriptionCharacters}?', flags: '', expected: `[\\u2FF0-\\u2FFF]?` },
      { pattern: '\\p{IsCJKSymbolsandPunctuation}', flags: '', expected: `[\\u3000-\\u303F]` },
      { pattern: '\\p{IsCJKSymbolsandPunctuation}+', flags: '', expected: `[\\u3000-\\u303F]+` },
      { pattern: '\\p{IsCJKSymbolsandPunctuation}?', flags: '', expected: `[\\u3000-\\u303F]?` },
      { pattern: '\\p{IsHiragana}', flags: '', expected: `[\\u3040-\\u309F]` },
      { pattern: '\\p{IsHiragana}+', flags: '', expected: `[\\u3040-\\u309F]+` },
      { pattern: '\\p{IsHiragana}?', flags: '', expected: `[\\u3040-\\u309F]?` },
      { pattern: '\\p{IsKatakana}', flags: '', expected: `[\\u30A0-\\u30FF]` },
      { pattern: '\\p{IsKatakana}+', flags: '', expected: `[\\u30A0-\\u30FF]+` },
      { pattern: '\\p{IsKatakana}?', flags: '', expected: `[\\u30A0-\\u30FF]?` },
      { pattern: '\\p{IsBopomofo}', flags: '', expected: `[\\u3100-\\u312F]` },
      { pattern: '\\p{IsBopomofo}+', flags: '', expected: `[\\u3100-\\u312F]+` },
      { pattern: '\\p{IsBopomofo}?', flags: '', expected: `[\\u3100-\\u312F]?` },
      { pattern: '\\p{IsHangulCompatibilityJamo}', flags: '', expected: `[\\u3130-\\u318F]` },
      { pattern: '\\p{IsHangulCompatibilityJamo}+', flags: '', expected: `[\\u3130-\\u318F]+` },
      { pattern: '\\p{IsHangulCompatibilityJamo}?', flags: '', expected: `[\\u3130-\\u318F]?` },
      { pattern: '\\p{IsKanbun}', flags: '', expected: `[\\u3190-\\u319F]` },
      { pattern: '\\p{IsKanbun}+', flags: '', expected: `[\\u3190-\\u319F]+` },
      { pattern: '\\p{IsKanbun}?', flags: '', expected: `[\\u3190-\\u319F]?` },
      { pattern: '\\p{IsBopomofoExtended}', flags: '', expected: `[\\u31A0-\\u31BF]` },
      { pattern: '\\p{IsBopomofoExtended}+', flags: '', expected: `[\\u31A0-\\u31BF]+` },
      { pattern: '\\p{IsBopomofoExtended}?', flags: '', expected: `[\\u31A0-\\u31BF]?` },
      { pattern: '\\p{IsEnclosedCJKLettersandMonths}', flags: '', expected: `[\\u3200-\\u32FF]` },
      { pattern: '\\p{IsEnclosedCJKLettersandMonths}+', flags: '', expected: `[\\u3200-\\u32FF]+` },
      { pattern: '\\p{IsEnclosedCJKLettersandMonths}?', flags: '', expected: `[\\u3200-\\u32FF]?` },
      { pattern: '\\p{IsCJKCompatibility}', flags: '', expected: `[\\u3300-\\u33FF]` },
      { pattern: '\\p{IsCJKCompatibility}+', flags: '', expected: `[\\u3300-\\u33FF]+` },
      { pattern: '\\p{IsCJKCompatibility}?', flags: '', expected: `[\\u3300-\\u33FF]?` },
      { pattern: '\\p{IsCJKUnifiedIdeographsExtensionA}', flags: '', expected: `[\\u3400-\\u4DBF]` },
      { pattern: '\\p{IsCJKUnifiedIdeographsExtensionA}+', flags: '', expected: `[\\u3400-\\u4DBF]+` },
      { pattern: '\\p{IsCJKUnifiedIdeographsExtensionA}?', flags: '', expected: `[\\u3400-\\u4DBF]?` },
      { pattern: '\\p{IsCJKUnifiedIdeographs}', flags: '', expected: `[\\u4E00-\\u9FFF]` },
      { pattern: '\\p{IsCJKUnifiedIdeographs}+', flags: '', expected: `[\\u4E00-\\u9FFF]+` },
      { pattern: '\\p{IsCJKUnifiedIdeographs}?', flags: '', expected: `[\\u4E00-\\u9FFF]?` },
      { pattern: '\\p{IsYiSyllables}', flags: '', expected: `[\\uA000-\\uA48F]` },
      { pattern: '\\p{IsYiSyllables}+', flags: '', expected: `[\\uA000-\\uA48F]+` },
      { pattern: '\\p{IsYiSyllables}?', flags: '', expected: `[\\uA000-\\uA48F]?` },
      { pattern: '\\p{IsYiRadicals}', flags: '', expected: `[\\uA490-\\uA4CF]` },
      { pattern: '\\p{IsYiRadicals}+', flags: '', expected: `[\\uA490-\\uA4CF]+` },
      { pattern: '\\p{IsYiRadicals}?', flags: '', expected: `[\\uA490-\\uA4CF]?` },
      { pattern: '\\p{IsHangulSyllables}', flags: '', expected: `[\\uAC00-\\uD7A3]` },
      { pattern: '\\p{IsHangulSyllables}+', flags: '', expected: `[\\uAC00-\\uD7A3]+` },
      { pattern: '\\p{IsHangulSyllables}?', flags: '', expected: `[\\uAC00-\\uD7A3]?` },
      { pattern: '\\p{IsPrivateUseArea}', flags: '', expected: `[\\uE000-\\uF8FF]` },
      { pattern: '\\p{IsPrivateUseArea}+', flags: '', expected: `[\\uE000-\\uF8FF]+` },
      { pattern: '\\p{IsPrivateUseArea}?', flags: '', expected: `[\\uE000-\\uF8FF]?` },
      { pattern: '\\p{IsCJKCompatibilityIdeographs}', flags: '', expected: `[\\uF900-\\uFAFF]` },
      { pattern: '\\p{IsCJKCompatibilityIdeographs}+', flags: '', expected: `[\\uF900-\\uFAFF]+` },
      { pattern: '\\p{IsCJKCompatibilityIdeographs}?', flags: '', expected: `[\\uF900-\\uFAFF]?` },
      { pattern: '\\p{IsAlphabeticPresentationForms}', flags: '', expected: `[\\uFB00-\\uFB4F]` },
      { pattern: '\\p{IsAlphabeticPresentationForms}+', flags: '', expected: `[\\uFB00-\\uFB4F]+` },
      { pattern: '\\p{IsAlphabeticPresentationForms}?', flags: '', expected: `[\\uFB00-\\uFB4F]?` },
      { pattern: '\\p{IsArabicPresentationForms-A}', flags: '', expected: `[\\uFB50-\\uFDFF]` },
      { pattern: '\\p{IsArabicPresentationForms-A}+', flags: '', expected: `[\\uFB50-\\uFDFF]+` },
      { pattern: '\\p{IsArabicPresentationForms-A}?', flags: '', expected: `[\\uFB50-\\uFDFF]?` },
      { pattern: '\\p{IsCombiningHalfMarks}', flags: '', expected: `[\\uFE20-\\uFE2F]` },
      { pattern: '\\p{IsCombiningHalfMarks}+', flags: '', expected: `[\\uFE20-\\uFE2F]+` },
      { pattern: '\\p{IsCombiningHalfMarks}?', flags: '', expected: `[\\uFE20-\\uFE2F]?` },
      { pattern: '\\p{IsCJKCompatibilityForms}', flags: '', expected: `[\\uFE30-\\uFE4F]` },
      { pattern: '\\p{IsCJKCompatibilityForms}+', flags: '', expected: `[\\uFE30-\\uFE4F]+` },
      { pattern: '\\p{IsCJKCompatibilityForms}?', flags: '', expected: `[\\uFE30-\\uFE4F]?` },
      { pattern: '\\p{IsSmallFormVariants}', flags: '', expected: `[\\uFE50-\\uFE6F]` },
      { pattern: '\\p{IsSmallFormVariants}+', flags: '', expected: `[\\uFE50-\\uFE6F]+` },
      { pattern: '\\p{IsSmallFormVariants}?', flags: '', expected: `[\\uFE50-\\uFE6F]?` },
      { pattern: '\\p{IsArabicPresentationForms-B}', flags: '', expected: `[\\uFE70-\\uFEFF]` },
      { pattern: '\\p{IsArabicPresentationForms-B}+', flags: '', expected: `[\\uFE70-\\uFEFF]+` },
      { pattern: '\\p{IsArabicPresentationForms-B}?', flags: '', expected: `[\\uFE70-\\uFEFF]?` },
      { pattern: '\\p{IsHalfwidthandFullwidthForms}', flags: '', expected: `[\\uFF00-\\uFFEF]` },
      { pattern: '\\p{IsHalfwidthandFullwidthForms}+', flags: '', expected: `[\\uFF00-\\uFFEF]+` },
      { pattern: '\\p{IsHalfwidthandFullwidthForms}?', flags: '', expected: `[\\uFF00-\\uFFEF]?` },
      { pattern: '\\p{IsSpecials}', flags: '', expected: `[\\uFFF0-\\uFFFF]` },
      { pattern: '\\p{IsSpecials}+', flags: '', expected: `[\\uFFF0-\\uFFFF]+` },
      { pattern: '\\p{IsSpecials}?', flags: '', expected: `[\\uFFF0-\\uFFFF]?` },
      { pattern: '\\p{IsLatin-1Supplement}', flags: '', expected: `[\\x80-\\xFF]` },
      { pattern: '\\p{IsLatin-1Supplement}+', flags: '', expected: `[\\x80-\\xFF]+` },
      { pattern: '\\p{IsLatin-1Supplement}?', flags: '', expected: `[\\x80-\\xFF]?` },
      { pattern: '\\p{IsLatinExtended-A}', flags: '', expected: `[\\u0100-\\u017F]` },
      { pattern: '\\p{IsLatinExtended-A}+', flags: '', expected: `[\\u0100-\\u017F]+` },
      { pattern: '\\p{IsLatinExtended-A}?', flags: '', expected: `[\\u0100-\\u017F]?` },
      { pattern: '\\p{IsLatinExtended-B}', flags: '', expected: `[\\u0180-\\u024F]` },
      { pattern: '\\p{IsLatinExtended-B}+', flags: '', expected: `[\\u0180-\\u024F]+` },
      { pattern: '\\p{IsLatinExtended-B}?', flags: '', expected: `[\\u0180-\\u024F]?` },
      { pattern: '\\p{IsCombiningDiacriticalMarks}', flags: '', expected: `[\\u0300-\\u036F]` },
      { pattern: '\\p{IsCombiningDiacriticalMarks}+', flags: '', expected: `[\\u0300-\\u036F]+` },
      { pattern: '\\p{IsCombiningDiacriticalMarks}?', flags: '', expected: `[\\u0300-\\u036F]?` },
      { pattern: '\\p{IsOgham}', flags: '', expected: `[\\u1680-\\u169F]` },
      { pattern: '\\p{IsOgham}+', flags: '', expected: `[\\u1680-\\u169F]+` },
      { pattern: '\\p{IsOgham}?', flags: '', expected: `[\\u1680-\\u169F]?` },
      { pattern: '\\p{IsRunic}', flags: '', expected: `[\\u16A0-\\u16FF]` },
      { pattern: '\\p{IsRunic}+', flags: '', expected: `[\\u16A0-\\u16FF]+` },
      { pattern: '\\p{IsRunic}?', flags: '', expected: `[\\u16A0-\\u16FF]?` },
      { pattern: '\\p{IsKhmer}', flags: '', expected: `[\\u1780-\\u17FF]` },
      { pattern: '\\p{IsKhmer}+', flags: '', expected: `[\\u1780-\\u17FF]+` },
      { pattern: '\\p{IsKhmer}?', flags: '', expected: `[\\u1780-\\u17FF]?` },
      { pattern: '\\p{IsMongolian}', flags: '', expected: `[\\u1800-\\u18AF]` },
      { pattern: '\\p{IsMongolian}+', flags: '', expected: `[\\u1800-\\u18AF]+` },
      { pattern: '\\p{IsMongolian}?', flags: '', expected: `[\\u1800-\\u18AF]?` },
      { pattern: '\\p{IsLatinExtendedAdditional}', flags: '', expected: `[\\u1E00-\\u1EFF]` },
      { pattern: '\\p{IsLatinExtendedAdditional}+', flags: '', expected: `[\\u1E00-\\u1EFF]+` },
      { pattern: '\\p{IsLatinExtendedAdditional}?', flags: '', expected: `[\\u1E00-\\u1EFF]?` },
      { pattern: '\\p{IsGreekExtended}', flags: '', expected: `[\\u1F00-\\u1FFF]` },
      { pattern: '\\p{IsGreekExtended}+', flags: '', expected: `[\\u1F00-\\u1FFF]+` },
      { pattern: '\\p{IsGreekExtended}?', flags: '', expected: `[\\u1F00-\\u1FFF]?` },
      { pattern: '\\p{IsHighSurrogates}', flags: '', expected: `[\\uD800-\\uDB7F]` },
      { pattern: '\\p{IsHighSurrogates}+', flags: '', expected: `[\\uD800-\\uDB7F]+` },
      { pattern: '\\p{IsHighSurrogates}?', flags: '', expected: `[\\uD800-\\uDB7F]?` },
      { pattern: '\\p{IsLowSurrogates}', flags: '', expected: `[\\uDC00-\\uDFFF]` },
      { pattern: '\\p{IsLowSurrogates}+', flags: '', expected: `[\\uDC00-\\uDFFF]+` },
      { pattern: '\\p{IsLowSurrogates}?', flags: '', expected: `[\\uDC00-\\uDFFF]?` },
      { pattern: '\\p{IsOldItalic}', flags: '', expected: `[\\u{10300}-\\u{1032F}]` },
      { pattern: '\\p{IsOldItalic}+', flags: '', expected: `[\\u{10300}-\\u{1032F}]+` },
      { pattern: '\\p{IsOldItalic}?', flags: '', expected: `[\\u{10300}-\\u{1032F}]?` },
      { pattern: '\\p{IsGothic}', flags: '', expected: `[\\u{10330}-\\u{1034F}]` },
      { pattern: '\\p{IsGothic}+', flags: '', expected: `[\\u{10330}-\\u{1034F}]+` },
      { pattern: '\\p{IsGothic}?', flags: '', expected: `[\\u{10330}-\\u{1034F}]?` },
      { pattern: '\\p{IsDeseret}', flags: '', expected: `[\\u{10400}-\\u{1044F}]` },
      { pattern: '\\p{IsDeseret}+', flags: '', expected: `[\\u{10400}-\\u{1044F}]+` },
      { pattern: '\\p{IsDeseret}?', flags: '', expected: `[\\u{10400}-\\u{1044F}]?` },
      { pattern: '\\p{IsByzantineMusicalSymbols}', flags: '', expected: `[\\u{1D000}-\\u{1D0FF}]` },
      { pattern: '\\p{IsByzantineMusicalSymbols}+', flags: '', expected: `[\\u{1D000}-\\u{1D0FF}]+` },
      { pattern: '\\p{IsByzantineMusicalSymbols}?', flags: '', expected: `[\\u{1D000}-\\u{1D0FF}]?` },
      { pattern: '\\p{IsMusicalSymbols}', flags: '', expected: `[\\u{1D100}-\\u{1D1FF}]` },
      { pattern: '\\p{IsMusicalSymbols}+', flags: '', expected: `[\\u{1D100}-\\u{1D1FF}]+` },
      { pattern: '\\p{IsMusicalSymbols}?', flags: '', expected: `[\\u{1D100}-\\u{1D1FF}]?` },
      { pattern: '\\p{IsMathematicalAlphanumericSymbols}', flags: '', expected: `[\\u{1D400}-\\u{1D7FF}]` },
      { pattern: '\\p{IsMathematicalAlphanumericSymbols}+', flags: '', expected: `[\\u{1D400}-\\u{1D7FF}]+` },
      { pattern: '\\p{IsMathematicalAlphanumericSymbols}?', flags: '', expected: `[\\u{1D400}-\\u{1D7FF}]?` },
      { pattern: '\\p{IsCJKUnifiedIdeographsExtensionB}', flags: '', expected: `[\\u{20000}-\\u{2A6DF}]` },
      { pattern: '\\p{IsCJKUnifiedIdeographsExtensionB}+', flags: '', expected: `[\\u{20000}-\\u{2A6DF}]+` },
      { pattern: '\\p{IsCJKUnifiedIdeographsExtensionB}?', flags: '', expected: `[\\u{20000}-\\u{2A6DF}]?` },
      { pattern: '\\p{IsCJKCompatibilityIdeographsSupplement}', flags: '', expected: `[\\u{2F800}-\\u{2FA1F}]` },
      { pattern: '\\p{IsCJKCompatibilityIdeographsSupplement}+', flags: '', expected: `[\\u{2F800}-\\u{2FA1F}]+` },
      { pattern: '\\p{IsCJKCompatibilityIdeographsSupplement}?', flags: '', expected: `[\\u{2F800}-\\u{2FA1F}]?` },
      { pattern: '\\p{IsTags}', flags: '', expected: `[\\u{E0000}-\\u{E007F}]` },
      { pattern: '\\p{IsTags}+', flags: '', expected: `[\\u{E0000}-\\u{E007F}]+` },
      { pattern: '\\p{IsTags}?', flags: '', expected: `[\\u{E0000}-\\u{E007F}]?` },
      { pattern: '\\p{IsSupplementaryPrivateUseArea-A}', flags: '', expected: `[\\u{F0000}-\\u{FFFFD}]` },
      { pattern: '\\p{IsSupplementaryPrivateUseArea-A}+', flags: '', expected: `[\\u{F0000}-\\u{FFFFD}]+` },
      { pattern: '\\p{IsSupplementaryPrivateUseArea-A}?', flags: '', expected: `[\\u{F0000}-\\u{FFFFD}]?` },
      { pattern: '\\p{IsSupplementaryPrivateUseArea-B}', flags: '', expected: `[\\u{100000}-\\u{10FFFD}]` },
      { pattern: '\\p{IsSupplementaryPrivateUseArea-B}+', flags: '', expected: `[\\u{100000}-\\u{10FFFD}]+` },
      { pattern: '\\p{IsSupplementaryPrivateUseArea-B}?', flags: '', expected: `[\\u{100000}-\\u{10FFFD}]?` },
    ] as const;

    for (const fixture of fixtures) {
      expect(translateRegexPattern(fixture.pattern, fixture.flags)).toBe(fixture.expected);
    }
  });

  it('translates the current regex flag fixtures to ECMAScript flags', () => {
    const fixtures = [
      { flags: '', global: false, pattern: undefined, expected: '' },
      { flags: 'i', global: false, pattern: undefined, expected: 'i' },
      { flags: 'im', global: true, pattern: undefined, expected: 'gim' },
      { flags: 'qx', global: false, pattern: undefined, expected: '' },
      { flags: 'sxi', global: true, pattern: undefined, expected: 'gsi' },
      { flags: '', global: false, pattern: `[${XML_NAME_START_CHAR_CLASS}]`, expected: 'u' },
      { flags: '', global: false, pattern: `[\\p{Ll}]`, expected: 'u' },
      { flags: '', global: false, pattern: `[\\P{Lu}]`, expected: 'u' },
    ] as const;

    for (const fixture of fixtures) {
      expect(toEcmaRegexFlags(fixture.flags, TEST_SPAN, fixture.global, fixture.pattern)).toBe(fixture.expected);
    }
  });

  it('compiles XML name escapes into working ECMAScript regexes', () => {
    expect(compileRegex('\\i\\c*', '', TEST_SPAN).test('_:alpha')).toBe(true);
    expect(compileRegex('\\i+', '', TEST_SPAN).test('1.0')).toBe(false);
    expect(compileRegex('\\I+', '', TEST_SPAN).test('1.0')).toBe(true);
    expect(compileRegex('\\c+', '', TEST_SPAN).test('abc')).toBe(true);
    expect(compileRegex('\\C+', '', TEST_SPAN).test(' \t')).toBe(true);
    expect(compileRegex('^[\\s\\i]*$', '', TEST_SPAN).test('a b  Z:_')).toBe(true);
    expect(compileRegex('^[\\s\\i]*$', '', TEST_SPAN).test('1')).toBe(false);
    expect(compileRegex('^[\\I]+$', '', TEST_SPAN).test('1.0')).toBe(true);
    expect(compileRegex('^[\\I]+$', '', TEST_SPAN).test('_')).toBe(false);
    expect(compileRegex('^[\\C\\?a-c\\?]+$', '', TEST_SPAN).test('?a?')).toBe(true);
    expect(compileRegex('^[\\C\\?a-c\\?]+$', '', TEST_SPAN).test('?d?')).toBe(false);
    expect(compileRegex('^[^\\I]+$', '', TEST_SPAN).test('_')).toBe(true);
    expect(compileRegex('^[^\\I]+$', '', TEST_SPAN).test('1')).toBe(false);
    expect(compileRegex('^[^\\C\\?a-c\\?]+$', '', TEST_SPAN).test('_')).toBe(true);
    expect(compileRegex('^[^\\C\\?a-c\\?]+$', '', TEST_SPAN).test('?')).toBe(false);
    expect(compileRegex('^[a-d-[b-c]]+$', '', TEST_SPAN).test('ad')).toBe(true);
    expect(compileRegex('^[a-d-[b-c]]+$', '', TEST_SPAN).test('b')).toBe(false);
    expect(compileRegex('^[\\d-[357]]+$', '', TEST_SPAN).test('24680')).toBe(true);
    expect(compileRegex('^[\\d-[357]]+$', '', TEST_SPAN).test('357')).toBe(false);
    expect(compileRegex('^[a-c-[^a-c]]+$', '', TEST_SPAN).test('abc')).toBe(true);
    expect(compileRegex('^[a-c-[^a-c]]+$', '', TEST_SPAN).test('d')).toBe(false);
    expect(compileRegex('^m[\\w-[^aeiou]][\\w-[^aeiou]]t$', '', TEST_SPAN).test('meet')).toBe(true);
    expect(compileRegex('^m[\\w-[^aeiou]][\\w-[^aeiou]]t$', '', TEST_SPAN).test('mbbt')).toBe(false);
    expect(compileRegex('^[^cde-[ag]]+$', '', TEST_SPAN).test('bfxyz')).toBe(true);
    expect(compileRegex('^[^cde-[ag]]+$', '', TEST_SPAN).test('d')).toBe(false);
    expect(compileRegex('^[\\c-[^\\i]]+$', '', TEST_SPAN).test('_:alpha')).toBe(true);
    expect(compileRegex('^[\\c-[^\\i]]+$', '', TEST_SPAN).test('1')).toBe(false);
    expect(compileRegex('^[\\i-[^\\c]]+$', '', TEST_SPAN).test('_')).toBe(true);
    expect(compileRegex('^[\\i-[^\\c]]+$', '', TEST_SPAN).test('1')).toBe(false);
    expect(compileRegex('^[\\c-[\\I]]+$', '', TEST_SPAN).test('_:alpha')).toBe(true);
    expect(compileRegex('^[\\c-[\\I]]+$', '', TEST_SPAN).test('a1')).toBe(false);
    expect(compileRegex('^[\\i-[\\C]]+$', '', TEST_SPAN).test('_:alpha')).toBe(true);
    expect(compileRegex('^[\\i-[\\C]]+$', '', TEST_SPAN).test('a1')).toBe(false);
    expect(compileRegex('^[\\c-[\\i\\C]]+$', '', TEST_SPAN).test('1.-')).toBe(true);
    expect(compileRegex('^[\\c-[\\i\\C]]+$', '', TEST_SPAN).test('_')).toBe(false);
    expect(compileRegex('^[\\i-[\\c\\I]]+$', '', TEST_SPAN).test('_')).toBe(false);
    expect(compileRegex('^[\\i-[\\c\\I]]+$', '', TEST_SPAN).test(':')).toBe(false);
    expect(compileRegex('^[^\\c-[\\i\\C]]+$', '', TEST_SPAN).test('_:alpha')).toBe(true);
    expect(compileRegex('^[^\\c-[\\i\\C]]+$', '', TEST_SPAN).test('1.-')).toBe(false);
    expect(compileRegex('^[^\\i-[\\c\\I]]+$', '', TEST_SPAN).test('_:alpha')).toBe(true);
    expect(compileRegex('^[^\\i-[\\c\\I]]+$', '', TEST_SPAN).test('1.-')).toBe(true);
    expect(compileRegex('^[\\p{Ll}-[ae-z]]+$', '', TEST_SPAN).test('b')).toBe(true);
    expect(compileRegex('^[\\p{Ll}-[ae-z]]+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^[\\p{Nd}-[2468]]+$', '', TEST_SPAN).test('13579')).toBe(true);
    expect(compileRegex('^[\\p{Nd}-[2468]]+$', '', TEST_SPAN).test('2468')).toBe(false);
    expect(compileRegex('^[\\P{Lu}-[ae-z]]+$', '', TEST_SPAN).test('1.-')).toBe(true);
    expect(compileRegex('^[\\P{Lu}-[ae-z]]+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^[\\w-[\\p{Ll}]]+$', '', TEST_SPAN).test('AZ09_')).toBe(true);
    expect(compileRegex('^[\\w-[\\p{Ll}]]+$', '', TEST_SPAN).test('aZ09_')).toBe(false);
    expect(compileRegex('^\\p{IsBasicLatin}+$', '', TEST_SPAN).test('Az09')).toBe(true);
    expect(compileRegex('^\\p{IsBasicLatin}+$', '', TEST_SPAN).test('Ā')).toBe(false);
    expect(compileRegex('^\\P{IsBasicLatin}+$', '', TEST_SPAN).test('Ā')).toBe(true);
    expect(compileRegex('^\\P{IsBasicLatin}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^[\\p{IsBasicLatin}]$', '', TEST_SPAN).test('A')).toBe(true);
    expect(compileRegex('^[\\p{IsBasicLatin}]$', '', TEST_SPAN).test('Ā')).toBe(false);
    expect(compileRegex('^[\\P{IsBasicLatin}]$', '', TEST_SPAN).test('Ā')).toBe(true);
    expect(compileRegex('^[\\P{IsBasicLatin}]$', '', TEST_SPAN).test('A')).toBe(false);
    expect(compileRegex('^[^\\p{IsBasicLatin}]+$', '', TEST_SPAN).test('Ā')).toBe(true);
    expect(compileRegex('^[^\\p{IsBasicLatin}]+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^[^\\P{IsBasicLatin}]$', '', TEST_SPAN).test('a')).toBe(true);
    expect(compileRegex('^[^\\P{IsBasicLatin}]$', '', TEST_SPAN).test('Ā')).toBe(false);
    expect(compileRegex('^[\\p{IsBasicLatin}-[\\P{Lu}]]+$', '', TEST_SPAN).test('A')).toBe(true);
    expect(compileRegex('^[\\p{IsBasicLatin}-[\\P{Lu}]]+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^[\\p{IsGreekandCoptic}-[\\P{Lu}]]+$', '', TEST_SPAN).test('Α')).toBe(true);
    expect(compileRegex('^[\\p{IsGreekandCoptic}-[\\P{Lu}]]+$', '', TEST_SPAN).test('α')).toBe(false);
    expect(compileRegex('^\\p{IsIPAExtensions}+$', '', TEST_SPAN).test('ɐ')).toBe(true);
    expect(compileRegex('^\\p{IsIPAExtensions}+$', '', TEST_SPAN).test('ʰ')).toBe(false);
    expect(compileRegex('^\\p{IsIPAExtensions}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsSpacingModifierLetters}+$', '', TEST_SPAN).test('ʰ')).toBe(true);
    expect(compileRegex('^\\p{IsSpacingModifierLetters}+$', '', TEST_SPAN).test('ɐ')).toBe(false);
    expect(compileRegex('^\\p{IsSpacingModifierLetters}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCyrillic}$', '', TEST_SPAN).test('Ѐ')).toBe(true);
    expect(compileRegex('^\\p{IsCyrillic}$', '', TEST_SPAN).test('Ա')).toBe(false);
    expect(compileRegex('^\\p{IsCyrillic}+$', '', TEST_SPAN).test('Ѐӿ')).toBe(true);
    expect(compileRegex('^\\p{IsCyrillic}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCyrillic}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsArmenian}$', '', TEST_SPAN).test('Ա')).toBe(true);
    expect(compileRegex('^\\p{IsArmenian}$', '', TEST_SPAN).test('Ѐ')).toBe(false);
    expect(compileRegex('^\\p{IsArmenian}+$', '', TEST_SPAN).test('Աֆ')).toBe(true);
    expect(compileRegex('^\\p{IsArmenian}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsArmenian}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsHebrew}$', '', TEST_SPAN).test('א')).toBe(true);
    expect(compileRegex('^\\p{IsHebrew}$', '', TEST_SPAN).test('Ա')).toBe(false);
    expect(compileRegex('^\\p{IsHebrew}+$', '', TEST_SPAN).test('אב')).toBe(true);
    expect(compileRegex('^\\p{IsHebrew}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsHebrew}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsArabic}$', '', TEST_SPAN).test('ا')).toBe(true);
    expect(compileRegex('^\\p{IsArabic}$', '', TEST_SPAN).test('א')).toBe(false);
    expect(compileRegex('^\\p{IsArabic}+$', '', TEST_SPAN).test('اب')).toBe(true);
    expect(compileRegex('^\\p{IsArabic}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsArabic}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsSyriac}$', '', TEST_SPAN).test('ܐ')).toBe(true);
    expect(compileRegex('^\\p{IsSyriac}$', '', TEST_SPAN).test('ا')).toBe(false);
    expect(compileRegex('^\\p{IsSyriac}+$', '', TEST_SPAN).test('ܐܒ')).toBe(true);
    expect(compileRegex('^\\p{IsSyriac}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsSyriac}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsThaana}$', '', TEST_SPAN).test('ހ')).toBe(true);
    expect(compileRegex('^\\p{IsThaana}$', '', TEST_SPAN).test('ܐ')).toBe(false);
    expect(compileRegex('^\\p{IsThaana}+$', '', TEST_SPAN).test('ހށ')).toBe(true);
    expect(compileRegex('^\\p{IsThaana}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsThaana}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsDevanagari}$', '', TEST_SPAN).test('अ')).toBe(true);
    expect(compileRegex('^\\p{IsDevanagari}$', '', TEST_SPAN).test('ހ')).toBe(false);
    expect(compileRegex('^\\p{IsDevanagari}+$', '', TEST_SPAN).test('अआ')).toBe(true);
    expect(compileRegex('^\\p{IsDevanagari}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsDevanagari}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsBengali}$', '', TEST_SPAN).test('অ')).toBe(true);
    expect(compileRegex('^\\p{IsBengali}$', '', TEST_SPAN).test('अ')).toBe(false);
    expect(compileRegex('^\\p{IsBengali}+$', '', TEST_SPAN).test('অআ')).toBe(true);
    expect(compileRegex('^\\p{IsBengali}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsBengali}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsGurmukhi}$', '', TEST_SPAN).test('ਅ')).toBe(true);
    expect(compileRegex('^\\p{IsGurmukhi}$', '', TEST_SPAN).test('অ')).toBe(false);
    expect(compileRegex('^\\p{IsGurmukhi}+$', '', TEST_SPAN).test('ਅਆ')).toBe(true);
    expect(compileRegex('^\\p{IsGurmukhi}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsGurmukhi}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsGujarati}$', '', TEST_SPAN).test('અ')).toBe(true);
    expect(compileRegex('^\\p{IsGujarati}$', '', TEST_SPAN).test('ਅ')).toBe(false);
    expect(compileRegex('^\\p{IsGujarati}+$', '', TEST_SPAN).test('અઆ')).toBe(true);
    expect(compileRegex('^\\p{IsGujarati}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsGujarati}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsOriya}$', '', TEST_SPAN).test('ଅ')).toBe(true);
    expect(compileRegex('^\\p{IsOriya}$', '', TEST_SPAN).test('અ')).toBe(false);
    expect(compileRegex('^\\p{IsOriya}+$', '', TEST_SPAN).test('ଅଆ')).toBe(true);
    expect(compileRegex('^\\p{IsOriya}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsOriya}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsTamil}$', '', TEST_SPAN).test('அ')).toBe(true);
    expect(compileRegex('^\\p{IsTamil}$', '', TEST_SPAN).test('ଅ')).toBe(false);
    expect(compileRegex('^\\p{IsTamil}+$', '', TEST_SPAN).test('அஆ')).toBe(true);
    expect(compileRegex('^\\p{IsTamil}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsTamil}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsTelugu}$', '', TEST_SPAN).test('అ')).toBe(true);
    expect(compileRegex('^\\p{IsTelugu}$', '', TEST_SPAN).test('அ')).toBe(false);
    expect(compileRegex('^\\p{IsTelugu}+$', '', TEST_SPAN).test('అఆ')).toBe(true);
    expect(compileRegex('^\\p{IsTelugu}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsTelugu}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsKannada}$', '', TEST_SPAN).test('ಅ')).toBe(true);
    expect(compileRegex('^\\p{IsKannada}$', '', TEST_SPAN).test('అ')).toBe(false);
    expect(compileRegex('^\\p{IsKannada}+$', '', TEST_SPAN).test('ಅಆ')).toBe(true);
    expect(compileRegex('^\\p{IsKannada}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsKannada}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsMalayalam}$', '', TEST_SPAN).test('അ')).toBe(true);
    expect(compileRegex('^\\p{IsMalayalam}$', '', TEST_SPAN).test('ಅ')).toBe(false);
    expect(compileRegex('^\\p{IsMalayalam}+$', '', TEST_SPAN).test('അആ')).toBe(true);
    expect(compileRegex('^\\p{IsMalayalam}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsMalayalam}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsSinhala}$', '', TEST_SPAN).test('අ')).toBe(true);
    expect(compileRegex('^\\p{IsSinhala}$', '', TEST_SPAN).test('അ')).toBe(false);
    expect(compileRegex('^\\p{IsSinhala}+$', '', TEST_SPAN).test('අආ')).toBe(true);
    expect(compileRegex('^\\p{IsSinhala}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsSinhala}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsThai}$', '', TEST_SPAN).test('ก')).toBe(true);
    expect(compileRegex('^\\p{IsThai}$', '', TEST_SPAN).test('අ')).toBe(false);
    expect(compileRegex('^\\p{IsThai}+$', '', TEST_SPAN).test('กข')).toBe(true);
    expect(compileRegex('^\\p{IsThai}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsThai}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsLao}$', '', TEST_SPAN).test('ກ')).toBe(true);
    expect(compileRegex('^\\p{IsLao}$', '', TEST_SPAN).test('ก')).toBe(false);
    expect(compileRegex('^\\p{IsLao}+$', '', TEST_SPAN).test('ກຂ')).toBe(true);
    expect(compileRegex('^\\p{IsLao}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsLao}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsTibetan}$', '', TEST_SPAN).test('ཀ')).toBe(true);
    expect(compileRegex('^\\p{IsTibetan}$', '', TEST_SPAN).test('ກ')).toBe(false);
    expect(compileRegex('^\\p{IsTibetan}+$', '', TEST_SPAN).test('ཀཁ')).toBe(true);
    expect(compileRegex('^\\p{IsTibetan}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsTibetan}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsMyanmar}$', '', TEST_SPAN).test('က')).toBe(true);
    expect(compileRegex('^\\p{IsMyanmar}$', '', TEST_SPAN).test('ཀ')).toBe(false);
    expect(compileRegex('^\\p{IsMyanmar}+$', '', TEST_SPAN).test('ကခ')).toBe(true);
    expect(compileRegex('^\\p{IsMyanmar}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsMyanmar}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsGeorgian}$', '', TEST_SPAN).test('Ⴀ')).toBe(true);
    expect(compileRegex('^\\p{IsGeorgian}$', '', TEST_SPAN).test('က')).toBe(false);
    expect(compileRegex('^\\p{IsGeorgian}+$', '', TEST_SPAN).test('ႠႡ')).toBe(true);
    expect(compileRegex('^\\p{IsGeorgian}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsGeorgian}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsHangulJamo}$', '', TEST_SPAN).test('ᄀ')).toBe(true);
    expect(compileRegex('^\\p{IsHangulJamo}$', '', TEST_SPAN).test('Ⴀ')).toBe(false);
    expect(compileRegex('^\\p{IsHangulJamo}+$', '', TEST_SPAN).test('ᄀᄁ')).toBe(true);
    expect(compileRegex('^\\p{IsHangulJamo}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsHangulJamo}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsEthiopic}$', '', TEST_SPAN).test('ሀ')).toBe(true);
    expect(compileRegex('^\\p{IsEthiopic}$', '', TEST_SPAN).test('ᄀ')).toBe(false);
    expect(compileRegex('^\\p{IsEthiopic}+$', '', TEST_SPAN).test('ሀሁ')).toBe(true);
    expect(compileRegex('^\\p{IsEthiopic}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsEthiopic}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCherokee}$', '', TEST_SPAN).test('Ꭰ')).toBe(true);
    expect(compileRegex('^\\p{IsCherokee}$', '', TEST_SPAN).test('ሀ')).toBe(false);
    expect(compileRegex('^\\p{IsCherokee}+$', '', TEST_SPAN).test('ᎠᎡ')).toBe(true);
    expect(compileRegex('^\\p{IsCherokee}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCherokee}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsUnifiedCanadianAboriginalSyllabics}$', '', TEST_SPAN).test('᐀')).toBe(true);
    expect(compileRegex('^\\p{IsUnifiedCanadianAboriginalSyllabics}$', '', TEST_SPAN).test('Ꭰ')).toBe(false);
    expect(compileRegex('^\\p{IsUnifiedCanadianAboriginalSyllabics}+$', '', TEST_SPAN).test('᐀ᐁ')).toBe(true);
    expect(compileRegex('^\\p{IsUnifiedCanadianAboriginalSyllabics}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsUnifiedCanadianAboriginalSyllabics}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsGeneralPunctuation}$', '', TEST_SPAN).test(' ')).toBe(true);
    expect(compileRegex('^\\p{IsGeneralPunctuation}$', '', TEST_SPAN).test('⁰')).toBe(false);
    expect(compileRegex('^\\p{IsGeneralPunctuation}+$', '', TEST_SPAN).test('  ')).toBe(true);
    expect(compileRegex('^\\p{IsGeneralPunctuation}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsGeneralPunctuation}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsSuperscriptsandSubscripts}$', '', TEST_SPAN).test('⁰')).toBe(true);
    expect(compileRegex('^\\p{IsSuperscriptsandSubscripts}$', '', TEST_SPAN).test('₠')).toBe(false);
    expect(compileRegex('^\\p{IsSuperscriptsandSubscripts}+$', '', TEST_SPAN).test('⁰ⁱ')).toBe(true);
    expect(compileRegex('^\\p{IsSuperscriptsandSubscripts}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsSuperscriptsandSubscripts}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCurrencySymbols}$', '', TEST_SPAN).test('₠')).toBe(true);
    expect(compileRegex('^\\p{IsCurrencySymbols}$', '', TEST_SPAN).test(String.fromCodePoint(0x20d0))).toBe(false);
    expect(compileRegex('^\\p{IsCurrencySymbols}+$', '', TEST_SPAN).test('₠₡')).toBe(true);
    expect(compileRegex('^\\p{IsCurrencySymbols}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCurrencySymbols}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCombiningDiacriticalMarksforSymbols}$', '', TEST_SPAN).test(String.fromCodePoint(0x20d0))).toBe(true);
    expect(compileRegex('^\\p{IsCombiningDiacriticalMarksforSymbols}$', '', TEST_SPAN).test('℀')).toBe(false);
    expect(compileRegex('^\\p{IsCombiningDiacriticalMarksforSymbols}+$', '', TEST_SPAN).test(String.fromCodePoint(0x20d0, 0x20d1))).toBe(true);
    expect(compileRegex('^\\p{IsCombiningDiacriticalMarksforSymbols}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCombiningDiacriticalMarksforSymbols}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsLetterlikeSymbols}$', '', TEST_SPAN).test('℀')).toBe(true);
    expect(compileRegex('^\\p{IsLetterlikeSymbols}$', '', TEST_SPAN).test('⅐')).toBe(false);
    expect(compileRegex('^\\p{IsLetterlikeSymbols}+$', '', TEST_SPAN).test('℀℁')).toBe(true);
    expect(compileRegex('^\\p{IsLetterlikeSymbols}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsLetterlikeSymbols}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsNumberForms}$', '', TEST_SPAN).test('⅐')).toBe(true);
    expect(compileRegex('^\\p{IsNumberForms}$', '', TEST_SPAN).test('←')).toBe(false);
    expect(compileRegex('^\\p{IsNumberForms}+$', '', TEST_SPAN).test('⅐⅑')).toBe(true);
    expect(compileRegex('^\\p{IsNumberForms}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsNumberForms}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsArrows}$', '', TEST_SPAN).test('←')).toBe(true);
    expect(compileRegex('^\\p{IsArrows}$', '', TEST_SPAN).test('∀')).toBe(false);
    expect(compileRegex('^\\p{IsArrows}+$', '', TEST_SPAN).test('←↑')).toBe(true);
    expect(compileRegex('^\\p{IsArrows}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsArrows}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsMathematicalOperators}$', '', TEST_SPAN).test('∀')).toBe(true);
    expect(compileRegex('^\\p{IsMathematicalOperators}$', '', TEST_SPAN).test('⌀')).toBe(false);
    expect(compileRegex('^\\p{IsMathematicalOperators}+$', '', TEST_SPAN).test('∀∁')).toBe(true);
    expect(compileRegex('^\\p{IsMathematicalOperators}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsMathematicalOperators}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsMiscellaneousTechnical}$', '', TEST_SPAN).test('⌀')).toBe(true);
    expect(compileRegex('^\\p{IsMiscellaneousTechnical}$', '', TEST_SPAN).test('␀')).toBe(false);
    expect(compileRegex('^\\p{IsMiscellaneousTechnical}+$', '', TEST_SPAN).test('⌀⌁')).toBe(true);
    expect(compileRegex('^\\p{IsMiscellaneousTechnical}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsMiscellaneousTechnical}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsControlPictures}$', '', TEST_SPAN).test('␀')).toBe(true);
    expect(compileRegex('^\\p{IsControlPictures}$', '', TEST_SPAN).test('⑀')).toBe(false);
    expect(compileRegex('^\\p{IsControlPictures}+$', '', TEST_SPAN).test('␀␁')).toBe(true);
    expect(compileRegex('^\\p{IsControlPictures}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsControlPictures}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsOpticalCharacterRecognition}$', '', TEST_SPAN).test('⑀')).toBe(true);
    expect(compileRegex('^\\p{IsOpticalCharacterRecognition}$', '', TEST_SPAN).test('①')).toBe(false);
    expect(compileRegex('^\\p{IsOpticalCharacterRecognition}+$', '', TEST_SPAN).test('⑀⑁')).toBe(true);
    expect(compileRegex('^\\p{IsOpticalCharacterRecognition}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsOpticalCharacterRecognition}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsEnclosedAlphanumerics}$', '', TEST_SPAN).test('①')).toBe(true);
    expect(compileRegex('^\\p{IsEnclosedAlphanumerics}$', '', TEST_SPAN).test('─')).toBe(false);
    expect(compileRegex('^\\p{IsEnclosedAlphanumerics}+$', '', TEST_SPAN).test('①②')).toBe(true);
    expect(compileRegex('^\\p{IsEnclosedAlphanumerics}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsEnclosedAlphanumerics}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsBoxDrawing}$', '', TEST_SPAN).test('─')).toBe(true);
    expect(compileRegex('^\\p{IsBoxDrawing}$', '', TEST_SPAN).test('▀')).toBe(false);
    expect(compileRegex('^\\p{IsBoxDrawing}+$', '', TEST_SPAN).test('─━')).toBe(true);
    expect(compileRegex('^\\p{IsBoxDrawing}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsBoxDrawing}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsBlockElements}$', '', TEST_SPAN).test('▀')).toBe(true);
    expect(compileRegex('^\\p{IsBlockElements}$', '', TEST_SPAN).test('■')).toBe(false);
    expect(compileRegex('^\\p{IsBlockElements}+$', '', TEST_SPAN).test('▀▁')).toBe(true);
    expect(compileRegex('^\\p{IsBlockElements}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsBlockElements}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsGeometricShapes}$', '', TEST_SPAN).test('■')).toBe(true);
    expect(compileRegex('^\\p{IsGeometricShapes}$', '', TEST_SPAN).test('☀')).toBe(false);
    expect(compileRegex('^\\p{IsGeometricShapes}+$', '', TEST_SPAN).test('■□')).toBe(true);
    expect(compileRegex('^\\p{IsGeometricShapes}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsGeometricShapes}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsMiscellaneousSymbols}$', '', TEST_SPAN).test('☀')).toBe(true);
    expect(compileRegex('^\\p{IsMiscellaneousSymbols}$', '', TEST_SPAN).test('■')).toBe(false);
    expect(compileRegex('^\\p{IsMiscellaneousSymbols}+$', '', TEST_SPAN).test('☀☁')).toBe(true);
    expect(compileRegex('^\\p{IsMiscellaneousSymbols}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsMiscellaneousSymbols}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsDingbats}$', '', TEST_SPAN).test('✀')).toBe(true);
    expect(compileRegex('^\\p{IsDingbats}$', '', TEST_SPAN).test('⠀')).toBe(false);
    expect(compileRegex('^\\p{IsDingbats}+$', '', TEST_SPAN).test('✀✁')).toBe(true);
    expect(compileRegex('^\\p{IsDingbats}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsDingbats}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsBraillePatterns}$', '', TEST_SPAN).test('⠀')).toBe(true);
    expect(compileRegex('^\\p{IsBraillePatterns}$', '', TEST_SPAN).test('⺀')).toBe(false);
    expect(compileRegex('^\\p{IsBraillePatterns}+$', '', TEST_SPAN).test('⠀⠁')).toBe(true);
    expect(compileRegex('^\\p{IsBraillePatterns}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsBraillePatterns}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCJKRadicalsSupplement}$', '', TEST_SPAN).test('⺀')).toBe(true);
    expect(compileRegex('^\\p{IsCJKRadicalsSupplement}$', '', TEST_SPAN).test('⼀')).toBe(false);
    expect(compileRegex('^\\p{IsCJKRadicalsSupplement}+$', '', TEST_SPAN).test('⺀⺁')).toBe(true);
    expect(compileRegex('^\\p{IsCJKRadicalsSupplement}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCJKRadicalsSupplement}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsKangxiRadicals}$', '', TEST_SPAN).test('⼀')).toBe(true);
    expect(compileRegex('^\\p{IsKangxiRadicals}$', '', TEST_SPAN).test('⿰')).toBe(false);
    expect(compileRegex('^\\p{IsKangxiRadicals}+$', '', TEST_SPAN).test('⼀⼁')).toBe(true);
    expect(compileRegex('^\\p{IsKangxiRadicals}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsKangxiRadicals}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsIdeographicDescriptionCharacters}$', '', TEST_SPAN).test('⿰')).toBe(true);
    expect(compileRegex('^\\p{IsIdeographicDescriptionCharacters}$', '', TEST_SPAN).test('　')).toBe(false);
    expect(compileRegex('^\\p{IsIdeographicDescriptionCharacters}+$', '', TEST_SPAN).test('⿰⿱')).toBe(true);
    expect(compileRegex('^\\p{IsIdeographicDescriptionCharacters}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsIdeographicDescriptionCharacters}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCJKSymbolsandPunctuation}$', '', TEST_SPAN).test('　')).toBe(true);
    expect(compileRegex('^\\p{IsCJKSymbolsandPunctuation}$', '', TEST_SPAN).test('ぁ')).toBe(false);
    expect(compileRegex('^\\p{IsCJKSymbolsandPunctuation}+$', '', TEST_SPAN).test('　、')).toBe(true);
    expect(compileRegex('^\\p{IsCJKSymbolsandPunctuation}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCJKSymbolsandPunctuation}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsHiragana}$', '', TEST_SPAN).test('ぁ')).toBe(true);
    expect(compileRegex('^\\p{IsHiragana}$', '', TEST_SPAN).test('ァ')).toBe(false);
    expect(compileRegex('^\\p{IsHiragana}+$', '', TEST_SPAN).test('ぁあ')).toBe(true);
    expect(compileRegex('^\\p{IsHiragana}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsHiragana}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsKatakana}$', '', TEST_SPAN).test('ァ')).toBe(true);
    expect(compileRegex('^\\p{IsKatakana}$', '', TEST_SPAN).test('ㄅ')).toBe(false);
    expect(compileRegex('^\\p{IsKatakana}+$', '', TEST_SPAN).test('ァア')).toBe(true);
    expect(compileRegex('^\\p{IsKatakana}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsKatakana}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsBopomofo}$', '', TEST_SPAN).test('ㄅ')).toBe(true);
    expect(compileRegex('^\\p{IsBopomofo}$', '', TEST_SPAN).test('㄰')).toBe(false);
    expect(compileRegex('^\\p{IsBopomofo}+$', '', TEST_SPAN).test('ㄅㄆ')).toBe(true);
    expect(compileRegex('^\\p{IsBopomofo}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsBopomofo}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsHangulCompatibilityJamo}$', '', TEST_SPAN).test('㄰')).toBe(true);
    expect(compileRegex('^\\p{IsHangulCompatibilityJamo}$', '', TEST_SPAN).test('ㄅ')).toBe(false);
    expect(compileRegex('^\\p{IsHangulCompatibilityJamo}+$', '', TEST_SPAN).test('㄰ㄱ')).toBe(true);
    expect(compileRegex('^\\p{IsHangulCompatibilityJamo}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsHangulCompatibilityJamo}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsKanbun}$', '', TEST_SPAN).test(String.fromCodePoint(0x3190))).toBe(true);
    expect(compileRegex('^\\p{IsKanbun}$', '', TEST_SPAN).test(String.fromCodePoint(0x31a0))).toBe(false);
    expect(compileRegex('^\\p{IsKanbun}+$', '', TEST_SPAN).test(String.fromCodePoint(0x3190, 0x3191))).toBe(true);
    expect(compileRegex('^\\p{IsKanbun}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsKanbun}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsBopomofoExtended}$', '', TEST_SPAN).test(String.fromCodePoint(0x31a0))).toBe(true);
    expect(compileRegex('^\\p{IsBopomofoExtended}$', '', TEST_SPAN).test(String.fromCodePoint(0x3200))).toBe(false);
    expect(compileRegex('^\\p{IsBopomofoExtended}+$', '', TEST_SPAN).test(String.fromCodePoint(0x31a0, 0x31a1))).toBe(true);
    expect(compileRegex('^\\p{IsBopomofoExtended}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsBopomofoExtended}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsEnclosedCJKLettersandMonths}$', '', TEST_SPAN).test(String.fromCodePoint(0x3200))).toBe(true);
    expect(compileRegex('^\\p{IsEnclosedCJKLettersandMonths}$', '', TEST_SPAN).test(String.fromCodePoint(0x3300))).toBe(false);
    expect(compileRegex('^\\p{IsEnclosedCJKLettersandMonths}+$', '', TEST_SPAN).test(String.fromCodePoint(0x3200, 0x3201))).toBe(true);
    expect(compileRegex('^\\p{IsEnclosedCJKLettersandMonths}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsEnclosedCJKLettersandMonths}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCJKCompatibility}$', '', TEST_SPAN).test(String.fromCodePoint(0x3300))).toBe(true);
    expect(compileRegex('^\\p{IsCJKCompatibility}$', '', TEST_SPAN).test(String.fromCodePoint(0x3400))).toBe(false);
    expect(compileRegex('^\\p{IsCJKCompatibility}+$', '', TEST_SPAN).test(String.fromCodePoint(0x3300, 0x3301))).toBe(true);
    expect(compileRegex('^\\p{IsCJKCompatibility}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCJKCompatibility}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCJKUnifiedIdeographsExtensionA}$', '', TEST_SPAN).test(String.fromCodePoint(0x3400))).toBe(true);
    expect(compileRegex('^\\p{IsCJKUnifiedIdeographsExtensionA}$', '', TEST_SPAN).test('一')).toBe(false);
    expect(compileRegex('^\\p{IsCJKUnifiedIdeographsExtensionA}+$', '', TEST_SPAN).test(String.fromCodePoint(0x3400, 0x3401))).toBe(true);
    expect(compileRegex('^\\p{IsCJKUnifiedIdeographsExtensionA}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCJKUnifiedIdeographsExtensionA}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCJKUnifiedIdeographs}$', '', TEST_SPAN).test('一')).toBe(true);
    expect(compileRegex('^\\p{IsCJKUnifiedIdeographs}$', '', TEST_SPAN).test(String.fromCodePoint(0xa000))).toBe(false);
    expect(compileRegex('^\\p{IsCJKUnifiedIdeographs}+$', '', TEST_SPAN).test('一丁')).toBe(true);
    expect(compileRegex('^\\p{IsCJKUnifiedIdeographs}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCJKUnifiedIdeographs}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsYiSyllables}$', '', TEST_SPAN).test(String.fromCodePoint(0xa000))).toBe(true);
    expect(compileRegex('^\\p{IsYiSyllables}$', '', TEST_SPAN).test(String.fromCodePoint(0xa490))).toBe(false);
    expect(compileRegex('^\\p{IsYiSyllables}+$', '', TEST_SPAN).test(String.fromCodePoint(0xa000, 0xa001))).toBe(true);
    expect(compileRegex('^\\p{IsYiSyllables}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsYiSyllables}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsYiRadicals}$', '', TEST_SPAN).test(String.fromCodePoint(0xa490))).toBe(true);
    expect(compileRegex('^\\p{IsYiRadicals}$', '', TEST_SPAN).test('가')).toBe(false);
    expect(compileRegex('^\\p{IsYiRadicals}+$', '', TEST_SPAN).test(String.fromCodePoint(0xa490, 0xa491))).toBe(true);
    expect(compileRegex('^\\p{IsYiRadicals}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsYiRadicals}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsHangulSyllables}$', '', TEST_SPAN).test('가')).toBe(true);
    expect(compileRegex('^\\p{IsHangulSyllables}$', '', TEST_SPAN).test(String.fromCodePoint(0xe000))).toBe(false);
    expect(compileRegex('^\\p{IsHangulSyllables}+$', '', TEST_SPAN).test('가각')).toBe(true);
    expect(compileRegex('^\\p{IsHangulSyllables}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsHangulSyllables}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsPrivateUseArea}$', '', TEST_SPAN).test(String.fromCodePoint(0xe000))).toBe(true);
    expect(compileRegex('^\\p{IsPrivateUseArea}$', '', TEST_SPAN).test('가')).toBe(false);
    expect(compileRegex('^\\p{IsPrivateUseArea}+$', '', TEST_SPAN).test(String.fromCodePoint(0xe000, 0xe001))).toBe(true);
    expect(compileRegex('^\\p{IsPrivateUseArea}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsPrivateUseArea}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCJKCompatibilityIdeographs}$', '', TEST_SPAN).test(String.fromCodePoint(0xf900))).toBe(true);
    expect(compileRegex('^\\p{IsCJKCompatibilityIdeographs}$', '', TEST_SPAN).test(String.fromCodePoint(0xfb00))).toBe(false);
    expect(compileRegex('^\\p{IsCJKCompatibilityIdeographs}+$', '', TEST_SPAN).test(String.fromCodePoint(0xf900, 0xf901))).toBe(true);
    expect(compileRegex('^\\p{IsCJKCompatibilityIdeographs}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCJKCompatibilityIdeographs}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsAlphabeticPresentationForms}$', '', TEST_SPAN).test(String.fromCodePoint(0xfb00))).toBe(true);
    expect(compileRegex('^\\p{IsAlphabeticPresentationForms}$', '', TEST_SPAN).test(String.fromCodePoint(0xfb50))).toBe(false);
    expect(compileRegex('^\\p{IsAlphabeticPresentationForms}+$', '', TEST_SPAN).test(String.fromCodePoint(0xfb00, 0xfb01))).toBe(true);
    expect(compileRegex('^\\p{IsAlphabeticPresentationForms}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsAlphabeticPresentationForms}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsArabicPresentationForms-A}$', '', TEST_SPAN).test(String.fromCodePoint(0xfb50))).toBe(true);
    expect(compileRegex('^\\p{IsArabicPresentationForms-A}$', '', TEST_SPAN).test(String.fromCodePoint(0xfe20))).toBe(false);
    expect(compileRegex('^\\p{IsArabicPresentationForms-A}+$', '', TEST_SPAN).test(String.fromCodePoint(0xfb50, 0xfb51))).toBe(true);
    expect(compileRegex('^\\p{IsArabicPresentationForms-A}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsArabicPresentationForms-A}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCombiningHalfMarks}$', '', TEST_SPAN).test(String.fromCodePoint(0xfe20))).toBe(true);
    expect(compileRegex('^\\p{IsCombiningHalfMarks}$', '', TEST_SPAN).test(String.fromCodePoint(0xfe30))).toBe(false);
    expect(compileRegex('^\\p{IsCombiningHalfMarks}+$', '', TEST_SPAN).test(String.fromCodePoint(0xfe20, 0xfe21))).toBe(true);
    expect(compileRegex('^\\p{IsCombiningHalfMarks}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCombiningHalfMarks}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCJKCompatibilityForms}$', '', TEST_SPAN).test(String.fromCodePoint(0xfe30))).toBe(true);
    expect(compileRegex('^\\p{IsCJKCompatibilityForms}$', '', TEST_SPAN).test(String.fromCodePoint(0xfe50))).toBe(false);
    expect(compileRegex('^\\p{IsCJKCompatibilityForms}+$', '', TEST_SPAN).test(String.fromCodePoint(0xfe30, 0xfe31))).toBe(true);
    expect(compileRegex('^\\p{IsCJKCompatibilityForms}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCJKCompatibilityForms}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsSmallFormVariants}$', '', TEST_SPAN).test(String.fromCodePoint(0xfe50))).toBe(true);
    expect(compileRegex('^\\p{IsSmallFormVariants}$', '', TEST_SPAN).test(String.fromCodePoint(0xfe70))).toBe(false);
    expect(compileRegex('^\\p{IsSmallFormVariants}+$', '', TEST_SPAN).test(String.fromCodePoint(0xfe50, 0xfe51))).toBe(true);
    expect(compileRegex('^\\p{IsSmallFormVariants}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsSmallFormVariants}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsArabicPresentationForms-B}$', '', TEST_SPAN).test(String.fromCodePoint(0xfe70))).toBe(true);
    expect(compileRegex('^\\p{IsArabicPresentationForms-B}$', '', TEST_SPAN).test('Ａ')).toBe(false);
    expect(compileRegex('^\\p{IsArabicPresentationForms-B}+$', '', TEST_SPAN).test(String.fromCodePoint(0xfe70, 0xfe71))).toBe(true);
    expect(compileRegex('^\\p{IsArabicPresentationForms-B}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsArabicPresentationForms-B}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsHalfwidthandFullwidthForms}$', '', TEST_SPAN).test('Ａ')).toBe(true);
    expect(compileRegex('^\\p{IsHalfwidthandFullwidthForms}$', '', TEST_SPAN).test(String.fromCodePoint(0xfb00))).toBe(false);
    expect(compileRegex('^\\p{IsHalfwidthandFullwidthForms}+$', '', TEST_SPAN).test('ＡＢ')).toBe(true);
    expect(compileRegex('^\\p{IsHalfwidthandFullwidthForms}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsHalfwidthandFullwidthForms}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsSpecials}$', '', TEST_SPAN).test(String.fromCodePoint(0xfff0))).toBe(true);
    expect(compileRegex('^\\p{IsSpecials}$', '', TEST_SPAN).test('Ａ')).toBe(false);
    expect(compileRegex('^\\p{IsSpecials}+$', '', TEST_SPAN).test(String.fromCodePoint(0xfff0, 0xfff9))).toBe(true);
    expect(compileRegex('^\\p{IsSpecials}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsSpecials}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsLatin-1Supplement}$', '', TEST_SPAN).test('À')).toBe(true);
    expect(compileRegex('^\\p{IsLatin-1Supplement}$', '', TEST_SPAN).test('Ā')).toBe(false);
    expect(compileRegex('^\\p{IsLatin-1Supplement}+$', '', TEST_SPAN).test('ÀÁ')).toBe(true);
    expect(compileRegex('^\\p{IsLatin-1Supplement}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsLatin-1Supplement}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsLatinExtended-A}$', '', TEST_SPAN).test('Ā')).toBe(true);
    expect(compileRegex('^\\p{IsLatinExtended-A}$', '', TEST_SPAN).test(String.fromCodePoint(0x180))).toBe(false);
    expect(compileRegex('^\\p{IsLatinExtended-A}+$', '', TEST_SPAN).test('Āā')).toBe(true);
    expect(compileRegex('^\\p{IsLatinExtended-A}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsLatinExtended-A}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsLatinExtended-B}$', '', TEST_SPAN).test(String.fromCodePoint(0x180))).toBe(true);
    expect(compileRegex('^\\p{IsLatinExtended-B}$', '', TEST_SPAN).test(String.fromCodePoint(0x250))).toBe(false);
    expect(compileRegex('^\\p{IsLatinExtended-B}+$', '', TEST_SPAN).test(String.fromCodePoint(0x180, 0x181))).toBe(true);
    expect(compileRegex('^\\p{IsLatinExtended-B}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsLatinExtended-B}?$', '', TEST_SPAN).test('')).toBe(true);
    expect(compileRegex('^\\p{IsCombiningDiacriticalMarks}$', '', TEST_SPAN).test(String.fromCodePoint(0x300))).toBe(true);
    expect(compileRegex('^\\p{IsCombiningDiacriticalMarks}$', '', TEST_SPAN).test(String.fromCodePoint(0x370))).toBe(false);
    expect(compileRegex('^\\p{IsCombiningDiacriticalMarks}+$', '', TEST_SPAN).test(String.fromCodePoint(0x300, 0x301))).toBe(true);
    expect(compileRegex('^\\p{IsCombiningDiacriticalMarks}+$', '', TEST_SPAN).test('a')).toBe(false);
    expect(compileRegex('^\\p{IsCombiningDiacriticalMarks}?$', '', TEST_SPAN).test('')).toBe(true);

    const supplementaryFixtures = [
      {
        alias: 'IsOgham',
        single: String.fromCodePoint(0x1680),
        missing: String.fromCodePoint(0x16a0),
        repeated: String.fromCodePoint(0x1680, 0x1681),
      },
      {
        alias: 'IsRunic',
        single: String.fromCodePoint(0x16a0),
        missing: String.fromCodePoint(0x1700),
        repeated: String.fromCodePoint(0x16a0, 0x16a1),
      },
      {
        alias: 'IsKhmer',
        single: String.fromCodePoint(0x1780),
        missing: String.fromCodePoint(0x1800),
        repeated: String.fromCodePoint(0x1780, 0x1781),
      },
      {
        alias: 'IsMongolian',
        single: String.fromCodePoint(0x1800),
        missing: String.fromCodePoint(0x18b0),
        repeated: String.fromCodePoint(0x1800, 0x1801),
      },
      {
        alias: 'IsLatinExtendedAdditional',
        single: String.fromCodePoint(0x1e00),
        missing: String.fromCodePoint(0x1f00),
        repeated: String.fromCodePoint(0x1e00, 0x1e01),
      },
      {
        alias: 'IsGreekExtended',
        single: String.fromCodePoint(0x1f00),
        missing: String.fromCodePoint(0x2000),
        repeated: String.fromCodePoint(0x1f00, 0x1f01),
      },
      {
        alias: 'IsHighSurrogates',
        single: String.fromCharCode(0xd800),
        missing: String.fromCharCode(0xdc00),
        repeated: String.fromCharCode(0xd800, 0xd801),
      },
      {
        alias: 'IsLowSurrogates',
        single: String.fromCharCode(0xdc00),
        missing: String.fromCharCode(0xd800),
        repeated: String.fromCharCode(0xdc00, 0xdc01),
      },
      {
        alias: 'IsOldItalic',
        single: String.fromCodePoint(0x10300),
        missing: String.fromCodePoint(0x10330),
        repeated: String.fromCodePoint(0x10300, 0x10301),
      },
      {
        alias: 'IsGothic',
        single: String.fromCodePoint(0x10330),
        missing: String.fromCodePoint(0x10400),
        repeated: String.fromCodePoint(0x10330, 0x10331),
      },
      {
        alias: 'IsDeseret',
        single: String.fromCodePoint(0x10400),
        missing: String.fromCodePoint(0x10450),
        repeated: String.fromCodePoint(0x10400, 0x10401),
      },
      {
        alias: 'IsByzantineMusicalSymbols',
        single: String.fromCodePoint(0x1d000),
        missing: String.fromCodePoint(0x1d100),
        repeated: String.fromCodePoint(0x1d000, 0x1d001),
      },
      {
        alias: 'IsMusicalSymbols',
        single: String.fromCodePoint(0x1d100),
        missing: String.fromCodePoint(0x1d400),
        repeated: String.fromCodePoint(0x1d100, 0x1d101),
      },
      {
        alias: 'IsMathematicalAlphanumericSymbols',
        single: String.fromCodePoint(0x1d400),
        missing: String.fromCodePoint(0x1d800),
        repeated: String.fromCodePoint(0x1d400, 0x1d401),
      },
      {
        alias: 'IsCJKUnifiedIdeographsExtensionB',
        single: String.fromCodePoint(0x20000),
        missing: String.fromCodePoint(0x2f800),
        repeated: String.fromCodePoint(0x20000, 0x20001),
      },
      {
        alias: 'IsCJKCompatibilityIdeographsSupplement',
        single: String.fromCodePoint(0x2f800),
        missing: String.fromCodePoint(0xe0000),
        repeated: String.fromCodePoint(0x2f800, 0x2f801),
      },
      {
        alias: 'IsTags',
        single: String.fromCodePoint(0xe0000),
        missing: String.fromCodePoint(0xf0000),
        repeated: String.fromCodePoint(0xe0000, 0xe0001),
      },
      {
        alias: 'IsSupplementaryPrivateUseArea-A',
        single: String.fromCodePoint(0xf0000),
        missing: String.fromCodePoint(0x100000),
        repeated: String.fromCodePoint(0xf0000, 0xf0001),
      },
      {
        alias: 'IsSupplementaryPrivateUseArea-B',
        single: String.fromCodePoint(0x100000),
        missing: String.fromCodePoint(0xe0000),
        repeated: String.fromCodePoint(0x100000, 0x100001),
      },
    ] as const;

    for (const fixture of supplementaryFixtures) {
      expect(compileRegex(`^\\p{${fixture.alias}}$`, '', TEST_SPAN).test(fixture.single)).toBe(true);
      expect(compileRegex(`^\\p{${fixture.alias}}$`, '', TEST_SPAN).test(fixture.missing)).toBe(false);
      expect(compileRegex(`^\\p{${fixture.alias}}+$`, '', TEST_SPAN).test(fixture.repeated)).toBe(true);
      expect(compileRegex(`^\\p{${fixture.alias}}+$`, '', TEST_SPAN).test('a')).toBe(false);
      expect(compileRegex(`^\\p{${fixture.alias}}?$`, '', TEST_SPAN).test('')).toBe(true);
    }
  });

  it('raises FOCA0002 for unsupported regex flags in the translator fixture suite', () => {
    let thrown: unknown;

    try {
      toEcmaRegexFlags('z', TEST_SPAN);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(XPathError);
    expect(thrown).toMatchObject({ code: 'FOCA0002' });
  });
});