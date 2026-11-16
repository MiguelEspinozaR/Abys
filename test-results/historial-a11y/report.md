# Evidencia M5 — historial-a11y (bloque C)

- **Fecha:** 2026-11-16 (UTC, cierre BUILD/M5)
- **Rama:** `feat/historial-a11y` (apilada desde `feat/forms-a11y` @ `ec3c41a`)
- **HEAD base:** `ec3c41a37e8b6d94caa99bbd3a3bc9a41b5e5658`
- **Estado del árbol:** M1–M4 implementados en working tree, **sin commits** (no se realizaron mutaciones de Git). Evidencia producida en M5.
- **Entorno harness:** `vite preview` `http://localhost:5178` sirviendo `web/dist` construido con `VITE_API_URL=http://localhost:18082/api/v1`; Chrome headless 156.0.8078.79 (channel `chrome`), Playwright 1.65.0 (caché npx del entorno), Node v22.22.1. Todas las lecturas/escrituras API interceptadas con `page.route()` (mocks deterministas 2026/2025/2024; 2025 con `meta.total_pages=2` para “Cargar más”; splits globales conocidos). Red de seguridad 599 `HARNESS_BLOCKED_WRITE` ante escrituras no mockeadas. No se usó backend real de escritura.

## Resumen de verificación final (ejecutada)

| Comando | Resultado | Evidencia |
|---|---|---|
| `(cd web && npx tsc -b)` | **PASS** (exit 0) | `logs/tsc.log` |
| `(cd web && npm test)` | **PASS** (exit 0, 9 archivos / 121 tests) | `logs/npm-test.log` |
| `(cd web && VITE_API_URL=http://localhost:18082/api/v1 npm run build)` | **PASS** (exit 0) | `logs/npm-build.log` |
| `(cd backend && go test ./...)` | **PASS** (exit 0; `router`/`splitcalc` ok, resto sin tests) | `logs/go-test.log` |
| `grep -rn "transition-all" web/src` | **0** ocurrencias | `logs/grep-transition-all.log` |
| `git diff --stat ec3c41a..HEAD -- web/package.json web/package-lock.json backend/go.mod backend/go.sum` | **vacío** (sin commits nuevos; deps sin cambios) | salida de verificación |
| `git diff --name-only -- web/package.json web/package-lock.json backend/go.mod backend/go.sum` | **vacío** | salida de verificación |

> Nota: los cambios de M1–M4/M5 están **uncommitted** en el working tree (producto en `web/` + evidencia en `test-results/historial-a11y/` + docs `backlog/` y `test-results/tests/historial-a11y.json`). No se modificaron `package.json`, lockfiles, `go.mod/go.sum`, backend, API ni BD.

## Tabla AC1–AC14

| AC | Criterio | Resultado | Evidencia / números | Notas |
|---|---|---|---|---|
| AC1 | Deep-link de filtros/rango en `/ingresos`; atrás/adelante/recarga | **PASS (harness)** | `logs/harness-metrics.json`, `logs/harness-run.log`: `load365=true push=true back=true reload=true`; `screenshots/ingresos-desktop-light.png` | — |
| AC2 | `?tab=` en `/configuracion` (default/canónico, cambio, atrás/adelante) | **PASS (harness + probe)** | Fix producto en `web/src/hooks/useTabUrl.ts`: dedupe por `useRef` del último tab solicitado para ignorar `onValueChange` duplicados antes del primer push. Probe instrumentado (2 corridas limpias): 1 click = +1 `pushState`/`history.length`, `goBack()` restaura `?tab=cuentas`, `goForward()` restaura `?tab=fuentes` (`logs/probe-ac2-after.log`). Harness: `canon-default=true`, `canon-invalid=true`, `tab-history change=true back=true forward=true`. | — |
| AC3 | Presets y fechas (America/La_Paz) y sanitización de params inválidos | **PASS (harness)** | `canonYtd=true sinDesde=true sinFuenteInvalida=true custom=true`; unitarios `rango.test.ts`/`filtrosUrl.test.ts` en suite (121 tests PASS) | — |
| AC4 | Secciones por año colapsables, solo año actual expandido, ARIA, orden desc | **PASS (harness)** | `2026=true/true 2025=true/false region2025Hidden=true`; `screenshots/ingresos-m390-dark.png` | `aria-expanded`/`aria-controls`/región `hidden` verificados en flujo. |
| AC5 | Carga bajo demanda por año y “Cargar más” cuando supera el tope | **PASS (harness)** | `filas2025Antes=0 filas2025Despues=1 page2=true antes=1 despues=2` (mocks: 2025 `total_pages=2`) | Años colapsados no piden filas `page_size=500`; “Cargar más” pide página 2. Conteo/dedupe validados por comportamiento observado. |
| AC6 | `/splits` mismo patrón + filtros; totales globales | **PASS (harness)** | `secciones=true totalesGlobales=true antes={"splitsGenerados":"6","pendienteTotal":"795,00 Bs","realizadoTotal":"795,00 Bs","pendientePorCuenta":["795,00 Bs","0,00 Bs","795,00 Bs"]} despues={"splitsGenerados":"6","pendienteTotal":"795,00 Bs","realizadoTotal":"795,00 Bs","pendientePorCuenta":["795,00 Bs","0,00 Bs","795,00 Bs"]} listaSinParlana=true sinSplits2024=true` (`logs/harness-metrics.json`) | Interacción de filtro corregida en harness (`#splits-fuente` + opción exacta, `force`); totales globales inalterados y lista filtrada. |
| AC7 | 0 ocurrencias de `transition-all`; reduced-motion respetado | **PASS** | `grep` = 0 (`logs/grep-transition-all.log`); harness: `elementosConDuracion>0.02s=0` con `reducedMotion:'reduce'` | Regla global `prefers-reduced-motion` en `index.css` vigente. |
| AC8 | `meta theme-color` presente y actualizada al cambiar tema (rgb/hex) | **PASS (harness)** | `dark=rgb(10, 10, 10) toggled=rgb(255, 255, 255) changed=true rgbHex=true` (`logs/harness-metrics.json`), coherente con `--background` dark `oklch(0.145 0 0)` y light `oklch(1 0 0)`. | Normalización determinista oklch→rgb en `web/src/lib/themeColor.ts` (sin canvas) + test puro `web/src/lib/themeColor.test.ts`. |
| AC9 | 4 gráficos con nombre/descripción, tabla `sr-only`, `accessibilityLayer`, sin dependencia solo del color; AA | **PASS (harness)** | `figs=4 tables=4 descs=4 recharts=4 al=4 minRatio=4.88` (light), `minRatio=3.45` (dark) (`logs/harness-metrics.json`, `contrast.json`). Ratios chart-1..5 vs fondo: light 4.88/6.58/8.86/11.73/15.13, dark 13.36/9.34/6.36/4.18/3.45 (todos >= 3:1). | Harness convierte `oklch` con la misma matemática para medir contraste real; `contrast.json` actualizado con valores rgb/ratio por tema. |
| AC10 | Touch targets ≥44, foco visible, sin consola/overflow/truncados en estados nuevos | **PASS (smoke)** | `overflowPages=0 errors=0 warnings=0 pageErrors=0 failed=0`; capturas móvil/desktop light/dark | Smoke harness en estados clave; no sustituye auditoría AA completa. |
| AC11 | `tsc`, vitest, build y `go test` en verde | **PASS** | `logs/tsc.log`, `logs/npm-test.log` (9/121), `logs/npm-build.log`, `logs/go-test.log` | — |
| AC12 | Diff solo frontend + evidencia/docs; sin deps nuevas ni backend/API/BD | **PASS (alcance)** | `package.json`/lockfiles/`go.mod`/`go.sum` sin diff; sin cambios en `backend/**` ni contratos API/BD | Cambios de producto limitados a `web/` (M1–M4, uncommitted) + evidencia/docs `test-results/` y `backlog/`. `.ai/` no incluido en producto. |
| AC13 | Evidencia en `test-results/historial-a11y/` + `test-results/tests/historial-a11y.json` | **PASS (draft)** | Este reporte, métricas, console/contrast, logs, screenshots, harness; `test-results/tests/historial-a11y.json` generado | Valores finales sujetos a confirmación en TEST. |
| AC14 | Deploy verificado en `test3` (post-release, aprobación humana) | **PENDING** | — | Fuera de BUILD; requiere aprobación humana y `deployer` en DEPLOY. |

