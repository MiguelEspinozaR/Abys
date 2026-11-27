# Graph Report - abys-gestion  (2026-11-27)

## Corpus Check
- 372 files · ~351,250 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: .xml 8, (none) 4, .properties 4)

## Summary
- 3074 nodes · 9746 edges · 210 communities (75 shown, 135 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 368 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e0c1dbbe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CuentasTab.tsx
- router.go
- DashboardPage.tsx
- context.Context
- forms-audit.cjs
- SplitDao
- github.com/gin-gonic/gin.Context
- historial-audit.cjs
- DashboardService
- SyncScheduler
- hooks.ts
- AbysApi
- PagoDao
- RegistrarScreen.kt
- SettingDao
- SplitsViewModel
- AppResult
- IngresosViewModel
- Setup
- router.tsx
- Percent
- SyncState
- PagoFila.tsx
- react
- useHistorial.ts
- DashboardViewModel
- CuentaDetalleDialog.tsx
- ConfiguracionViewModel
- audit.cjs
- CuentaDao
- ConfiguracionViewModel
- testing.T
- ConnectivityMonitor.kt
- AbysApi.kt
- DashboardScreen.kt
- Money
- DateFormats
- SyncWorkers.kt
- .format
- SplitCalculatorTest
- aa-audit.cjs
- CalendarioDias.tsx
- api-errors.ts
- Theme.kt
- Money
- DataModule.kt
- opencode.json
- PendingOperationDao
- ValidarPagoUseCaseTest
- AbysNavHost.kt
- PushProcessor.kt
- AbysApiProvider
- PushProcessor
- RegistrarViewModel.kt
- compilerOptions
- CoreModule.kt
- SyncStatusRepository
- components.json
- App.tsx
- FuenteRepo
- dependencies
- AuthInterceptor
- compilerOptions
- AbysDatabase
- SecureStore
- themeColor.ts
- DashboardRepositoryImplTest
- Routes.kt
- vite.config.ts
- DashboardDtos.kt
- .actualizarFuente
- 000001_create_schema.up.sql
- ref
- devDependencies
- AbysApplication
- ComprobanteDropzone.tsx
- SyncOutcome
- computeIndicator
- audit-baseline.cjs
- probe-ac2.cjs
- deploy.sh
- tsconfig.json
- scripts
- stop.sh
- vite-env.d.ts
- PasoRealizar
- 000005_add_split_config.up.sql
- status.sh
- main.tsx
- abys

## God Nodes (most connected - your core abstractions)
1. `AppResult` - 76 edges
2. `SyncState` - 70 edges
3. `AbysApi` - 63 edges
4. `Money` - 54 edges
5. `react` - 53 edges
6. `ConfiguracionViewModel` - 52 edges
7. `Button()` - 49 edges
8. `SplitDao` - 49 edges
9. `responderError()` - 47 edges
10. `ApiEnvelope` - 47 edges

## Surprising Connections (you probably didn't know these)
- `TestValidacionCuentaInputInvalido()` --calls--> `NewCuentaHandler()`  [INFERRED]
  Abys/backend/internal/handler/validacion_entrada_test.go → Abys/backend/internal/handler/cuenta_handler.go
- `TestResponderErrorConservaDetails()` --calls--> `responderError()`  [INFERRED]
  Abys/backend/internal/handler/validacion_entrada_test.go → Abys/backend/internal/handler/errors.go
- `TestSummaryUsaRangoDe30Dias()` --calls--> `NewDashboardService()`  [INFERRED]
  Abys/backend/internal/service/dashboard_service_test.go → Abys/backend/internal/service/dashboard_service.go
- `Props` --references--> `Transaccion`  [EXTRACTED]
  Abys/web/src/features/splits/RealizarTxDialog.tsx → Abys/web/src/services/types.ts
- `Error` --references--> `AppError`  [EXTRACTED]
  app/src/main/java/com/mikylab/abys/data/sync/PushProcessor.kt → app/src/main/java/com/mikylab/abys/core/result/AppResult.kt

## Import Cycles
- 2-file cycle: `Abys/backend/internal/handler/settings_handler_test.go -> Abys/backend/internal/router/router.go -> Abys/backend/internal/handler/settings_handler_test.go`
- 3-file cycle: `Abys/backend/internal/handler/settings_handler_test.go -> Abys/backend/internal/router/integration_test.go -> Abys/backend/internal/router/router.go -> Abys/backend/internal/handler/settings_handler_test.go`

## Communities (210 total, 135 thin omitted)

### Community 0 - "CuentasTab.tsx"
Cohesion: 0.10
Nodes (60): ErrorSummary(), ItemError, Props, FieldError(), Props, FiltrosRango(), PRESETS, Button() (+52 more)

### Community 1 - "router.go"
Cohesion: 0.13
Nodes (12): AddDiaRequest, CreatePagoRequest, CuentaRequest, DiaInput, FuenteRequest, GenerarSplitRequest, RegistrarSettingsRequest, SplitSettingsRequest (+4 more)

### Community 2 - "DashboardPage.tsx"
Cohesion: 0.07
Nodes (67): date-fns@^4.1.0, recharts@^3.10.1, ChartLegend(), ChartLegendProps, Swatch(), claveFuente(), etiquetaBloque(), etiquetaMes() (+59 more)

### Community 3 - "context.Context"
Cohesion: 0.06
Nodes (34): NewConflict(), NewImmutable(), NewNotFound(), NewUnprocessable(), NewValidation(), scanCuenta(), mapPagoErr(), recalcularTotalPago() (+26 more)

### Community 4 - "forms-audit.cjs"
Cohesion: 0.06
Nodes (67): ac1(), ac2(), ac3(), ac4(), ac5(), ac6(), ac7(), ac8_ac9_ac10() (+59 more)

### Community 5 - "SplitDao"
Cohesion: 0.10
Nodes (5): SplitDao, SplitEntity, TransaccionEntity, SplitTransactionsSync, SplitRepositoryImplTest

### Community 6 - "github.com/gin-gonic/gin.Context"
Cohesion: 0.08
Nodes (25): NewInternal(), mesAnio(), badRequest(), responderError(), NewFuenteHandler(), hoyLaPaz(), diasAInput(), NewPagoHandler() (+17 more)

### Community 7 - "historial-audit.cjs"
Cohesion: 0.07
Nodes (57): ac1(), ac10(), ac2(), ac3(), ac4_ac5(), ac6(), ac7(), ac8() (+49 more)

### Community 8 - "DashboardService"
Cohesion: 0.05
Nodes (39): NewDashboardHandler(), bloquesDelMes(), fuentesNoNulas(), rangoSemana(), rangoUltimos30(), sumarFuentes(), TestBloquesDelMes(), TestRangoSemana() (+31 more)

### Community 10 - "hooks.ts"
Cohesion: 0.06
Nodes (79): FiltrosRangoProps, Textarea(), Campo, IDS_Campos, Obligatorio(), RegistrarPage(), aplicarModo(), distribuir() (+71 more)

### Community 11 - "AbysApi"
Cohesion: 0.11
Nodes (4): AbysApi, ApiEnvelope, EliminadoResponse, PullProcessor

### Community 12 - "PagoDao"
Cohesion: 0.08
Nodes (13): Converters, PagoDao, DiaTrabajadoEntity, PagoEntity, RemoteMappers, SettingsKeys, SyncState, FAILED (+5 more)

### Community 13 - "RegistrarScreen.kt"
Cohesion: 0.06
Nodes (6): Cuenta, CuentaDetalleDialog(), DatoCuenta(), GenerarSplitDialog(), RealizarTransaccionDialog(), ResultadoMasivo

### Community 14 - "SettingDao"
Cohesion: 0.20
Nodes (3): SettingDao, AppSettingEntity, SyncStateEntity

### Community 15 - "SplitsViewModel"
Cohesion: 0.12
Nodes (7): SplitRepositoryImpl, Split, Transaccion, SplitRepository, FilaTransaccion(), SplitsScreen(), SplitsViewModel

### Community 16 - "AppResult"
Cohesion: 0.09
Nodes (12): AppError, AppResult, Failure, Success, map(), onFailure(), onSuccess(), CuentaRepositoryImpl (+4 more)

### Community 17 - "IngresosViewModel"
Cohesion: 0.10
Nodes (6): PagoRepositoryImpl, FiltroPagos, PagoRepository, IngresosScreen(), IngresosUiState, IngresosViewModel

### Community 18 - "Setup"
Cohesion: 0.08
Nodes (47): main(), getEnv(), Load(), Connect(), NewCuentaHandler(), NewHealthHandler(), NewSettingsHandler(), TestSettingsRegistrarEndpoints() (+39 more)

### Community 19 - "router.tsx"
Cohesion: 0.08
Nodes (39): AppLayout(), BotonNav(), NavContenido(), TopBarMovil(), PageLoader(), Sidebar(), badgeVariants, buttonVariants (+31 more)

### Community 20 - "Percent"
Cohesion: 0.08
Nodes (12): ArchivosLocales, Resultado, Error, Ok, Percent, ValidarCuentaUseCase, CuentaConQr, SplitConPago (+4 more)

### Community 22 - "PagoFila.tsx"
Cohesion: 0.23
Nodes (25): ConfirmarDescarteDialog(), Props, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+17 more)

