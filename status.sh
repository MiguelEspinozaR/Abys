#!/usr/bin/env bash
#
# status.sh — estado de Abys (Fase 4)
#
# Reporta en español (✓/✗):
#   - backend  : http://localhost:8081/api/v1/health/db
#   - SPA      : http://localhost:5178/
#   - tunnel   : proceso cloudflared ("cloudflared tunnel run")
#   - público  : https://test3.mikylab.com (el fallo de red/DNS NO es fatal:
#               se reporta "NO PUBLICADO" y el script termina sin error).

set -uo pipefail

BACKEND_HEALTH_URL="http://localhost:8081/api/v1/health/db"
SPA_URL="http://localhost:5178/"
PUBLIC_URL="https://test3.mikylab.com"
PIDS_FILE=/tmp/abys_pids.txt
BACKEND_LOG=/tmp/abys_backend.log
FRONTEND_LOG=/tmp/abys_frontend.log

echo "=== Estado Abys ($(date '+%Y-%m-%d %H:%M:%S %Z')) ==="
echo ""

# --- Backend ---------------------------------------------------------------
if resp="$(curl -sf -m 5 "$BACKEND_HEALTH_URL" 2>/dev/null)"; then
  conexion="$(printf '%s' "$resp" | jq -r '.data.conexion // "?"' 2>/dev/null || printf '?')"
  latencia="$(printf '%s' "$resp" | jq -r '.data.latencia_ms // "?"' 2>/dev/null || printf '?')"
  version="$(printf '%s' "$resp" | jq -r '.data.version_pg // "?"' 2>/dev/null || printf '?')"
  echo "✓ Backend   : ACTIVO   $BACKEND_HEALTH_URL"
  echo "    (conexion=$conexion, latencia=${latencia}ms, version_pg=$version)"
else
  echo "✗ Backend   : CAÍDO    $BACKEND_HEALTH_URL"
  if [ -f "$BACKEND_LOG" ]; then
    echo "    Últimas líneas de $BACKEND_LOG:"
    tail -n 3 "$BACKEND_LOG" 2>/dev/null || true
  fi
fi

# --- SPA -------------------------------------------------------------------
if curl -sf -m 5 "$SPA_URL" >/dev/null 2>&1; then
  echo "✓ SPA       : ACTIVO   $SPA_URL"
else
  echo "✗ SPA       : CAÍDA    $SPA_URL"
  if [ -f "$FRONTEND_LOG" ]; then
    echo "    Últimas líneas de $FRONTEND_LOG:"
    tail -n 3 "$FRONTEND_LOG" 2>/dev/null || true
  fi
fi

# --- cloudflared (túnel compartido mikylab) ---------------------------------
if pgrep -f "cloudflared tunnel run" >/dev/null 2>&1; then
  echo "✓ cloudflared: ACTIVO   túnel mikylab (config la gestiona el orquestador)"
else
  echo "✗ cloudflared: INACTIVO (túnel mikylab no está corriendo)"
fi

# --- URL pública ------------------------------------------------------------
if curl -sf -m 8 "$PUBLIC_URL" >/dev/null 2>&1; then
  echo "✓ Público   : ACTIVO   $PUBLIC_URL"
else
  echo "✗ Público   : NO PUBLICADO   $PUBLIC_URL (fallo de red/DNS/túnel; no es fatal)"
fi

# --- PIDs guardados ---------------------------------------------------------
if [ -f "$PIDS_FILE" ]; then
  echo "✓ PIDs      : $PIDS_FILE  ($(tr '\n' ' ' < "$PIDS_FILE"))"
else
  echo "✗ PIDs      : no existe $PIDS_FILE (no hay instancia Abys registrada)"
fi