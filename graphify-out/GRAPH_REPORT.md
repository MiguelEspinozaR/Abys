# Graph Report - finanzasMikyGoRef  (2026-11-23)

## Corpus Check
- 260 files · ~264,195 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 42 file(s) not represented in the graph (top: .log 38, (none) 2, .example 1)

## Summary
- 1486 nodes · 4920 edges · 81 communities (49 shown, 32 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 288 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `335b0722`
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
- Web: themeColor.ts
- Backend: 000001_create_schema.up.sql
- Web: devDependencies
- Backend: PagoDetallado
- dominio.ts
- useUiStore
- Backend: HealthRepo
- router.tsx
- vitest
- Web: uiStore.ts
- Proyecto: deploy.sh
- Web: compilerOptions (C45)
- Web: scripts
- Proyecto: as_root()
- ConfiguracionPage.tsx
- Web: vite-env.d.ts
- Backend: 000005_add_split_config.up.s…
- uploads.ts
- api.ts
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
9. `lucide-react` - 30 edges
10. `FuenteDialog()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `TestValidacionCuentaInputInvalido()` --calls--> `NewCuentaHandler()`  [INFERRED]
  backend/internal/handler/validacion_entrada_test.go → backend/internal/handler/cuenta_handler.go
- `TestResponderErrorConservaDetails()` --calls--> `responderError()`  [INFERRED]
  backend/internal/handler/validacion_entrada_test.go → backend/internal/handler/errors.go
- `TestTotalesSplit()` --calls--> `totalesSplit()`  [INFERRED]
  backend/internal/handler/split_handler_test.go → backend/internal/handler/split_handler.go
- `TestValidarDiasTrabajados()` --calls--> `ValidarDiasTrabajados()`  [INFERRED]
  backend/internal/service/pago_service_test.go → backend/internal/service/validations.go
- `badRequest()` --calls--> `NewValidation()`  [EXTRACTED]
  backend/internal/handler/errors.go → backend/internal/apperr/apperr.go

## Import Cycles
- 2-file cycle: `backend/internal/handler/settings_handler_test.go -> backend/internal/router/router.go -> backend/internal/handler/settings_handler_test.go`
- 3-file cycle: `backend/internal/handler/settings_handler_test.go -> backend/internal/router/integration_test.go -> backend/internal/router/router.go -> backend/internal/handler/settings_handler_test.go`

## Communities (81 total, 32 thin omitted)

### Community 0 - "Web: DashboardPage.tsx"
Cohesion: 0.09
Nodes (58): date-fns, recharts, ChartLegend(), ChartLegendProps, Swatch(), claveFuente(), etiquetaBloque(), etiquetaMes() (+50 more)

### Community 1 - "Web: useHistorial.ts"
Cohesion: 0.07
Nodes (65): FiltrosRangoProps, HistorialAgrupado(), HistorialAgrupadoProps, SeccionAnio(), SeccionAnioProps, Props, IngresosPage(), Props (+57 more)

### Community 2 - "Evidencia: forms-audit.cjs"
Cohesion: 0.06
Nodes (67): ac1(), ac2(), ac3(), ac4(), ac5(), ac6(), ac7(), ac8_ac9_ac10() (+59 more)

### Community 3 - "Web: RegistrarPage.tsx"
Cohesion: 0.09
Nodes (43): ItemError, Props, Textarea(), Campo, centsToBsInput(), GuardiaNavegacion(), IDS_Campos, montosIniciales() (+35 more)

### Community 4 - "Evidencia: historial-audit.cjs"
Cohesion: 0.07
Nodes (57): ac1(), ac10(), ac2(), ac3(), ac4_ac5(), ac6(), ac7(), ac8() (+49 more)

### Community 5 - "Backend: github.com/gin-gonic/gin.Con…"
Cohesion: 0.12
Nodes (15): NewInternal(), mesAnio(), badRequest(), responderError(), NewFuenteHandler(), hoyLaPaz(), diasAInput(), NewPagoHandler() (+7 more)

### Community 6 - "Evidencia: aa-audit.cjs"
Cohesion: 0.05
Nodes (35): { chromium }, fs, routes, themes, viewports, { chromium }, { chromium }, { chromium } (+27 more)

### Community 7 - "api-errors.ts"
Cohesion: 0.15
Nodes (16): CampoCuenta, CampoEditarPago, CampoFuente, CampoGenerarSplit, CampoRegistrar, CampoTasa, ConfigErroresApi, ErrorApiLike (+8 more)

### Community 8 - "Web: CuentasTab.tsx"
Cohesion: 0.16
Nodes (44): ErrorSummary(), FieldError(), Props, Button(), Checkbox(), Dialog(), DialogContent(), DialogDescription() (+36 more)

### Community 9 - "Web: SplitsPage.tsx"
Cohesion: 0.12
Nodes (38): lucide-react, FiltrosRango(), PRESETS, Alert(), AlertDescription(), AlertTitle(), alertVariants, Card() (+30 more)

### Community 10 - "Evidencia: audit.cjs"
Cohesion: 0.07
Nodes (47): checkStaticCss(), { chromium }, BASELINE, clamp01(), compactCase(), compactFocus(), compactResults(), compareDesktopLayout() (+39 more)

### Community 11 - "Backend: CuentaRepo"
Cohesion: 0.09
Nodes (21): NewConflict(), NewCuentaHandler(), NewSplitHandler(), scanCuenta(), mapSplitErr(), NewCuentaService(), deref(), esGeneralID() (+13 more)

### Community 12 - "NavContenido.tsx"
Cohesion: 0.27
Nodes (13): react-router-dom, AppLayout(), BotonNav(), NavContenido(), TopBarMovil(), Sidebar(), Tooltip(), TooltipContent() (+5 more)

### Community 13 - "Backend: NewValidation()"
Cohesion: 0.12
Nodes (21): Error, Kind, NewImmutable(), NewNotFound(), NewUnprocessable(), NewValidation(), mapPagoErr(), recalcularTotalPago() (+13 more)

### Community 14 - "Backend: dashboard_service.go"
Cohesion: 0.23
Nodes (10): AddDiaRequest, CreatePagoRequest, CuentaRequest, DiaInput, FuenteRequest, GenerarSplitRequest, RegistrarSettingsRequest, SplitSettingsRequest (+2 more)

### Community 15 - "Web: PagoFila.tsx"
Cohesion: 0.15
Nodes (36): ConfirmarDescarteDialog(), Props, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+28 more)

### Community 16 - "Proyecto: router.go"
Cohesion: 0.18
Nodes (5): assertErrorValidacion(), contextoJSON(), TestResponderErrorConservaDetails(), TestValidacionCuentaDatosValidosYLegacy(), TestValidacionCuentaInputInvalido()

### Community 17 - "Backend: Setup()"
Cohesion: 0.13
Nodes (28): main(), getEnv(), Load(), Connect(), NewSettingsHandler(), TestSettingsRegistrarEndpoints(), NewCuentaRepo(), NewDashboardRepo() (+20 more)

### Community 18 - "Backend: context.Context"
Cohesion: 0.06
Nodes (33): NewDashboardHandler(), bloquesDelMes(), NewDashboardService(), rangoSemana(), rangoUltimos30(), TestBloquesDelMes(), TestDistribucionSumaYOrden(), TestHistorySinTendencia() (+25 more)

### Community 19 - "Web: hooks.ts"
Cohesion: 0.08
Nodes (38): api, invalidarHistorial(), invalidarPagosYDashboard(), queryKeys, useActualizarFuente(), useActualizarPago(), useActualizarRegistrarSettings(), useActualizarSplitSettings() (+30 more)

### Community 20 - "react"
Cohesion: 0.23
Nodes (9): class-variance-authority, radix-ui, react, badgeVariants, buttonVariants, ComprobanteDropzone(), Props, ACCEPT_UPLOAD (+1 more)

### Community 21 - "Web: FuentesTab.tsx"
Cohesion: 0.15
Nodes (22): Skeleton(), Switch(), Table(), TableBody(), TableCell(), TableHead(), TableHeader(), TableRow() (+14 more)

### Community 22 - "Backend: testing.T"
Cohesion: 0.17
Nodes (24): leerMigracion(), TestMigration000006Backfill(), TestTotalesSplit(), TestValidarDiasTrabajados(), aplicarModo(), CalcularSplit(), rawCents(), Recalcular() (+16 more)

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
Cohesion: 0.18
Nodes (6): scanFuente(), NewFuenteService(), validarSplitAuto(), Fuente, FuenteRepo, FuenteService

### Community 27 - "Backend: .GetPorID()"
Cohesion: 0.17
Nodes (11): splitJSON(), totalesSplit(), transaccionJSON(), scanSplit(), scanTransaccion(), SplitHandler, Split, Transaccion (+3 more)

### Community 28 - "package.json"
Cohesion: 0.09
Nodes (28): cn, @fontsource-variable/inter, react-calendar, react-dom, shadcn, sonner, @tanstack/react-query, zustand (+20 more)

### Community 29 - "Web: compilerOptions (C29)"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 30 - "ModoDistribucion"
Cohesion: 0.20
Nodes (12): aplicarModo(), distribuir(), modos, ModoDistribucion, ModoRegistro, MODOS_DISTRIBUCION, construirDiasPayload(), ConstruirDiasPayloadArgs (+4 more)

### Community 32 - "Web: fuentesDots.ts"
Cohesion: 0.18
Nodes (13): Props, BG_FUENTE_FALLBACK, COLOR_FUENTE_FALLBACK, construirFuentesPorDia(), esColorHex(), FuenteDelDia, FuenteDelDiaTop, FuenteLeyenda (+5 more)

### Community 33 - "cors_test.go"
Cohesion: 0.23
Nodes (9): CORS(), servirCORS(), TestCORSComodinDevuelveAsterisco(), TestCORSOrigenNoPermitidoSinCabeceras(), TestCORSOrigenPermitidoReflejaOrigenYVary(), TestCORSPreflightResponde204(), TestCORSSinOrigenNoEmiteCabeceras(), Logger() (+1 more)

### Community 34 - "Web: themeColor.ts"
Cohesion: 0.30
Nodes (12): aplicarMeta(), clamp01(), clamp255(), leerTokenBackground(), linearToSrgb(), normalizarColor(), normalizeRgb(), oklchToRgb() (+4 more)

### Community 35 - "Backend: 000001_create_schema.up.sql"
Cohesion: 0.27
Nodes (13): cuentas, dias_trabajados, fuentes, historial_tasas, idx_dias_fecha, idx_historial_cuenta, idx_pagos_fecha, idx_pagos_fuente (+5 more)

### Community 36 - "Web: devDependencies"
Cohesion: 0.10
Nodes (20): tailwindcss, @tailwindcss/vite, tw-animate-css, @types/node, @types/react, @types/react-dom, typescript, vite (+12 more)

### Community 37 - "Backend: PagoDetallado"
Cohesion: 0.26
Nodes (6): scanPago(), scanPagoDetallado(), DiaTrabajado, Pago, FiltroPagos, PagoDetallado

### Community 38 - "dominio.ts"
Cohesion: 0.34
Nodes (12): esMetodoPago(), esModoRedondeo(), esModoRegistro(), esUnoDe(), METODOS_PAGO_VALIDOS, MODOS_REDONDEO_VALIDOS, MODOS_REGISTRO_VALIDOS, normalizarModoRedondeo() (+4 more)

### Community 39 - "useUiStore"
Cohesion: 0.27
Nodes (6): App(), Toaster(), TooltipProvider(), queryClient, router, useUiStore

### Community 40 - "Backend: HealthRepo"
Cohesion: 0.32
Nodes (5): NewHealthHandler(), HealthHandler, HealthInfo, HealthRepo, TablaInfo

### Community 41 - "router.tsx"
Cohesion: 0.24
Nodes (8): PageLoader(), Configuracion, conSuspense(), Dashboard, Health, Ingresos, Registrar, Splits

### Community 42 - "vitest"
Cohesion: 0.15
Nodes (13): vitest, idsParaReintento(), puedeRealizar(), textoConfirmacion(), realizarSeleccionados(), ResultadoRealizacion, Props, sumaMontosSeleccionados() (+5 more)

### Community 43 - "Web: uiStore.ts"
Cohesion: 0.38
Nodes (6): MetodoPago, sincronizarThemeColor(), PagoPayload, aplicarTema(), Tema, UiState

### Community 44 - "Proyecto: deploy.sh"
Cohesion: 0.60
Nodes (5): as_root(), die(), log(), deploy.sh script, warn()

### Community 45 - "Web: compilerOptions (C45)"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

### Community 46 - "Web: scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, test

### Community 48 - "ConfiguracionPage.tsx"
Cohesion: 0.57
Nodes (6): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), ConfiguracionPage()

### Community 51 - "uploads.ts"
Cohesion: 0.36
Nodes (5): ArchivoSeleccionado, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, TipoPermitido, TIPOS_PERMITIDOS

### Community 52 - "api.ts"
Cohesion: 0.40
Nodes (4): ApiRequestError, BASE_URL, request(), RequestOptions

## Knowledge Gaps
- **1 isolated node(s):** `abys`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 345 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Web: DashboardPage.tsx`, `Web: useHistorial.ts`, `Web: RegistrarPage.tsx`, `useUiStore`, `Web: CuentasTab.tsx`, `Web: SplitsPage.tsx`, `router.tsx`, `NavContenido.tsx`, `Web: PagoFila.tsx`, `ConfiguracionPage.tsx`, `Web: FuentesTab.tsx`, `package.json`, `Web: dropdown-menu.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 43 inferred relationships involving `responderError()` (e.g. with `TestResponderErrorConservaDetails()` and `.Actualizar()`) actually correct?**
  _`responderError()` has 43 INFERRED edges - model-reasoned connections that need verification._
- **What connects `abys` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Web: DashboardPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0869215291750503 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Web: SplitsPage.tsx` to `Web: DashboardPage.tsx`, `Web: useHistorial.ts`, `Web: RegistrarPage.tsx`, `useUiStore`, `Web: CuentasTab.tsx`, `router.tsx`, `NavContenido.tsx`, `Web: PagoFila.tsx`, `ConfiguracionPage.tsx`, `react`, `Web: FuentesTab.tsx`, `package.json`, `Web: dropdown-menu.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Should `Web: useHistorial.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0675990675990676 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `Web: DashboardPage.tsx`, `Web: useHistorial.ts`, `Web: fuentesDots.ts`, `Web: themeColor.ts`, `Web: devDependencies`, `Web: RegistrarPage.tsx`, `dominio.ts`, `api-errors.ts`, `NavContenido.tsx`, `Web: PagoFila.tsx`, `uploads.ts`, `package.json`, `ModoDistribucion`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._