### Community 23 - "react"
Cohesion: 0.09
Nodes (60): HistorialAgrupado(), ErrorPage(), ErrorPageProps, Alert(), AlertDescription(), AlertTitle(), alertVariants, Card() (+52 more)

### Community 24 - "useHistorial.ts"
Cohesion: 0.07
Nodes (59): HistorialAgrupadoProps, SeccionAnio(), SeccionAnioProps, Props, Props, useFiltrosHistorial(), UseFiltrosHistorialResultado, AnioConDatos (+51 more)

### Community 25 - "DashboardViewModel"
Cohesion: 0.08
Nodes (7): safeApiCall(), DashboardViewModel, Servidor, inicioDeSemana(), RangoHistorial, Seleccion, DashboardViewModelTest

### Community 26 - "CuentaDetalleDialog.tsx"
Cohesion: 0.12
Nodes (23): Checkbox(), Separator(), idsParaReintento(), puedeRealizar(), textoConfirmacion(), CuentaDetalleDialog(), fechaEs(), Paso (+15 more)

### Community 27 - "ConfiguracionViewModel"
Cohesion: 0.12
Nodes (3): ConfiguracionScreen(), Miniatura(), ConfiguracionViewModel

### Community 28 - "audit.cjs"
Cohesion: 0.08
Nodes (36): checkStaticCss(), { chromium }, BASELINE, compactCase(), compactFocus(), compactResults(), compareDesktopLayout(), countCategories() (+28 more)

