import { XdmError, XsltError, type ErrorFrame, type RelatedLocation } from '../errors/index.js';

export function prependXsltErrorFrame(error: unknown, frame: ErrorFrame, related?: RelatedLocation): unknown {
  if (!(error instanceof XdmError)) {
    return error;
  }

  return new XsltError(
    error.code,
    error.detailMessage,
    error.location,
    error.details,
    {
      related: related === undefined ? error.related : [related, ...error.related],
      frames: [frame, ...error.frames],
      suggestions: error.suggestions,
      causes: error.causes.length === 0 ? [error] : error.causes,
    },
  );
}

export function computeLevenshteinDistance(left: string, right: string): number {
  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0] ?? 0;
    previousRow[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const temp = previousRow[rightIndex] ?? 0;
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previousRow[rightIndex] = Math.min(
        (previousRow[rightIndex] ?? 0) + 1,
        (previousRow[rightIndex - 1] ?? 0) + 1,
        previousDiagonal + substitutionCost,
      );
      previousDiagonal = temp;
    }
  }

  return previousRow[right.length] ?? right.length;
}