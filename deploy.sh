#!/usr/bin/env bash
#
# deploy.sh — despliegue idempotente de Abys (Fase 4)
#
# Qué hace:
#   0. Verifica prerequisitos (go, npm, node, curl, fuser; node_modules en web/;
#      puertos 8081/5178 libres u ocupados solo por instancias Abys previas).
#   1. Detiene instancias Abys previas (misma lógica que stop.sh, sin mensajes).
#   2. Compila el backend: cd backend && go build -o server ./cmd/server
#   3. Compila el frontend: cd web && VITE_API_URL=/api/v1 npm run build
#   4. Arranca el backend en :8081 (nohup, persistente) y espera el health.
#   5. Arranca la SPA (vite preview) en :5178 (nohup, persistente) y espera.
#   6. Guarda los PIDs en /tmp/abys_pids.txt (uno por línea).
#   7. Muestra el resumen final (URLs y rutas de logs).
#
# Reglas de seguridad:
#   - NUNCA toca los puertos 8080/5173 ni los procesos del proyecto anterior
#     (finanzasMikyGo está en /home/miky/Documentos/finanzasMikyGo).
#   - NUNCA usa `pkill -f vite` global (mataría el vite dev del proyecto anterior).
#   - NO imprime secretos (el backend lee backend/.env; aquí solo se pasan
#     CORS_ORIGIN y PORT por entorno).
#   - NO usa sudo.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
WEB_DIR="$ROOT_DIR/web"

BACKEND_PORT=8081
SPA_PORT=5178
BACKEND_HEALTH_URL="http://localhost:${BACKEND_PORT}/api/v1/health/db"
SPA_URL="http://localhost:${SPA_PORT}/"
PIDS_FILE=/tmp/abys_pids.txt
BACKEND_LOG=/tmp/abys_backend.log
FRONTEND_LOG=/tmp/abys_frontend.log

# PIDs arrancados en esta ejecución (para limpieza parcial si algo falla).
BACKEND_PID=""
FRONTEND_PID=""
# Log relevante para mostrar el tail si un paso falla.
FAIL_LOG=""

log()  { printf '[deploy] %s\n' "$*"; }
warn() { printf '[deploy] AVISO: %s\n' "$*" >&2; }

die() {
  printf '[deploy] ERROR: %s\n' "$1" >&2
  cleanup_started
  if [ -n "$FAIL_LOG" ] && [ -f "$FAIL_LOG" ]; then
    printf '[deploy] Últimas líneas de %s:\n' "$FAIL_LOG" >&2
    tail -n 15 "$FAIL_LOG" 2>/dev/null >&2 || true
  fi
  printf '[deploy] Puedes re-ejecutar ./deploy.sh (o ./stop.sh para limpiar).\n' >&2
  exit 1
}

