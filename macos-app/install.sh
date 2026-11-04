#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Planificador ID — Instalador para macOS
#  Uso: bash install.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
ROJO='\033[0;31m'
AZUL='\033[0;34m'
RESET='\033[0m'
BOLD='\033[1m'

APP_NAME="Planificador ID"
APP_DEST="/Applications/Planificador ID.app"

echo ""
echo -e "${AZUL}${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${AZUL}${BOLD}║   Planificador ID — Instalador macOS     ║${RESET}"
echo -e "${AZUL}${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── 1. Detectar directorio del script ────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 2. Verificar Node.js ──────────────────────────────────────
echo -e "${BOLD}→ Verificando Node.js…${RESET}"
if ! command -v node &>/dev/null; then
  echo -e "${ROJO}✗ Node.js no encontrado.${RESET}"
  echo "  Instala Node.js desde: https://nodejs.org (versión LTS)"
  echo ""
  if command -v brew &>/dev/null; then
    echo -e "  O ejecuta: ${BOLD}brew install node${RESET}"
  fi
  exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${VERDE}✓ Node.js ${NODE_VERSION}${RESET}"

# ── 3. Verificar npm ──────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  echo -e "${ROJO}✗ npm no encontrado.${RESET}"
  exit 1
fi
echo -e "${VERDE}✓ npm $(npm -v)${RESET}"

# ── 4. Instalar dependencias ──────────────────────────────────
echo ""
echo -e "${BOLD}→ Instalando dependencias de Electron…${RESET}"
echo -e "  (Puede tomar 1–3 minutos la primera vez)"
npm install --silent

# ── 5. Generar iconos si no existen ──────────────────────────
echo ""
echo -e "${BOLD}→ Preparando recursos…${RESET}"
bash "$SCRIPT_DIR/scripts/make-icons.sh" 2>/dev/null || true
echo -e "${VERDE}✓ Recursos listos${RESET}"

# ── 6. Build ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}→ Construyendo la app…${RESET}"
echo -e "  (Puede tomar 2–5 minutos)"
npm run build:dir 2>&1 | grep -E '(•|✓|✗|Error|error|warning)' || true

# ── 7. Instalar en /Applications ─────────────────────────────
BUILD_APP=$(find "$SCRIPT_DIR/dist/mac"* -name "*.app" 2>/dev/null | head -1)

if [ -z "$BUILD_APP" ]; then
  echo -e "${ROJO}✗ No se encontró la app compilada.${RESET}"
  echo "  Intenta: npm run build:dir  (dentro de macos-app/)"
  exit 1
fi

echo ""
echo -e "${BOLD}→ Instalando en /Applications…${RESET}"

# Remover versión anterior si existe
if [ -d "$APP_DEST" ]; then
  echo -e "  Reemplazando versión anterior…"
  rm -rf "$APP_DEST"
fi

cp -R "$BUILD_APP" "$APP_DEST"
echo -e "${VERDE}✓ Instalado en ${APP_DEST}${RESET}"

# ── 8. Quitar cuarentena (apps no firmadas) ───────────────────
echo ""
echo -e "${BOLD}→ Configurando permisos…${RESET}"
xattr -rd com.apple.quarantine "$APP_DEST" 2>/dev/null || true
echo -e "${VERDE}✓ Permisos configurados${RESET}"

# ── 9. Listo ──────────────────────────────────────────────────
echo ""
echo -e "${VERDE}${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${VERDE}${BOLD}║   ✓  Instalación completada              ║${RESET}"
echo -e "${VERDE}${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Abre ${BOLD}Planificador ID${RESET} desde /Applications"
echo -e "  o ejecuta: ${BOLD}open \"$APP_DEST\"${RESET}"
echo ""
echo -e "  El ícono aparecerá en la barra superior de macOS."
echo -e "  Atajo global: ${BOLD}⌘ Shift P${RESET} para mostrar/ocultar."
echo ""

# Ofrecer abrir la app
read -rp "  ¿Abrir ahora? [S/n]: " RESP
RESP="${RESP:-S}"
if [[ "$RESP" =~ ^[Ss]$ ]]; then
  open "$APP_DEST"
fi
