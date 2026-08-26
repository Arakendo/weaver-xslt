import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Element } from '@xmldom/xmldom';

import { parseXml } from '../../../src/xml/parse.js';
import type {
  SelectionDisposition,
  VerificationBackend,
  VerificationInventoryEntry,
} from '../ledger.js';
import { VERIFICATION_BACKENDS } from '../ledger.js';
import type { Qt3CaseExclusionReason, Qt3SliceCase } from './harness.js';
import { getQt3CaseExclusion, loadQt3SliceCases } from './harness.js';

export const QT3_SUITE = 'W3C QT3 test suite';
export const QT3_REVISION = '83993587711dbd5c18ed846385ec37d079d6e492';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const QT3_ROOT = join(REPO_ROOT, 'vendor', 'qt3tests');
const DEFAULT_PROFILE_PATH = join(REPO_ROOT, 'corpus', 'overlays', 'qt3', 'weaver-mvp2-v1.json');

export type Qt3ProfileOverlay = {
  readonly schemaVersion: 1;
  readonly suite: typeof QT3_SUITE;
  readonly suiteRevision: typeof QT3_REVISION;
  readonly profile: string;
  readonly requiredBackends: readonly VerificationBackend[];
  readonly selectionRationale: string;
  readonly setFiles: readonly string[];
  readonly exclusionDisposition: Readonly<Record<Qt3CaseExclusionReason, SelectionDisposition>>;
  readonly expected: {
    readonly inventoried: number;
    readonly selectionTotals: Readonly<Record<SelectionDisposition, number>>;
    readonly outcomeDigest: string;
  };
};

export type Qt3ProfileInventoryEntry = VerificationInventoryEntry & {
  readonly testCase?: Qt3SliceCase;
  readonly reason?: string;
  readonly detail?: string;
};

export function loadQt3ProfileOverlay(path = DEFAULT_PROFILE_PATH): Qt3ProfileOverlay {
  const value = JSON.parse(readFileSync(path, 'utf8')) as Qt3ProfileOverlay;
  if (
    value.schemaVersion !== 1 ||
    value.suite !== QT3_SUITE ||
    value.suiteRevision !== QT3_REVISION
  ) {
    throw new Error("QT3 profile identity does not match Weaver's pinned corpus.");
  }
  if (value.profile.length === 0 || value.selectionRationale.length === 0) {
    throw new Error('QT3 profile requires a name and selection rationale.');
  }
  if (value.setFiles.length === 0 || new Set(value.setFiles).size !== value.setFiles.length) {
    throw new Error('QT3 profile requires unique test-set paths.');
  }
  if (
    value.requiredBackends.length === 0 ||
    value.requiredBackends.some((backend) => !VERIFICATION_BACKENDS.includes(backend))
  ) {
    throw new Error('QT3 profile contains an invalid required backend.');
  }

  return value;
}

export function buildQt3ProfileInventory(overlay: Qt3ProfileOverlay): Qt3ProfileInventoryEntry[] {
  const loadedCases = loadQt3SliceCases(overlay.setFiles);
  const loadedByIdentity = new Map(
    loadedCases.map((testCase) => [identityKey(testCase.setFile, testCase.caseName), testCase]),
  );
  const inventory: Qt3ProfileInventoryEntry[] = [];

  for (const setFile of overlay.setFiles) {
    const document = parseXml(readFileSync(join(QT3_ROOT, setFile), 'utf8'));
    const caseElements = Array.from(document.getElementsByTagName('test-case')) as Element[];

    for (const caseElement of caseElements) {
      const caseName = caseElement.getAttribute('name') ?? '<unnamed>';
      const testCase = loadedByIdentity.get(identityKey(setFile, caseName));
      if (testCase === undefined) {
        inventory.push({
          suite: overlay.suite,
          suiteRevision: overlay.suiteRevision,
          setFile,
          caseName,
          selection: 'metadata-failure',
          reason: 'unsupported-test-or-assertion-metadata',
        });
        continue;
      }

      const exclusion = getQt3CaseExclusion(testCase);
      inventory.push({
        suite: overlay.suite,
        suiteRevision: overlay.suiteRevision,
        setFile,
        caseName,
        selection:
          exclusion === undefined ? 'selected' : overlay.exclusionDisposition[exclusion.reason],
        testCase,
        ...(exclusion === undefined
          ? {}
          : {
              reason: exclusion.reason,
              ...(exclusion.detail === undefined ? {} : { detail: exclusion.detail }),
            }),
      });
    }
  }

  return inventory;
}

export function createQt3ProfileOutcomeDigest(
  inventory: readonly Qt3ProfileInventoryEntry[],
): string {
  const lines = inventory
    .map((entry) =>
      JSON.stringify([
        entry.setFile,
        entry.caseName,
        entry.selection,
        entry.reason ?? null,
        entry.detail ?? null,
      ]),
    )
    .sort();

  return createHash('sha256').update(lines.join('\n')).digest('hex');
}

function identityKey(setFile: string, caseName: string): string {
  return JSON.stringify([setFile, caseName]);
}
