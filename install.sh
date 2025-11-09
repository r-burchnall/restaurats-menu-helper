#!/usr/bin/env bash
set -euo pipefail

# Simple installer for menu-cli and menu-manage on Linux/macOS
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/r-burchnall/restaurats-menu-helper/main/install.sh | bash
#
# Defaults:
#   --owner  r-burchnall
#   --repo   restaurats-menu-helper
#   --branch main
#
# Advanced:
#   --install-dir <path>  (default: "$HOME/.local/share/<repo>")
#   --bin-dir <path>      (default: "$HOME/.local/bin")
#
# Requires: curl, tar, bash. Requires Bun installed and in PATH.

OWNER_DEFAULT="r-burchnall"
REPO_DEFAULT="restaurats-menu-helper"
BRANCH_DEFAULT="main"

OWNER="$OWNER_DEFAULT"
REPO="$REPO_DEFAULT"
BRANCH="$BRANCH_DEFAULT"
INSTALL_DIR=""
BIN_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner)
      OWNER="$2"; shift 2;;
    --repo)
      REPO="$2"; shift 2;;
    --branch)
      BRANCH="$2"; shift 2;;
    --install-dir)
      INSTALL_DIR="$2"; shift 2;;
    --bin-dir)
      BIN_DIR="$2"; shift 2;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1;;
  esac
done

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun is required but not found in PATH." >&2
  echo "Install Bun: curl -fsSL https://bun.sh/install | bash" >&2
  exit 1
fi

if [[ -z "${INSTALL_DIR:-}" ]]; then
  INSTALL_DIR="$HOME/.local/share/$REPO"
fi
if [[ -z "${BIN_DIR:-}" ]]; then
  BIN_DIR="$HOME/.local/bin"
fi

TARBALL_URL="https://codeload.github.com/${OWNER}/${REPO}/tar.gz/refs/heads/${BRANCH}"
TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "Downloading ${OWNER}/${REPO}@${BRANCH}..."
curl -fsSL "$TARBALL_URL" -o "$TMP_DIR/repo.tar.gz"
mkdir -p "$TMP_DIR/src"
tar -xzf "$TMP_DIR/repo.tar.gz" -C "$TMP_DIR/src"

# The tarball extracts to <repo>-<branch>
SRC_DIR="$(find "$TMP_DIR/src" -maxdepth 1 -type d -name "${REPO}-*" | head -n1)"
if [[ -z "$SRC_DIR" ]]; then
  echo "Failed to locate extracted directory" >&2
  exit 1
fi

echo "Installing to $INSTALL_DIR"
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cp -R "$SRC_DIR"/. "$INSTALL_DIR"/

mkdir -p "$BIN_DIR"

# Create shim: menu-cli
CLI_SHIM="$BIN_DIR/menu-cli"
cat > "$CLI_SHIM" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="${REPO_DIR_OVERRIDE:-$HOME/.local/share/restaurats-menu-helper}"
exec bun "$REPO_DIR/index.ts" "$@"
EOF
chmod +x "$CLI_SHIM"

# Create shim: menu-manage
MANAGE_SHIM="$BIN_DIR/menu-manage"
cat > "$MANAGE_SHIM" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="${REPO_DIR_OVERRIDE:-$HOME/.local/share/restaurats-menu-helper}"
exec bun "$REPO_DIR/menu-utils.ts" "$@"
EOF
chmod +x "$MANAGE_SHIM"

# Ensure BIN_DIR on PATH (append to common profiles if missing)
if ! echo ":$PATH:" | grep -q ":$BIN_DIR:"; then
  PROFILE_FILES=( "$HOME/.profile" "$HOME/.bashrc" "$HOME/.zshrc" )
  for pf in "${PROFILE_FILES[@]}"; do
    if [[ -f "$pf" ]]; then
      if ! grep -q "$BIN_DIR" "$pf"; then
        echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$pf"
        echo "Added $BIN_DIR to PATH in $pf"
      fi
    fi
  done
  # Also create ~/.profile if none exist
  if [[ ! -f "$HOME/.profile" ]]; then
    echo "export PATH=\"$BIN_DIR:\$PATH\"" > "$HOME/.profile"
    echo "Created $HOME/.profile and added $BIN_DIR to PATH"
  fi
fi

echo ""
echo "Installed:"
echo "  menu-cli     -> $CLI_SHIM"
echo "  menu-manage  -> $MANAGE_SHIM"
echo ""
echo "Usage:"
echo "  menu-cli"
echo "  menu-manage"
echo ""
echo "If command not found, restart your shell or run:"
echo "  export PATH=\"$BIN_DIR:\$PATH\""


