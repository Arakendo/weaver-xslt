export function findNextExecutableLineIndex(
  moduleLines: readonly string[],
  startIndex: number,
): number {
  for (let index = startIndex + 1; index < moduleLines.length; index += 1) {
    const trimmedLine = moduleLines[index]?.trim() ?? '';
    if (trimmedLine.length === 0) {
      continue;
    }

    if (trimmedLine.startsWith('/** ') && trimmedLine.endsWith(' */')) {
      continue;
    }

    return index;
  }

  throw new Error(`No executable line found after module line ${startIndex + 1}.`);
}

export function decodeSourceLineMappings(mappings: string): number[] {
  const decodedLines: number[] = [];
  let previousSourceLine = 0;

  for (const encodedLine of mappings.split(';')) {
    if (encodedLine.length === 0) {
      decodedLines.push(previousSourceLine);
      continue;
    }

    let offset = 0;
    offset = decodeVlq(encodedLine, offset).nextOffset;
    offset = decodeVlq(encodedLine, offset).nextOffset;
    const decodedSourceLine = decodeVlq(encodedLine, offset);
    previousSourceLine += decodedSourceLine.value;
    decodedLines.push(previousSourceLine);
  }

  return decodedLines;
}

function decodeVlq(
  text: string,
  startOffset: number,
): { readonly value: number; readonly nextOffset: number } {
  let offset = startOffset;
  let shift = 0;
  let value = 0;

  while (true) {
    const character = text[offset];
    if (character === undefined) {
      throw new Error('Unexpected end of VLQ segment.');
    }

    const digit = BASE64_VLQ_DIGITS.indexOf(character);
    if (digit < 0) {
      throw new Error(`Invalid base64 VLQ digit: ${character}`);
    }

    offset += 1;
    value |= (digit & 31) << shift;
    if ((digit & 32) === 0) {
      const isNegative = (value & 1) === 1;
      return {
        value: isNegative ? -(value >> 1) : value >> 1,
        nextOffset: offset,
      };
    }

    shift += 5;
  }
}

const BASE64_VLQ_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
