# F6 — Regresión, evidencia y cierre — `refactor-purga-seguridad`

- **Repo:** `/home/miky/Documentos/finanzasMikyGoRef`
- **Rama:** `chore/refactor-purga-seguridad` (tracking `origin/chore/refactor-purga-seguridad`)
- **HEAD validado:** `335b07225362033cb740a3422fcdee5dce378f53` (B2: guarda de integración)
- **Base del feature:** `35bb8a1` (6 commits de fase: F1–F6/F6-corrección)
- **Fecha:** 2026-11-23 (actualización post-review)
- **Modo:** TEST / solo lectura de código. No se modificó código de producto, no se hizo `git add`/`commit`/`tag`/`push`.
- **Escritura permitida:** únicamente `test-results/refactor-purga-seguridad/` y el resumen `test-results/tests/refactor-purga-seguridad.json` (política §6 / PLAN §7).
- **Veredicto:** **PASS** — AC1–AC12 PASS (AC10 con justificación estática del reviewer; AC11 con grafo regenerado). Sin bloqueos funcionales ni de compilación.
- **`release_ready`: false** — el usuario probará manualmente la rama antes de cualquier merge. **No hay deploy, tag ni release.**

---

## 1. Comandos canónicos (política §3)

Salida exacta conservada en `logs/`. Exit code del proceso (no del `tee`). Los comandos 1–6 son la corrida base en `f3b137d`; los comandos 7–12 son la **re-ejecución en el HEAD actual `335b072`** tras las correcciones de review.

| # | Comando ejecutado | Exit | Resultado / salida relevante | Log |
|---|---|---|---|---|
| 1 | `cd web && npx tsc -b` | 0 | Sin salida (compilación limpia) | `logs/01-web-tsc.log` |
| 2 | `cd web && npm test` | 0 | `Test Files 18 passed (18)` · `Tests 187 passed (187)` · 15.01s | `logs/02-web-npm-test.log` |
| 3 | `cd web && npm run build` | 0 | `✓ 3282 modules transformed` · aviso no bloqueante chunks >500 kB | `logs/03-web-npm-build.log` |
| 4 | `cd backend && ABYS_SKIP_INTEGRATION=1 go test ./...` | 0 | 7 paquetes `ok`, 4 `[no test files]`, 0 fallos | `logs/04-backend-go-test.log` |
| 5 | `cd backend && go build ./...` | 0 | Sin salida (compila todos los paquetes, sin artefactos) | `logs/05-backend-go-build-all.log` |
| 6 | `cd backend && ABYS_SKIP_INTEGRATION=1 go test -v ./...` | 0 | 34 tests top-level + 18 subtests PASS; 5 `--- SKIP` (corrida anterior a B2) | `logs/06-backend-go-test-verbose.log` |
| 7 | `cd web && npx tsc -b && npm test && npm run build` | 0 | 187/187 tests; build OK (`✓ 3282 modules transformed`, 22.45s) | `logs/07-web-rerun-head-335b072.log` |
| 8 | `cd backend && ABYS_SKIP_INTEGRATION=1 go test ./...` | 0 | 7 paquetes `ok`, 4 `[no test files]`, 0 fallos, **sin conexión a BD** | `logs/08-backend-rerun-head-335b072.log` |
| 9 | `cd backend && ABYS_SKIP_INTEGRATION=1 go test -cover ./...` | 0 | Cobertura Go observada (ver §10); sin umbral definido | `logs/08-backend-rerun-head-335b072.log` |
| 10 | `cd backend && ABYS_SKIP_INTEGRATION=1 go test -v -run '^TestValidacionEntradasHTTP$' ./internal/router` | 0 | `--- SKIP: TestValidacionEntradasHTTP` · `integración desactivada` (B2 verificado) | `logs/08-backend-rerun-head-335b072.log` |
| 11 | `cd backend && go build ./...` | 0 | Sin salida; sin artefactos nuevos | `logs/08-backend-rerun-head-335b072.log` |
| 12 | `cd backend && ABYS_SKIP_INTEGRATION=1 go test -count=1 -v ./...` | 0 | **51** `--- PASS` (33 top-level + 18 subtests), **6** `--- SKIP`, **0** `--- FAIL` | `logs/09-backend-go-test-verbose-head-335b072.log` |

**Desviaciones deliberadas de los comandos literales de la política (según instrucción del task):**

