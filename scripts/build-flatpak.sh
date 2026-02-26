#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_ID="com.whatorin.cleanwrapper"
MANIFEST="packaging/flatpak/${APP_ID}.yml"
BUILD_DIR=".flatpak/build"
REPO_DIR=".flatpak/repo"
BUNDLE_DIR="dist"
BUNDLE_FILE="${BUNDLE_DIR}/WhaTorin.flatpak"
BIN_PATH="src-tauri/target/release/${APP_ID}"
RUNTIME_REF="org.gnome.Platform//48"
SDK_REF="org.gnome.Sdk//48"

if ! command -v flatpak >/dev/null 2>&1; then
  echo "flatpak no esta instalado."
  exit 1
fi

if ! command -v flatpak-builder >/dev/null 2>&1; then
  echo "flatpak-builder no esta instalado."
  echo "Fedora: sudo dnf install flatpak-builder"
  echo "Debian/Ubuntu: sudo apt install flatpak-builder"
  exit 1
fi

if ! flatpak remotes --user --columns=name | grep -qx "flathub"; then
  echo "Agregando remoto flathub (scope user)..."
  flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
fi

if ! flatpak info --user "$RUNTIME_REF" >/dev/null 2>&1; then
  echo "Instalando runtime $RUNTIME_REF ..."
  flatpak install --user -y flathub "$RUNTIME_REF"
fi

if ! flatpak info --user "$SDK_REF" >/dev/null 2>&1; then
  echo "Instalando SDK $SDK_REF ..."
  flatpak install --user -y flathub "$SDK_REF"
fi

if [[ ! -x "$BIN_PATH" ]]; then
  echo "No se encontro el binario release en $BIN_PATH"
  echo "Compilando release..."
  cargo build --release --manifest-path src-tauri/Cargo.toml
fi

mkdir -p "$BUILD_DIR" "$REPO_DIR" "$BUNDLE_DIR"

flatpak-builder \
  --force-clean \
  --repo="$REPO_DIR" \
  "$BUILD_DIR" \
  "$MANIFEST"

flatpak build-bundle "$REPO_DIR" "$BUNDLE_FILE" "$APP_ID" stable

echo
echo "Bundle generado: $BUNDLE_FILE"
echo "Instalar con:"
echo "  flatpak install --user \"$BUNDLE_FILE\""
echo "Ejecutar con:"
echo "  flatpak run $APP_ID"
