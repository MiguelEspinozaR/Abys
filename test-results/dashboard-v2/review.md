# Review — dashboard-v2

| Campo | Valor |
|---|---|
| Decisión | **REJECTED** |
| Revisor | reviewer (opencode/big-pickle) |
| Fecha | 2026-11-17 |
| Rama | `feat/dashboard-v2` @ `e9faeea` |
| Base | `main` @ `643c511` |
| Entradas | `git diff 643c511..e9faeea`, SPEC/PLAN/policy, `test-results/security/dashboard-v2.{json,md}`, código y ejecución local de comandos |
| Hard block de seguridad | **No** (0 hallazgos; sin secretos expuestos; Gitleaks no disponible → regex fallback advisory) |

## Resumen

La implementación cubre la mayor parte del alcance funcional: columna `monto_enteros` por día,
derivación del total del pago con 422, backfill con día sintético, 7 endpoints de agregación,
registro híbrido sin OCR, charts por día/fuente con patrones/leyenda/tablas y layout sin scroll
interno en `<main>`. Los comandos de calidad ejecutados por este revisor pasan.

Sin embargo **REVIEW no puede aprobar** porque falta toda la evidencia obligatoria del bloque
(AC1/AC15/AC16/AC18), el gate AA es duro y no está evidenciado, y el Swagger generado existe solo
en el filesystem local (ignorado por Git), por lo que no se entrega en el diff.

---

## Blocking issues

### B1 — Evidencia obligatoria ausente (AC18, R12.4, PLAN M5/§13)

- `test-results/dashboard-v2/` **no existe** (`glob test-results/dashboard-v2/**/*` → 0 archivos).
- `test-results/tests/dashboard-v2.json` **no existe**.
- Faltan: `report.md`, `metrics-before.json`, `metrics-after.json`, `console-log.json`, `logs/`,
  `harness/dashboard-v2-audit.cjs` y screenshots de estados clave (no de scroll).
- Sin estos artefactos no se pueden cerrar AC1, AC15, AC16 ni AC18. El PLAN §17 sitúa la evidencia
  dentro de BUILD (M5), antes de REVIEW/TEST.

**Required change:** generar y versionar la estructura completa de evidencia de PLAN §13, con
resultados AC1–AC19 en `test-results/tests/dashboard-v2.json` y un `report.md` que incluya
comandos, números y limitaciones.

### B2 — Gate AA duro sin evidencia (policy §5, R12.1/R12.2, AC15)

- No hay harness ni métricas de contraste light/dark, foco ≥3:1, touch targets ≥44×44 en móvil,
  teclado ni `prefers-reduced-motion` para los controles nuevos: toggle detallado/distribuido,
  inputs por día, selector de redondeo, botones ‹ ›, leyendas y tortas.
- La inspección de código es consistente con el gate:
  `web/src/components/ui/button.tsx:7` (`max-md:min-h-11`),
  `web/src/features/dashboard/ChartCard.tsx:51-70` (`max-md:min-h-11 max-md:min-w-11` + `aria-label`),
  `web/src/features/dashboard/ChartPatterns.tsx:70-115` (patrones por fuente),
  `web/src/features/dashboard/WeeklyChart.tsx:50,80-96`,
  `web/src/features/dashboard/DistributionPie.tsx:39-89`,
  `web/src/features/dashboard/DashboardPage.tsx:182-237,271,341` (tablas `sr-only` y descripciones).
  Pero `project-policy.md:52-63` declara el gate **duro**: sin medición no se acepta.

**Required change:** adjuntar evidencia del harness AA para ambos temas y ambos viewports, con
ratios y resultados por control; corregir cualquier fallo antes de solicitar re-review.

### B3 — Scroll único no medido (R1/R12.5, AC1)

