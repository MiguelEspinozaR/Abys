# M2 — Evidencia y revisión (tester) — `api-base-url-build`

- **Repo:** `/home/miky/Documentos/finanzasMikyGoRef`
- **Rama:** `fix/pagina-error-personalizada`
- **Commit base:** `5e427c0` (`5e427c02301d620fa4a9a00576be22ea04dab49b`, declarado en spec/plan)
- **Fecha:** 2026-11-24 (registro local `2026-11-24T01:11:19-04:00`)
- **Milestone:** M2 — Evidencia y revisión (parte tester; AC5 queda para reviewer)
- **Referencias:** `.ai/specs/api-base-url-build/spec.md`, `.ai/plans/api-base-url-build/plan.md`
- **`release_ready`: `false`** — AC5 no aprobado; sin merge, tag, release ni deploy autorizados.

## Restricciones cumplidas

No se ejecutaron operaciones de Git salvo la lectura explícita `git check-ignore -v web/.env.production`; no hubo `add`/`commit`/`push`/`switch`/`diff`/`status`. No se hizo deploy, no se reiniciaron servicios, no se contactó test3 ni BD, no se modificó código fuente, no se tocó `.ai/`, `.gitattributes` ni `graphify-out/`. No se capturaron pantallas ni se registraron secretos. Únicas escrituras: `test-results/api-base-url-build/report.md`, `test-results/api-base-url-build/metrics.json` y el resumen estructurado `test-results/tests/api-base-url-build-m2.json`; el build regeneró artefactos derivados en `web/dist/` y `npx tsc -b` pudo refrescar `.tsbuildinfo` (ninguno de producto).

No se usó `graphify query` porque el usuario prohibió expresamente tocar `graphify-out/`.

## 1. Comandos canónicos

Ejecutados en orden, sin `VITE_API_URL` en el entorno (`printenv VITE_API_URL` → `<unset>`).

| # | Comando (workdir) | Exit | Resultado |
|---|---|---:|---|
| 1 | `cd web && npx tsc -b` | 0 | Sin salida; compilación limpia |
| 2 | `cd web && npm test` | 0 | `Test Files 19 passed (19)` · `Tests 197 passed (197)` · Vitest 5.0.0 · `Duration 13.36s` |
| 3 | `cd web && npm run build` | 0 | `✓ 3285 modules transformed` · `✓ built in 21.91s` · aviso no bloqueante de chunks >500 kB |
| 4 | Búsqueda acotada en `web/dist/assets/*.js` | 0 | Ver §2 |
| 5 | `git check-ignore -v web/.env.production` (raíz del repo; solo lectura) | 0 | `.gitignore:5:!web/.env.production<TAB>web/.env.production` |

**Aviso no bloqueante:** `(!) Some chunks are larger than 500 kB after minification` (`index-CpDLBCX2.js` 526.65 kB / gzip 168.63 kB; `DashboardPage-Csj7h5wO.js` 451.55 kB / gzip 129.21 kB). El build termina con exit 0; la configuración de bundle no se tocó (fuera del alcance).

**Cobertura:** no se midió. `web/package.json` no declara proveedor ni script de cobertura y la política no fija umbral para esta feature; se reporta solo el resultado de tests (197/197). No se inventa ningún umbral.

## 2. AC1 — build sin `VITE_API_URL`

Búsqueda literal acotada a `web/dist/assets/*.js` (22 archivos JS generados). `rg` no está disponible en este entorno, por lo que se usó la herramienta de búsqueda de contenido y un conteo acotado con `python3` sobre ese único directorio.

| Cadena | Archivos | Ocurrencias | Detalle |
|---|---|---:|---|
| `/api/v1` | `hooks-DaBvzlIc.js` | 2 | `const Re="/api/v1".replace(/\/+$/,"")` (base de `fetch`) y `` `${"/api/v1".replace(/\/api\/v1\/?$/,"")}${...}` `` (`assetUrl`) |
| `http://localhost:8080/api/v1` | ninguno | **0** | No aparece como base ni en ningún otro asset JS |
| `localhost:8080` | `HealthPage-CGmnf6hL.js` | 1 | Texto informativo aceptado: `Verifica que el backend esté corriendo en http://localhost:8080.` (sin `/api/v1`) |

Otras coincidencias de `8080` en `DashboardPage-Csj7h5wO.js` son literales de color `#808080` de Recharts, no URLs. Asset principal del build: `index-CpDLBCX2.js` (idéntico al registrado en M0 del plan).

**Resultado AC1: PASS.**

## 3. AC2 — development sin cambios (revisión estática)