### Community 29 - "CuentaDao"
Cohesion: 0.12
Nodes (7): CuentaDao, CuentaEntity, HistorialTasaEntity, CuentaConHistorial, PagoConDetalle, SplitConTransacciones, GeneralRateHelper

### Community 31 - "testing.T"
Cohesion: 0.09
Nodes (41): leerMigracion(), TestMigration000006Backfill(), assertErrorValidacion(), contextoJSON(), TestResponderErrorConservaDetails(), TestValidacionCuentaDatosValidosYLegacy(), TestValidacionCuentaInputInvalido(), servirCORS() (+33 more)

### Community 33 - "AbysApi.kt"
Cohesion: 0.21
Nodes (21): HealthDbResponse, ApiErrorBody, ApiErrorEnvelope, CambioTasaResponse, CrearPagoResponse, CuentaDto, DiaTrabajadoDto, FuenteDto (+13 more)

### Community 34 - "DashboardScreen.kt"
Cohesion: 0.12
Nodes (18): BarChart(), DistributionPieChart(), etiquetaMes(), FilaApilada, LineChart(), StackedBarChart(), TextoVacioChart(), DialogoCuenta() (+10 more)

### Community 35 - "Money"
Cohesion: 0.10
Nodes (13): Money, FilaDiaFuente, DashboardRepositoryImpl, BarraDia, BarraMes, BloqueMes, DashboardSummary, Distribucion (+5 more)

### Community 36 - "DateFormats"
Cohesion: 0.10
Nodes (6): DateFormats, LocalDateTimeCompat, DialogoHistorial(), diaSemanaCorto(), FilaPago(), DateFormatsTest

### Community 37 - "SyncWorkers.kt"
Cohesion: 0.21
Nodes (4): aResultado(), SyncAllWorker, SyncPullWorker, SyncPushWorker

### Community 38 - ".format"
Cohesion: 0.11
Nodes (10): centsToEditableBs(), formatBs(), parseBsToCents(), formatTasaBps(), centsToTexto(), DiaEditable, EditarPagoDialog(), parsearFecha() (+2 more)

### Community 39 - "SplitCalculatorTest"
Cohesion: 0.08
Nodes (17): ModoCalculo, ENTEROS, PRECISO, REDONDEADO, ModoDistribucion, ENTEROS, PRECISO, REDONDEADO (+9 more)

### Community 40 - "aa-audit.cjs"
Cohesion: 0.10
Nodes (17): { chromium }, fs, OUT, path, { chromium }, fs, OUT, path (+9 more)

