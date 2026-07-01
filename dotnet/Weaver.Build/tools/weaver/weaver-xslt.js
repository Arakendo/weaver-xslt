#!/usr/bin/env bash
# shimbed Weaver CLI for build test
# Usage: compile <stylesheet> --emit <emit> --outDir <dir>

set -euo pipefail

cmd="$1"; shift || true
if [ "$cmd" != "compile" ]; then
  echo "shim: unsupported command: $cmd" >&2
  exit 2
fi

infile="$1"; shift || true
emit="bundle"
outdir=""

# parse rest
while [ "$#" -gt 0 ]; do
  case "$1" in
    --emit)
      emit="$2"; shift 2;;
    --outDir)
      outdir="$2"; shift 2;;
    --sample)
      # ignore
      shift 2;;
    *)
      shift;;
  esac
done

if [ -z "$infile" ]; then
  echo "shim: no input" >&2
  exit 3
fi
if [ -z "$outdir" ]; then
  echo "shim: no outDir specified" >&2
  exit 4
fi

mkdir -p "$outdir"
base=$(basename "$infile")
name="$base"
# create a bundle artifact and map and digest
bundle_file="$outdir/$name.bundle.js"
map_file="$outdir/$name.bundle.js.map"
digest_file="$outdir/$name.digest"

cat > "$bundle_file" <<EOF
// shimbed bundle for $infile
exports.source = { path: "$infile", digest: "shim-digest-123" };
exports.transform = function(input, ctx) { return '<html><body>shim</body></html>'; };
EOF

cat > "$map_file" <<EOF
{ "version":3 }
EOF

echo "shim: wrote $bundle_file and $map_file"
# write digest
echo "shim-digest-123" > "$digest_file"

# also create a placeholder .xsl.deps to emulate dependency sidecar
deps_file="$outdir/$name.deps"
echo "$infile" > "$deps_file"

exit 0