- **Go build:** se ejecutó `go build ./...` en lugar de `go build -o server ./cmd/server` para **no generar artefactos**. Existe `backend/server` previamente (ignorado por Git); **no se tocó ni se commiteó**.
- **Go test:** se antefijó `ABYS_SKIP_INTEGRATION=1`. Motivo: `backend/.env` existe en el entorno; sin la guarda los tests de integración cargarían la credencial real y escribirían en `abys_test`. No se leyó ni imprimió `backend/.env`. Tras la corrección B2 (commit `335b072`) la guarda de `TestValidacionEntradasHTTP` está en `integration_test.go:278-280`, **antes** de `testConfigYPostgres()` (`integration_test.go:805`), que es quien ejecuta `godotenv.Load("../../.env")`. Por tanto, en esta corrida ningún test cargó `.env`, abrió pool ni escribió en BD.

### Tests de integración NO ejecutados (escrituras a BD real)

Los 6 siguientes se omitieron explícitamente con `ABYS_SKIP_INTEGRATION=1` (motivo en log: `integración desactivada`):

| Test | Paquete | Motivo |
|---|---|---|
| `TestMigration000006Backfill` | `internal/database` | Crea/droppea esquema y ejecuta migraciones contra BD |
| `TestSettingsRegistrarEndpoints` | `internal/handler` | Conecta a `abys_test`, hace POST/DELETE en `app_settings` |
| `TestPagoRepoMontoPorDia` | `internal/repository` | Conecta a `abys_test`, inserta/borra pagos |
| `TestIntegrationAPI` | `internal/router` | Flujo completo con POST/PUT/DELETE en `abys_test` (incluye `/health`, `/health/db`) |
| `TestValidacionEntradasHTTP` | `internal/router` | **B2:** antes de `335b072` se ejecutaba y escribía en `abys_test`; ahora respeta la guarda y se omite antes de cargar `.env` |
| `TestSplitPendienteExcluyeGeneralHTTP` | `internal/router` | Conecta a `abys_test`, crea/limpia pagos y splits |

No se ejecutó ningún harness Playwright/E2E completo ni el gate AA visual (requieren servidor/navegador y escribirían fuera del directorio permitido); ver AC10.

---

## 2. Símbolos protegidos (R4.2 / D-PLAN-1/2/6)

Búsqueda literal sobre `web/src/**`, `backend/**` (excluyendo el binario ignorado `backend/server` y `backend/.env`), `package.json`, `package-lock.json` y `.env.example`.

| Símbolo | Ocurrencias en código de producto | Evidencia principal |
|---|---:|---|
| `clavePagosPagina` | 8 | `web/src/services/hooks.ts:87` (definición); usado en `web/src/hooks/useHistorial.ts:112,158,203,217` |
| `fetchPagosPagina` | 5 | `web/src/services/hooks.ts:100` (definición); usado en `useHistorial.ts:113,159,218` |
| `serializarFiltrosPagos` | 5 | `web/src/services/hooks.ts:75` (definición) + `clavePagosPagina`/`fetchPagosPagina`/`usePagos` |
| `PagosFiltros` | 7 | `web/src/services/hooks.ts:57` (interface) + `useHistorial.ts:16,38` |
| `esFechaISOValida` | 17 | `web/src/lib/validators.ts:18`; consumido por `filtrosUrl.ts`, `agrupar.ts`, tests |
| `Error.Details` | campo presente | `backend/internal/apperr/apperr.go:24` (`Details any`) + serializado en `errors.go:37-38` + test `validacion_entrada_test.go:127` |
| `NewInternal` | 7 | `apperr.go:44`; usado en `errors.go:20`, `upload.go`, `splitcalc.go:202` |
| `responderError` | 66 | `backend/internal/handler/errors.go:17`; usado por todos los handlers |
| `invalidarHistorial` | 10 | `web/src/services/hooks.ts:285`; 9 llamadas en mutaciones |
| `api.ts` | archivo presente | `web/src/services/api.ts` — desempaqueta `{data:T}` en `:79-80`; `useHealth()` y `hooks.ts` lo consumen |
| `queryKeys.pagos` | 11 | `web/src/services/hooks.ts:129,291,356,…,494` |
| `queryKeys.splits` | 10 | `web/src/services/hooks.ts:138,317,370,…,535` |
| `["split"]` | 6 | `web/src/services/hooks.ts:384,398,428,450,522` + `hooks.marcarRealizadas.test.ts:52` |
| `agrupar.ts` | archivo presente | `web/src/lib/agrupar.ts` (+ `agrupar.test.ts`), conservado por SPEC `historial-a11y` R3/D7 |

**Resultado: todos los símbolos protegidos siguen presentes.** Observación: `agruparPorAnio` solo tiene consumidor su propio test; no se encontró import desde código de producto (vigilar en un futuro review de código muerto; se conserva por instrucción explícita del task/SPEC).