### Community 41 - "CalendarioDias.tsx"
Cohesion: 0.11
Nodes (27): ListarDias(), CalendarioDias(), ColorSwatch(), Herramienta, HERRAMIENTAS, Props, valueToDate(), bpsToPercentNum() (+19 more)

### Community 42 - "api-errors.ts"
Cohesion: 0.09
Nodes (28): CampoCuenta, CampoEditarPago, CampoFuente, CampoGenerarSplit, CampoRegistrar, CampoTasa, ConfigErroresApi, ErrorApiLike (+20 more)

### Community 43 - "Theme.kt"
Cohesion: 0.11
Nodes (3): MainActivity, AbysColors, AbysTheme()

### Community 44 - "Money"
Cohesion: 0.14
Nodes (15): DomainMappers, DiaTrabajado, Fuente, HistorialTasa, Pago, aliasDe(), colorValido(), construirFuentesPorDia() (+7 more)

### Community 45 - "DataModule.kt"
Cohesion: 0.08
Nodes (9): AppErrorException, RepositoryModule, RoomTransactionRunner, HealthRepositoryImpl, HealthInfo, TablaInfo, HealthRepository, HealthUiState (+1 more)

### Community 46 - "opencode.json"
Cohesion: 0.07
Nodes (26): agents, android, android-deep, description, mode, model, permissions, system (+18 more)

### Community 48 - "ValidarPagoUseCaseTest"
Cohesion: 0.18
Nodes (7): DiaTrabajadoDraft, PagoDraft, ValidarPagoUseCase, Resultado, Error, Ok, ValidarPagoUseCaseTest

### Community 49 - "AbysNavHost.kt"
Cohesion: 0.08
Nodes (12): ErrorState(), EstadoVacio(), KpiCard(), LoadingState(), SyncStatusChip(), HealthScreen(), AbysApp(), CalendarioMes() (+4 more)

### Community 50 - "PushProcessor.kt"
Cohesion: 0.18
Nodes (10): ActualizarPagoRequest, AgregarDiaRequest, CambiarTasaRequest, CrearCuentaRequest, CrearFuenteRequest, CrearPagoRequest, DiaInputRequest, GenerarSplitRequest (+2 more)

### Community 51 - "AbysApiProvider"
Cohesion: 0.16
Nodes (3): ApiErrorParser, ParsedError, AbysApiProvider

### Community 52 - "PushProcessor"
Cohesion: 0.26
Nodes (9): PendingOperationEntity, PushProcessor, CallResult, Error, Ok, OpResult, Done, Fatal (+1 more)

### Community 53 - "RegistrarViewModel.kt"
Cohesion: 0.06
Nodes (17): LaPaz, TransactionRunner, SettingsRepositoryImpl, Operations, RegistrarSettings, SplitSettings, MetodoPago, EFECTIVO (+9 more)

### Community 54 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+14 more)

### Community 56 - "SyncStatusRepository"
Cohesion: 0.31
Nodes (3): SyncStatusRepositoryImpl, SyncEstado, SyncStatusRepository

### Community 57 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 58 - "App.tsx"
Cohesion: 0.24
Nodes (5): App(), AppErrorBoundary, AppErrorBoundaryProps, AppErrorBoundaryState, router

### Community 59 - "FuenteRepo"
Cohesion: 0.18
Nodes (6): scanFuente(), NewFuenteService(), validarSplitAuto(), Fuente, FuenteRepo, FuenteService

### Community 60 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, class-variance-authority@^0.7.1, cn@^0.2.6, @fontsource-variable/inter@^5.2.5, lucide-react@^0.474.0, radix-ui@^1.6.7, react@^19.1.0, react-calendar@^5.1.0 (+9 more)

### Community 62 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 63 - "AbysDatabase"
Cohesion: 0.19
Nodes (3): DatabaseModule, AbysDatabase, SyncStateDao

### Community 66 - "themeColor.ts"
Cohesion: 0.28
Nodes (13): aplicarMeta(), clamp01(), clamp255(), leerTokenBackground(), linearToSrgb(), normalizarColor(), normalizeRgb(), oklchToRgb() (+5 more)

### Community 67 - "DashboardRepositoryImplTest"
Cohesion: 0.20
Nodes (3): DashboardDao, FilaMesHistorial, DashboardRepositoryImplTest

### Community 68 - "Routes.kt"
Cohesion: 0.13
Nodes (8): BottomDestination, CONFIGURACION, DASHBOARD, HEALTH, INGRESOS, REGISTRAR, SPLITS, Routes