- El código apunta a scroll único: `web/src/components/layout/AppLayout.tsx:9,16,19-29` elimina
  `h-dvh`/`overflow-hidden` y el scroll de `<main>`; `web/index.html:2-16` no fija altura;
  `web/src/index.css` no define `overflow`/`height:100%` en `html/body/#root`. El nav interno
  `web/src/components/layout/NavContenido.tsx:63` y el overlay `NavMovil.tsx:46` quedan dentro de
  lo permitido por R1.3 siempre que no generen segundo scrollbar de página.
- El PLAN §9 exige medición por métricas en `/dashboard` y `/registrar`, 390×844 y 1440×900,
  light/dark, con **exactamente 1** contenedor con `overflow-y` real. No hay `metrics-after.json`.

**Required change:** ejecutar el harness Playwright por métricas (sin screenshots para scroll) y
versionar `metrics-after.json` + `console-log.json` con 0 errores y sin scroll horizontal nuevo.

### B4 — Swagger generado pero no versionado (R11.4, AC14)

- `.gitignore:12` ignora `backend/docs/`; `git ls-files backend/docs` está vacío y
  `git diff 643c511..e9faeea -- backend/docs` está vacío.
- Los archivos locales sí contienen los contratos nuevos
  (`backend/docs/swagger.json:388,424,1634,1653,1665,1690,1698,1746,1755,1919,1939`;
  `backend/docs/docs.go:394,430,1640,1659,1671,1696,1704,1752,1761,1925,1945`;
  `backend/docs/swagger.yaml:7,17,26,47,52`), pero al estar ignorados no se entregan con la rama.
- PLAN M1/M2 los lista como "archivos a tocar" y exige revisión de `backend/docs/*`.

**Required change:** versionar los 3 archivos generados (ajustando `.gitignore` o force-add
autorizado) **o** documentar/ejecutar un paso de generación verificable y admitirlo explícitamente
como convención del bloque. Sin eso AC14 no es verificable desde el repo.

### B5 — Integraciones con BD no ejecutadas/evidenciadas (AC4/AC5/AC14)

- `backend/internal/database/migration_test.go:19-26`,
  `backend/internal/repository/pago_repo_test.go:18-25` y
  `backend/internal/router/integration_test.go:26-36` se omiten cuando `DB_PASSWORD` no está
  definido. `go test ./...` pasó localmente con esos skips.
- No hay logs de ejecución contra BD de test aislada para backfill, 422, fuentes soft-deleted ni
  los 7 endpoints.

**Required change:** ejecutar la suite de integración con BD de test en TEST y registrar los
resultados en el `report.md`/JSON estructurado.

---

## Non-blocking observations

- **O1 — Calidad verificada por el revisor (no sustituye evidencia):** `npm test` (11 archivos,
  144 tests), `npx tsc -b`, `npm run build`, `go test ./...` y
  `go build -o /tmp/dashboard-v2-server ./cmd/server` terminaron en verde. Debe igualmente
  versionarse el log en `test-results/dashboard-v2/logs/`.
- **O2 — Seguridad:** 0 findings; `tesseract.js` se retira y no hay dependencias nuevas; sin
  secretos expuestos. Gitleaks no estaba disponible y se usó regex fallback (advisory), por lo que
  no constituye hard block.
- **O3 — `useHistorial.ts:71-76`:** el filtro de meses candidatos pasó de `cantidad_pagos > 0` a
  `total_centavos > 0`. Es coherente con R11.2, pero un mes con pagos de total 0 deja de ser
  navegable con ‹ ›. Confirmar que es aceptable.
- **O4 — Build warning:** `npm run build` avisa de chunks >500 kB (`DashboardPage` 451 kB,
  `index` 516 kB). No bloquea y parece precursor del propio feature; considerar code-splitting
  fuera de este bloque.
- **O5 — AC19:** deploy a `test3` queda para Release tras aprobación humana; no se exige en este
  review.

---

## AC coverage

