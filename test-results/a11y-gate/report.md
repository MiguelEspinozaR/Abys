# TEST — Gate de accesibilidad UI (`a11y-gate`)

| Campo | Valor |
|---|---|
| Rama | `feat/a11y-gate` |
| HEAD | `07e957e` (`fix(web): muestra foco visible en paneles de tabs`) |
| Base | `78ca19a` |
| Fecha | 2026-11-09 |
| Estado | **TEST_PASS** |
| Navegador | Chrome 156.0.8078.79 (Playwright) |
| Node / Go | v22.22.1 / go1.26.8 linux/amd64 |
| Preview | `http://localhost:5178` |
| API de auditoría | `http://localhost:18082/api/v1` (GET únicamente) |

> Nota de staging: `:8082` está ocupado por una aplicación ajena (`Abys-Invest`) que responde HTML en `/api/v1/health`. Para evitar falsos fallos se usó el backend de este repo en `:18082`, con build `VITE_API_URL=http://localhost:18082/api/v1`. `:8081` no se tocó. No se hicieron escrituras API.

## Comandos ejecutados

```bash
# staging
cd web && VITE_API_URL=http://localhost:18082/api/v1 npm run build
cd web && ./node_modules/.bin/vite preview --port 5178 --strictPort --host 0.0.0.0

# calidad
cd web && npx tsc -b
cd web && npm test
cd web && VITE_API_URL=http://localhost:18082/api/v1 npm run build
cd backend && go test -count=1 ./...

# tests dirigidos y harness real
cd web && npx vitest run src/lib/nav.test.ts src/services/ocr.test.ts
node test-results/a11y-gate/harness/audit.cjs
```

## Tabla AC1–AC12

| AC | Resultado | Números / evidencia |
|---|---|---|
| AC1 — Touch ≥44×44 | **PASS** | 0 fallos. 20 casos default móvil (5 rutas × 360/390 × light/dark) + 104 estados secundarios. Targets: `/` 14, `/ingresos` 413, `/splits` 22, `/registrar` 52, `/configuracion` 22 por viewport/tema. |
| AC2 — Desktop 1440×900 sin cambios | **PASS** | 10/10 casos ruta/tema con `matched` completo: `/` 16/16, `/ingresos` 40/40, `/splits` 28/28 (light) y 8/8 (dark), `/registrar` 22/22, `/configuracion` 26/26. Sin diffs de geometría. |
| AC3 — Foco ≥3:1 | **PASS** | 26/26 mediciones de los 13 componentes (light/dark). **Además, TabsContent 2/2** con `inset-ring` visible: 4.73 light / 4.18 dark. Todos ≥3:1. |
| AC4 — Teclado/orden lógico | **PASS** | 20/20 walks (5 rutas × 390/1440 × light/dark), `order=true`, `focusVisible=true`, 0 interactivos sin indicador. En `/configuracion`, el tabpanel `#radix-…-content-cuentas` es foco visible en 4/4 walks, con `inset-ring` de 2 px y sin fallo. |
| AC5 — Reduced motion ≤10 ms | **PASS** | Panel, dialog y alert: `maxAnimationMs=0.01`, `maxTransitionMs=0.01`, `infinite=0`, visibles, `opacity=1`. OCR reduce `auto`; OCR normal `smooth`; sin scroll animado. |
| AC6 — Skip link | **PASS** | Light y dark: primer Tab = “Saltar al contenido”; Enter enfoca `MAIN#contenido`; siguiente Tab entra en `main`. |
| AC7 — No regresión | **PASS** | 134 casos: **0** violaciones de contraste de texto, **0** overflow horizontal, **0** truncados, **0** errores de consola/requests fallidos. Favicon 404 excluido como baseline conocido. |
| AC8 — Calidad | **PASS** | `tsc` 0; `npm test` 3 archivos / 24 tests; `npm run build` 0; `go test ./...` 0. |
| AC9 — Alcance | **PASS** | **21 archivos cambiados** en `78ca19a..HEAD`. El pedido mencionaba 22, pero el diff real no contiene un 22.º archivo. Sin deps nuevas, sin API/BD/migraciones, sin `package.json`/`go.mod`/`package-lock.json`. |
| AC10 — Git | **PASS** | HEAD `07e957e` == `origin/feat/a11y-gate`; 7 commits desde `78ca19a`; sin merges, tags ni force-push. `git status` solo muestra `?? test-results/`. |
| AC11 — Deploy | **PASS** | Deploy a `test3` con `DEPLOY_HEALTH_PASS` y AC1–AC7 en vivo `LIVE_PASS`. Evidencia: `test-results/deploy/deploy-report.md` y `live-a11y.md`. |
| AC12 — Evidencia | **PASS** | `report.md`, `metrics-before.json`, `metrics-after.json` (270,636 bytes), `console-log.json`, harness, logs y 12 capturas clave. |

