# Review — historial-a11y (bloque C)

**Fecha:** 2026-11-15  
**Rama:** `feat/historial-a11y` · **HEAD:** `2f41036` (== `origin/feat/historial-a11y`) · **Base:** `ec3c41a`  
**Commits revisados:** `500d798` (M1/M2), `8dd580f` (M3), `ad07e31` (M4), `0c06ac1` (evidencia M5), `888b954` (docs), `2f41036` (scan seguridad).  
**Artefactos:** SPEC `.ai/specs/historial-a11y/spec.md` (R1–R7, D1–D13, AC1–AC14), PLAN `.ai/plans/historial-a11y/plan.md` (M0–M5, §3, §9, §10, §15.3), `test-results/historial-a11y/{report.md,metrics-before.json,metrics-after.json,contrast.json,console-log.json,logs/*,harness/*,screenshots/*}`, `test-results/security/historial-a11y.{json,md}`, `test-results/tests/historial-a11y.json`, diff `ec3c41a..HEAD`.

## Veredicto

**APPROVED**

**`REVIEW -> TEST` autorizado.** No se identifican hallazgos bloqueantes de arquitectura, policy, SPEC/PLAN, seguridad ni correctitud en el alcance del bloque C. AC1–AC13 cuentan con evidencia coherente y verificable; **AC14 queda PENDING** (deploy post-release con aprobación humana, fuera de BUILD/REVIEW). Las desviaciones documentadas por el builder son aceptables (ver hallazgos L1–L4).

## Evaluación AC1–AC14