| AC | Estado | Base de la evaluación |
|---|---|---|
| AC1 scroll único | **Could not verify** | Código coherente (AppLayout 9/16/19-29); faltan métricas Playwright (B3) |
| AC2 cards finales | Verified by code | `DashboardPage.tsx:248-264` solo 2 cards; sin "Días trabajados"/"Pagos" |
| AC3 total 30d La Paz | Verified by code + unit | `dashboard_service.go`/tests; falta Playwright (B1) |
| AC4 columna + Σ + 422 | Partial | `pago_service.go:26-65,99-155`, `apperr`/`errors.go`; integración BD omitida (B5) |
| AC5 backfill + sintético + down | Partial | `000006_*.sql` correcto por inspección; `migration_test.go` omitido sin BD (B5) |
| AC6 registro detallado | Verified by code + unit | `RegistrarPage.tsx:609-650,731-740`; falta Playwright (B1) |
| AC7 registro distribuido | Verified by code + unit | `distribuir.ts:40-66`, `distribuir.test.ts` (144 tests totales en verde); falta Playwright |
| AC8 sin OCR, comprobante conservado | Verified by code + grep | 0 matches de `tesseract|ocr|leerComprobante`; `ComprobanteDropzone.tsx` conserva upload; falta Playwright |
| AC9 semanal apilado | Verified by code | `WeeklyChart.tsx:50,80-96`, ChartLegend/Tooltip; falta Playwright 22/10 |
| AC10 mensual bloques | Verified by code | `DashboardPage.tsx:283-306`, `MonthlyYearlyCharts.tsx`; falta Playwright |
| AC11 anual 12 meses | Verified by code | `DashboardPage.tsx:308-321`; falta Playwright |
| AC12 histórico sin tendencia | Verified by code + grep | Sin `tendencia` en `web/src`; `HistoryChart.tsx`; falta Playwright |
| AC13 tortas mes/año | Verified by code | `DashboardPage.tsx:338-376`, `DistributionPie.tsx`; falta Playwright/empty state |
| AC14 API + Swagger | Partial / blocking | Contratos en código y 7 endpoints en swagger local, pero docs ignorados (B4) e integración BD omitida (B5) |
| AC15 gate AA | **Could not verify / hard gate** | Sin harness AA (B2) |
| AC16 comandos en verde | Verified by reviewer, evidence missing | Ejecutados ahora en verde; sin logs versionados (B1/O1) |
| AC17 versión 0.3.0 sin tag | Verified | `CHANGELOG.md`, `README.md`, `web/package.json`; `git show-ref --tags` → sin tags |
| AC18 evidencia | **FAIL** | B1 |
| AC19 deploy test3 | Not applicable | Post-release, fuera de REVIEW |

---

## Required changes before re-review

1. Crear `test-results/dashboard-v2/` con `report.md`, métricas, `console-log.json`, `logs/`,
   `harness/` y screenshots clave; crear `test-results/tests/dashboard-v2.json`.
2. Adjuntar evidencia AA (contraste, foco, touch, teclado, reduced-motion, no-color-only).
3. Adjuntar métricas de scroll único en ambas rutas × 2 viewports × 2 temas.
4. Resolver la entrega del Swagger generado (versionarlo o documentar generación verificable).
5. Ejecutar y evidenciar integraciones con BD de test para AC4/AC5/AC14.

No se modificó código de producto ni historial de Git durante esta revisión.

---
---

# Re-review (segunda pasada) — reviewer

| Campo | Valor |
|---|---|
| Decisión (segunda pasada) | **APPROVED** — supersede la decisión `REJECTED` de la primera pasada |
| Revisor | reviewer (opencode/big-pickle) |
| Fecha | 2026-11-17 |
| HEAD revisado | `a896f0f5371ce29d6be6bee9c6ea47f3d6838cca` |
| Base | `main @ 643c511` |
| Alcance del diff | `643c511..a896f0f` (producto idéntico a `3f2e6f6`; `a896f0f` y `e9faeea` solo añaden evidencia) |
| Hard block de seguridad | **No** (0 hallazgos; 0 secretos; Gitleaks no disponible → regex fallback advisório) |
| Regla aplicada | Todo lo exigido en la primera pasada se verificó **leyendo los artefactos versionados**, no re-asserting |

