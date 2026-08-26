import { join } from 'node:path';

import {
  inventoryConformanceSources,
  verifyConformanceSources,
} from '../test/conformance/corpusSources.js';

const repositoryRoot = join(import.meta.dirname, '..');

verifyConformanceSources(repositoryRoot);
const inventory = inventoryConformanceSources(repositoryRoot);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(inventory, undefined, 2));
} else {
  for (const source of inventory) {
    console.log(
      `${source.name}: ${source.revision} — ${source.testCases} cases in ${source.distinctTestSets} test sets`,
    );
  }
}