# Limpieza parcial: detiene solo lo que esta ejecución arrancó.
cleanup_started() {
  local started=0
  if [ -n "$FRONTEND_PID" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; started=1; fi
  if [ -n "$BACKEND_PID" ]; then kill "$BACKEND_PID" 2>/dev/null || true; started=1; fi
  if [ "$started" -eq 1 ]; then rm -f "$PIDS_FILE"; fi
}

port_listening() { fuser "$1/tcp" >/dev/null 2>&1; }

# Detiene únicamente instancias Abys previas (PIDs guardados + puertos Abys).
stop_abys_silent() {
  if [ -f "$PIDS_FILE" ]; then
    while read -r pid; do
      [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
    done < "$PIDS_FILE"
    sleep 1
  fi
  # Red de seguridad: SOLO 8081/5178. Nunca 8080/5173.
  fuser -k "${BACKEND_PORT}/tcp" "${SPA_PORT}/tcp" 2>/dev/null || true
  rm -f "$PIDS_FILE"
  # Espera a que los puertos queden libres (máx. ~5s).
  for _ in $(seq 1 10); do
    if ! port_listening "$BACKEND_PORT" && ! port_listening "$SPA_PORT"; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

# ---------------------------------------------------------------------------
# Paso 0: prerequisitos
# ---------------------------------------------------------------------------
log "Paso 0: verificando prerequisitos..."
for tool in go npm node curl fuser; do
  command -v "$tool" >/dev/null 2>&1 || die "falta la herramienta requerida: $tool"
done

if [ -d "$WEB_DIR/node_modules" ]; then
  log "  node_modules presente en web/ ✓"
else
  log "  node_modules ausente en web/ — ejecutando npm install ..."
  ( cd "$WEB_DIR" && npm install ) || die "npm install falló"
  log "  npm install completado ✓"
fi

# Puertos: si están ocupados por algo que NO es Abys, se aborta sin tocar nada ajeno.
for p in "$BACKEND_PORT" "$SPA_PORT"; do
  if port_listening "$p"; then
    owner_pid="$(fuser "$p/tcp" 2>/dev/null | grep -oE '[0-9]+')"
    if [ -f "$PIDS_FILE" ] && printf '%s\n' "$owner_pid" | grep -qxF -f "$PIDS_FILE" >/dev/null 2>&1; then
      log "  puerto $p ocupado por una instancia Abys previa (el Paso 1 la detendrá)"
    else
      die "el puerto $p está ocupado por un proceso ajeno (pid(s): $owner_pid); no se detiene nada ajeno"
    fi
  else
    log "  puerto $p libre ✓"
  fi
done

# ---------------------------------------------------------------------------
# Paso 1: detener instancias Abys previas (idempotencia)
# ---------------------------------------------------------------------------
log "Paso 1: deteniendo instancias Abys previas (:${BACKEND_PORT}/tcp y :${SPA_PORT}/tcp)"
if ! stop_abys_silent; then
  FAIL_LOG="$BACKEND_LOG"
  die "no se pudieron liberar los puertos :${BACKEND_PORT}/:${SPA_PORT} tras detener Abys; revisa procesos ajenos"
fi

# ---------------------------------------------------------------------------
# Paso 2: compilar backend
# ---------------------------------------------------------------------------
log "Paso 2: compilando backend (go build -o server ./cmd/server)"
FAIL_LOG="$BACKEND_LOG"
( cd "$BACKEND_DIR" && go build -o server ./cmd/server ) || die "falló 'go build' del backend"
log "  backend compilado: $BACKEND_DIR/server ✓"

# ---------------------------------------------------------------------------
# Paso 3: compilar frontend
# ---------------------------------------------------------------------------
log "Paso 3: compilando frontend (VITE_API_URL=/api/v1 npm run build)"
FAIL_LOG="$FRONTEND_LOG"
( cd "$WEB_DIR" && VITE_API_URL=/api/v1 npm run build ) || die "falló 'npm run build' del frontend"
log "  frontend compilado: $WEB_DIR/dist ✓"

# ---------------------------------------------------------------------------
# Paso 4: arrancar backend en :8081
# ---------------------------------------------------------------------------
log "Paso 4: arrancando backend en :$BACKEND_PORT"
cd "$BACKEND_DIR" || die "no se pudo entrar a $BACKEND_DIR"
# PORT=8081 explícito: backend/.env define PORT=8080, y 8080 lo ocupa el
# proyecto anterior; godotenv no pisa las variables ya exportadas en el entorno.
CORS_ORIGIN="http://localhost:5173,https://test3.mikylab.com" \
PORT="$BACKEND_PORT" \
nohup ./server > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
cd "$ROOT_DIR" || die "no se pudo volver a la raíz del repo"

log "  esperando health en $BACKEND_HEALTH_URL (hasta ~20s)..."
FAIL_LOG="$BACKEND_LOG"
backend_ok=""
for _ in $(seq 1 20); do
  if curl -sf "$BACKEND_HEALTH_URL" >/dev/null 2>&1; then backend_ok=1; break; fi
  kill -0 "$BACKEND_PID" 2>/dev/null || break   # el proceso murió antes de responder
  sleep 1
done
[ -n "$backend_ok" ] || die "el backend no respondió en $BACKEND_HEALTH_URL"
log "  backend sano ✓ (pid $BACKEND_PID)"

# ---------------------------------------------------------------------------
# Paso 5: arrancar SPA (vite preview) en :5178
# ---------------------------------------------------------------------------
log "Paso 5: arrancando SPA (vite preview) en :$SPA_PORT"
cd "$WEB_DIR" || die "no se pudo entrar a $WEB_DIR"
nohup node_modules/.bin/vite preview --port "$SPA_PORT" --strictPort --host 0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
cd "$ROOT_DIR" || die "no se pudo volver a la raíz del repo"

log "  esperando $SPA_URL (hasta ~15s)..."
FAIL_LOG="$FRONTEND_LOG"
spa_ok=""
for _ in $(seq 1 15); do
  if curl -sf "$SPA_URL" >/dev/null 2>&1; then spa_ok=1; break; fi
  kill -0 "$FRONTEND_PID" 2>/dev/null || break   # el proceso murió antes de responder
  sleep 1
done
[ -n "$spa_ok" ] || die "la SPA no respondió en $SPA_URL"
log "  SPA activa ✓ (pid $FRONTEND_PID)"

# ---------------------------------------------------------------------------
# Paso 6: guardar PIDs
# ---------------------------------------------------------------------------
log "Paso 6: guardando PIDs en $PIDS_FILE"
printf '%s\n%s\n' "$BACKEND_PID" "$FRONTEND_PID" > "$PIDS_FILE" || die "no se pudo escribir $PIDS_FILE"

# ---------------------------------------------------------------------------
# Paso 7: resumen final
# ---------------------------------------------------------------------------
log "Paso 7: despliegue completado"
echo ""
echo "  === Abys desplegado (Fase 4) ==="
echo "    Backend API : http://localhost:${BACKEND_PORT}   (health: ${BACKEND_HEALTH_URL})"
echo "    SPA         : http://localhost:${SPA_PORT}"
echo "    PIDs        : ${PIDS_FILE}   (backend=${BACKEND_PID}, spa=${FRONTEND_PID})"
echo "    Logs        : ${BACKEND_LOG} | ${FRONTEND_LOG}"
echo "    Público     : https://test3.mikylab.com   (ingress Cloudflare: lo gestiona el orquestador)"
echo ""