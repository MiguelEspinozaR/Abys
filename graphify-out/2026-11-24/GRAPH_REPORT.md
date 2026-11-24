# Graph Report - finanzasMikyGoRef  (2026-11-24)

## Corpus Check
- 264 files · ~266,470 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 43 file(s) not represented in the graph (top: .log 38, (none) 3, .example 1)

## Summary
- 1494 nodes · 4936 edges · 83 communities (51 shown, 32 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 288 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9cb62661`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Web: DashboardPage.tsx
- Web: useHistorial.ts
- Evidencia: forms-audit.cjs
- Web: RegistrarPage.tsx
- Evidencia: historial-audit.cjs
- Backend: github.com/gin-gonic/gin.Con…
- aa-audit.cjs
- api-errors.ts
- Web: CuentasTab.tsx
- Web: SplitsPage.tsx
- Evidencia: audit.cjs
- Backend: CuentaRepo
- NavContenido.tsx
- Backend: NewValidation()
- Backend: dashboard_service.go
- Web: PagoFila.tsx
- Proyecto: router.go
- Backend: Setup()
- Backend: context.Context
- Web: hooks.ts
- react
- Web: FuentesTab.tsx
- Backend: testing.T
- Backend: dashboard_handler.go
- Web: compilerOptions
- Web: components.json
- Backend: FuenteRepo
- Backend: .GetPorID()
- package.json
- Web: compilerOptions (C29)
- ModoDistribucion
- Web: fuentesDots.ts
- cors_test.go
- vitest
- Backend: 000001_create_schema.up.sql
- Web: devDependencies
- Backend: PagoDetallado
- dominio.ts
- useUiStore
- DashboardPage.tsx
- router.tsx
- fakeDashboardRepo
- ref
- Proyecto: deploy.sh
- Web: compilerOptions (C45)
- Web: scripts
- Proyecto: as_root()
- computeIndicator
- Web: vite-env.d.ts
- Backend: 000005_add_split_config.up.s…
- format.ts
- audit-baseline.cjs
- probe-ac2.cjs
- nav.ts
- Proyecto: status.sh
- Backend: abys

## God Nodes (most connected - your core abstractions)
1. `react` - 51 edges
2. `responderError()` - 47 edges
3. `Button()` - 47 edges
4. `RegistrarPage()` - 45 edges
5. `EditarPagoDialog()` - 42 edges
6. `formatBs()` - 37 edges
7. `CuentasTab()` - 35 edges
8. `Setup()` - 33 edges
9. `FuenteDialog()` - 30 edges
10. `lucide-react` - 30 edges

## Surprising Connections (you probably didn't know these)
- `TestValidacionCuentaInputInvalido()` --calls--> `NewCuentaHandler()`  [INFERRED]
  backend/internal/handler/validacion_entrada_test.go → backend/internal/handler/cuenta_handler.go
- `TestResponderErrorConservaDetails()` --calls--> `responderError()`  [INFERRED]
  backend/internal/handler/validacion_entrada_test.go → backend/internal/handler/errors.go
- `TestTotalesSplit()` --calls--> `totalesSplit()`  [INFERRED]
  backend/internal/handler/split_handler_test.go → backend/internal/handler/split_handler.go
- `SplitHandler` --references--> `CuentaRepo`  [EXTRACTED]
  backend/internal/handler/split_handler.go → backend/internal/repository/cuenta_repo.go
- `SplitHandler` --references--> `SplitService`  [EXTRACTED]
  backend/internal/handler/split_handler.go → backend/internal/service/split_service.go

## Import Cycles
- 2-file cycle: `backend/internal/handler/settings_handler_test.go -> backend/internal/router/router.go -> backend/internal/handler/settings_handler_test.go`
- 3-file cycle: `backend/internal/handler/settings_handler_test.go -> backend/internal/router/integration_test.go -> backend/internal/router/router.go -> backend/internal/handler/settings_handler_test.go`

## Communities (83 total, 32 thin omitted)

### Community 0 - "Web: DashboardPage.tsx"
Cohesion: 0.12
Nodes (34): date-fns, recharts, date-fns@^4.1.0, ChartLegend(), ChartLegendProps, Swatch(), claveFuente(), etiquetaBloque() (+26 more)

### Community 1 - "Web: useHistorial.ts"
Cohesion: 0.09
Nodes (53): FiltrosRangoProps, HistorialAgrupadoProps, SeccionAnio(), SeccionAnioProps, Props, Props, useFiltrosHistorial(), UseFiltrosHistorialResultado (+45 more)

### Community 2 - "Evidencia: forms-audit.cjs"
Cohesion: 0.06
Nodes (67): ac1(), ac2(), ac3(), ac4(), ac5(), ac6(), ac7(), ac8_ac9_ac10() (+59 more)

### Community 3 - "Web: RegistrarPage.tsx"
Cohesion: 0.08
Nodes (56): ErrorSummary(), ItemError, Props, FieldError(), Props, AlertDescription(), AlertTitle(), Input() (+48 more)

### Community 4 - "Evidencia: historial-audit.cjs"
Cohesion: 0.07
Nodes (57): ac1(), ac10(), ac2(), ac3(), ac4_ac5(), ac6(), ac7(), ac8() (+49 more)

### Community 5 - "Backend: github.com/gin-gonic/gin.Con…"
Cohesion: 0.11
Nodes (15): NewInternal(), mesAnio(), badRequest(), responderError(), NewFuenteHandler(), hoyLaPaz(), diasAInput(), NewPagoHandler() (+7 more)

### Community 6 - "aa-audit.cjs"
Cohesion: 0.10
Nodes (17): { chromium }, fs, OUT, path, { chromium }, fs, OUT, path (+9 more)

### Community 7 - "api-errors.ts"
Cohesion: 0.09
Nodes (28): CampoCuenta, CampoEditarPago, CampoFuente, CampoGenerarSplit, CampoRegistrar, CampoTasa, ConfigErroresApi, ErrorApiLike (+20 more)

### Community 8 - "Web: CuentasTab.tsx"
Cohesion: 0.19
Nodes (30): Button(), Checkbox(), Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay() (+22 more)

### Community 9 - "Web: SplitsPage.tsx"
Cohesion: 0.12
Nodes (44): lucide-react, FiltrosRango(), PRESETS, HistorialAgrupado(), Card(), CardContent(), CardDescription(), CardHeader() (+36 more)

### Community 10 - "Evidencia: audit.cjs"
Cohesion: 0.09
Nodes (36): checkStaticCss(), { chromium }, BASELINE, compactCase(), compactFocus(), compactResults(), compareDesktopLayout(), countCategories() (+28 more)

### Community 11 - "Backend: CuentaRepo"
Cohesion: 0.11
Nodes (18): NewCuentaHandler(), NewSplitHandler(), scanCuenta(), NewCuentaService(), deref(), esGeneralID(), NewSplitService(), NewTasaService() (+10 more)

### Community 12 - "NavContenido.tsx"
Cohesion: 0.36
Nodes (11): react-router-dom, AppLayout(), BotonNav(), NavContenido(), TopBarMovil(), Sidebar(), Tooltip(), TooltipContent() (+3 more)

### Community 13 - "Backend: NewValidation()"
Cohesion: 0.11
Nodes (20): Error, Kind, NewConflict(), NewImmutable(), NewNotFound(), NewUnprocessable(), NewValidation(), mapPagoErr() (+12 more)

### Community 14 - "Backend: dashboard_service.go"
Cohesion: 0.23
Nodes (10): AddDiaRequest, CreatePagoRequest, CuentaRequest, DiaInput, FuenteRequest, GenerarSplitRequest, RegistrarSettingsRequest, SplitSettingsRequest (+2 more)

### Community 15 - "Web: PagoFila.tsx"
Cohesion: 0.20
Nodes (32): ConfirmarDescarteDialog(), Props, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+24 more)

### Community 16 - "Proyecto: router.go"
Cohesion: 0.15
Nodes (8): leerMigracion(), TestMigration000006Backfill(), TestTotalesSplit(), assertErrorValidacion(), contextoJSON(), TestResponderErrorConservaDetails(), TestValidacionCuentaDatosValidosYLegacy(), TestValidacionCuentaInputInvalido()

### Community 17 - "Backend: Setup()"
Cohesion: 0.12
Nodes (24): main(), getEnv(), Load(), Connect(), NewHealthHandler(), NewSettingsHandler(), TestSettingsRegistrarEndpoints(), NewCuentaRepo() (+16 more)

### Community 18 - "Backend: context.Context"
Cohesion: 0.09
Nodes (27): NewDashboardHandler(), bloquesDelMes(), NewDashboardService(), rangoSemana(), rangoUltimos30(), TestBloquesDelMes(), TestDistribucionSumaYOrden(), TestHistorySinTendencia() (+19 more)

### Community 19 - "Web: hooks.ts"
Cohesion: 0.11
Nodes (29): Props, Props, sumaMontosSeleccionados(), queryKeys, CambiarTasaPayload, CambioTasaResponse, Cuenta, CuentaPayload (+21 more)

### Community 20 - "react"
Cohesion: 0.15
Nodes (17): class-variance-authority, radix-ui, react, Alert(), alertVariants, badgeVariants, buttonVariants, Tabs() (+9 more)

### Community 21 - "Web: FuentesTab.tsx"
Cohesion: 0.13
Nodes (24): Switch(), Table(), TableBody(), TableCell(), TableHead(), TableHeader(), TableRow(), Campo (+16 more)

### Community 22 - "Backend: testing.T"
Cohesion: 0.15
Nodes (29): cleanup(), cleanupCuenta(), countPagos(), doReq(), hasCode(), TestIntegrationAPI(), TestSplitPendienteExcluyeGeneralHTTP(), TestValidacionEntradasHTTP() (+21 more)

### Community 23 - "Backend: dashboard_handler.go"
Cohesion: 0.21
Nodes (10): fuentesNoNulas(), sumarFuentes(), DashboardDistributionMonthlyResponse, DashboardDistributionYearlyResponse, DashboardWeeklyResponse, FuenteTotal, DiaConFuentes, DistributionMonthlyResultado (+2 more)

### Community 24 - "Web: compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+14 more)

### Community 25 - "Web: components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "Backend: FuenteRepo"
Cohesion: 0.13
Nodes (10): scanFuente(), NewFuenteService(), validarSplitAuto(), NewPagoService(), Fuente, FuenteRepo, SettingsRepo, Repos (+2 more)

### Community 27 - "Backend: .GetPorID()"
Cohesion: 0.19
Nodes (10): splitJSON(), totalesSplit(), transaccionJSON(), scanSplit(), scanTransaccion(), SplitHandler, Split, Transaccion (+2 more)

### Community 28 - "package.json"
Cohesion: 0.12
Nodes (17): cn, @fontsource-variable/inter, react-calendar, shadcn, zustand, dependencies, class-variance-authority@^0.7.1, cn@^0.2.6 (+9 more)

### Community 29 - "Web: compilerOptions (C29)"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 30 - "ModoDistribucion"
Cohesion: 0.25
Nodes (9): aplicarModo(), distribuir(), modos, ModoDistribucion, MODOS_DISTRIBUCION, construirDiasPayload(), ConstruirDiasPayloadArgs, base (+1 more)

### Community 32 - "Web: fuentesDots.ts"
Cohesion: 0.15
Nodes (20): CalendarioDias(), ColorSwatch(), Herramienta, HERRAMIENTAS, Props, valueToDate(), fromISODate(), toISODate() (+12 more)

### Community 33 - "cors_test.go"
Cohesion: 0.23
Nodes (9): CORS(), servirCORS(), TestCORSComodinDevuelveAsterisco(), TestCORSOrigenNoPermitidoSinCabeceras(), TestCORSOrigenPermitidoReflejaOrigenYVary(), TestCORSPreflightResponde204(), TestCORSSinOrigenNoEmiteCabeceras(), Logger() (+1 more)

### Community 34 - "vitest"
Cohesion: 0.08
Nodes (32): vitest, idsParaReintento(), puedeRealizar(), realizarSeleccionados(), ResultadoRealizacion, agruparPorAnio(), anioDeFecha(), contarPorAnio() (+24 more)

### Community 35 - "Backend: 000001_create_schema.up.sql"
Cohesion: 0.27
Nodes (13): cuentas, dias_trabajados, fuentes, historial_tasas, idx_dias_fecha, idx_historial_cuenta, idx_pagos_fecha, idx_pagos_fuente (+5 more)

### Community 36 - "Web: devDependencies"
Cohesion: 0.11
Nodes (24): tailwindcss, @tailwindcss/vite, tw-animate-css, @types/node, @types/react, @types/react-dom, typescript, vite (+16 more)

### Community 37 - "Backend: PagoDetallado"
Cohesion: 0.26
Nodes (6): scanPago(), scanPagoDetallado(), DiaTrabajado, Pago, FiltroPagos, PagoDetallado

### Community 38 - "dominio.ts"
Cohesion: 0.22
Nodes (18): esMetodoPago(), esModoRedondeo(), esModoRegistro(), esModoSplit(), esUnoDe(), MetodoPago, METODOS_PAGO_VALIDOS, ModoRegistro (+10 more)

### Community 39 - "useUiStore"
Cohesion: 0.16
Nodes (10): react-dom, sonner, @tanstack/react-query, react-dom@^19.1.0, sonner@^2.0.1, @tanstack/react-query@^5.66.9, App(), Toaster() (+2 more)

### Community 40 - "DashboardPage.tsx"
Cohesion: 0.15
Nodes (25): etiquetaMes(), filasHistorial(), filasMeses(), ChartPatterns(), ChartTooltip(), Props, DashboardPage(), MES_TITULO() (+17 more)

### Community 41 - "router.tsx"
Cohesion: 0.22
Nodes (9): PageLoader(), Configuracion, conSuspense(), Dashboard, Health, Ingresos, Registrar, router (+1 more)

### Community 42 - "fakeDashboardRepo"
Cohesion: 0.14
Nodes (8): DashboardHistoryResponse, BloqueTotal, DiaFuenteTotal, MesTotal, PuntoHistorial, ResumenTotales, fakeDashboardRepo, HistoryResultado

### Community 43 - "ref"
Cohesion: 0.14
Nodes (7): { chromium }, { chromium }, { chromium }, { chromium }, fs, path, results

### Community 44 - "Proyecto: deploy.sh"
Cohesion: 0.60
Nodes (5): as_root(), die(), log(), deploy.sh script, warn()

### Community 45 - "Web: compilerOptions (C45)"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

### Community 46 - "Web: scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, test

### Community 48 - "computeIndicator"
Cohesion: 0.20
Nodes (11): clamp01(), composite(), computeIndicator(), effBgFromChain(), luminance(), oklabToRgb(), parseColor(), parseShadowLayers() (+3 more)

### Community 51 - "format.ts"
Cohesion: 0.29
Nodes (7): ListarDias(), DIAS_SEMANA, diaSemanaEs(), MESES_ABREV, nfBs, nfPct, percentNumToBps()

### Community 52 - "audit-baseline.cjs"
Cohesion: 0.25
Nodes (5): { chromium }, fs, routes, themes, viewports

### Community 53 - "probe-ac2.cjs"
Cohesion: 0.57
Nodes (6): { chromium }, probeBackForward(), probeCanonAndHarnessFlow(), probeNoParamCanon(), state(), waitTab()

### Community 54 - "nav.ts"
Cohesion: 0.47
Nodes (4): GRUPOS, ITEMS, NavItemDef, tituloDeRuta()

## Knowledge Gaps
- **1 isolated node(s):** `abys`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 348 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Web: DashboardPage.tsx`, `Web: useHistorial.ts`, `Web: RegistrarPage.tsx`, `Web: devDependencies`, `useUiStore`, `Web: CuentasTab.tsx`, `Web: SplitsPage.tsx`, `DashboardPage.tsx`, `router.tsx`, `NavContenido.tsx`, `Web: PagoFila.tsx`, `Web: FuentesTab.tsx`, `package.json`, `Web: dropdown-menu.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 43 inferred relationships involving `responderError()` (e.g. with `TestResponderErrorConservaDetails()` and `.Actualizar()`) actually correct?**
  _`responderError()` has 43 INFERRED edges - model-reasoned connections that need verification._
- **What connects `abys` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Web: DashboardPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12427409988385599 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `Web: DashboardPage.tsx`, `Web: useHistorial.ts`, `Web: fuentesDots.ts`, `Web: RegistrarPage.tsx`, `Web: devDependencies`, `dominio.ts`, `api-errors.ts`, `format.ts`, `Web: hooks.ts`, `nav.ts`, `ModoDistribucion`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Should `Web: useHistorial.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08514013749338974 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Web: SplitsPage.tsx` to `Web: fuentesDots.ts`, `Web: useHistorial.ts`, `Web: RegistrarPage.tsx`, `Web: devDependencies`, `useUiStore`, `Web: CuentasTab.tsx`, `router.tsx`, `DashboardPage.tsx`, `NavContenido.tsx`, `Web: PagoFila.tsx`, `react`, `Web: FuentesTab.tsx`, `nav.ts`, `package.json`, `Web: dropdown-menu.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._