---

## 3. Símbolos eliminados — comprobación de ausencia

| Símbolo | Ocurrencias en código de producto | Detalle |
|---|---:|---|
| `usePagosPagina` | 0 | — |
| `usePagoDetalle` | 0 | — |
| `useSplitDetalle` | 0 | — |
| `WithDetails(` | 0 | — |
| `AsError(` | 0 | — |
| `prefersReducedMotion` | 0 | — |
| `motionBehavior` | 0 | — |
| `<Progress` | 0 | `web/src/components/ui/progress.tsx` eliminado (diff F2) |
| `ApiEnvelope` | 0 | — |
| `next-themes` | 0 | — |
| `geist` | 0 | — |
| `@radix-ui/react-` | 0 en `package.json` / `web/src` (**438 en `package-lock.json`**) | exclusivamente dependencias **transitivas** de `radix-ui`/`shadcn`; la UI importa desde `radix-ui` |
| `clsx` | 0 en `package.json` / `web/src` (**5 en `package-lock.json`**) | transitiva de `class-variance-authority`, `radix-ui` y `shadcn` |
| `tailwind-merge` | 0 | — |
| `TIMEZONE` | 0 | Tampoco `TimeZone` en `config.go`; resuelto en F4 |

**Resultado: sin referencias en código de producto.** Las únicas ocurrencias repo-wide están en `.ai/` (documentación de PLAN/SPEC, no modificada) y en evidencia histórica `test-results/**`. `prefers-reduced-motion` **sí** permanece, pero como media query CSS en `web/src/index.css:201` — requerido por el gate AA §5.6, no es uno de los símbolos purgados.

---

## 4. Flujos protegidos (R4.3) — verificación por lectura focalizada + tests existentes

| Flujo | Evidencia estática | Tests que lo cubren (ejecutados) |
|---|---|---|
| Histórico paginado con filtros | `useHistorial.ts` usa `clavePagosPagina`/`fetchPagosPagina`/`PagosFiltros`; serializador centralizado | `filtrosUrl.test.ts`, `agrupar.test.ts`, `hooks.marcarRealizadas.test.ts`; backend `TestDashboardContracts` (GET history 200) |
| Registrar pago (comprobante + auto-split) | `hooks.ts:300-302` (`postRaw /pagos`, `split_auto`), `pagoPayload.ts`, `uploads.ts` | `pagoPayload.test.ts`, `uploads.test.ts`, `validators.test.ts`, `api-errors.test.ts`; backend `TestDerivarTotalPagoY422` y tests unitarios de validación |
| Splits (generar/marcar) | `hooks.ts` invalida `queryKeys.splits` y `["split"]`; `confirmacionRealizar`, `realizarSeleccionados` | `confirmacionRealizar.test.ts`, `realizarSeleccionados.test.ts`, `subtotal.test.ts`; backend `TestTotalesSplit` + 8 `TestCalcularSplit*` |
| Dashboard | `queryKeys.summary/history/weekly/monthly/yearly/distribution*`; `chartLogic.ts` | `chartLogic.test.ts`; backend `TestDashboardContracts` (8 endpoints → 200) |
| Configuración | `RegistrarTab.tsx`, `SplitsTab.tsx`, `settingsFallback.ts`, `queryKeys.*Settings` | `settingsFallback.test.ts`, `themeColor.test.ts`; backend `TestValidacionCuentaInputInvalido` / `TestValidacionCuentaDatosValidosYLegacy` / `TestResponderErrorConservaDetails` |
| Health | `router.go:85-86` (`/health`, `/health/db`), `HealthHandler`, `useHealth()` → `/health/db`, `nav.ts` ruta `/health` | `nav.test.ts` (ruta); `/health` y `/health/db` solo se ejercitan en `TestIntegrationAPI`, omitido por la guarda anti-BD |

**Nota:** la cobertura es estática + unitaria; no hubo ejecución E2E contra BD real ni contra la app en marcha. `TestValidacionEntradasHTTP` (HTTP 400/201/200) quedó **omitido por diseño** en esta corrida tras B2; su verificación runtime queda para la prueba manual del usuario. Los tests unitarios de handler cubren los mismos casos de validación sin BD.

---

## 5. Tamaño de `web/dist`

Tras el rebuild en `335b072` (log `07-web-rerun-head-335b072.log`):

