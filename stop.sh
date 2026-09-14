#!/usr/bin/env bash
#
# stop.sh — detiene SOLO los procesos Abys (Fase 4)
#
# Qué hace:
#   1. Mata (SIGTERM) los PIDs guardados en /tmp/abys_pids.txt, si existe.
#   2. Red de seguridad: fuser -k SOLO sobre :8081/tcp y :5178/tcp.
#   3. Elimina /tmp/abys_pids.txt.
#   4. Verifica que los puertos Abys quedaron libres y avisa del estado
#      del proyecto anterior (8080/5173), que NUNCA se toca.
#
# Reglas de seguridad:
#   - NUNCA toca :8080 ni :5173 ni procesos de finanzasMikyGo.
#   - NUNCA usa `pkill -f vite` global (mataría el vite dev del proyecto anterior).

set -uo pipefail

PIDS_FILE=/tmp/abys_pids.txt
BACKEND_PORT=8081
SPA_PORT=5178

stopped=0

# --- 1. PIDs guardados -------------------------------------------------------
if [ -f "$PIDS_FILE" ]; then
  echo "[stop] deteniendo procesos Abys listados en $PIDS_FILE:"
  while read -r pid; do
    [ -n "$pid" ] || continue
    if kill -0 "$pid" 2>/dev/null; then
      if kill "$pid" 2>/dev/null; then
        echo "  ✓ pid $pid (SIGTERM)"
        stopped=1
      else
        echo "  ✗ no se pudo señalar el pid $pid"
      fi
    else
      echo "  - pid $pid ya no existe"
    fi
  done < "$PIDS_FILE"
else
  echo "[stop] no existe $PIDS_FILE; no hay PIDs guardados"
fi

sleep 1

# --- 2. Red de seguridad: solo los puertos Abys ------------------------------
if fuser -k "${BACKEND_PORT}/tcp" "${SPA_PORT}/tcp" 2>/dev/null; then
  echo "[stop] red de seguridad: quedaban procesos en :${BACKEND_PORT}/:${SPA_PORT}; SIGKILL aplicado"
  stopped=1
fi

# --- 3. Esperar puertos libres (máx. ~5s) y limpiar PIDs ---------------------
for _ in $(seq 1 10); do
  if ! fuser "${BACKEND_PORT}/tcp" >/dev/null 2>&1 && ! fuser "${SPA_PORT}/tcp" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

rm -f "$PIDS_FILE"
echo "[stop] $PIDS_FILE eliminado"

# --- 4. Verificaciones finales ------------------------------------------------
if fuser "${BACKEND_PORT}/tcp" >/dev/null 2>&1 || fuser "${SPA_PORT}/tcp" >/dev/null 2>&1; then
  echo "✗ [stop] ATENCIÓN: aún hay algo escuchando en :${BACKEND_PORT} o :${SPA_PORT} (proceso ajeno o que no terminó); no se fuerza su cierre"
  exit 1
fi

echo "✓ [stop] servicios Abys detenidos (:${BACKEND_PORT} y :${SPA_PORT} libres)"

# Proyecto anterior (solo informativo; nunca lo tocamos).
if fuser 8080/tcp >/dev/null 2>&1; then
  echo "✓ [stop] proyecto anterior sigue activo en :8080 (intacto)"
else
  echo "✗ [stop] AVISO: :8080 ya no escucha (no lo tocamos; era así antes?)"
fi
if fuser 5173/tcp >/dev/null 2>&1; then
  echo "✓ [stop] proyecto anterior sigue activo en :5173 (intacto)"
else
  echo "✗ [stop] AVISO: :5173 ya no escucha (no lo tocamos; era así antes?)"
fi

exit 0