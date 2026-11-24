# Graph Report - finanzasMikyGoRef  (2026-11-24)

## Corpus Check
- 264 files · ~266,470 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 43 file(s) not represented in the graph (top: .log 38, (none) 3, .example 1)

## Summary
- 1506 nodes · 4979 edges · 84 communities (52 shown, 32 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 288 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a0384dcd`
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
- CuentasTab.tsx
- Web: SplitsPage.tsx
- Evidencia: audit.cjs
- Backend: CuentaRepo
- NavContenido.tsx
- Backend: NewValidation()
- Backend: dashboard_service.go
- Button
- Proyecto: router.go
- Backend: Setup()
- dashboard_service_test.go
- Web: hooks.ts
- ConfiguracionPage.tsx
- FuentesTab.tsx
- Backend: testing.T
- chartLogic.ts
- Web: compilerOptions
- Web: components.json
- Backend: FuenteRepo
- Backend: .GetPorID()
- package.json
- Web: compilerOptions (C29)
- ModoDistribucion
- Web: fuentesDots.ts
- cors_test.go
- themeColor.ts
- Backend: 000001_create_schema.up.sql
- Web: devDependencies
- Backend: PagoDetallado
- dominio.ts
- useUiStore
- DashboardPage.tsx
- router.tsx
- DashboardService
- confirmacionRealizar.ts
- Proyecto: deploy.sh
- Web: compilerOptions (C45)
- Web: scripts
- Proyecto: as_root()
- App.tsx
- Web: vite-env.d.ts
- Backend: 000005_add_split_config.up.s…
- format.ts
- ErrorPage.tsx
- agrupar.ts
- uploads.ts
- api.ts
- Proyecto: status.sh
- Backend: abys

## God Nodes (most connected - your core abstractions)
1. `react` - 53 edges
2. `Button()` - 49 edges
3. `responderError()` - 47 edges
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
- `TestTotalesSplit()` --calls--> `totalesSplit()`  [INFERRED]
  backend/internal/handler/split_handler_test.go → backend/internal/handler/split_handler.go
- `TestResponderErrorConservaDetails()` --calls--> `responderError()`  [INFERRED]
  backend/internal/handler/validacion_entrada_test.go → backend/internal/handler/errors.go
- `rangoUltimos30()` --calls--> `LaPaz()`  [INFERRED]
  backend/internal/service/dashboard_service.go → backend/internal/service/validations.go
- `TestRangoUltimos30()` --calls--> `LaPaz()`  [INFERRED]
  backend/internal/service/dashboard_service_test.go → backend/internal/service/validations.go

## Import Cycles
- 2-file cycle: `backend/internal/handler/settings_handler_test.go -> backend/internal/router/router.go -> backend/internal/handler/settings_handler_test.go`
- 3-file cycle: `backend/internal/handler/settings_handler_test.go -> backend/internal/router/integration_test.go -> backend/internal/router/router.go -> backend/internal/handler/settings_handler_test.go`

## Communities (84 total, 32 thin omitted)

### Community 0 - "Web: DashboardPage.tsx"
Cohesion: 0.20
Nodes (23): recharts, ChartLegend(), Swatch(), claveFuente(), filasApiladas(), filasDistribucion(), fuentesUnicas(), idPatron() (+15 more)

### Community 1 - "Web: useHistorial.ts"
Cohesion: 0.08
Nodes (57): vitest, FiltrosRangoProps, HistorialAgrupado(), HistorialAgrupadoProps, SeccionAnio(), SeccionAnioProps, Props, IngresosPage() (+49 more)

### Community 2 - "Evidencia: forms-audit.cjs"
Cohesion: 0.06
Nodes (67): ac1(), ac2(), ac3(), ac4(), ac5(), ac6(), ac7(), ac8_ac9_ac10() (+59 more)

### Community 3 - "Web: RegistrarPage.tsx"
Cohesion: 0.10
Nodes (46): Input(), Textarea(), Campo, centsToBsInput(), EditarPagoDialog(), GuardiaNavegacion(), IDS_Campos, montosIniciales() (+38 more)

### Community 4 - "Evidencia: historial-audit.cjs"
Cohesion: 0.07
Nodes (57): ac1(), ac10(), ac2(), ac3(), ac4_ac5(), ac6(), ac7(), ac8() (+49 more)

### Community 5 - "Backend: github.com/gin-gonic/gin.Con…"
Cohesion: 0.12
Nodes (15): NewInternal(), mesAnio(), badRequest(), responderError(), NewFuenteHandler(), hoyLaPaz(), diasAInput(), NewPagoHandler() (+7 more)

### Community 6 - "aa-audit.cjs"
Cohesion: 0.05
Nodes (35): { chromium }, fs, routes, themes, viewports, { chromium }, { chromium }, { chromium } (+27 more)

### Community 7 - "api-errors.ts"
Cohesion: 0.11
Nodes (22): CampoCuenta, CampoEditarPago, CampoFuente, CampoGenerarSplit, CampoRegistrar, CampoTasa, ConfigErroresApi, ErrorApiLike (+14 more)

### Community 8 - "CuentasTab.tsx"
Cohesion: 0.13
Nodes (38): ErrorSummary(), ItemError, Props, FieldError(), Props, Dialog(), DialogContent(), DialogDescription() (+30 more)

### Community 9 - "Web: SplitsPage.tsx"
Cohesion: 0.14
Nodes (34): lucide-react, radix-ui, react, FiltrosRango(), PRESETS, Card(), CardContent(), CardDescription() (+26 more)

### Community 10 - "Evidencia: audit.cjs"
Cohesion: 0.07
Nodes (47): checkStaticCss(), { chromium }, BASELINE, clamp01(), compactCase(), compactFocus(), compactResults(), compareDesktopLayout() (+39 more)

### Community 11 - "Backend: CuentaRepo"
Cohesion: 0.11
Nodes (16): NewConflict(), NewCuentaHandler(), NewSplitHandler(), scanCuenta(), deref(), esGeneralID(), NewSplitService(), NewTasaService() (+8 more)

### Community 12 - "NavContenido.tsx"
Cohesion: 0.27
Nodes (13): react-router-dom, AppLayout(), BotonNav(), NavContenido(), TopBarMovil(), Sidebar(), Tooltip(), TooltipContent() (+5 more)

### Community 13 - "Backend: NewValidation()"
Cohesion: 0.12
Nodes (20): Error, Kind, NewImmutable(), NewNotFound(), NewUnprocessable(), NewValidation(), mapPagoErr(), recalcularTotalPago() (+12 more)

### Community 14 - "Backend: dashboard_service.go"
Cohesion: 0.21
Nodes (12): AddDiaRequest, CreatePagoRequest, CuentaRequest, DiaInput, FuenteRequest, GenerarSplitRequest, RegistrarSettingsRequest, SplitSettingsRequest (+4 more)

### Community 15 - "Button"
Cohesion: 0.20
Nodes (21): class-variance-authority, Badge(), badgeVariants, Button(), buttonVariants, Checkbox(), DialogTrigger(), Separator() (+13 more)

### Community 16 - "Proyecto: router.go"
Cohesion: 0.10
Nodes (23): main(), getEnv(), Load(), Connect(), TestSettingsRegistrarEndpoints(), assertErrorValidacion(), contextoJSON(), TestResponderErrorConservaDetails() (+15 more)

### Community 17 - "Backend: Setup()"
Cohesion: 0.14
Nodes (17): NewHealthHandler(), NewSettingsHandler(), NewCuentaRepo(), NewDashboardRepo(), NewFuenteRepo(), NewHealthRepo(), NewPagoRepo(), NewSettingsRepo() (+9 more)

### Community 18 - "dashboard_service_test.go"
Cohesion: 0.23
Nodes (11): NewDashboardService(), rangoUltimos30(), TestDistribucionSumaYOrden(), TestHistorySinTendencia(), TestMonthlyRellenaBloques(), TestRangoUltimos30(), TestSummaryUsaRangoDe30Dias(), TestWeeklyFormatea7DiasYPorFuente() (+3 more)

### Community 19 - "Web: hooks.ts"
Cohesion: 0.10
Nodes (28): Props, Props, sumaMontosSeleccionados(), api, PagosFiltros, queryKeys, useActualizarRegistrarSettings(), useActualizarSplitSettings() (+20 more)

### Community 20 - "ConfiguracionPage.tsx"
Cohesion: 0.57
Nodes (6): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), ConfiguracionPage()

### Community 21 - "FuentesTab.tsx"
Cohesion: 0.11
Nodes (48): ConfirmarDescarteDialog(), Props, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+40 more)

### Community 22 - "Backend: testing.T"
Cohesion: 0.17
Nodes (25): leerMigracion(), TestMigration000006Backfill(), TestTotalesSplit(), aplicarModo(), CalcularSplit(), rawCents(), Recalcular(), montosPorAlias() (+17 more)

### Community 23 - "chartLogic.ts"
Cohesion: 0.14
Nodes (22): date-fns, ChartLegendProps, etiquetaBloque(), etiquetaMes(), FilaBloque, FilaDistribucion, FilaHistorial, FilaMes (+14 more)

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
Cohesion: 0.21
Nodes (10): splitJSON(), totalesSplit(), transaccionJSON(), scanSplit(), scanTransaccion(), SplitHandler, Split, Transaccion (+2 more)

### Community 28 - "package.json"
Cohesion: 0.11
Nodes (18): cn, @fontsource-variable/inter, react-calendar, shadcn, zustand, dependencies, class-variance-authority@^0.7.1, cn@^0.2.6 (+10 more)

### Community 29 - "Web: compilerOptions (C29)"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 30 - "ModoDistribucion"
Cohesion: 0.21
Nodes (11): aplicarModo(), distribuir(), modos, ModoDistribucion, MODOS_DISTRIBUCION, construirDiasPayload(), ConstruirDiasPayloadArgs, base (+3 more)

### Community 32 - "Web: fuentesDots.ts"
Cohesion: 0.17
Nodes (18): CalendarioDias(), ColorSwatch(), HERRAMIENTAS, Props, valueToDate(), BG_FUENTE_FALLBACK, COLOR_FUENTE_FALLBACK, construirFuentesPorDia() (+10 more)

### Community 33 - "cors_test.go"
Cohesion: 0.23
Nodes (9): CORS(), servirCORS(), TestCORSComodinDevuelveAsterisco(), TestCORSOrigenNoPermitidoSinCabeceras(), TestCORSOrigenPermitidoReflejaOrigenYVary(), TestCORSPreflightResponde204(), TestCORSSinOrigenNoEmiteCabeceras(), Logger() (+1 more)

### Community 34 - "themeColor.ts"
Cohesion: 0.28
Nodes (13): aplicarMeta(), clamp01(), clamp255(), leerTokenBackground(), linearToSrgb(), normalizarColor(), normalizeRgb(), oklchToRgb() (+5 more)

### Community 35 - "Backend: 000001_create_schema.up.sql"
Cohesion: 0.27
Nodes (13): cuentas, dias_trabajados, fuentes, historial_tasas, idx_dias_fecha, idx_historial_cuenta, idx_pagos_fecha, idx_pagos_fuente (+5 more)

### Community 36 - "Web: devDependencies"
Cohesion: 0.11
Nodes (24): tailwindcss, @tailwindcss/vite, tw-animate-css, @types/node, @types/react, @types/react-dom, typescript, vite (+16 more)

### Community 37 - "Backend: PagoDetallado"
Cohesion: 0.18
Nodes (8): scanPago(), scanPagoDetallado(), DiaTrabajado, HistorialTasa, Pago, FiltroPagos, PagoDetallado, rangoBloque

### Community 38 - "dominio.ts"
Cohesion: 0.24
Nodes (17): esMetodoPago(), esModoRedondeo(), esModoRegistro(), esUnoDe(), MetodoPago, METODOS_PAGO_VALIDOS, ModoRegistro, MODOS_REDONDEO_VALIDOS (+9 more)

### Community 39 - "useUiStore"
Cohesion: 0.16
Nodes (11): react-dom, sonner, @tanstack/react-query, react-dom@^19.1.0, sonner@^2.0.1, @tanstack/react-query@^5.66.9, Toaster(), TooltipProvider() (+3 more)

### Community 40 - "DashboardPage.tsx"
Cohesion: 0.24
Nodes (15): filasHistorial(), DashboardPage(), MES_TITULO(), tablaDistribucion(), tablaHistoricoRango(), HistoryChart(), TablaDatos(), TablaDatosFila (+7 more)

### Community 41 - "router.tsx"
Cohesion: 0.23
Nodes (10): PageLoader(), conError(), Configuracion, conSuspense(), Dashboard, Health, Ingresos, Registrar (+2 more)

### Community 42 - "DashboardService"
Cohesion: 0.06
Nodes (32): NewDashboardHandler(), bloquesDelMes(), fuentesNoNulas(), rangoSemana(), sumarFuentes(), TestBloquesDelMes(), TestRangoSemana(), LaPaz() (+24 more)

### Community 43 - "confirmacionRealizar.ts"
Cohesion: 0.24
Nodes (8): idsParaReintento(), puedeRealizar(), textoConfirmacion(), realizarSeleccionados(), ResultadoRealizacion, CLAVES, ConfiguracionBulk, mocks

### Community 44 - "Proyecto: deploy.sh"
Cohesion: 0.60
Nodes (5): as_root(), die(), log(), deploy.sh script, warn()

### Community 45 - "Web: compilerOptions (C45)"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

### Community 46 - "Web: scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, test

### Community 48 - "App.tsx"
Cohesion: 0.24
Nodes (5): App(), AppErrorBoundary, AppErrorBoundaryProps, AppErrorBoundaryState, router

### Community 51 - "format.ts"
Cohesion: 0.21
Nodes (11): ListarDias(), labelMetodo(), bpsToPercentNum(), DIAS_SEMANA, diaSemanaEs(), fromISODate(), MESES_ABREV, nfBs (+3 more)

### Community 52 - "ErrorPage.tsx"
Cohesion: 0.38
Nodes (7): ErrorPage(), ErrorPageProps, Alert(), AlertDescription(), AlertTitle(), alertVariants, CardFooter()

### Community 53 - "agrupar.ts"
Cohesion: 0.39
Nodes (6): agruparPorAnio(), anioDeFecha(), contarPorAnio(), GrupoAnio, paginasNecesarias(), Fila

### Community 54 - "uploads.ts"
Cohesion: 0.36
Nodes (5): ArchivoSeleccionado, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, TipoPermitido, TIPOS_PERMITIDOS

### Community 55 - "api.ts"
Cohesion: 0.40
Nodes (4): ApiRequestError, BASE_URL, request(), RequestOptions

## Knowledge Gaps
- **1 isolated node(s):** `abys`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 352 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Web: SplitsPage.tsx` to `Web: DashboardPage.tsx`, `Web: useHistorial.ts`, `Web: RegistrarPage.tsx`, `Web: devDependencies`, `useUiStore`, `CuentasTab.tsx`, `DashboardPage.tsx`, `router.tsx`, `NavContenido.tsx`, `Button`, `App.tsx`, `ErrorPage.tsx`, `FuentesTab.tsx`, `ConfiguracionPage.tsx`, `package.json`, `Web: dropdown-menu.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `abys` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Web: useHistorial.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08276797829036635 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Web: useHistorial.ts` to `Web: fuentesDots.ts`, `themeColor.ts`, `Web: RegistrarPage.tsx`, `Web: devDependencies`, `dominio.ts`, `api-errors.ts`, `confirmacionRealizar.ts`, `NavContenido.tsx`, `format.ts`, `Web: hooks.ts`, `agrupar.ts`, `uploads.ts`, `chartLogic.ts`, `ModoDistribucion`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `Evidencia: forms-audit.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06376811594202898 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Web: SplitsPage.tsx` to `Web: fuentesDots.ts`, `Web: useHistorial.ts`, `Web: RegistrarPage.tsx`, `Web: devDependencies`, `useUiStore`, `CuentasTab.tsx`, `router.tsx`, `DashboardPage.tsx`, `NavContenido.tsx`, `Button`, `ConfiguracionPage.tsx`, `FuentesTab.tsx`, `package.json`, `Web: dropdown-menu.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Should `Web: RegistrarPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09954751131221719 - nodes in this community are weakly interconnected._