> Nota de integridad: esta sección se **añade**; la primera pasada queda intacta arriba. No se modificó
> código de producto, `.ai/`, `.gitignore` ni historial de Git. Único archivo tocado: este `review.md`.

## 1. Verificación de los 5 ítems del rechazo anterior

Confirmo primero que los 25 artefactos de evidencia están **trackeados en HEAD**
(`git ls-tree -r --name-only HEAD -- test-results/...` → 25 archivos), no solo presentes en el filesystem.

| Ítem previo | Estado | Evidencia leída y resultado |
|---|---|---|
| **1. Árbol `test-results/dashboard-v2/` + `test-results/tests/dashboard-v2.json`** | **RESUELTO** | Versionados los 25 artefactos: `report.md`, `metrics-before.json`, `metrics-after.json`, `console-log.json`, 4 harness `.cjs` + `aa-results.json`/`ac-functional.json`/`dom-inventory.json`, 11 `logs/`, `swagger.json` y el JSON estructurado AC1–AC19. Contenido inspeccionado, no solo existencia. |
| **2. Evidencia del harness AA** | **RESUELTO** | `aa-audit.cjs` (8 checks), `aa-results.json` (8 combinaciones), `dom-inventory.json` (18 patrones, 37 formas con patrón, 3 leyendas, 6 tablas `sr-only`), `playwright-aa-run.log`. Los 6 puntos duros de policy §5 + "no solo color" están medidos; todos PASS salvo `uiContrast` (adjudicado en §2). |
| **3. Métricas de scroll** | **RESUELTO** | `metrics-after.json`: 8/8 combinaciones (2 rutas × 390×844/1440×900 × light/dark) con `document.scrollingElement=html`, `nestedScrollers=0`, `scrollContainers.total=0`, sin overflow horizontal; `console-log.json` 0 errores/warnings/pageerrors/requestfailed; `playwright-scroll-run.log` corrobora. |
| **4. Swagger verificable** | **RESUELTO** (opción 2 de B4) | `swagger.json` + `swagger-generation.log`: comando exacto `swag init -g cmd/server/main.go -o docs` → exit 0, 3 archivos generados, 7 endpoints `/dashboard/*` y `handler.DiaInput` (`fecha` required, `monto_enteros` integer ≥0) verificados; `go.mod`/`go.sum` sin diff. `backend/docs/` sigue gitignored, tal como permite la opción elegida en B4. |
| **5. Integración con BD** | **RESUELTO** | `go-test-db.log`: 28 tests nombrados en PASS, **0 SKIP**; incluye `TestMigration000006Backfill`, `TestPagoRepoMontoPorDia`, `TestIntegrationAPI` (POST/PUT → 422, 409, 404, `health/db` 200) y `TestDashboardContracts` (7 endpoints 200). Sin valores secretos impresos ni persistidos. |

Comandos canónicos también evidenciados y en verde: `web-tsc.log`, `web-npm-test.log` (11 archivos/144 tests), `web-npm-build.log`, `go-vet.log`, `go-build.log`, `go-test-no-db.log`.

## 2. Adjudicación de `uiContrast` en `/registrar`

**Decisión: FUERA DE ALCANCE del gate duro → observación documentada no bloqueante / ítem de backlog. AC15 PUEDE PASAR.**

Razonamiento desde las fuentes de verdad, no re-asserting del veredicto interno del harness:

