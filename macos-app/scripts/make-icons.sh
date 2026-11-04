#!/usr/bin/env bash
# Genera iconos para macOS a partir de icon-512.png
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS="$SCRIPT_DIR/../assets"
SOURCE_PNG="$SCRIPT_DIR/../../icons/icon-512.png"

mkdir -p "$ASSETS"

# ── Icono .icns (necesario para el .app y el .dmg) ─────────────
if command -v sips &>/dev/null && command -v iconutil &>/dev/null; then
  # macOS nativo: sips + iconutil
  ICONSET="$ASSETS/AppIcon.iconset"
  mkdir -p "$ICONSET"

  for SIZE in 16 32 64 128 256 512; do
    sips -z $SIZE $SIZE "$SOURCE_PNG" --out "$ICONSET/icon_${SIZE}x${SIZE}.png"    &>/dev/null
    sips -z $((SIZE*2)) $((SIZE*2)) "$SOURCE_PNG" --out "$ICONSET/icon_${SIZE}x${SIZE}@2x.png" &>/dev/null
  done

  iconutil -c icns "$ICONSET" -o "$ASSETS/icon.icns"
  rm -rf "$ICONSET"
  echo "✓ icon.icns generado"

elif command -v convert &>/dev/null; then
  # Linux/CI: ImageMagick
  convert "$SOURCE_PNG" -resize 256x256 "$ASSETS/icon.png"
  echo "✓ icon.png generado (ImageMagick)"
else
  # Fallback: copiar tal cual
  cp "$SOURCE_PNG" "$ASSETS/icon.png"
  echo "✓ icon.png copiado (fallback)"
fi

# ── Icono de tray (16×16 PNG, escala @2x = 32×32) ──────────────
if command -v sips &>/dev/null; then
  sips -z 32 32 "$SOURCE_PNG" --out "$ASSETS/tray-icon@2x.png" &>/dev/null
  sips -z 16 16 "$SOURCE_PNG" --out "$ASSETS/tray-icon.png"    &>/dev/null
  echo "✓ tray-icon.png generado"
elif command -v convert &>/dev/null; then
  convert "$SOURCE_PNG" -resize 32x32 "$ASSETS/tray-icon@2x.png"
  convert "$SOURCE_PNG" -resize 16x16 "$ASSETS/tray-icon.png"
  echo "✓ tray-icon.png generado (ImageMagick)"
else
  cp "$SOURCE_PNG" "$ASSETS/tray-icon.png"
  echo "✓ tray-icon.png copiado (fallback)"
fi

# ── Fondo del DMG (540×380 simple) ─────────────────────────────
if command -v python3 &>/dev/null; then
  python3 - <<'PYEOF'
import struct, zlib, os

W, H = 540, 380
ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')

def make_png(w, h, r, g, b):
    raw = []
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw.extend([r, g, b])
    raw_bytes = bytes(raw)
    def chunk(tag, data):
        c = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', c)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw_bytes))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

# Fondo gris muy claro (compatible con light mode)
out = os.path.join(ASSETS, 'dmg-bg.png')
with open(out, 'wb') as f:
    f.write(make_png(W, H, 242, 240, 236))
print('✓ dmg-bg.png generado')
PYEOF
fi
