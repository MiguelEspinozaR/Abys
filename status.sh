#!/usr/bin/env bash
#
# status.sh — estado de Abys (Fase 4, systemd)
#
# Reporta en español (✓/✗):
#   - units    : abys-backend y abys-frontend (activas, enabled, MainPID)
#   - backend  : http://localhost:8081/api/v1/health/db
#   - SPA      : http://localhost:5178/
#   - tunnel   : proceso cloudflared ("cloudflared tunnel run")
#   - público  : https://test3.mikylab.com/health (el fallo de red/DNS NO es fatal:
#                se reporta "NO PUBLICADO" y el script termina sin error).

set -uo pipefail

BACKEND_UNIT=abys-backend
FRONTEND_UNIT=abys-frontend
BACKEND_HEALTH_URL="http://localhost:8081/api/v1/health/db"
SPA_URL="http://localhost:5178/"
PUBLIC_HEALTH_URL="https://test3.mikylab.com/health"
TUNNEL_PATTERN="cloudflared tunnel run"

echo "=== Estado Abys ($(date '+%Y-%m-%d %H:%M:%S %Z')) ==="
echo ""

# --- Units systemd -----------------------------------------------------------
for unit in "$BACKEND_UNIT" "$FRONTEND_UNIT"; do
  state="$(systemctl is-active "$unit" 2>/dev/null || true)"
  enabled="$(systemctl is-enabled "$unit" 2>/dev/null || true)"
  pid="$(systemctl show -p MainPID --value "$unit" 2>/dev/null || true)"
  if [ "$state" = "active" ]; then
    echo "✓ Unit      : $unit ACTIVA   (enabled=$enabled, pid=${pid:-?})"
  else
    echo "✗ Unit      : $unit ${state:-desconocida}   (enabled=${enabled:-?})"
    journalctl -u "$unit" -n 3 --no-pager 2>/dev/null | tail -n 3 || true
  fi
done

# --- Backend ---------------------------------------------------------------
if resp="$(curl -sf -m 5 "$BACKEND_HEALTH_URL" 2>/dev/null)"; then
  conexion="$(printf '%s' "$resp" | jq -r '.data.conexion // "?"' 2>/dev/null || printf '?')"
  latencia="$(printf '%s' "$resp" | jq -r '.data.latencia_ms // "?"' 2>/dev/null || printf '?')"
  version="$(printf '%s' "$resp" | jq -r '.data.version_pg // "?"' 2>/dev/null || printf '?')"
  echo "✓ Backend   : ACTIVO   $BACKEND_HEALTH_URL"
  echo "    (conexion=$conexion, latencia=${latencia}ms, version_pg=$version)"
else
  echo "✗ Backend   : CAÍDO    $BACKEND_HEALTH_URL"
fi

# --- SPA -------------------------------------------------------------------
if curl -sf -m 5 "$SPA_URL" >/dev/null 2>&1; then
  echo "✓ SPA       : ACTIVO   $SPA_URL"
else
  echo "✗ SPA       : CAÍDA    $SPA_URL"
fi

# --- cloudflared (túnel compartido mikylab) ---------------------------------
if pgrep -f "$TUNNEL_PATTERN" >/dev/null 2>&1; then
  echo "✓ cloudflared: ACTIVO   túnel mikylab (config la gestiona el orquestador)"
else
  echo "✗ cloudflared: INACTIVO (túnel mikylab no está corriendo)"
fi

# --- Healthcheck público ----------------------------------------------------
if resp="$(curl -sf -m 8 "$PUBLIC_HEALTH_URL" 2>/dev/null)"; then
  echo "✓ Público   : ACTIVO   $PUBLIC_HEALTH_URL"
  echo "    $(printf '%s' "$resp" | head -c 160)"
else
  echo "✗ Público   : NO PUBLICADO   $PUBLIC_HEALTH_URL (fallo de red/DNS/túnel; no es fatal)"
fi
