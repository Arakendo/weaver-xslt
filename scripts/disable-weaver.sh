#!/usr/bin/env bash
# Create a repository-level Directory.Build.Weaver.props to disable Weaver.Build targets
set -euo pipefail
ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")
TARGET="$ROOT_DIR/Directory.Build.Weaver.props"
cat > "$TARGET" <<'EOF'
<Project>
  <PropertyGroup>
    <WeaverEnabled>false</WeaverEnabled>
  </PropertyGroup>
</Project>
EOF

echo "Created $TARGET to disable Weaver.Build targets. Commit or leave it uncommitted per your workflow."