| AC | Criterio | Resultado | Evidencia / verificación |
|---|---|---|---|
| AC1 | Deep-link de filtros/rango en `/ingresos`: URL↔estado, atrás/adelante y recarga | **PASS** | `logs/harness-metrics.json`/`logs/harness-run.log`: `load365=true push=true back=true reload=true`; unit `filtrosUrl.test.ts`/`rango.test.ts` en suite (121 PASS); `hooks/useFiltrosHistorial.ts` + `lib/filtrosUrl.ts`/`lib/rango.ts`. Captura `screenshots/ingresos-desktop-light.png`. |
| AC2 | `?tab=` en `/configuracion` (default, canónico, push, atrás/adelante) | **PASS** | Fix en `hooks/useTabUrl.ts`: ref `ultimoSolicitadoRef` deduplica `onValueChange` repetidos antes del primer push (evita doble entrada). Probe instrumentado: 1 click = +1 `pushState`, back/forward restauran (`logs/probe-ac2-after.log`, `probe-ac2.cjs`); harness: `canon-default/invalid=true`, `tab-history change/back/forward=true`. |
| AC3 | Presets `ytd/365/anio/custom` (America/La_Paz) y sanitización | **PASS** | `rango.ts`: `hoyEnLaPaz` vía `Intl.DateTimeFormat` tz `America/La_Paz`, `calcularRango`, `interseccionConAnio`, `aniosDelRango`; sanitización 2 fases en `filtrosUrl.ts`/`useFiltrosHistorial.ts` (estructural + semántica de `fuente`, canonización con comparación de serializado). Harness `canonYtd/sinDesde/sinFuenteInvalida/custom=true`. |
| AC4 | Secciones por año colapsables, solo año actual expandido, ARIA, orden desc | **PASS** | `HistorialAgrupado.tsx`/`SeccionAnio.tsx` + `lib/agrupar.ts`; expansión local, reset por key `claveRangoFiltros`. Harness: `2026 expandido, 2025 colapsado, region2025Hidden=true`; `aria-expanded`/`aria-controls`/región con `hidden`. Capturas ingresos móvil/desktop. |
| AC5 | Carga bajo demanda por año y “Cargar más” cuando supera tope | **PASS** | `services/hooks.ts`: `usePagosPagina` con key `["historial","pagos",params]`, `staleTime:30_000`, `enabled`; `clavePagosPagina/serializarFiltrosPagos` canónicos, sin tocar `usePagos`. Harness con mocks (`2025 total_pages=2`): años colapsados sin fetch de filas, `filas2025Antes=0→1`, `page2=true`, `antes=1→despues=2`, sin duplicados observados. Tope `page_size` 500 asumido (PLAN §1). |
| AC6 | `/splits` mismo patrón + filtros; totales globales (D8) | **PASS** | `SplitsPage.tsx`: totales/cabecera/“Pendiente por cuenta” desde `useSplits()`/`useCuentas()` globales; lista agrupada/filtrada. Harness: `secciones=true totalesGlobales=true` (valores idénticos antes/después), lista filtrada (`listaSinParlana=true`), `sinSplits2024=true`. D-A aceptada (índice por pagos; año sin splits muestra vacío). |
| AC7 | 0 `transition-all` en `web/src`; reduced-motion respetado | **PASS** | `metrics-after.json`/`logs/grep-transition-all.log`: 0 ocurrencias (0 archivos). Reemplazos explícitos en `badge.tsx`, `button.tsx`, `switch.tsx`, `tabs.tsx`, `ComprobanteDropzone.tsx`, `progress.tsx`. Harness con `reducedMotion:'reduce'`: `elementosConDuracion>0.02s=0`. Regla global `prefers-reduced-motion` en `index.css` preservada. |
| AC8 | `meta theme-color` presente y actualizada (rgb/hex) al cambiar tema | **PASS** | `web/index.html`: meta inicial `#0a0a0a` (dark). `lib/themeColor.ts`: normalización determinista (hex/rgb passthrough + conversión pura `oklch→rgb/rgba`, reintento con rAF) sin depender de canvas; `store/uiStore.ts` sincroniza en `aplicarTema`. Harness: `dark=rgb(10,10,10) toggled=rgb(255,255,255) changed=true rgbHex=true`, coherente con tokens. Test `themeColor.test.ts` incluido. |
| AC9 | 4 gráficos con nombre/descripción, tabla `sr-only`, `accessibilityLayer`, sin dependencia solo del color, AA | **PASS** | `ChartFigure.tsx` (`figure` + `aria-labelledby/aria-describedby`, desc `sr-only`), `TablaDatos.tsx` (caption/thead/th scope, filas formateadas), `ChartPatterns.tsx` (patrones por gráfico, ids fijos únicos por render único), `ChartCard.tsx`, charts con `accessibilityLayer` y `ChartTooltip` con nombre de serie en texto. Harness: `figs=4 tables=4 descs=4 recharts=4 al=4`; `contrast.json`: min 4.88 (light) / 3.45 (dark), todos ≥3:1 para `chart-1..5` vs fondo. Paleta gris ajustada en `index.css` (D-C). |
| AC10 | Touch targets ≥44, foco visible, sin consola/overflow/truncados en estados nuevos | **PASS (smoke)** | Harness smoke estados clave (390×844/1440×900, light/dark, teclado): `overflowPages=0 errors=0 warnings=0 pageErrors=0 failed=0` (`console-log.json`, `harness-metrics.json`); controles nuevos con `max-md:min-h-11`/foco visible (presets, encabezados año, “Cargar más”, tab URL). Capturas incluidas. |
| AC11 | `tsc`, vitest, build y `go test` en verde | **PASS** | `logs/tsc.log` exit 0; `logs/npm-test.log` 9 archivos / 121 tests PASS; `logs/npm-build.log` exit 0 (`VITE_API_URL=http://localhost:18082/api/v1`); `logs/go-test.log` PASS. |
| AC12 | Diff solo frontend + evidencia/docs; sin deps nuevas ni backend/API/BD | **PASS** | `git diff --stat ec3c41a..HEAD`: `web/src/**`, `web/index.html`, `test-results/**`, `backlog/backlog.md` únicamente. Sin `web/package.json`, lockfiles, `backend/go.mod/go.sum` ni `backend/**`. Sin `.ai/`, `.opencode/`, infra de agentes. |
| AC13 | Evidencia versionada en `test-results/historial-a11y/` + `test-results/tests/historial-a11y.json` | **PASS** | `report.md`, `metrics-before/after.json`, `contrast.json`, `console-log.json`, `logs/*`, `screenshots/*`, `harness/*`, y `test-results/tests/historial-a11y.json` presentes. |
| AC14 | Deploy verificado en `test3` (post-release, aprobación humana) | **PENDING** | Fuera de BUILD/REVIEW (D13, PLAN §16, policy). Requiere aprobación humana + deployer; evidencia esperada `test-results/deployments/historial-a11y.json`. |

## Hallazgos

### Alta

Ninguno.

### Media

Ninguna.

### Baja / observaciones (no bloqueantes)

1. **L1 — Desviaciones declaradas aceptables (SPEC/PLAN cumplidos).** (a) `progress.tsx` usa `transition-[transform]` (R4.2 explícito) en lugar de `transition-colors`; correcto según el caso. (b) Dark `--chart-5` ajustado a luminancia 0.51: el valor puntual difiere del ejemplo nominal pero `contrast.json` mide **3.45:1** vs fondo dark (≥3:1, R6.4/D-C) → aceptable. (c) `ChartPatterns` renderiza un patrón por gráfico para garantizar ids únicos en DOM; cumple R6.3. (d) `filasHistorial` compartido para gráfico/tabla `sr-only` asegura coincidencia exacta de datos (R6.2). (e) Barras con `stroke` de contraste mantienen lectura sin depender solo del color.

2. **L2 — Metadatos de evidencia levemente desalineados (cosmético).** `metrics-after.json`/`report.md` registran `head_sha`/`commit` base `ec3c41a` y notas de “working tree uncommitted”, aunque el HEAD revisado es `2f41036` con commits de producto/evidencia/docs/scan. No afecta al producto ni invalida la evidencia de ejecución (logs de tsc/vitest/build/go-test/harness corresponden al estado implementado). **Sugerencia:** alinear metadatos en TEST/DOCUMENT si se re-emite evidencia.