## AC3 — Ratios de foco medidos

| Componente | Light | Dark |
|---|---:|---:|
| Button default | 4.73 | 3.79 |
| Button ghost | 4.73 | 3.79 |
| Button destructive | 4.53 | 3.50 |
| Input | 4.73 | 3.79 |
| Textarea | 4.73 | 3.79 |
| Select trigger | 4.73 | 3.79 |
| SelectItem | 4.34 | 3.19 |
| Tabs trigger | 4.34 | 3.19 |
| Nav link | 4.53 | 3.79 |
| Switch | 4.73 | 3.79 |
| Checkbox | 4.73 | 3.79 |
| DropdownMenuItem | 4.34 | 3.19 |
| DropdownMenuItem destructive | 3.96 | 3.78 |
| **TabsContent (supplemental)** | **4.73** | **4.18** |

Los 13 componentes suman 26/26. TabsContent se mide aparte para no alterar el conteo del SPEC; su indicador es `inset-ring` de 2 px. El valor dark medido es 4.18, superior al ~3.79 estimado.

## AC4 — Evidencia del tabpanel

En los 4 walks de `/configuracion` (390/1440 × light/dark):

- `role="tabpanel"`, `slot="tabs-content"`, `tabindex="0"`.
- `focusVisible=true` al llegar con Tab.
- `indicator=true`.
- `insetRingShadow: inset 0 0 0 2px oklch(55.6% 0 0)`.
- `interactiveWithoutIndicator=0`; `tabpanelFocusVisible=true`; `tabpanelIndicator=true`.

El cambio de `07e957e` añade `focus-visible:inset-ring-2 focus-visible:inset-ring-ring` a `TabsContent`; el CSS compilado contiene ambas variantes.

## AC7 — Antes / después

| Evidencia | Antes (`dc8cc63`) | Después (`07e957e`) |
|---|---:|---:|
| Casos con violación de contraste | 48 | **0** |
| Violaciones de contraste | 198 | **0** |
| Calendario mes vecino | 166 | **0** |
| Labels de nav | 18 | **0** |
| Badges contador | 14 | **0** |
| Overflow horizontal | 0 | **0** |
| Truncados | 0 | **0** |
| Consola / requests fallidos | 0 | **0** |

Ratios puntuales verificados tras el fix de contraste:

| Elemento | Light | Dark |
|---|---:|---:|
| Label de nav “Finanzas” | 4.53 | 6.91 |
| Calendario mes vecino | 4.73 | 6.91 |
| Badge contador “54/46” | 10.58 | 9.76 |

## Capturas clave

- 5 rutas × 390×844 × light/dark: `route-{dashboard,ingresos,splits,registrar,configuracion}-m390-{light,dark}.png`
- Dashboard 1440×900 × light/dark: `route-dashboard-desktop-{light,dark}.png`

Total: 12 capturas en `test-results/a11y-gate/screenshots/`. El cambio de tabpanel solo muestra ring al foco, por lo que no requiere una captura visual adicional.

## Riesgos residuales

1. **AC11 verificado**: deploy a `test3` con health check y AC1–AC7 en vivo (`LIVE_PASS`); sin rollback necesario.
2. **Baseline desktop limitado**: el baseline capturó subconjuntos (p. ej. `/ingresos` 40 targets). AC2 compara los targets existentes por texto/geometría; los extra se reportan como información.
3. **`:8082` ocupado por app ajena**: se usó `:18082` para evitar falsos negativos. `:8081` no se modificó.
4. **Evidencia versionada**: `test-results/` se publicó en `7030e4c`; `.ai/` queda fuera de Git por diseño.

## Artefactos

- `test-results/a11y-gate/report.md`
- `test-results/a11y-gate/metrics-before.json`
- `test-results/a11y-gate/metrics-after.json` (270,636 bytes, compacto)
- `test-results/a11y-gate/console-log.json`
- `test-results/a11y-gate/logs/tabpanel-focus.json`
- `test-results/a11y-gate/logs/fixed-contrast-ratios.json`
- `test-results/a11y-gate/harness/audit.cjs`
- `test-results/a11y-gate/harness/audit-baseline.cjs`
- `test-results/a11y-gate/logs/`
- `test-results/a11y-gate/screenshots/`
- `test-results/tests/a11y-gate.json`

## Veredicto

**TEST_PASS + LIVE_PASS** — AC1–AC12 en PASS. AC7 se mantiene en 0 violaciones, 0 overflow, 0 truncados y 0 errores de consola. AC4 incluye el tabpanel de `/configuracion` como foco visible con `inset-ring` y sin fallo. AC11 se verificó en vivo en `test3` (`DEPLOY_HEALTH_PASS` + `LIVE_PASS`) sin rollback.