## Evidencia producida (M5)

- `test-results/historial-a11y/report.md` (este archivo)
- `test-results/historial-a11y/metrics-before.json` (existente, M0) y `test-results/historial-a11y/metrics-after.json`
- `test-results/historial-a11y/contrast.json`
- `test-results/historial-a11y/console-log.json`
- `test-results/historial-a11y/logs/`: `m0.txt`, `m0-harness.json`, `m1-filtros-url.md`, `m2-historial.md`, `m3-transiciones-tema.md`, `m4-graficos.md`, `tsc.log`, `npm-test.log`, `npm-build.log`, `go-test.log`, `grep-transition-all.log`, `harness-run.log`, `harness-metrics.json`, `matrix.json`
- `test-results/historial-a11y/screenshots/`: `/ingresos` (custom/expandido desktop, ytd/móvil light+dark), `/splits` (móvil light, desktop dark), `/configuracion?tab=` (light/dark), dashboard 4 gráficos (desktop light/dark)
- `test-results/historial-a11y/harness/historial-audit.cjs`
- `test-results/tests/historial-a11y.json` (draft, esquema forms-a11y)
- `backlog/backlog.md` (fila bloque C + roadmap)

## Limitaciones y desviaciones

- **AC8:** resuelto en esta iteración: `meta theme-color` normalizado a `rgb()` determinísticamente (`themeColor.ts` + `themeColor.test.ts`); harness confirma rgb en dark/light y cambio de tema.
- **AC9 contraste:** resuelto para medición: harness convierte `oklch` y registra ratios reales en `contrast.json` (min 4.88 light / 3.45 dark, todos >= 3:1).
- **AC2:** corregido en producto (dedupe de `setTab` por ref para evitar doble push por invocaciones repetidas de `onValueChange`); verificado con probe instrumentado x2 y harness AC2 PASS.
- **AC6:** resuelto en harness: interacción de filtro corregida y verificado que totales globales no cambian mientras la lista se filtra (sin "Parlana", año 2024 vacío de splits).
- **Topes/diseño conocidos (SPEC/PLAN):** índice de años en `/splits` basado en pagos del rango (D-A, año con pagos sin splits muestra estado vacío), `page_size` efectivo 500, `theme-color` inicial estático en HTML hasta sincronización, expansión/“Cargar más” como estado local.
- **AC14:** deploy a `test3` pendiente de aprobación humana y ejecución en DEPLOY (fuera de BUILD).

## Notas de seguridad de ejecución

- No se realizaron escrituras reales: rutas API mockeadas con `page.route()` y safety net 599 `HARNESS_BLOCKED_WRITE`.
- Puertos `:8081`/`:8082`/`test3` no fueron utilizados/modificados durante BUILD.
- No se modificó producto para ocultar hallazgos; las desviaciones se reportan.