- `web/src/services/api.ts` intacto: `const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1").replace(/\/+$/, "")` (línea 9) y el mismo default en `assetUrl` (línea 103).
- Vite 6.4.3 instalado: `getEnvFilesForMode(mode, envDir)` construye `` `.env.${mode}` `` (en `web/node_modules/vite/dist/node/chunks/dep-Dm0c1Wj2.js`); `resolveConfig(..., defaultMode = "development", ...)` fija `development` para dev. No se inició servidor de desarrollo.
- `web/vite.config.ts` no define `envDir`, `mode` ni `define` que fuerce `production` en dev; el único archivo de entorno presente es `web/.env.production`.
- Por tanto `vite dev` (mode `development`) no carga `.env.production` y conserva el default localhost; `vite build` (mode `production`) sí lo carga.

**Resultado AC2: PASS (estático).**

## 4. AC3 — `.gitignore`, secretos e infraestructura

- `.gitignore` mantiene `.env` (línea 2), `.env.*` (línea 3), `!.env.example` (línea 4) y añade únicamente `!web/.env.production` (línea 5).
- Salida literal de `git check-ignore -v web/.env.production`: `.gitignore:5:!web/.env.production<TAB>web/.env.production` (exit 0): la regla negativa está activa, luego el archivo es rastreable y el patrón `.env.*` sigue cubriendo el resto.
- `web/.env.production` contiene solo configuración pública: comentario en español y `VITE_API_URL=/api/v1`. Escaneo de patrones de secretos: 0 coincidencias. No se imprimió ni persistió ningún valor sensible.
- `deploy.sh` (mtime 2026-11-17 00:55, anterior a M1) sigue con `VITE_API_URL=/api/v1` en las líneas 9, 91 y 92; `status.sh` y `stop.sh` con mtimes anteriores a M1. No hay unidades systemd en el repositorio. No se modificaron deploy.sh, units, nginx, Cloudflare ni cabeceras de caché.

**Resultado AC3: PASS (verificación estática; sin `git diff`).**

## 5. AC4 — evidencia y health checks ya observados

Artefactos escritos en `test-results/api-base-url-build/`: `report.md` y `metrics.json`; resumen en `test-results/tests/api-base-url-build-m2.json`.

Health checks **ya observados en M0** (según `.ai/plans/api-base-url-build/plan.md`, M0, y `.ai/specs/api-base-url-build/spec.md`, contexto/aprobación), **no re-ejecutados en M2**:

| Endpoint | Resultado observado | Fuente |
|---|---|---|
| SPA local `http://localhost:5178` | 200 | plan M0: «health local ... => 200»; servidor Vite preexistente |
| `https://test3.mikylab.com/api/v1/health/db` | 200 (`conexion=ok`) | plan M0 y spec contexto: «BD sana: /api/v1/health/db 200 con connexion=ok» |
| `https://test3.mikylab.com/health` | 200 | plan M0: «test3 /api/v1/health/db y /health => 200» |

En M2 no se hicieron peticiones HTTP a esos destinos, no se escribió en BD, no se reiniciaron servicios ni se desplegó; los valores se transcriben como evidencia histórica ya observada, no como una medición nueva.

**Resultado AC4: PASS (evidencia completa).**

## 6. AC5 — aprobación de reviewer

**PENDING_REVIEW.** Este informe no la marca PASS. Campo para el reviewer:

- Nombre/actor: `________________________`
- Fecha: `________________________`
- Decisión: `________________________` (APROBADO / RECHAZADO)
- Verificación pendiente: AC1–AC5, ausencia de secretos y que no se tocó deploy.

## 7. Veredicto

| AC | Estado | Resumen |
|---|---|---|
| AC1 | PASS | `/api/v1` incrustado (2 ocurrencias en `hooks-DaBvzlIc.js`); 0 ocurrencias de `http://localhost:8080/api/v1` en `web/dist/assets` |
| AC2 | PASS | Default de `api.ts` intacto; Vite solo carga `.env.production` en mode production (revisión estática) |
| AC3 | PASS | Solo `!web/.env.production` añadido; sin secretos; deploy.sh/units intactos |
| AC4 | PASS | `report.md`, `metrics.json` y resumen JSON; health 200 ya observados referenciados |
| AC5 | **PENDING_REVIEW** | Requiere aprobación humana; no marcado PASS por el tester |

`overall = EVIDENCE_COMPLETE_PENDING_REVIEW` · `ac_pass = 4` · `ac_pending_review = 1` · `ac_fail = 0` · **`release_ready = false`**.
