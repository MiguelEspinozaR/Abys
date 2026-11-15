#!/usr/bin/env bash
#
# deploy.sh — despliegue idempotente de Abys (Fase 4, systemd)
#
# Qué hace:
#   0. Verifica prerequisitos (go, npm, node, curl, systemctl; node_modules en web/)
#      y que existan las units abys-backend / abys-frontend.
#   1. Compila el backend: cd backend && go build -o server ./cmd/server
#   2. Compila el frontend: cd web && VITE_API_URL=/api/v1 npm run build
#   3. Reinicia las units systemd abys-backend y abys-frontend.
#   4. Espera los healthchecks locales (backend con DB y SPA).
#   5. Comprueba (informativo) el healthcheck público https://test3.mikylab.com/health.
#   6. Muestra el resumen final.
#
# Reglas de seguridad:
#   - SOLO actúa sobre las units abys-backend y abys-frontend.
#   - NUNCA toca :8080/:5173 ni los procesos del proyecto anterior
#     (finanzasMikyGo está en /home/miky/Documentos/finanzasMikyGo).
#   - NO imprime secretos (el backend lee backend/.env; las units definen PORT y CORS).
#   - Requiere sudo para `systemctl restart` (se pedirá contraseña si hace falta).
#
# Uso: ./deploy.sh

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
WEB_DIR="$ROOT_DIR/web"

BACKEND_UNIT=abys-backend
FRONTEND_UNIT=abys-frontend
BACKEND_PORT=8081
SPA_PORT=5178
BACKEND_HEALTH_URL="http://localhost:${BACKEND_PORT}/api/v1/health/db"
SPA_URL="http://localhost:${SPA_PORT}/"
PUBLIC_HEALTH_URL="https://test3.mikylab.com/health"
LEGACY_PIDS_FILE=/tmp/abys_pids.txt

log()  { printf '[deploy] %s\n' "$*"; }
warn() { printf '[deploy] AVISO: %s\n' "$*" >&2; }

die() {
  printf '[deploy] ERROR: %s\n' "$1" >&2
  printf '[deploy] Revisa el estado con: systemctl status %s %s\n' "$BACKEND_UNIT" "$FRONTEND_UNIT" >&2
  exit 1
}

# systemctl restart/stop requieren privilegios; si no somos root, usamos sudo.
# Con terminal interactiva sudo pregunta normalmente; sin TTY (CI/pipe) usa -S.
as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif [ -t 0 ]; then
    sudo "$@"
  else
    sudo -S -p '' "$@"
  fi
}

# ---------------------------------------------------------------------------
# Paso 0: prerequisitos
# ---------------------------------------------------------------------------
log "Paso 0: verificando prerequisitos..."
for tool in go npm node curl systemctl; do
  command -v "$tool" >/dev/null 2>&1 || die "falta la herramienta requerida: $tool"
done

for unit in "$BACKEND_UNIT" "$FRONTEND_UNIT"; do
  systemctl cat "$unit" >/dev/null 2>&1 || die "no existe la unit $unit"
done
log "  units $BACKEND_UNIT y $FRONTEND_UNIT presentes ✓"

if [ -d "$WEB_DIR/node_modules" ]; then
  log "  node_modules presente en web/ ✓"
else
  log "  node_modules ausente en web/ — ejecutando npm install ..."
  ( cd "$WEB_DIR" && npm install ) || die "npm install falló"
  log "  npm install completado ✓"
fi

# ---------------------------------------------------------------------------
# Paso 1: compilar backend
# ---------------------------------------------------------------------------
log "Paso 1: compilando backend (go build -o server ./cmd/server)"
( cd "$BACKEND_DIR" && go build -o server ./cmd/server ) || die "falló 'go build' del backend"
log "  backend compilado: $BACKEND_DIR/server ✓"

# ---------------------------------------------------------------------------
# Paso 2: compilar frontend
# ---------------------------------------------------------------------------
log "Paso 2: compilando frontend (VITE_API_URL=/api/v1 npm run build)"
( cd "$WEB_DIR" && VITE_API_URL=/api/v1 npm run build ) || die "falló 'npm run build' del frontend"
log "  frontend compilado: $WEB_DIR/dist ✓"

# ---------------------------------------------------------------------------
# Paso 3: reiniciar units systemd
# ---------------------------------------------------------------------------
log "Paso 3: reiniciando $BACKEND_UNIT y $FRONTEND_UNIT (systemd)"
as_root systemctl restart "$BACKEND_UNIT" "$FRONTEND_UNIT" || die "falló 'systemctl restart'"
log "  units reiniciadas ✓"

# ---------------------------------------------------------------------------
# Paso 4: esperar healthchecks locales
# ---------------------------------------------------------------------------
log "  esperando backend en $BACKEND_HEALTH_URL (hasta ~30s)..."
backend_ok=""
for _ in $(seq 1 30); do
  if curl -sf -m 2 "$BACKEND_HEALTH_URL" >/dev/null 2>&1; then backend_ok=1; break; fi
  systemctl is-active --quiet "$BACKEND_UNIT" || break
  sleep 1
done
[ -n "$backend_ok" ] || die "el backend no respondió en $BACKEND_HEALTH_URL"
log "  backend sano ✓ (pid $(systemctl show -p MainPID --value "$BACKEND_UNIT"))"

log "  esperando SPA en $SPA_URL (hasta ~15s)..."
spa_ok=""
for _ in $(seq 1 15); do
  if curl -sf -m 2 "$SPA_URL" >/dev/null 2>&1; then spa_ok=1; break; fi
  systemctl is-active --quiet "$FRONTEND_UNIT" || break
  sleep 1
done
[ -n "$spa_ok" ] || die "la SPA no respondió en $SPA_URL"
log "  SPA activa ✓ (pid $(systemctl show -p MainPID --value "$FRONTEND_UNIT"))"

# ---------------------------------------------------------------------------
# Paso 5: healthcheck público (informativo, no fatal)
# ---------------------------------------------------------------------------
if curl -sf -m 8 "$PUBLIC_HEALTH_URL" >/dev/null 2>&1; then
  log "  healthcheck público OK: $PUBLIC_HEALTH_URL ✓"
else
  warn "healthcheck público sin respuesta: $PUBLIC_HEALTH_URL (revisa túnel/nginx/DNS)"
fi

# ---------------------------------------------------------------------------
# Paso 6: resumen final
# ---------------------------------------------------------------------------
rm -f "$LEGACY_PIDS_FILE"
log "Paso 6: despliegue completado"
echo ""
echo "  === Abys desplegado (systemd) ==="
echo "    Backend API : http://localhost:${BACKEND_PORT}   (health: ${BACKEND_HEALTH_URL})"
echo "    SPA         : http://localhost:${SPA_PORT}"
echo "    Units       : ${BACKEND_UNIT} y ${FRONTEND_UNIT}"
echo "    Público     : https://test3.mikylab.com   (health: ${PUBLIC_HEALTH_URL})"
echo ""