| Métrica | Valor |
|---|---:|
| Baseline indicada en el task | 1.536.940 B |
| Actual (`suma de archivos`, 25 archivos) | **1.450.009 B** |
| Delta | **−86.931 B (−5,656 %)** |
| Chunk mayor | `index-CYhxWG3s.js` 516.949 B |
| Segundo | `DashboardPage-DrclDJxr.js` 451.549 B |
| Fuentes Inter | `latin` 48.256 B + `latin-ext` 85.068 B |

Detalle por archivo en `bundle-size.json`. **Conclusión: el bundle no aumentó; disminuyó ~5,7 %.** Los hashes SHA-256 de las fuentes desplegadas en esta corrida son `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62` (`latin`) y `34b9c504cab7a73e37b746343a449132e56cf7b5481af2cb81dc74dcff25c956` (`latin-ext`); el reviewer confirmó que son byte-idénticas a las del baseline (mismo contenido, mismo `unicode-range`).

---

## 6. Veredictos AC1–AC12 (SPEC §5)

| AC | Criterio | Estado | Justificación |
|---|---|---|---|
| AC1 | Purga sin consumidores; build roto = fallo | **PASS** | Inventario §3.1 purgado salvo `agrupar.ts`: los 3 hooks, `queryKeys.pago/split`, `WithDetails`, `AsError`, `a11y.ts`, `progress.tsx` y `ApiEnvelope` tienen 0 referencias en producto; `tsc` + `go build ./...` en verde. `agrupar.ts` conservado por instrucción/SPEC `historial-a11y` R3/D7 |
| AC2 | Símbolos protegidos presentes y en uso | **PASS** | 14/14 verificados (§2) |
| AC3 | `npm test` + `go test ./...` pasan | **PASS** | 187/187 web; 7 paquetes Go `ok`, 0 fallos; re-ejecución en `335b072` sin conexión a BD |
| AC4 | Build pasa y `web/dist` no aumenta | **PASS** | Build OK; 1.450.009 B vs 1.536.940 B (−5,656 %) |
| AC5 | Contrato HTTP idéntico | **PASS** | `responderError` mantiene `{"error":{"code","message","details?"}}`; `api.ts` desempaqueta `{data:T}`; `TestResponderErrorConservaDetails` PASS |
| AC6 | `.env.example` sin credenciales; secreto fuera del repo | **PASS** | `.env.example:9` usa placeholder `cambiar-en-despliegue`; `backend/.env` gitignored y no leído; informe antiguo con secreto eliminado (B1) y `rescan.json` redactado |
| AC7 | CORS localhost + rechazo + preflight | **PASS** | 5 tests de middleware PASS (origen permitido, no permitido, OPTIONS 204, `*`, sin Origin) |
| AC8 | 400 inválidos / 200-201 válidos / legacy | **PASS** | `TestValidacionCuentaInputInvalido`, `TestValidacionCuentaDatosValidosYLegacy`, `TestDerivarTotalPagoY422` y tests web de payload/validators PASS; `TestValidacionEntradasHTTP` omitido por B2 (guarda anti-BD), no fallido |
| AC9 | Seis flujos verificados | **PASS** | Verificación por lectura focalizada + tests existentes (§4); sin E2E con BD |
| AC10 | Gate AA §5 intacto | **PASS** | El reviewer verificó **estáticamente** que no hay cambios observables de copy, navegación, focus ni `prefers-reduced-motion`; los únicos cambios visuales son fuentes byte-idénticas (`latin`/`latin-ext`) y la eliminación de componentes sin uso. La media query `@media (prefers-reduced-motion: reduce)` sigue en `web/src/index.css:201`. **Advisory:** no se reejecutó el harness visual completo en esta corrida; la prueba manual la hará el usuario antes de cualquier merge |
| AC11 | Grafo actualizado | **PASS** | Grafo regenerado por el usuario con `/home/miky/.local/bin/graphify update .`; `graphify-out/graph.json` declara `built_at_commit = 335b07225362033cb740a3422fcdee5dce378f53` (HEAD validado) |
| AC12 | Sin merge/tags; commits por fase sin `.ai/` | **PASS** | 6 commits desde `35bb8a1`, 0 merges, 0 tags en HEAD; `git diff --name-only 35bb8a1..HEAD` no incluye `.ai/` ni `.opencode/`; esta corrida no hizo commits |

**Resumen:** `PASS=12`, `FAIL=0`, `NO_EJECUTADO=0`. No se detectaron regresiones funcionales ni de compilación. `release_ready=false` por decisión del usuario: verificación manual pendiente.

---

## 7. Resolución de bloqueos de review

