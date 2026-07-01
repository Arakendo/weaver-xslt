#!/usr/bin/env bash
# Remove repository-level Directory.Build.Weaver.props to re-enable Weaver.Build targets
set -euo pipefail
ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")
TARGET="$ROOT_DIR/Directory.Build.Weaver.props"
if [ -f "$TARGET" ]; then
  rm "$TARGET"
  echo "Removed $TARGET. Weaver.Build targets will use their default enablement settings."
else
  echo "$TARGET did not exist. Nothing changed."
fi
