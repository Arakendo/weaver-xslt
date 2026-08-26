import { createHash } from 'node:crypto';

import type { ExecutionDisposition, VerificationBackend } from '../ledger.js';
import { runXslt30Case } from './harness.js';
import {
  inventoryXslt30Metadata,
  loadXslt30FamilyCaseNames,
  rankXslt30CandidateFamilies,
} from './metadataInventory.js';

const BACKENDS: readonly VerificationBackend[] = ['interpreter', 'native-direct', 'native-emitted'];
const ADMITTED_FAMILIES = new Set([
  'tests/decl/template/_template-test-set.xml',
  'tests/expr/path/_path-test-set.xml',
]);

export type Xslt30FamilyRankingReport = ReturnType<typeof createXslt30FamilyRanking>;

export function createXslt30FamilyRanking(repositoryRoot: string) {
  const inventory = inventoryXslt30Metadata(repositoryRoot);
  const candidates = rankXslt30CandidateFamilies(inventory).map((family) => {
    const outcomes = loadXslt30FamilyCaseNames(repositoryRoot, family.setFile).map((caseName) => ({
      caseName,
      execution: Object.fromEntries(
        BACKENDS.map((backend) => [
          backend,
          runXslt30Case({ setFile: family.setFile, caseName, selection: 'selected' }, backend)
            .execution,
        ]),
      ) as Readonly<Record<VerificationBackend, ExecutionDisposition>>,
    }));

    return {
      name: family.name,
      setFile: family.setFile,
      testCases: family.testCases,
      metadataShapes: family.metadataShapes,
      alreadyAdmitted: ADMITTED_FAMILIES.has(family.setFile),
      backendPassed: Object.fromEntries(
        BACKENDS.map((backend) => [
          backend,
          outcomes.filter((testCase) => testCase.execution[backend] === 'passed').length,
        ]),
      ) as Readonly<Record<VerificationBackend, number>>,
      outcomeDigest: createHash('sha256').update(JSON.stringify(outcomes)).digest('hex'),
    };
  });

  candidates.sort(compareCandidates);

  return {
    schemaVersion: 1 as const,
    suite: inventory.suite,
    suiteRevision: inventory.revision,
    inventory: {
      testSets: inventory.testSets,
      testCases: inventory.testCases,
      stylesheetReferences: inventory.stylesheetReferences,
      distinctStylesheetFiles: inventory.distinctStylesheetFiles,
      metadataShapes: inventory.metadataShapeCount,
    },
    criteria: {
      maximumCases: 20,
      exactlyOneFileBackedStylesheetPerCase: true,
      assertions: ['assert-xml', 'error'] as const,
      ranking:
        'unadmitted first, then interpreter pass ratio, native-direct pass ratio, family size, suite path',
    },
    candidates,
    recommendation: {
      immediateAdmission: 'tests/fn/deep-equal/_deep-equal-test-set.xml',
      nextSemanticPressure: 'tests/expr/for/_for-test-set.xml',
      rationale:
        'Admit the complete two-case deep-equal family already passing in the interpreter, then use the complete four-case for family to drive xsl:sequence, sequence arithmetic, and format-number gaps also identified by FastXSLT.',
    },
  };
}

function compareCandidates(
  left: {
    readonly alreadyAdmitted: boolean;
    readonly testCases: number;
    readonly setFile: string;
    readonly backendPassed: Readonly<Record<VerificationBackend, number>>;
  },
  right: {
    readonly alreadyAdmitted: boolean;
    readonly testCases: number;
    readonly setFile: string;
    readonly backendPassed: Readonly<Record<VerificationBackend, number>>;
  },
): number {
  if (left.alreadyAdmitted !== right.alreadyAdmitted) {
    return left.alreadyAdmitted ? 1 : -1;
  }

  const interpreterDifference =
    right.backendPassed.interpreter * left.testCases -
    left.backendPassed.interpreter * right.testCases;
  if (interpreterDifference !== 0) {
    return interpreterDifference;
  }

  const nativeDifference =
    right.backendPassed['native-direct'] * left.testCases -
    left.backendPassed['native-direct'] * right.testCases;
  return (
    nativeDifference ||
    left.testCases - right.testCases ||
    left.setFile.localeCompare(right.setFile)
  );
}
