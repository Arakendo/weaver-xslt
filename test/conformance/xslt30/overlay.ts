import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { SelectionDisposition, VerificationBackend } from '../ledger.js';
import { createVerificationCaseKey, VERIFICATION_BACKENDS } from '../ledger.js';

export const XSLT30_SUITE = 'W3C XSLT 3.0 test suite';
export const XSLT30_REVISION = '6f8fd9e966ae74a251a2604abef9d904c7bc5c9b';

export type Xslt30OverlayCase = {
  readonly setFile: string;
  readonly caseName: string;
  readonly selection: SelectionDisposition;
  readonly rationale?: string;
};

export type Xslt30Overlay = {
  readonly schemaVersion: 1;
  readonly suite: typeof XSLT30_SUITE;
  readonly suiteRevision: typeof XSLT30_REVISION;
  readonly profile: string;
  readonly requiredBackends: readonly VerificationBackend[];
  readonly selectionRationale: string;
  readonly cases: readonly Xslt30OverlayCase[];
};

const DEFAULT_OVERLAY_PATH = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'corpus',
  'overlays',
  'xslt30',
  'weaver-mvp3-v1.json',
);

export function loadXslt30Overlay(path = DEFAULT_OVERLAY_PATH): Xslt30Overlay {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isRecord(value)) {
    throw new Error('XSLT30 overlay root must be an object.');
  }
  if (value.schemaVersion !== 1) {
    throw new Error(`Unsupported XSLT30 overlay schema version ${String(value.schemaVersion)}.`);
  }
  if (value.suite !== XSLT30_SUITE || value.suiteRevision !== XSLT30_REVISION) {
    throw new Error("XSLT30 overlay suite identity does not match Weaver's pinned corpus.");
  }
  if (typeof value.profile !== 'string' || value.profile.length === 0) {
    throw new Error('XSLT30 overlay requires a profile name.');
  }
  if (typeof value.selectionRationale !== 'string' || value.selectionRationale.length === 0) {
    throw new Error('XSLT30 overlay requires a selection rationale.');
  }
  if (!Array.isArray(value.requiredBackends) || value.requiredBackends.length === 0) {
    throw new Error('XSLT30 overlay requires at least one execution backend.');
  }
  const requiredBackends = value.requiredBackends.map((backend) => {
    if (!isVerificationBackend(backend)) {
      throw new Error(`Unknown XSLT30 overlay backend ${String(backend)}.`);
    }
    return backend;
  });
  if (new Set(requiredBackends).size !== requiredBackends.length) {
    throw new Error('XSLT30 overlay contains duplicate execution backends.');
  }
  if (!Array.isArray(value.cases) || value.cases.length === 0) {
    throw new Error('XSLT30 overlay requires at least one case.');
  }

  const cases = value.cases.map((entry, index) => parseOverlayCase(entry, index));
  const identities = new Set<string>();
  for (const testCase of cases) {
    const key = createVerificationCaseKey({
      suite: XSLT30_SUITE,
      suiteRevision: XSLT30_REVISION,
      setFile: testCase.setFile,
      caseName: testCase.caseName,
    });
    if (identities.has(key)) {
      throw new Error(`XSLT30 overlay contains duplicate case identity ${key}.`);
    }
    identities.add(key);
  }

  return {
    schemaVersion: 1,
    suite: XSLT30_SUITE,
    suiteRevision: XSLT30_REVISION,
    profile: value.profile,
    requiredBackends,
    selectionRationale: value.selectionRationale,
    cases,
  };
}

function parseOverlayCase(value: unknown, index: number): Xslt30OverlayCase {
  if (!isRecord(value)) {
    throw new Error(`XSLT30 overlay case ${index} must be an object.`);
  }
  if (typeof value.setFile !== 'string' || value.setFile.length === 0) {
    throw new Error(`XSLT30 overlay case ${index} requires setFile.`);
  }
  if (typeof value.caseName !== 'string' || value.caseName.length === 0) {
    throw new Error(`XSLT30 overlay case ${index} requires caseName.`);
  }
  if (!isSelectionDisposition(value.selection)) {
    throw new Error(
      `XSLT30 overlay case ${index} has unknown selection ${String(value.selection)}.`,
    );
  }
  if (value.rationale !== undefined && typeof value.rationale !== 'string') {
    throw new Error(`XSLT30 overlay case ${index} rationale must be a string.`);
  }

  return {
    setFile: value.setFile,
    caseName: value.caseName,
    selection: value.selection,
    ...(value.rationale === undefined ? {} : { rationale: value.rationale }),
  };
}

function isSelectionDisposition(value: unknown): value is SelectionDisposition {
  return [
    'selected',
    'profile-excluded',
    'engine-unsupported',
    'harness-unsupported',
    'metadata-failure',
  ].includes(value as SelectionDisposition);
}

function isVerificationBackend(value: unknown): value is VerificationBackend {
  return VERIFICATION_BACKENDS.includes(value as VerificationBackend);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
