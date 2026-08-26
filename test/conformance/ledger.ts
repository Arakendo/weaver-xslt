export const VERIFICATION_BACKENDS = ['interpreter', 'native-direct', 'native-emitted'] as const;

export type VerificationBackend = (typeof VERIFICATION_BACKENDS)[number];

export type SelectionDisposition =
  | 'selected'
  | 'profile-excluded'
  | 'engine-unsupported'
  | 'harness-unsupported'
  | 'metadata-failure';

export type ExecutionDisposition =
  | 'passed'
  | 'semantic-mismatch'
  | 'diagnostic-mismatch'
  | 'engine-failure'
  | 'harness-failure';

export type VerificationCaseIdentity = {
  readonly suite: string;
  readonly suiteRevision: string;
  readonly setFile: string;
  readonly caseName: string;
};

export type VerificationInventoryEntry = VerificationCaseIdentity & {
  readonly selection: SelectionDisposition;
};

export type VerificationObservation = VerificationCaseIdentity & {
  readonly backend: VerificationBackend;
  readonly execution: ExecutionDisposition;
};

export type SelectionTotals = Readonly<Record<SelectionDisposition, number>> & {
  readonly inventoried: number;
};

export type ExecutionTotals = Readonly<Record<ExecutionDisposition | 'incomplete', number>> & {
  readonly selected: number;
};

export type VerificationLedgerSummary = {
  readonly selection: SelectionTotals;
  readonly executionByBackend: Readonly<Partial<Record<VerificationBackend, ExecutionTotals>>>;
};

export function createVerificationCaseKey(identity: VerificationCaseIdentity): string {
  return JSON.stringify([
    identity.suite,
    identity.suiteRevision,
    identity.setFile,
    identity.caseName,
  ]);
}

export function summarizeVerificationLedger(
  inventory: readonly VerificationInventoryEntry[],
  observations: readonly VerificationObservation[],
  requiredBackends: readonly VerificationBackend[],
): VerificationLedgerSummary {
  const inventoryByKey = new Map<string, VerificationInventoryEntry>();
  const selection = createSelectionTotals();

  for (const entry of inventory) {
    const key = createVerificationCaseKey(entry);
    if (inventoryByKey.has(key)) {
      throw new Error(`Duplicate verification inventory identity: ${key}`);
    }

    inventoryByKey.set(key, entry);
    selection.inventoried += 1;
    selection[entry.selection] += 1;
  }

  const requiredBackendSet = new Set<VerificationBackend>();
  for (const backend of requiredBackends) {
    if (requiredBackendSet.has(backend)) {
      throw new Error(`Duplicate required verification backend: ${backend}`);
    }
    requiredBackendSet.add(backend);
  }

  const observationKeys = new Set<string>();
  const executionByBackend: Partial<Record<VerificationBackend, MutableExecutionTotals>> = {};
  for (const backend of requiredBackendSet) {
    executionByBackend[backend] = createExecutionTotals(selection.selected);
  }

  for (const observation of observations) {
    const caseKey = createVerificationCaseKey(observation);
    const inventoryEntry = inventoryByKey.get(caseKey);
    if (inventoryEntry === undefined) {
      throw new Error(`Verification observation has no inventory entry: ${caseKey}`);
    }
    if (inventoryEntry.selection !== 'selected') {
      throw new Error(`Verification observation targets an unselected case: ${caseKey}`);
    }
    if (!requiredBackendSet.has(observation.backend)) {
      throw new Error(
        `Verification observation targets backend ${observation.backend}, which is not required by this profile.`,
      );
    }

    const observationKey = `${caseKey}:${observation.backend}`;
    if (observationKeys.has(observationKey)) {
      throw new Error(`Duplicate verification observation: ${observationKey}`);
    }
    observationKeys.add(observationKey);

    const totals = executionByBackend[observation.backend]!;
    totals[observation.execution] += 1;
    totals.incomplete -= 1;
  }

  return {
    selection,
    executionByBackend,
  };
}

type MutableSelectionTotals = {
  inventoried: number;
} & Record<SelectionDisposition, number>;

type MutableExecutionTotals = {
  selected: number;
  incomplete: number;
} & Record<ExecutionDisposition, number>;

function createSelectionTotals(): MutableSelectionTotals {
  return {
    inventoried: 0,
    selected: 0,
    'profile-excluded': 0,
    'engine-unsupported': 0,
    'harness-unsupported': 0,
    'metadata-failure': 0,
  };
}

function createExecutionTotals(selected: number): MutableExecutionTotals {
  return {
    selected,
    passed: 0,
    'semantic-mismatch': 0,
    'diagnostic-mismatch': 0,
    'engine-failure': 0,
    'harness-failure': 0,
    incomplete: selected,
  };
}