3. **L3 — Reporte de seguridad referenciado a `888b954` (rango producto cubierto).** `test-results/security/historial-a11y.{md,json}` escanean `ec3c41a..888b954`; HEAD actual agrega `2f41036` (solo `backlog/backlog.md`, doc). El diff de producto/seguridad sensible queda cubierto por el scan PASS; no hay hallazgos ni hard blocks. Verificar en TEST/SCAN que el commit final documentado no introduzca cambios de producto no escaneados.

4. **L4 — Cobertura de harness es smoke/dirigida, no exhaustiva de AA.** AC10 se sustenta en smoke (overflow/consola/errores) y capturas; touch/foco se infieren de implementación y casos clave, no de auditoría axe exhaustiva por estado. Consistente con el enfoque del bloque; recomendable mantener vigilancia en TEST manual asistido si se amplía alcance.

## Verificaciones específicas solicitadas

- **AC2 / `useTabUrl.ts`:** la dedupe por ref evita apilar entradas idénticas cuando `onValueChange` se dispara repetidamente antes de que React aplique el `push`; una vez aplicado el cambio, el `useEffect` sincroniza `ultimoSolicitadoRef` con el `tab` real. Con cambio a tab distinto siempre empuja (`valido !== ultimoSolicitadoRef.current`). Probe y harness confirman exactamente 1 history entry por cambio y back/forward operativos. **Correcto y no rompe navegación normal.**
- **AC8 / `themeColor.ts`:** conversión `oklch→oklab→LMS→sRGB lineal→sRGB` con clamp y serialización estable; soporta L en 0..1/0..100, hue en deg/rad/grad/turn, alpha. Coincide con tokens medidos (`rgb(10,10,10)` dark / `rgb(255,255,255)` light) y con `contrast.json`. **Correcto.**
- **Invalidación histórico (`services/hooks.ts`):** `invalidarHistorial` invalida `["historial"]` (prefijo) cubriendo `["historial","pagos",params]` de `usePagosPagina` sin colisionar ni alterar `usePagos` (`["pagos",...]`); se invoca en mutaciones relevantes (crear/subir/generar/eliminar/marcar y fuentes/cuentas). **Coherente con PLAN §3.4.**
- **Tablas `sr-only` / datos:** `TablaDatos` renderiza valores formateados recibidos; charts comparten filas derivadas (`filasHistorial` en histórico) para paridad gráfico↔tabla. **Correcto por diseño.**
- **Riesgos de correctitud (PLAN §13):** canonización idempotente (comparación serializado), resincronización borrador↔URL en cambio de params, `enabled` para años colapsados, keys estables por string de params, dedupe por `id` en acumulación, región siempre en DOM con `hidden`. No se observan bucles ni regresiones en evidencia.

## Arquitectura, alcance y seguridad

- **Alcance frontend-only:** cambios en `web/src/**` y `web/index.html` + evidencia/docs/test-results/backlog. Sin backend, API, BD, migraciones, `go.mod/go.sum`, `package.json`/lockfiles.
- **Contratos/infra intactos:** `web/src/services/types.ts` y `web/src/services/api.ts` sin diff; router/nav/estrategia global de caché sin cambios de diseño (se agrega hook/key propia para histórico); sin deps nuevas.
- **Git/policy:** commits de producto no incluyen `.ai/`/`.opencode/`/infra de agentes; evidencia y scan separados. No se mutó historial durante la revisión.
- **Seguridad:** `test-results/security/historial-a11y.{md,json}` → **PASS**, `hard_blocks: []`, sin secretos (regex fallback advisory, gitleaks no disponible), sin SAST/deps/config/supply-chain/beforeunload. Sin riesgo inaceptable identificado.

## Calidad reproducida (según evidencia de BUILD)

- `npx tsc -b` PASS · `npm test` 9 archivos / 121 tests PASS · `npm run build` PASS · `go test ./...` PASS · `grep transition-all web/src` = 0. (No se re-ejecutó en esta revisión; logs versionados.)

## Cambios requeridos

**Ninguno bloqueante.** Recomendaciones para TEST/DOCUMENT (opcionales, no condición de aprobación):
- Alinear metadatos de `metrics-after.json`/`report.md` con HEAD final si se regenera evidencia (L2).
- Mantener `test-results/tests/historial-a11y.json` como fuente de verdad al cerrar TEST y registrar AC14 como PENDING/post-release.
- Si el diff posterior a `888b954` creciera más allá de docs, re-ejecutar SCAN sobre el rango efectivo.

## Recomendación de transición

- **Aprobar `REVIEW -> TEST`.**
- En **TEST:** ejecutar/confirmar harness + suite sobre el commit revisado, cerrar `test-results/tests/historial-a11y.json` (AC1–AC13), conservar AC14 PENDING.
- En **RELEASE (aprobación humana):** deploy a `test3`, verificar AC1–AC10 en vivo y producir `test-results/deployments/historial-a11y.json` (AC14). Sin merge a `main` ni tags.

---
*Revisión realizada sin modificar código de producto ni historial Git.*
