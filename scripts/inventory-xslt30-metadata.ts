import { join } from 'node:path';

import {
  inventoryXslt30Metadata,
  rankXslt30CandidateFamilies,
} from '../test/conformance/xslt30/metadataInventory.js';

const repositoryRoot = join(import.meta.dirname, '..');
const inventory = inventoryXslt30Metadata(repositoryRoot, {
  includeMetadataShapes: process.argv.includes('--shapes'),
});

console.log(
  JSON.stringify(
    {
      ...inventory,
      candidateFamilies: rankXslt30CandidateFamilies(inventory),
    },
    undefined,
    2,
  ),
);
