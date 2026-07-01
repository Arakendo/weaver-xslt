#!/usr/bin/env bash
# shimbed Weaver CLI for build test
# Usage: compile <stylesheet> --emit <emit> --outDir <dir> [--diagnostics json] [--diagnostics-out <path>] [--fail-on-diagnostics <true|false>]

set -euo pipefail

cmd="$1"; shift || true
if [ "$cmd" != "compile" ]; then
  echo "shim: unsupported command: $cmd" >&2
  exit 2
fi

infile="$1"; shift || true
emit="bundle"
outdir=""
diags_mode=""
diags_out=""
fail_on_diags="false"

# parse rest
while [ "$#" -gt 0 ]; do
  case "$1" in
    --emit)
      emit="$2"; shift 2;;
    --outDir|--outdir)
      outdir="$2"; shift 2;;
    --sample)
      # ignore
      shift 2;;
    --diagnostics|--format)
      if [ "$2" = "json" ]; then
        diags_mode="json"
      fi
      shift 2;;
    --diagnostics-out)
      diags_out="$2"; shift 2;;
    --fail-on-diagnostics)
      fail_on_diags="$2"; shift 2;;
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

# emit a sample diagnostic payload if requested
if [ "$diags_mode" = "json" ]; then
  diag_json_path="$diags_out"
  if [ -z "$diag_json_path" ]; then
    diag_json_path="$outdir/$name.diagnostics.json"
  fi

  # Example: one warning about a deprecated feature
  cat > "$diag_json_path" <<EOF
{
  "source": { "path": "$infile" },
  "diagnostics": [
    {
      "code": "XTST001",
      "phase": "compile",
      "severity": "warning",
      "category": "style",
      "message": "example: deprecated instruction used",
      "primary": { "uri": "$infile", "lineStart": 2, "columnStart": 5 }
    }
  ]
}
EOF
  # Also emit MSBuild-friendly line to stderr so MSBuild picks it up
  echo "$infile(2,5): warning XTST001: example: deprecated instruction used" >&2

  if [ "$fail_on_diags" = "true" ]; then
    # exit non-zero to simulate failing on diagnostics
    exit 2
  fi
fi

exit 0