1. **El check que falla no es un punto del gate duro.** `policy §5` enumera una lista cerrada de 6 puntos y condiciona el rechazo a "si falla alguno de **estos** puntos": (1) touch ≥44×44 móvil, (2) **contraste de texto** AA, (3) **foco visible** ≥3:1 (WCAG 1.4.11 aplicado al indicador de foco), (4) teclado, (5) nombre accesible, (6) reduced-motion. En el harness, esos puntos se implementan como `touchTargets`, `textContrast`, `focusIndicator`, `keyboard`, `accessibleNames`, `reducedMotion` (aa-audit.cjs:97-122, 146-175, 227-344, 406-415) y **todos pasan 8/8** (`playwright-aa-run.log`: `text=0 focus=0 touch=0 names=0 keyboardTrap=false reducedMotionOffenders=0`). El `uiContrast` que falla es un check **adicional del autor del harness** (aa-audit.cjs:124-144) que mide `borderTopColor` de borders **estáticos** de controles contra el fondo — criterio de contraste no textual de límites de componente, que la política **no adoptó** como gate duro. El único criterio ≥3:1 no textual de §5 es explícitamente el **foco visible**, y ese sí pasa.

2. **Los controles marcados no son "controles nuevos" (R12.1).** El SPEC R12.1 limita el gate a *"Todo control nuevo"*. Verificado contra la BASE `643c511` con `git show`: `SelectTrigger id="fuente"` (renderiza `button#fuente`, base `RegistrarPage.tsx:447`), `Textarea id="notas"` (base `RegistrarPage.tsx:563`) y el `<button ... border-2 border-dashed>` del dropzone (base `ComprobanteDropzone.tsx:184-208`) **ya existían antes de este feature**. Los tokens que producen los colores marcados (`--border`/`--input` → `oklch(0.922 0 0)` light, `oklch(1 0 0 / 0.15)` dark) provienen de `web/src/index.css`, cuyo diff `643c511..HEAD` es **vacío** (`git diff ... -- web/src/index.css` → 0 líneas). No hay regresión introducida por la entrega.

3. **El gate aceptado previamente no medía borders de componentes.** `test-results/historial-a11y/contrast.json` (bloque C, aceptado) midió únicamente ratios de tokens `--chart-1..5` vs `--background` a AA no textual ≥3:1. convertir el contraste de borde estático en criterio bloqueante ahora sería aplicar **retroactivamente** un estándar más estricto a código pre-existente y no modificado, invalidando un gate ya aceptado sobre el mismo design system. Equivale a mover el listón, no a corregir una regresión.

4. **Los controles nuevos de este feature sí pasan el gate completo.** Toggle detallado/distribuido (`fieldset#registrar-modo`), selector de modo (`fieldset#metodo`), inputs de monto por día, botones ‹ ›, leyendas y tortas: `text=0`, `focus=0`, touch móvil 14/14 dashboard y 54/54 registrar, `names=0`, sin trampa de teclado, 0 ofensores de reduced-motion, y gráficos no dependen solo del color (18 patrones/37 formas/3 leyendas/6 tablas). R12.1/R12.2 quedan cubiertos.

5. **Salvedad honesta:** el contraste de borde de controles de formulario es una consideración legítima de WCAG 2.1 SC 1.4.11 (UI components) y una mejora de usabilidad real; por eso se **registra como backlog**, no se ignora. Pero no es el gate duro declarado por este proyecto, y la política no declara los borders estáticos como hard block. No existe base para bloquear la entrega por él.

**Required change retirado:** ya no se exige corregir los borders antes de aceptar. Se recomienda (no bloquea) elevar `--border`/`--input` a ≥3:1 en ambos temas en un bloque de diseño system separado y re-ejecutar el harness.

## 3. Bloqueos restantes

**Ninguno.** No hay hallazgos con `file+line` que bloqueen: security 0 findings / 0 secretos (Gitleaks ausente → regex fallback, advisory por política); arquitectura y COMMANDos canónicos en verde; `.ai/` y `.opencode/` fuera del diff de producto; sin tag/release; Git no mutado por este revisor.

