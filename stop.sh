#!/usr/bin/env bash
#
# stop.sh — detiene SOLO los servicios Abys (Fase 4, systemd)
#
# Qué hace:
#   1. Detiene las units abys-backend y abys-frontend con systemctl.
#   2. Espera a que queden inactivas (máx. ~10s).
#   3. Elimina el obsoleto /tmp/abys_pids.txt de despliegues antiguos con nohup.
#   4. Avisa del estado del proyecto anterior (:8080/:5173), que NUNCA se toca.
#
# Reglas de seguridad:
#   - SOLO actúa sobre las units abys-backend y abys-frontend.
#   - NUNCA toca :8080 ni :5173 ni procesos de finanzasMikyGo.
#   - Requiere sudo para `systemctl stop` (se pedirá contraseña si hace falta).
#
# Uso: ./stop.sh

set -uo pipefail

BACKEND_UNIT=abys-backend
FRONTEND_UNIT=abys-frontend
LEGACY_PIDS_FILE=/tmp/abys_pids.txt
BACKEND_PORT=8081
SPA_PORT=5178

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

echo "[stop] deteniendo $BACKEND_UNIT y $FRONTEND_UNIT (systemd)..."
as_root systemctl stop "$BACKEND_UNIT" "$FRONTEND_UNIT" || {
  echo "✗ [stop] falló 'systemctl stop'; revisa: systemctl status $BACKEND_UNIT $FRONTEND_UNIT" >&2
  exit 1
}

for _ in $(seq 1 20); do
  if ! systemctl is-active --quiet "$BACKEND_UNIT" && ! systemctl is-active --quiet "$FRONTEND_UNIT"; then
    break
  fi
  sleep 0.5
done

if systemctl is-active --quiet "$BACKEND_UNIT" || systemctl is-active --quiet "$FRONTEND_UNIT"; then
  echo "✗ [stop] ATENCIÓN: las units siguen activas; revisa: systemctl status $BACKEND_UNIT $FRONTEND_UNIT" >&2
  exit 1
fi

echo "✓ [stop] $BACKEND_UNIT y $FRONTEND_UNIT detenidos"

rm -f "$LEGACY_PIDS_FILE"
echo "[stop] $LEGACY_PIDS_FILE eliminado (si existía)"

# Puerto Abys: solo informativo; no forzamos el cierre de procesos ajenos.
if fuser "${BACKEND_PORT}/tcp" "${SPA_PORT}/tcp" >/dev/null 2>&1; then
  echo "✗ [stop] AVISO: algo sigue escuchando en :${BACKEND_PORT}/:${SPA_PORT} (proceso ajeno); no se toca"
else
  echo "✓ [stop] puertos Abys libres (:${BACKEND_PORT} y :${SPA_PORT})"
fi

# Proyecto anterior (solo informativo; nunca lo tocamos).
if fuser 8080/tcp >/dev/null 2>&1; then
  echo "✓ [stop] proyecto anterior sigue activo en :8080 (intacto)"
else
  echo "✗ [stop] AVISO: :8080 ya no escucha (no lo tocamos; ¿era así antes?)"
fi
if fuser 5173/tcp >/dev/null 2>&1; then
  echo "✓ [stop] proyecto anterior sigue activo en :5173 (intacto)"
else
  echo "✗ [stop] AVISO: :5173 ya no escucha (no lo tocamos; ¿era así antes?)"
fi

exit 0
