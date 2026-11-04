#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Planificador ID — Build DMG distribuible
#  Uso: bash scripts/build-dmg.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "→ Generando iconos…"
bash scripts/make-icons.sh

echo "→ Instalando dependencias…"
npm install --silent

echo "→ Construyendo DMG (universal: Intel + Apple Silicon)…"
npm run build:dmg

DMG=$(find dist -name "*.dmg" 2>/dev/null | head -1)
if [ -n "$DMG" ]; then
  echo ""
  echo "✓ DMG listo: $DMG"
  open "$(dirname "$DMG")"
else
  echo "✗ No se generó el DMG."
  exit 1
fi