## 4. Observaciones no bloqueantes

- **N1 (backlog, derivada de §2):** contraste de borde estático <3:1 en `button#fuente`, `textarea#notas` y dropzone de `/registrar` (light 1.26:1; dark 1.57:1 / 1.33:1). Pre-existente, tokens sin cambios, fuera del gate duro. Seguimiento en deuda de design system.
- **N2 (delivery, F-DOCS-001):** `backend/docs/` sigue gitignored; Swagger se entrega mediante generación reproducible documentada. Aceptado según la opción 2 de B4.
- **N3 (advisory, F-BUILD-001):** warning de chunks >500 kB (`DashboardPage` 451 kB, `index` 516 kB). No bloquea; code-splitting fuera de este bloque.
- **N4 (metodología, F-BASELINE-001):** `metrics-before.json` es estático (`git show`/`git grep` desde `643c511`); no hay métrica live previa. No afecta AC1 (PLAN M0 ya define el baseline como estático).
- **N5 (arrastrada de la primera pasada, O3):** `useHistorial.ts:71-76` cambió el filtro de `cantidad_pagos > 0` a `total_centavos > 0`; un mes con total 0 deja de ser navegable con ‹ ›. Coherente con R11.2; confirmar aceptabilidad.
- **N6 (release):** AC19 (deploy a `test3`) queda para Release tras aprobación humana; fuera de REVIEW.
- **N7 (seguridad):** Gitleaks no disponible; regex fallback usado como advisory. 0 secretos detectados → no es hard block.

## 5. Cobertura AC (segunda pasada)

| AC | Estado | Base |
|---|---|---|
| AC1 | PASS | `metrics-after.json` 8/8; documento único scroller, 0 anidados, 0 overflow horizontal |
| AC2 | PASS | `ac-functional.json#AC2` |
| AC3 | PASS | `go-test-db.log` (`TestSummaryUsaRangoDe30Dias`) + `ac-functional.json#AC3` |
| AC4 | PASS | `go-test-db.log` (`TestPagoRepoMontoPorDia`, `TestDerivarTotalPagoY422`, 422 HTTP) |
| AC5 | PASS | `go-test-db.log` (`TestMigration000006Backfill`, 0 SKIP) |
| AC6 | PASS | `ac-functional.json#AC6` |
| AC7 | PASS | `ac-functional.json#AC7` + `#AC7-residual`; Vitest 144 tests |
| AC8 | PASS | `ac-functional.json#AC8`; grep 0 OCR/tesseract |
| AC9 | PASS | `ac-functional.json#AC9`; `dom-inventory.json` patrones/leyenda/tabla |
| AC10 | PASS | `ac-functional.json#AC10` |
| AC11 | PASS | `ac-functional.json#AC11` |
| AC12 | PASS | `ac-functional.json#AC12` |
| AC13 | PASS | `ac-functional.json#AC13` + `#AC13-empty` |
| AC14 | PASS | `go-test-db.log` (7 endpoints) + `swagger.json`/`swagger-generation.log` |
| **AC15** | **PASS (tras adjudicación §2)** | Los 6 puntos duros de policy §5 + no-solo-color pasan 8/8 para controles nuevos y ambos temas; `uiContrast` es check extra fuera del gate (N1) |
| AC16 | PASS | logs `tsc`/`npm test`/`build`/`go vet`/`go build`/`go test` en verde |
| AC17 | PASS | `0.3.0` en CHANGELOG y `web/package.json`; sin tags |
| **AC18** | **PASS** | 25 artefactos versionados en `HEAD` + JSON estructurado AC1–AC19 |
| AC19 | BLOCKED (fuera de REVIEW) | Deploy post-release, requiere aprobación humana |

**Resultado: AC1–AC18 PASS, AC19 fuera de alcance → REVIEW APROBADO (APPROVED).**
