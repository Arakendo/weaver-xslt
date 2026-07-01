#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fail(message, exitCode) {
  process.stderr.write(`${message}\n`);
  process.exit(exitCode);
}

const args = process.argv.slice(2);
const command = args.shift();

if (command !== 'compile') {
  fail(`shim: unsupported command: ${command ?? '<missing>'}`, 2);
}

const infile = args.shift();
if (!infile) {
  fail('shim: no input', 3);
}

let emit = 'bundle';
let outdir = path.dirname(infile);
let diagnosticsMode = '';
let diagnosticsOut = '';
let failOnDiagnostics = false;

for (let index = 0; index < args.length; index += 1) {
  const token = args[index];
  const next = args[index + 1];
  switch (token) {
    case '--emit':
      emit = next ?? emit;
      index += 1;
      break;
    case '--outDir':
    case '--outdir':
      outdir = next ?? outdir;
      index += 1;
      break;
    case '--sample':
      index += 1;
      break;
    case '--diagnostics':
    case '--format':
      diagnosticsMode = next === 'json' ? 'json' : diagnosticsMode;
      index += 1;
      break;
    case '--diagnostics-out':
      diagnosticsOut = next ?? diagnosticsOut;
      index += 1;
      break;
    case '--fail-on-diagnostics':
      failOnDiagnostics = next === 'true';
      index += 1;
      break;
    default:
      break;
  }
}

fs.mkdirSync(outdir, { recursive: true });

const base = path.basename(infile);
const bundleFile = path.join(outdir, `${base}.bundle.js`);
const mapFile = path.join(outdir, `${base}.bundle.js.map`);
const digestFile = path.join(outdir, `${base}.digest`);
const depsFile = path.join(outdir, `${base}.deps`);

fs.writeFileSync(
  bundleFile,
  [
    `// shimmed ${emit} bundle for ${infile}`,
    `exports.source = { path: ${JSON.stringify(infile)}, digest: "shim-digest-123" };`,
    'exports.transform = function(input, ctx) { return "<html><body>shim</body></html>"; };',
    '',
  ].join('\n'),
  'utf8',
);
fs.writeFileSync(mapFile, '{ "version": 3 }\n', 'utf8');
fs.writeFileSync(digestFile, 'shim-digest-123\n', 'utf8');
fs.writeFileSync(depsFile, `${infile}\n`, 'utf8');
process.stdout.write(`shim: wrote ${bundleFile} and ${mapFile}\n`);

if (diagnosticsMode === 'json') {
  const diagnosticsPath = diagnosticsOut || path.join(outdir, `${base}.diagnostics.json`);
  const payload = {
    source: { path: infile },
    diagnostics: [
      {
        code: 'XTST001',
        phase: 'compile',
        severity: 'warning',
        category: 'style',
        message: 'example: deprecated instruction used',
        primary: { uri: infile, lineStart: 2, columnStart: 5 },
      },
    ],
  };
  fs.mkdirSync(path.dirname(diagnosticsPath), { recursive: true });
  fs.writeFileSync(diagnosticsPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stderr.write(`${infile}(2,5): warning XTST001: example: deprecated instruction used\n`);
  if (failOnDiagnostics) {
    process.exit(2);
  }
}
