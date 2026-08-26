import { join } from 'node:path';

import { createXslt30FamilyRanking } from '../test/conformance/xslt30/familyRanking.js';

const repositoryRoot = join(import.meta.dirname, '..');

console.log(JSON.stringify(createXslt30FamilyRanking(repositoryRoot), undefined, 2));
