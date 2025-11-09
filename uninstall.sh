#!/usr/bin/env bash
set -euo pipefail

# Uninstaller for menu-cli and menu-manage
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/r-burchnall/restaurats-menu-helper/refs/heads/main/uninstall.sh | bash
#
# Or run locally:
#   bash uninstall.sh

INSTALL_DIR_DEFAULT="$HOME/.local/share/restaurats-menu-helper"
BIN_DIR_DEFAULT="$HOME/.local/bin"

INSTALL_DIR="${INSTALL_DIR_OVERRIDE:-$INSTALL_DIR_DEFAULT}"
BIN_DIR="${BIN_DIR_OVERRIDE:-$BIN_DIR_DEFAULT}"

CLI_SHIM="$BIN_DIR/menu-cli"
MANAGE_SHIM="$BIN_DIR/menu-manage"

echo "Uninstalling restaurats-menu-helper..."
echo ""

# Remove shims
if [[ -f "$CLI_SHIM" ]]; then
  rm -f "$CLI_SHIM"
  echo "Removed: $CLI_SHIM"
else
  echo "Not found: $CLI_SHIM"
fi

if [[ -f "$MANAGE_SHIM" ]]; then
  rm -f "$MANAGE_SHIM"
  echo "Removed: $MANAGE_SHIM"
else
  echo "Not found: $MANAGE_SHIM"
fi

# Remove installation directory
if [[ -d "$INSTALL_DIR" ]]; then
  rm -rf "$INSTALL_DIR"
  echo "Removed: $INSTALL_DIR"
else
  echo "Not found: $INSTALL_DIR"
fi

echo ""
echo "Uninstall complete!"

