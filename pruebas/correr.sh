#!/usr/bin/env bash
# Corre todas las pruebas del sistema en un navegador de verdad.
#
# No hace falta para usar el sistema: es solo para verificar, antes de
# publicar, que un cambio no rompió nada.
#
#   bash pruebas/correr.sh
#
# Devuelve 0 si todo pasa y 1 si algo falla, así que sirve para automatizar.

set -uo pipefail
cd "$(dirname "$0")/.."

PUERTO="${PUERTO:-8765}"
export SALIDA="${SALIDA:-/tmp/capturas}"
mkdir -p "$SALIDA"

# Playwright se instala fuera del repositorio para no dejar node_modules
# dentro ni tentar a Vercel con un package.json.
HERRAMIENTAS="${HERRAMIENTAS:-/tmp/pruebas-cieloraso}"
if [ ! -d "$HERRAMIENTAS/node_modules/playwright" ]; then
  echo "Instalando Playwright en $HERRAMIENTAS (solo la primera vez)…"
  mkdir -p "$HERRAMIENTAS"
  (cd "$HERRAMIENTAS" && npm init -y >/dev/null 2>&1 && npm install playwright --no-audit --no-fund >/dev/null 2>&1)
fi
# Los módulos ES no miran NODE_PATH, así que se pasa la ruta exacta.
export PLAYWRIGHT_MODULO="$HERRAMIENTAS/node_modules/playwright/index.js"

# Servidor estático propio, para no depender de que ya haya uno.
if ! curl -s -o /dev/null "http://localhost:$PUERTO/index.html"; then
  python3 -m http.server "$PUERTO" >/dev/null 2>&1 &
  SERVIDOR=$!
  trap 'kill $SERVIDOR 2>/dev/null' EXIT
  sleep 2
fi

FALLARON=0
TOTAL=0

for archivo in pruebas/*.mjs; do
  nombre="$(basename "$archivo")"
  echo ""
  echo "════ $nombre"
  if node "$archivo"; then
    TOTAL=$((TOTAL + 1))
  else
    TOTAL=$((TOTAL + 1))
    FALLARON=$((FALLARON + 1))
  fi
done

echo ""
echo "════════════════════════════════════════"
if [ "$FALLARON" -eq 0 ]; then
  echo "✅ Las $TOTAL suites pasaron. Se puede publicar."
  exit 0
fi
echo "❌ $FALLARON de $TOTAL suites fallaron. NO publicar."
exit 1
