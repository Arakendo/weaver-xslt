import { describe, expect, it } from 'vitest';

import type { VerificationInventoryEntry, VerificationObservation } from './ledger.js';
import { summarizeVerificationLedger } from './ledger.js';

const SUITE = 'synthetic-suite';
const REVISION = '0123456789abcdef';

function inventoryEntry(
  caseName: string,
  selection: VerificationInventoryEntry['selection'],
): VerificationInventoryEntry {
  return {
    suite: SUITE,
    suiteRevision: REVISION,
    setFile: 'set.xml',
    caseName,
    selection,
  };
}

function observation(
  caseName: string,
  backend: VerificationObservation['backend'],
  execution: VerificationObservation['execution'],
): VerificationObservation {
  return {
    suite: SUITE,
    suiteRevision: REVISION,
    setFile: 'set.xml',
    caseName,
    backend,
    execution,
  };
}

describe('verification ledger conservation', () => {
  it('conserves selection and required-backend execution denominators', () => {
    const inventory = [
      inventoryEntry('pass', 'selected'),
      inventoryEntry('mismatch', 'selected'),
      inventoryEntry('profile', 'profile-excluded'),
      inventoryEntry('engine', 'engine-unsupported'),
      inventoryEntry('harness', 'harness-unsupported'),
      inventoryEntry('metadata', 'metadata-failure'),
    ];
    const observations = [
      observation('pass', 'interpreter', 'passed'),
      observation('mismatch', 'interpreter', 'semantic-mismatch'),
      observation('pass', 'native-direct', 'passed'),
    ];

    const summary = summarizeVerificationLedger(inventory, observations, [
      'interpreter',
      'native-direct',
    ]);

    expect(summary.selection).toEqual({
      inventoried: 6,
      selected: 2,
      'profile-excluded': 1,
      'engine-unsupported': 1,
      'harness-unsupported': 1,
      'metadata-failure': 1,
    });
    expect(summary.executionByBackend.interpreter).toEqual({
      selected: 2,
      passed: 1,
      'semantic-mismatch': 1,
      'diagnostic-mismatch': 0,
      'engine-failure': 0,
      'harness-failure': 0,
      incomplete: 0,
    });
    expect(summary.executionByBackend['native-direct']?.incomplete).toBe(1);
    expect(summary.executionByBackend['native-emitted']).toBeUndefined();
  });

  it('rejects duplicate inventory and observation identities', () => {
    const selected = inventoryEntry('case', 'selected');
    const passed = observation('case', 'interpreter', 'passed');

    expect(() => summarizeVerificationLedger([selected, selected], [], ['interpreter'])).toThrow(
      /Duplicate verification inventory identity/,
    );
    expect(() =>
      summarizeVerificationLedger([selected], [passed, passed], ['interpreter']),
    ).toThrow(/Duplicate verification observation/);
  });

  it('rejects unknown, unselected, and unrequired observations', () => {
    const selected = inventoryEntry('selected', 'selected');
    const excluded = inventoryEntry('excluded', 'profile-excluded');

    expect(() =>
      summarizeVerificationLedger(
        [selected],
        [observation('unknown', 'interpreter', 'passed')],
        ['interpreter'],
      ),
    ).toThrow(/has no inventory entry/);
    expect(() =>
      summarizeVerificationLedger(
        [selected, excluded],
        [observation('excluded', 'interpreter', 'passed')],
        ['interpreter'],
      ),
    ).toThrow(/unselected case/);
    expect(() =>
      summarizeVerificationLedger(
        [selected],
        [observation('selected', 'native-direct', 'passed')],
        ['interpreter'],
      ),
    ).toThrow(/not required by this profile/);
  });
});
