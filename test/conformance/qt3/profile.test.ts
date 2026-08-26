import { describe, expect, it } from 'vitest';

import {
  buildQt3ProfileInventory,
  createQt3ProfileOutcomeDigest,
  loadQt3ProfileOverlay,
} from './profile.js';
import type { SelectionDisposition } from '../ledger.js';

describe('QT3 MVP+2 profile', () => {
  it('conserves its versioned selection outcomes', () => {
    const overlay = loadQt3ProfileOverlay();
    const inventory = buildQt3ProfileInventory(overlay);
    const totals: Partial<Record<SelectionDisposition, number>> = {};
    for (const entry of inventory) {
      totals[entry.selection] = (totals[entry.selection] ?? 0) + 1;
    }
    const actual = {
      inventoried: inventory.length,
      selectionTotals: totals,
      outcomeDigest: createQt3ProfileOutcomeDigest(inventory),
    };

    console.log(JSON.stringify(actual, null, 2));
    expect(actual).toEqual(overlay.expected);
  });
});
