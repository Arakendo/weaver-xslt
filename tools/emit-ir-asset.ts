import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import {
  compileStylesheetRuntimeArtifacts,
  composeStylesheetSourceFromFile,
  createStylesheetDigest,
} from '../src/processor/compile.js';

function usage(): never {
  throw new Error('Usage: npx tsx tools/emit-ir-asset.ts <stylesheet-path> [output-json-path]');
}

const [, , inputPathArg, outputPathArg] = process.argv;

if (inputPathArg === undefined) {
  usage();
}

const stylesheetPath = resolve(inputPathArg);
const stylesheetSource = composeStylesheetSourceFromFile(stylesheetPath);
const runtimeArtifacts = compileStylesheetRuntimeArtifacts(stylesheetSource, {
  path: basename(stylesheetPath),
  filePath: stylesheetPath,
});
const irJson = JSON.stringify(runtimeArtifacts.ir);
const digest = createStylesheetDigest(stylesheetSource);

const outputPath =
  outputPathArg === undefined
    ? resolve(
        'devtools-fixture',
        'public',
        `${basename(stylesheetPath)}.${digest}.ir.json`,
      )
    : resolve(outputPathArg);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, irJson, 'utf8');

const byteLength = Buffer.byteLength(irJson, 'utf8');
process.stdout.write(
  JSON.stringify(
    {
      stylesheetPath,
      outputPath,
      digest,
      bytes: byteLength,
      megabytes: Number((byteLength / 1024 / 1024).toFixed(2)),
    },
    null,
    2,
  ) + '\n',
);