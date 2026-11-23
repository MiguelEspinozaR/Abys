# Graph Report - finanzasMikyGoRef  (2026-11-23)

## Corpus Check
- Extracción --code-only: 256 archivos de código indexados por AST; 45 documentos y 65 imágenes omitidos (sin LLM). 14 migraciones SQL indexadas tras instalar tree_sitter_sql.

## Summary
- 1513 nodes · 4857 edges · 91 communities (45 shown, 46 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 286 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `94c1836c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Web: DashboardPage.tsx
- Web: useHistorial.ts
- Evidencia: forms-audit.cjs
- Web: RegistrarPage.tsx
- Evidencia: historial-audit.cjs
- Backend: github.com/gin-gonic/gin.Con…
- Evidencia: aa-audit.cjs
- Web: api-errors.ts
- Web: CuentasTab.tsx
- Web: SplitsPage.tsx
- Evidencia: audit.cjs
- Backend: CuentaRepo
- Web: router.tsx
- Backend: NewValidation()
- Backend: dashboard_service.go
- Web: PagoFila.tsx
- Proyecto: router.go
- Backend: Setup()
- Backend: context.Context
- Web: hooks.ts
- Web: react
- Web: FuentesTab.tsx
- Backend: testing.T
- Backend: dashboard_handler.go
- Web: compilerOptions
- Web: components.json
- Backend: FuenteRepo
- Backend: .GetPorID()
- Web: dependencies
- Web: compilerOptions (C29)
- Backend: dashboard_service_test.go
- Web: fuentesDots.ts
- Web: package.json
- Web: themeColor.ts
- Backend: 000001_create_schema.up.sql
- Web: devDependencies
- Backend: PagoDetallado
- Web: settingsFallback.ts
- Backend: SettingsRepo
- Backend: HealthRepo
- Web: vite.config.ts
- Web: Transaccion
- Web: uiStore.ts
- Proyecto: deploy.sh
- Web: compilerOptions (C45)
- Web: scripts
- Proyecto: as_root()
- Web: a11y.ts
- Web: vite-env.d.ts
- Backend: 000005_add_split_config.up.s…
- Web: @radix-ui/react-alert-dialog
- Web: @radix-ui/react-dialog
- Web: @radix-ui/react-select
- Web: @radix-ui/react-separator
- Web: @radix-ui/react-slot
- Web: @radix-ui/react-switch
- Web: @radix-ui/react-tabs
- Web: react-calendar
- Web: shadcn
- Web: sonner
- Web: tailwind-merge
- Web: @tanstack/react-query
- Proyecto: status.sh
- Backend: abys

## God Nodes (most connected - your core abstractions)
1. `react` - 52 edges
2. `Button()` - 47 edges
3. `responderError()` - 46 edges
4. `RegistrarPage()` - 45 edges
5. `EditarPagoDialog()` - 42 edges
6. `formatBs()` - 37 edges
7. `CuentasTab()` - 35 edges
8. `Setup()` - 32 edges
9. `FuenteDialog()` - 30 edges
10. `lucide-react` - 30 edges

## Surprising Connections (you probably didn't know these)
- `TestTotalesSplit()` --calls--> `totalesSplit()`  [INFERRED]
  backend/internal/handler/split_handler_test.go → backend/internal/handler/split_handler.go
- `rangoSemana()` --calls--> `LaPaz()`  [INFERRED]
  backend/internal/service/dashboard_service.go → backend/internal/service/validations.go
- `TestRangoSemana()` --calls--> `rangoSemana()`  [INFERRED]
  backend/internal/service/dashboard_service_test.go → backend/internal/service/dashboard_service.go
- `CuentaHandler` --references--> `CuentaRepo`  [EXTRACTED]
  backend/internal/handler/cuenta_handler.go → backend/internal/repository/cuenta_repo.go
- `CuentaHandler` --references--> `CuentaService`  [EXTRACTED]
  backend/internal/handler/cuenta_handler.go → backend/internal/service/cuenta_service.go

## Import Cycles
- 2-file cycle: `backend/internal/handler/settings_handler_test.go -> backend/internal/router/router.go -> backend/internal/handler/settings_handler_test.go`
- 3-file cycle: `backend/internal/handler/settings_handler_test.go -> backend/internal/router/integration_test.go -> backend/internal/router/router.go -> backend/internal/handler/settings_handler_test.go`

## Communities (91 total, 46 thin omitted)

### Community 0 - "Web: DashboardPage.tsx"
Cohesion: 0.07
Nodes (68): date-fns, recharts, ChartLegend(), ChartLegendProps, Swatch(), claveFuente(), etiquetaBloque(), etiquetaMes() (+60 more)

### Community 1 - "Web: useHistorial.ts"
Cohesion: 0.07
Nodes (65): FiltrosRangoProps, HistorialAgrupado(), HistorialAgrupadoProps, SeccionAnio(), SeccionAnioProps, Props, IngresosPage(), Props (+57 more)

### Community 2 - "Evidencia: forms-audit.cjs"
Cohesion: 0.06
Nodes (67): ac1(), ac2(), ac3(), ac4(), ac5(), ac6(), ac7(), ac8_ac9_ac10() (+59 more)

### Community 3 - "Web: RegistrarPage.tsx"
Cohesion: 0.09
Nodes (52): FieldError(), Props, Input(), Textarea(), Campo, centsToBsInput(), EditarPagoDialog(), GuardiaNavegacion() (+44 more)

### Community 4 - "Evidencia: historial-audit.cjs"
Cohesion: 0.07
Nodes (57): ac1(), ac10(), ac2(), ac3(), ac4_ac5(), ac6(), ac7(), ac8() (+49 more)

### Community 5 - "Backend: github.com/gin-gonic/gin.Con…"
Cohesion: 0.12
Nodes (13): mesAnio(), badRequest(), responderError(), NewFuenteHandler(), diasAInput(), NewPagoHandler(), pathID(), CuentaHandler (+5 more)

### Community 6 - "Evidencia: aa-audit.cjs"
Cohesion: 0.05
Nodes (35): { chromium }, fs, routes, themes, viewports, { chromium }, { chromium }, { chromium } (+27 more)

### Community 7 - "Web: api-errors.ts"
Cohesion: 0.06
Nodes (39): vitest, idsParaReintento(), puedeRealizar(), textoConfirmacion(), realizarSeleccionados(), ResultadoRealizacion, CampoCuenta, CampoEditarPago (+31 more)

### Community 8 - "Web: CuentasTab.tsx"
Cohesion: 0.13
Nodes (47): ErrorSummary(), ItemError, Props, Button(), Checkbox(), Dialog(), DialogContent(), DialogDescription() (+39 more)

### Community 9 - "Web: SplitsPage.tsx"
Cohesion: 0.12
Nodes (37): FiltrosRango(), PRESETS, Alert(), AlertDescription(), AlertTitle(), alertVariants, Card(), CardContent() (+29 more)

### Community 10 - "Evidencia: audit.cjs"
Cohesion: 0.07
Nodes (47): checkStaticCss(), { chromium }, BASELINE, clamp01(), compactCase(), compactFocus(), compactResults(), compareDesktopLayout() (+39 more)

### Community 11 - "Backend: CuentaRepo"
Cohesion: 0.09
Nodes (20): NewConflict(), NewImmutable(), NewCuentaHandler(), NewSplitHandler(), scanCuenta(), mapSplitErr(), NewCuentaService(), deref() (+12 more)

### Community 12 - "Web: router.tsx"
Cohesion: 0.11
Nodes (27): react-router-dom, App(), AppLayout(), BotonNav(), NavContenido(), TopBarMovil(), PageLoader(), Sidebar() (+19 more)

### Community 13 - "Backend: NewValidation()"
Cohesion: 0.10
Nodes (20): Error, Kind, AsError(), NewInternal(), NewNotFound(), NewUnprocessable(), NewValidation(), mapPagoErr() (+12 more)

### Community 14 - "Backend: dashboard_service.go"
Cohesion: 0.24
Nodes (12): roundFloat(), AddDiaRequest, CreatePagoRequest, CuentaRequest, DiaInput, FuenteRequest, GenerarSplitRequest, RegistrarSettingsRequest (+4 more)

### Community 15 - "Web: PagoFila.tsx"
Cohesion: 0.20
Nodes (32): ConfirmarDescarteDialog(), Props, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+24 more)

### Community 17 - "Backend: Setup()"
Cohesion: 0.12
Nodes (28): main(), getEnv(), Load(), Connect(), TestSettingsRegistrarEndpoints(), CORS(), Logger(), Recovery() (+20 more)

### Community 18 - "Backend: context.Context"
Cohesion: 0.14
Nodes (10): NewDashboardHandler(), rangoSemana(), BloqueTotal, DiaFuenteTotal, MesTotal, PuntoHistorial, ResumenTotales, dashboardReader (+2 more)

### Community 19 - "Web: hooks.ts"
Cohesion: 0.10
Nodes (28): api, queryKeys, useEliminarCuenta(), ApiEnvelope, ApiErrorBody, CambiarTasaPayload, CambioTasaResponse, CuentaPayload (+20 more)

### Community 20 - "Web: react"
Cohesion: 0.13
Nodes (18): class-variance-authority, cn, lucide-react, radix-ui, react, badgeVariants, buttonVariants, Tabs() (+10 more)

### Community 21 - "Web: FuentesTab.tsx"
Cohesion: 0.13
Nodes (24): Switch(), Table(), TableBody(), TableCell(), TableHead(), TableHeader(), TableRow(), Campo (+16 more)

### Community 22 - "Backend: testing.T"
Cohesion: 0.19
Nodes (23): leerMigracion(), TestMigration000006Backfill(), aplicarModo(), CalcularSplit(), rawCents(), Recalcular(), montosPorAlias(), tasasBase() (+15 more)

### Community 23 - "Backend: dashboard_handler.go"
Cohesion: 0.11
Nodes (20): fuentesNoNulas(), sumarFuentes(), DashboardDistributionMonthlyResponse, DashboardDistributionYearlyResponse, DashboardHistoryResponse, DashboardMonthlyResponse, DashboardSummaryResponse, DashboardWeeklyResponse (+12 more)

### Community 24 - "Web: compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+14 more)

### Community 25 - "Web: components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "Backend: FuenteRepo"
Cohesion: 0.18
Nodes (6): scanFuente(), NewFuenteService(), validarSplitAuto(), Fuente, FuenteRepo, FuenteService

### Community 27 - "Backend: .GetPorID()"
Cohesion: 0.20
Nodes (9): splitJSON(), totalesSplit(), transaccionJSON(), scanSplit(), scanTransaccion(), HistorialTasa, Split, Transaccion (+1 more)

### Community 28 - "Web: dependencies"
Cohesion: 0.11
Nodes (19): clsx, @fontsource-variable/geist, @fontsource-variable/inter, @radix-ui/react-dropdown-menu, @radix-ui/react-label, dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1 (+11 more)

### Community 29 - "Web: compilerOptions (C29)"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 30 - "Backend: dashboard_service_test.go"
Cohesion: 0.20
Nodes (14): bloquesDelMes(), NewDashboardService(), rangoUltimos30(), TestBloquesDelMes(), TestDistribucionSumaYOrden(), TestHistorySinTendencia(), TestMonthlyRellenaBloques(), TestRangoSemana() (+6 more)

### Community 32 - "Web: fuentesDots.ts"
Cohesion: 0.19
Nodes (12): Props, BG_FUENTE_FALLBACK, COLOR_FUENTE_FALLBACK, construirFuentesPorDia(), esColorHex(), FuenteDelDia, FuenteDelDiaTop, FuenteLeyenda (+4 more)

### Community 33 - "Web: package.json"
Cohesion: 0.13
Nodes (14): next-themes, @radix-ui/react-checkbox, @radix-ui/react-tooltip, react-dom, zustand, next-themes@^0.4.6, @radix-ui/react-checkbox@^1.1.4, @radix-ui/react-tooltip@^1.1.8 (+6 more)

### Community 34 - "Web: themeColor.ts"
Cohesion: 0.30
Nodes (12): aplicarMeta(), clamp01(), clamp255(), leerTokenBackground(), linearToSrgb(), normalizarColor(), normalizeRgb(), oklchToRgb() (+4 more)

### Community 35 - "Backend: 000001_create_schema.up.sql"
Cohesion: 0.27
Nodes (13): cuentas, dias_trabajados, fuentes, historial_tasas, idx_dias_fecha, idx_historial_cuenta, idx_pagos_fecha, idx_pagos_fuente (+5 more)

### Community 36 - "Web: devDependencies"
Cohesion: 0.14
Nodes (14): tailwindcss, tw-animate-css, @types/node, @types/react, @types/react-dom, typescript, devDependencies, tailwindcss@^4.1.4 (+6 more)

### Community 37 - "Backend: PagoDetallado"
Cohesion: 0.26
Nodes (6): scanPago(), scanPagoDetallado(), DiaTrabajado, Pago, FiltroPagos, PagoDetallado

### Community 38 - "Web: settingsFallback.ts"
Cohesion: 0.35
Nodes (11): esMetodoPago(), esModoRedondeo(), esModoRegistro(), esUnoDe(), METODOS_PAGO_VALIDOS, MODOS_REDONDEO_VALIDOS, MODOS_REGISTRO_VALIDOS, normalizarModoRedondeo() (+3 more)

### Community 39 - "Backend: SettingsRepo"
Cohesion: 0.31
Nodes (4): NewSettingsHandler(), NewPagoService(), SettingsHandler, SettingsRepo

### Community 40 - "Backend: HealthRepo"
Cohesion: 0.32
Nodes (5): NewHealthHandler(), HealthHandler, HealthInfo, HealthRepo, TablaInfo

### Community 41 - "Web: vite.config.ts"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite, vite, @vitejs/plugin-react, @tailwindcss/vite@^4.1.4, vite@^6.2.3, @vitejs/plugin-react@^4.3.4

### Community 42 - "Web: Transaccion"
Cohesion: 0.32
Nodes (5): Props, Props, sumaMontosSeleccionados(), Cuenta, Transaccion

### Community 43 - "Web: uiStore.ts"
Cohesion: 0.39
Nodes (7): sincronizarThemeColor(), MetodoPago, ModoRegistro, SplitSettings, aplicarTema(), Tema, UiState

### Community 44 - "Proyecto: deploy.sh"
Cohesion: 0.60
Nodes (5): as_root(), die(), log(), deploy.sh script, warn()

### Community 45 - "Web: compilerOptions (C45)"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

### Community 46 - "Web: scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, test

## Knowledge Gaps
- **1 isolated node(s):** `abys`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 356 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Web: react` to `Web: DashboardPage.tsx`, `Web: package.json`, `Web: useHistorial.ts`, `Web: RegistrarPage.tsx`, `Web: CuentasTab.tsx`, `Web: SplitsPage.tsx`, `Web: router.tsx`, `Web: PagoFila.tsx`, `Web: FuentesTab.tsx`, `Web: dependencies`, `Web: dropdown-menu.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 42 inferred relationships involving `responderError()` (e.g. with `.Actualizar()` and `.CambiarTasa()`) actually correct?**
  _`responderError()` has 42 INFERRED edges - model-reasoned connections that need verification._
- **What connects `abys` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Web: DashboardPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07401032702237521 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Web: react` to `Web: DashboardPage.tsx`, `Web: package.json`, `Web: useHistorial.ts`, `Web: RegistrarPage.tsx`, `Web: CuentasTab.tsx`, `Web: SplitsPage.tsx`, `Web: router.tsx`, `Web: PagoFila.tsx`, `Web: FuentesTab.tsx`, `Web: dependencies`, `Web: dropdown-menu.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `Web: useHistorial.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0675990675990676 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Web: api-errors.ts` to `Web: DashboardPage.tsx`, `Web: package.json`, `Web: fuentesDots.ts`, `Web: useHistorial.ts`, `Web: themeColor.ts`, `Web: RegistrarPage.tsx`, `Web: settingsFallback.ts`, `Web: devDependencies`, `Web: Transaccion`, `Web: router.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._