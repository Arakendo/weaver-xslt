#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function renderDiagnostic(diag, sourceBase) {
  const severity = diag.severity || 'error';
  const code = diag.code || 'WEAVER';
  const message = diag.message || '';
  let file = undefined;
  let line = undefined;
  let col = undefined;
  if (diag.primary) {
    if (diag.primary.uri) file = diag.primary.uri;
    if (typeof diag.primary.lineStart === 'number') line = diag.primary.lineStart;
    if (typeof diag.primary.columnStart === 'number') col = diag.primary.columnStart;
  }

  if (file && !path.isAbsolute(file) && sourceBase) {
    try {
      file = path.resolve(path.dirname(sourceBase), file);
    } catch (e) {
      // ignore
    }
  }

  const text = `${message} (${code})`;
  const sev = severity === 'error' ? 'error' : 'warning';
  if (file && line) {
    console.log(`${file}(${line},${col || 1}): ${sev} ${code}: ${text}`);
  } else {
    console.log(`${sev} ${code}: ${text}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    return 0;
  }

  for (const file of args) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      const root = JSON.parse(text);
      const sourceBase = root && root.source && root.source.path ? root.source.path : undefined;
      const diagnostics = (root && root.diagnostics) || [];
      for (const diag of diagnostics) {
        renderDiagnostic(diag, sourceBase);
      }
    } catch (e) {
      console.error(`weaver: failed to parse diagnostics file ${file}: ${String(e)}`);
    }
  }
}

process.exitCode = main();