### Community 69 - "vite.config.ts"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.1.4, vite@^6.2.3, @vitejs/plugin-react@^4.3.4, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 70 - "DashboardDtos.kt"
Cohesion: 0.41
Nodes (12): DashboardBloqueDto, DashboardDiaDto, DashboardHistoryDto, DashboardMesDto, DashboardMonthlyDto, DashboardPuntoDto, DashboardSummaryDto, DashboardWeeklyDto (+4 more)

### Community 72 - "000001_create_schema.up.sql"
Cohesion: 0.27
Nodes (13): cuentas, dias_trabajados, fuentes, historial_tasas, idx_dias_fecha, idx_historial_cuenta, idx_pagos_fecha, idx_pagos_fuente (+5 more)

### Community 73 - "ref"
Cohesion: 0.14
Nodes (7): { chromium }, { chromium }, { chromium }, { chromium }, fs, path, results

### Community 74 - "devDependencies"
Cohesion: 0.14
Nodes (18): devDependencies, tailwindcss@^4.1.4, tw-animate-css@^1.2.5, @types/node@^22.13.10, @types/react@^19.0.10, @types/react-dom@^19.0.4, typescript@~5.8.2, vitest@^5.0.0 (+10 more)

### Community 77 - "ComprobanteDropzone.tsx"
Cohesion: 0.24
Nodes (9): ComprobanteDropzone(), Props, ACCEPT_UPLOAD, ArchivoSeleccionado, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, TipoPermitido, TIPOS_PERMITIDOS (+1 more)

### Community 78 - "SyncOutcome"
Cohesion: 0.40
Nodes (4): SyncOutcome, FATAL, OK, RETRY

### Community 79 - "computeIndicator"
Cohesion: 0.20
Nodes (11): clamp01(), composite(), computeIndicator(), effBgFromChain(), luminance(), oklabToRgb(), parseColor(), parseShadowLayers() (+3 more)

### Community 81 - "audit-baseline.cjs"
Cohesion: 0.25
Nodes (5): { chromium }, fs, routes, themes, viewports

### Community 83 - "probe-ac2.cjs"
Cohesion: 0.57
Nodes (6): { chromium }, probeBackForward(), probeCanonAndHarnessFlow(), probeNoParamCanon(), state(), waitTab()

### Community 85 - "deploy.sh"
Cohesion: 0.60
Nodes (5): as_root(), die(), log(), deploy.sh script, warn()

### Community 86 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

### Community 88 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, test

### Community 93 - "PasoRealizar"
Cohesion: 0.67
Nodes (3): PasoRealizar, CONFIRMAR, SELECCION

### Community 105 - "main.tsx"
Cohesion: 0.25
Nodes (6): react-dom@^19.1.0, @tanstack/react-query@^5.66.9, TooltipProvider(), queryClient, react-dom, @tanstack/react-query

## Knowledge Gaps
- **31 isolated node(s):** `abys`, `Error`, `Done`, `OK`, `RETRY` (+26 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 651 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **135 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AbysApi` connect `AbysApi` to `AbysApi.kt`, `DashboardRepositoryImplTest`, `.actualizarFuente`, `PagoDao`, `PagoRepositoryImplTest.kt`, `POST`, `AbysApiProvider`, `PushProcessor.kt`, `PushProcessor`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `abys`, `Error`, `Done` to the rest of the system?**
  _31 weakly-connected nodes found - possible missing edges._
- **Should `CuentasTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09626064420584969 - nodes in this community are weakly interconnected._
- **Why does `AppResult` connect `AppResult` to `Money`, `SplitDao`, `PagoDao`, `DataModule.kt`, `PagoRepositoryImplTest.kt`, `SplitsViewModel`, `IngresosViewModel`, `AbysApiProvider`, `RegistrarViewModel.kt`, `DashboardViewModel`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `router.go` be split into smaller, more focused modules?**
  _Cohesion score 0.1325435024065161 - nodes in this community are weakly interconnected._
- **Why does `Money` connect `Money` to `.format`, `Money`, `RegistrarScreen.kt`, `PagoRepositoryImplTest.kt`, `SplitsViewModel`, `ValidarPagoUseCaseTest`, `PagoDao`, `Percent`, `RegistrarViewModel.kt`, `DashboardViewModel`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `DashboardPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07246835443037974 - nodes in this community are weakly interconnected._