# Informe de Despliegue - Bloque A a test3

**Fecha:** 2026-11-08

**HEAD:** `7030e4c`

**Rama:** `feat/a11y-gate`

**Estado:** `DEPLOY`

---

## 1. Preflight

- `git rev-parse HEAD` = `7030e4c` ✓
- `git status --short` = limpio (sin cambios) ✓
- Puertos verificados:
  - `:8080` ocupado por proyecto anterior (finanzasMikyGo) - **NO TOQUE** ✓
  - `:5173` ocupado por proyecto anterior - **NO TOQUE** ✓
  - `:8082` ocupado - **NO TOQUE** ✓
  - `:8081` y `:5178` = instancias Abys previas a detener ✓

---

## 2. Ejecución de `./stop.sh`

Detenidas SOLO las instancias Abys en `:8081`/`:5178`. Confirmado que puertos del proyecto anterior (:8080, :5173, :8082) siguen intactos y sin modificar.

---

## 3. Ejecución de `./deploy.sh`

**Resultado:** Despliegue completado exitosamente.

**Pasos clave:**
- Paso 0: prerequisitos verificados (go, npm, node, curl, fuser; node_modules presente)
- Paso 1: detenidas instancias Abys previas
- Paso 2: compilado backend Go (`backend/server ✓`)
- Paso 3: compilado frontend (`web/dist ✓`)
- Paso 4: backend arrancado en `:8081` (health OK en http://localhost:8081/api/v1/health/db, pid 2020334)
- Paso 5: SPA (vite preview) arrancada en `:5178` (pid 2020343)
- Paso 6: PIDs guardadas en `/tmp/abys_pids.txt`
- Paso 7: resumen final emitido

**PIDs registradas:** `2020334` (backend), `2020343` (SPA)

---

## 4. Salida de `./status.sh`

```
=== Estado Abys (2026-11-08 21:46:59 -04) ===

✓ Backend   : ACTIVO   http://localhost:8081/api/v1/health/db
    (conexion=ok, latencia=1.251ms, version_pg=18.6 (Ubuntu 18.6-1.pgdg26.04+2))
✓ SPA       : ACTIVO   http://localhost:5178/
✓ cloudflared: ACTIVO   túnel mikylab (config la gestiona el orquestador)
✓ Público   : ACTIVO   https://test3.mikylab.com
✓ PIDs      : /tmp/abys_pids.txt  (2020334 2020343 )
```

---

## 5. Resultados `curl` (GET only)

| Endpoint | Estado HTTP | Resultado |
|---|---|---|
| `http://localhost:8081/api/v1/health/db` | 200 OK | JSON: `{conexion: "ok", latencia_ms: 0.749, version_pg: "18.6 ...", tablas: [...]}` |
| `http://localhost:5178/` | 200 OK | HTML de Abys (componente root renderizado) |
| `https://test3.mikylab.com/` | 200 OK | HTML público con assets del build nuevo |
| `https://test3.mikylab.com/api/v1/health/db` | 200 OK | JSON: `{conexion: "ok", latencia_ms: 0.459, ...}` |

**Observación:** El HTML público en `https://test3.mikylab.com/` referencia assets del build nuevo (ej. `/assets/index-BvSt0T-A.js`, `/assets/index-CC4YOoc9.css`).

---

## 6. Extracto de logs

**`/tmp/abys_backend.log`:**
- Sin errores nuevos. Logs de Gin en modo release, endpoints registrados, base de datos conectada (`postgres@localhost:5432/abys`).
- El mensaje `bind: address already in use` corresponde a un intento previo; el despliegue actual utilizó el puerto correctamente.

**`/tmp/abys_frontend.log`:**
- Error de inicio inicial: `Port 5178 is already in use` (proceso previo que no había sido totalmente liberado).
- Después del `stop.sh` y nuevo `deploy.sh`, la SPA inició correctamente y responde en `:5178`.
- El 404 de `favicon.ico` no fue registrado como error nuevo (es baseline conocido).

---

## 7. Conclusión

**DEPLOY_HEALTH_PASS**

- Todos los servicios activos: backend (:8081), SPA (:5178), túnel cloudflared, URL pública (https://test3.mikylab.com).
- Health checks pasando (db connection OK en ambos endpoints).
- HTML público referencia assets del build nuevo.
- Puertos ajenos (:8080, :5173, :8082) sin modificar.
- Git sin alteraciones (HEAD = 7030e4c, árbol limpio).
- Evidencia guardada en `test-results/deploy/deploy-report.md`.

**PIDs finales:** `2020334` (backend), `2020343` (SPA)

**URLs verificadas:**
- `http://localhost:8081/api/v1/health/db` ✓
- `http://localhost:5178/` ✓
- `https://test3.mikylab.com/` ✓
- `https://test3.mikylab.com/api/v1/health/db` ✓