1. **B1 — Secreto en evidencia (RESUELTO):** el informe antiguo `test-results/security/analisis-correcciones-seguridad.json`, que contenía un valor de `DB_PASSWORD` sin redactar, fue **eliminado**. `test-results/refactor-purga-seguridad/security/rescan.json` fue **redactado** (todas las apariciones de `DB_PASSWORD=` usan `<redactado>` o el placeholder `PLACEHOLDER`; 0 valores no-placeholder). No se imprimió ningún valor secreto. Ver §11.
2. **B2 — `TestValidacionEntradasHTTP` ignoraba la guarda (RESUELTO, commit `335b072`):** la comprobación `if os.Getenv("ABYS_SKIP_INTEGRATION") == "1" { t.Skip(...) }` está en `integration_test.go:278-280`, antes de `testConfigYPostgres()`. La corrida `ABYS_SKIP_INTEGRATION=1 go test ./...` pasa con 0 fallos y 6 omisiones; el test dirigido confirma `--- SKIP` sin cargar `.env`. **No hay escrituras a BD.**
3. **AC10 (antes NO EJECUTADO) → PASS:** justificación estática del reviewer descrita en §6; harness visual completo no reejecutado (advisory).
4. **AC11 (antes FAIL) → PASS:** grafo regenerado en `335b072` con `graphify update .` (ver §6).

---

## 8. Hallazgos / observaciones restantes (todos advisory)

1. **Verificación manual pendiente:** el usuario probará la rama antes de cualquier merge; por eso `release_ready=false`. No se solicita deploy, tag ni release.
2. **R2.3 no enforceada por código:** `cors.go:17` acepta `*` si aparece en `CORS_ORIGIN`; la prohibición en producción está solo documentada (`cors.go:12-15`, `.env.example:14`) y `TestCORSComodinDevuelveAsterisco` verifica que el comodín sigue funcionando. AC7 (tal como está redactado) sí pasa.
3. **Ruta del template:** la SPEC habla de `backend/.env.example`, pero el archivo versionado es `.env.example` en la raíz. Contenido correcto (placeholder + notas CORS).
4. **`agrupar.ts`:** conservado, sin consumidor de producto; decisión confirmada por la conservación exigida en SPEC `historial-a11y` R3/D7.
5. **`backend/server`:** binario preexistente, ignorado por Git; no se usó ni modificó.
6. **Herramientas:** `gitleaks` y `semgrep` no disponibles en el entorno; no se realizó escaneo automatizado de secretos/SAST (ADVISORY, no bloqueante para AC6). La verificación de secretos de la evidencia se hizo con escaneo determinista de asignaciones `DB_PASSWORD=` (§11).

---

## 9. Cobertura (reportada, sin umbral inventado)

El suite canónico no define umbrales de cobertura; se reporta solo lo observado:

| Capa | Cobertura observada |
|---|---|
| Go (`ABYS_SKIP_INTEGRATION=1 go test -cover ./...`) | `internal/router` 98,5 % · `internal/middleware` 63,0 % · `internal/splitcalc` 86,4 % · `internal/service` 28,8 % · `internal/handler` 5,8 % · `internal/database`, `internal/repository`, `cmd/server`, `docs`, `internal/apperr`, `internal/config` 0,0 % (paquetes sin tests o sin statements cubiertos en esta corrida) |
| Web (Vitest) | **No medida**: no hay proveedor de cobertura configurado en `web/package.json`; 187/187 tests pasan |

No se define ni se aplica ningún umbral de cobertura en esta evidencia.

---

## 10. Estado final de Git

- `git status --short`: cambios en `test-results/refactor-purga-seguridad/` y `test-results/tests/refactor-purga-seguridad.json` (esta corrida), más los cambios en `graphify-out/` producidos por la regeneración autorizada del grafo en `335b072` (no por esta corrida). La consulta de grafo inicial de esta corrida restauró su único efecto colateral (`cache/last_query_stamp`).
- Sin `add`/`commit`/`tag`/`push` por parte de esta corrida; historial inalterado.
- `graphify-out/graph.json`: `built_at_commit = 335b07225362033cb740a3422fcdee5dce378f53`.

---

## 11. Verificación de seguridad de la evidencia

Se escanearon **todos los archivos bajo `test-results/`** buscando asignaciones `DB_PASSWORD=` con valores distintos de los placeholders permitidos (`cambiar-en-despliegue`, `PLACEHOLDER`, `your_password_here`) o de `<redactado>` (ya redactado).

- Asignaciones encontradas: **3** (en `refactor-purga-seguridad/security/rescan.json`: 2 `<redactado>` y 1 `PLACEHOLDER`).
- Valores no-placeholder / no-redactados restantes: **0**.
- No se imprimió ni persistió ningún valor secreto durante el escaneo.
