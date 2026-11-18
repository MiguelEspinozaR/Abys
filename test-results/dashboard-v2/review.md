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
