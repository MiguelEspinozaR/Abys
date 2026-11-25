# Graph Report - abys-gestion  (2026-11-25)

## Corpus Check
- 351 files · ~331,716 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: .xml 8, (none) 4, .properties 4)

## Summary
- 3012 nodes · 9370 edges · 231 communities (80 shown, 151 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 361 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4866706d`
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
- PullProcessor
- Repositories.kt
- AppError
- IngresosViewModel
- Setup
- router.tsx
- RegistrarPage.tsx
- SyncState
- FuentesTab.tsx
- react
- useHistorial.ts
- DashboardViewModel
- CuentaDetalleDialog.tsx
- NewValidation
- audit.cjs
- CuentaDao
- ConfiguracionViewModel
- testing.T
- agrupar.ts
- AbysApi.kt
- DashboardScreen.kt
- DashboardRepositoryImpl.kt
- DateFormats
- .format
- SplitCalculatorTest
- aa-audit.cjs
- CalendarioDias.tsx
- api-errors.ts
- Theme.kt
- Money
- DataModule.kt
- opencode.json
- DashboardDao
- ValidarPagoUseCaseTest
- AbysNavHost.kt
- PushProcessor.kt
- AbysApiProvider
- PushProcessor
- RegistrarViewModel.kt
- compilerOptions
- HealthScreen.kt
- SplitHandler
- components.json
- ModoDistribucion
- FuenteRepo
- dependencies
- AppResult
- compilerOptions
- AbysDatabase
- SecureStore
- themeColor.ts
- DashboardRepositoryImplTest
- Routes.kt
- package.json
- DashboardDtos.kt
- .actualizarFuente
- 000001_create_schema.up.sql
- ref
- devDependencies
- HealthViewModel.kt
- PagoRepositoryImplTest.kt
- ComprobanteDropzone.tsx
- DashboardViewModelTest.kt
- computeIndicator
- ConfiguracionPage.tsx
- audit-baseline.cjs
- probe-ac2.cjs
- DashboardRepository
- deploy.sh
- tsconfig.json
- ApiErrorParser
- scripts
- stop.sh
- a11y.ts
- vite-env.d.ts
- PasoRealizar
- 000005_add_split_config.up.sql
- status.sh
- @fontsource-variable/inter@^5.2.5
- @fontsource-variable/geist@^5.3.0
- next-themes@^0.4.6
- @radix-ui/react-alert-dialog@^1.1.6
- @radix-ui/react-select@^2.1.6
- @radix-ui/react-dialog@^1.1.6
- @radix-ui/react-tooltip@^1.1.8
- @radix-ui/react-label@^2.1.2
- @radix-ui/react-slot@^1.1.2
- @tanstack/react-query
- zustand
- abys
- react-dom
- tailwind-merge@^3.0.2

## God Nodes (most connected - your core abstractions)
1. `AppResult` - 76 edges
2. `SyncState` - 70 edges
3. `AbysApi` - 63 edges
4. `Money` - 53 edges
5. `react` - 52 edges
6. `SplitDao` - 49 edges
7. `ApiEnvelope` - 47 edges
8. `Button()` - 47 edges
9. `responderError()` - 46 edges
10. `RegistrarPage()` - 45 edges

## Surprising Connections (you probably didn't know these)
- `Error` --references--> `AppError`  [EXTRACTED]
  app/src/main/java/com/mikylab/abys/data/sync/PushProcessor.kt → app/src/main/java/com/mikylab/abys/core/result/AppResult.kt
- `TestValidarDiasTrabajados()` --calls--> `ValidarDiasTrabajados()`  [INFERRED]
  Abys/backend/internal/service/pago_service_test.go → Abys/backend/internal/service/validations.go
- `TestSummaryUsaRangoDe30Dias()` --calls--> `rangoUltimos30()`  [INFERRED]
  Abys/backend/internal/service/dashboard_service_test.go → Abys/backend/internal/service/dashboard_service.go
- `AbysApiProvider` --references--> `AbysApi`  [EXTRACTED]
  app/src/main/java/com/mikylab/abys/data/remote/AbysApiProvider.kt → app/src/main/java/com/mikylab/abys/data/remote/AbysApi.kt
- `DashboardRepositoryImplTest` --references--> `AbysApi`  [EXTRACTED]
  app/src/test/java/com/mikylab/abys/data/repository/DashboardRepositoryImplTest.kt → app/src/main/java/com/mikylab/abys/data/remote/AbysApi.kt

## Import Cycles
- 2-file cycle: `Abys/backend/internal/handler/settings_handler_test.go -> Abys/backend/internal/router/router.go -> Abys/backend/internal/handler/settings_handler_test.go`
- 3-file cycle: `Abys/backend/internal/handler/settings_handler_test.go -> Abys/backend/internal/router/integration_test.go -> Abys/backend/internal/router/router.go -> Abys/backend/internal/handler/settings_handler_test.go`

## Communities (231 total, 151 thin omitted)

### Community 0 - "CuentasTab.tsx"
Cohesion: 0.11
Nodes (47): ErrorSummary(), ItemError, Props, FieldError(), Props, Dialog(), DialogContent(), DialogDescription() (+39 more)

### Community 1 - "router.go"
Cohesion: 0.13
Nodes (13): AddDiaRequest, CreatePagoRequest, CuentaRequest, DashboardYearlyResponse, DiaInput, FuenteRequest, GenerarSplitRequest, RegistrarSettingsRequest (+5 more)

### Community 2 - "DashboardPage.tsx"
Cohesion: 0.08
Nodes (65): recharts@^3.10.1, ChartLegend(), ChartLegendProps, Swatch(), claveFuente(), etiquetaBloque(), etiquetaMes(), FilaBloque (+57 more)

### Community 3 - "context.Context"
Cohesion: 0.07
Nodes (29): AsError(), NewConflict(), NewImmutable(), NewInternal(), NewNotFound(), NewUnprocessable(), NewCuentaHandler(), NewSplitHandler() (+21 more)

### Community 4 - "forms-audit.cjs"
Cohesion: 0.06
Nodes (67): ac1(), ac2(), ac3(), ac4(), ac5(), ac6(), ac7(), ac8_ac9_ac10() (+59 more)

### Community 5 - "SplitDao"
Cohesion: 0.08
Nodes (7): SplitDao, SplitEntity, TransaccionEntity, RemoteMappers, SplitRepositoryImpl, SplitTransactionsSync, SplitRepositoryImplTest

### Community 6 - "github.com/gin-gonic/gin.Context"
Cohesion: 0.11
Nodes (15): mesAnio(), badRequest(), responderError(), NewFuenteHandler(), hoyLaPaz(), diasAInput(), NewPagoHandler(), pathID() (+7 more)

### Community 7 - "historial-audit.cjs"
Cohesion: 0.07
Nodes (57): ac1(), ac10(), ac2(), ac3(), ac4_ac5(), ac6(), ac7(), ac8() (+49 more)

### Community 8 - "DashboardService"
Cohesion: 0.06
Nodes (34): NewDashboardHandler(), bloquesDelMes(), fuentesNoNulas(), rangoSemana(), rangoUltimos30(), sumarFuentes(), TestBloquesDelMes(), TestRangoSemana() (+26 more)

### Community 9 - "SyncScheduler"
Cohesion: 0.05
Nodes (8): AbysApplication, ConnectivityMonitor, NetworkCallback, SyncScheduler, aResultado(), SyncAllWorker, SyncPullWorker, SyncPushWorker

### Community 10 - "hooks.ts"
Cohesion: 0.08
Nodes (45): QrCell(), esMetodoPago(), esModoRedondeo(), esModoRegistro(), esUnoDe(), METODOS_PAGO_VALIDOS, MODOS_REDONDEO_VALIDOS, MODOS_REGISTRO_VALIDOS (+37 more)

### Community 11 - "AbysApi"
Cohesion: 0.13
Nodes (3): AbysApi, ApiEnvelope, EliminadoResponse

### Community 12 - "PagoDao"
Cohesion: 0.10
Nodes (6): PagoDao, DiaTrabajadoEntity, PagoEntity, PagoRepositoryImpl, FiltroPagos, PagoRepositoryImplTest

### Community 13 - "RegistrarScreen.kt"
Cohesion: 0.08
Nodes (5): CuentaDetalleDialog(), DatoCuenta(), GenerarSplitDialog(), RealizarTransaccionDialog(), ResultadoMasivo

### Community 14 - "PullProcessor"
Cohesion: 0.08
Nodes (10): PendingOperationDao, SyncStateDao, AppSettingEntity, SyncStateEntity, PendingWriter, PullProcessor, SyncOutcome, FATAL (+2 more)

### Community 15 - "Repositories.kt"
Cohesion: 0.09
Nodes (13): Percent, Cuenta, Split, Transaccion, PagoRepository, SplitRepository, FilaTransaccion(), SplitsScreen() (+5 more)

### Community 16 - "AppError"
Cohesion: 0.13
Nodes (4): AppError, TransactionRunner, CuentaRepositoryImpl, FuenteRepositoryImpl

### Community 18 - "Setup"
Cohesion: 0.08
Nodes (35): main(), getEnv(), Load(), Connect(), NewHealthHandler(), NewSettingsHandler(), TestSettingsRegistrarEndpoints(), CORS() (+27 more)

### Community 19 - "router.tsx"
Cohesion: 0.10
Nodes (28): App(), AppLayout(), BotonNav(), NavContenido(), TopBarMovil(), PageLoader(), Sidebar(), Toaster() (+20 more)

### Community 20 - "RegistrarPage.tsx"
Cohesion: 0.07
Nodes (56): Input(), Textarea(), Campo, centsToBsInput(), GuardiaNavegacion(), IDS_Campos, montosIniciales(), Obligatorio() (+48 more)

### Community 21 - "SyncState"
Cohesion: 0.10
Nodes (9): Converters, FuenteDao, FuenteEntity, SyncState, FAILED, PENDING_CREATE, PENDING_DELETE, PENDING_UPDATE (+1 more)

### Community 22 - "FuentesTab.tsx"
Cohesion: 0.10
Nodes (57): ConfirmarDescarteDialog(), Props, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+49 more)

### Community 23 - "react"
Cohesion: 0.12
Nodes (39): FiltrosRango(), PRESETS, HistorialAgrupado(), SeccionAnio(), Alert(), AlertDescription(), AlertTitle(), alertVariants (+31 more)

### Community 24 - "useHistorial.ts"
Cohesion: 0.08
Nodes (53): FiltrosRangoProps, HistorialAgrupadoProps, SeccionAnioProps, Props, Props, useFiltrosHistorial(), UseFiltrosHistorialResultado, AnioConDatos (+45 more)

### Community 25 - "DashboardViewModel"
Cohesion: 0.10
Nodes (6): DashboardUiState, DashboardViewModel, Servidor, inicioDeSemana(), RangoHistorial, Seleccion

### Community 26 - "CuentaDetalleDialog.tsx"
Cohesion: 0.14
Nodes (20): Checkbox(), idsParaReintento(), puedeRealizar(), textoConfirmacion(), CuentaDetalleDialog(), fechaEs(), Paso, Props (+12 more)

### Community 27 - "NewValidation"
Cohesion: 0.11
Nodes (20): NewValidation(), mapPagoErr(), recalcularTotalPago(), scanPago(), scanPagoDetallado(), NewPagoService(), TestDerivarTotalPagoY422(), validarTotalCliente() (+12 more)

### Community 28 - "audit.cjs"
Cohesion: 0.08
Nodes (36): checkStaticCss(), { chromium }, BASELINE, compactCase(), compactFocus(), compactResults(), compareDesktopLayout(), countCategories() (+28 more)

### Community 29 - "CuentaDao"
Cohesion: 0.12
Nodes (7): CuentaDao, CuentaEntity, HistorialTasaEntity, CuentaConHistorial, PagoConDetalle, SplitConTransacciones, GeneralRateHelper

### Community 30 - "ConfiguracionViewModel"
Cohesion: 0.12
Nodes (4): BaseUrlStore, ConfiguracionUiState, ConfiguracionViewModel, PruebaConexion

### Community 31 - "testing.T"
Cohesion: 0.12
Nodes (31): leerMigracion(), TestMigration000006Backfill(), NewDashboardService(), TestDistribucionSumaYOrden(), TestHistorySinTendencia(), TestMonthlyRellenaBloques(), TestSummaryUsaRangoDe30Dias(), TestWeeklyFormatea7DiasYPorFuente() (+23 more)

### Community 32 - "agrupar.ts"
Cohesion: 0.39
Nodes (6): agruparPorAnio(), anioDeFecha(), contarPorAnio(), GrupoAnio, paginasNecesarias(), Fila

### Community 33 - "AbysApi.kt"
Cohesion: 0.21
Nodes (20): ApiErrorBody, ApiErrorEnvelope, CambioTasaResponse, CrearPagoResponse, CuentaDto, DiaTrabajadoDto, FuenteDto, HealthInfoDto (+12 more)

### Community 34 - "DashboardScreen.kt"
Cohesion: 0.16
Nodes (15): BarChart(), DistributionPieChart(), etiquetaMes(), FilaApilada, LineChart(), StackedBarChart(), TextoVacioChart(), ChartCard() (+7 more)

### Community 35 - "DashboardRepositoryImpl.kt"
Cohesion: 0.30
Nodes (5): FilaDiaFuente, DashboardRepositoryImpl, BarraDia, Distribucion, FuenteTotal

### Community 36 - "DateFormats"
Cohesion: 0.11
Nodes (4): DateFormats, LocalDateTimeCompat, FilaPago(), DateFormatsTest

### Community 38 - ".format"
Cohesion: 0.11
Nodes (9): centsToEditableBs(), formatBs(), parseBsToCents(), formatTasaBps(), centsToTexto(), DiaEditable, parsearFecha(), validar() (+1 more)

### Community 39 - "SplitCalculatorTest"
Cohesion: 0.17
Nodes (7): SplitCalculator, CalculoException, ResultadoRecalculo, TasaCuenta, TransaccionCalculada, TransaccionRecalculo, SplitCalculatorTest

### Community 40 - "aa-audit.cjs"
Cohesion: 0.10
Nodes (17): { chromium }, fs, OUT, path, { chromium }, fs, OUT, path (+9 more)

### Community 41 - "CalendarioDias.tsx"
Cohesion: 0.17
Nodes (18): CalendarioDias(), ColorSwatch(), HERRAMIENTAS, Props, valueToDate(), fromISODate(), BG_FUENTE_FALLBACK, COLOR_FUENTE_FALLBACK (+10 more)

### Community 42 - "api-errors.ts"
Cohesion: 0.11
Nodes (22): CampoCuenta, CampoEditarPago, CampoFuente, CampoGenerarSplit, CampoRegistrar, CampoTasa, ConfigErroresApi, ErrorApiLike (+14 more)

### Community 43 - "Theme.kt"
Cohesion: 0.10
Nodes (3): MainActivity, AbysColors, AbysTheme()

### Community 44 - "Money"
Cohesion: 0.12
Nodes (18): Money, DomainMappers, DiaTrabajado, DiaTrabajadoDraft, Fuente, HistorialTasa, Pago, PagoDraft (+10 more)

### Community 45 - "DataModule.kt"
Cohesion: 0.11
Nodes (5): RepositoryModule, RoomTransactionRunner, SyncStatusRepositoryImpl, SyncEstado, SyncStatusRepository

### Community 46 - "opencode.json"
Cohesion: 0.07
Nodes (26): agents, android, android-deep, description, mode, model, permissions, system (+18 more)

### Community 47 - "DashboardDao"
Cohesion: 0.22
Nodes (3): LaPaz, DashboardDao, FilaMesHistorial

### Community 48 - "ValidarPagoUseCaseTest"
Cohesion: 0.21
Nodes (5): ValidarPagoUseCase, Resultado, Error, Ok, ValidarPagoUseCaseTest

### Community 49 - "AbysNavHost.kt"
Cohesion: 0.09
Nodes (6): AbysApp(), CalendarioMes(), LeyendaCalendario(), PuntoCalendario(), RegistrarScreen(), widthMonto()

### Community 50 - "PushProcessor.kt"
Cohesion: 0.14
Nodes (11): ActualizarPagoRequest, AgregarDiaRequest, CambiarTasaRequest, CrearCuentaRequest, CrearFuenteRequest, CrearPagoRequest, DiaInputRequest, GenerarSplitRequest (+3 more)

### Community 52 - "PushProcessor"
Cohesion: 0.28
Nodes (9): PendingOperationEntity, PushProcessor, CallResult, Error, Ok, OpResult, Done, Fatal (+1 more)

### Community 53 - "RegistrarViewModel.kt"
Cohesion: 0.07
Nodes (22): SettingDao, HealthRepositoryImpl, SettingsRepositoryImpl, RegistrarSettings, SplitSettings, MetodoPago, EFECTIVO, QR (+14 more)

### Community 54 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+14 more)

### Community 55 - "HealthScreen.kt"
Cohesion: 0.12
Nodes (6): ErrorState(), EstadoVacio(), KpiCard(), LoadingState(), SyncStatusChip(), HealthScreen()

### Community 56 - "SplitHandler"
Cohesion: 0.21
Nodes (9): splitJSON(), TestTotalesSplit(), totalesSplit(), scanSplit(), scanTransaccion(), SplitHandler, Split, Transaccion (+1 more)

### Community 57 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 58 - "ModoDistribucion"
Cohesion: 0.18
Nodes (6): ModoDistribucion, ENTEROS, PRECISO, REDONDEADO, DistribuirUseCase, DistribuirUseCaseTest

### Community 59 - "FuenteRepo"
Cohesion: 0.18
Nodes (6): scanFuente(), NewFuenteService(), validarSplitAuto(), Fuente, FuenteRepo, FuenteService

### Community 60 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority@^0.7.1, cn@^0.2.6, date-fns@^4.1.0, lucide-react@^0.474.0, radix-ui@^1.6.7, @radix-ui/react-separator@^1.1.2, @radix-ui/react-switch@^1.1.3 (+11 more)

### Community 61 - "AppResult"
Cohesion: 0.09
Nodes (10): AppErrorException, AppResult, Failure, Success, map(), onFailure(), onSuccess(), safeApiCall() (+2 more)

### Community 62 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 64 - "SecureStore"
Cohesion: 0.08
Nodes (4): CoreModule, AuthInterceptor, SecureStore, TokenStore

### Community 66 - "themeColor.ts"
Cohesion: 0.30
Nodes (12): aplicarMeta(), clamp01(), clamp255(), leerTokenBackground(), linearToSrgb(), normalizarColor(), normalizeRgb(), oklchToRgb() (+4 more)

### Community 68 - "Routes.kt"
Cohesion: 0.13
Nodes (8): BottomDestination, CONFIGURACION, DASHBOARD, HEALTH, INGRESOS, REGISTRAR, SPLITS, Routes

### Community 69 - "package.json"
Cohesion: 0.15
Nodes (12): clsx@^2.1.1, @radix-ui/react-checkbox@^1.1.4, @radix-ui/react-dropdown-menu@^2.1.6, sonner@^2.0.1, name, private, type, version (+4 more)

### Community 70 - "DashboardDtos.kt"
Cohesion: 0.41
Nodes (12): DashboardBloqueDto, DashboardDiaDto, DashboardHistoryDto, DashboardMesDto, DashboardMonthlyDto, DashboardPuntoDto, DashboardSummaryDto, DashboardWeeklyDto (+4 more)

### Community 71 - ".actualizarFuente"
Cohesion: 0.22
Nodes (3): ActualizadoResponse, AgregarDiaResponse, HealthDbResponse

### Community 72 - "000001_create_schema.up.sql"
Cohesion: 0.27
Nodes (13): cuentas, dias_trabajados, fuentes, historial_tasas, idx_dias_fecha, idx_historial_cuenta, idx_pagos_fecha, idx_pagos_fuente (+5 more)

### Community 73 - "ref"
Cohesion: 0.14
Nodes (7): { chromium }, { chromium }, { chromium }, { chromium }, fs, path, results

### Community 74 - "devDependencies"
Cohesion: 0.10
Nodes (20): devDependencies, tailwindcss@^4.1.4, @tailwindcss/vite@^4.1.4, tw-animate-css@^1.2.5, @types/node@^22.13.10, @types/react@^19.0.10, @types/react-dom@^19.0.4, typescript@~5.8.2 (+12 more)

### Community 75 - "HealthViewModel.kt"
Cohesion: 0.23
Nodes (4): HealthInfo, TablaInfo, HealthUiState, HealthViewModel

### Community 77 - "ComprobanteDropzone.tsx"
Cohesion: 0.24
Nodes (9): ComprobanteDropzone(), Props, ACCEPT_UPLOAD, ArchivoSeleccionado, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, TipoPermitido, TIPOS_PERMITIDOS (+1 more)

### Community 79 - "computeIndicator"
Cohesion: 0.20
Nodes (11): clamp01(), composite(), computeIndicator(), effBgFromChain(), luminance(), oklabToRgb(), parseColor(), parseShadowLayers() (+3 more)

### Community 80 - "ConfiguracionPage.tsx"
Cohesion: 0.47
Nodes (7): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), ConfiguracionPage(), class-variance-authority

### Community 81 - "audit-baseline.cjs"
Cohesion: 0.25
Nodes (5): { chromium }, fs, routes, themes, viewports

### Community 83 - "probe-ac2.cjs"
Cohesion: 0.57
Nodes (6): { chromium }, probeBackForward(), probeCanonAndHarnessFlow(), probeNoParamCanon(), state(), waitTab()

### Community 84 - "DashboardRepository"
Cohesion: 0.24
Nodes (4): BarraMes, DashboardSummary, DashboardRepository, Datos

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

## Knowledge Gaps
- **30 isolated node(s):** `Done`, `SYNCED`, `PENDING_CREATE`, `PENDING_UPDATE`, `PENDING_DELETE` (+25 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 660 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **151 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SyncState` connect `SyncState` to `AbysApi.kt`, `SplitDao`, `PagoDao`, `Money`, `PullProcessor`, `Repositories.kt`, `AppError`, `PagoRepositoryImplTest.kt`, `PushProcessor.kt`, `RegistrarViewModel.kt`, `CuentaDao`, `ConfiguracionViewModel`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `Done`, `SYNCED`, `PENDING_CREATE` to the rest of the system?**
  _30 weakly-connected nodes found - possible missing edges._
- **Should `CuentasTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11396843950905904 - nodes in this community are weakly interconnected._
- **Why does `Money` connect `Money` to `DashboardRepositoryImpl.kt`, `DashboardRepositoryImplTest`, `.format`, `PagoRepositoryImplTest.kt`, `RegistrarScreen.kt`, `DashboardViewModelTest.kt`, `DashboardDao`, `Repositories.kt`, `PagoDao`, `ValidarPagoUseCaseTest`, `DashboardRepository`, `RegistrarViewModel.kt`, `AppResult`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `router.go` be split into smaller, more focused modules?**
  _Cohesion score 0.12736842105263158 - nodes in this community are weakly interconnected._
- **Why does `AppResult` connect `AppResult` to `DashboardRepositoryImpl.kt`, `SplitDao`, `HealthViewModel.kt`, `PagoDao`, `Money`, `PagoRepositoryImplTest.kt`, `Repositories.kt`, `AppError`, `IngresosViewModel`, `DashboardViewModelTest.kt`, `AbysApiProvider`, `DashboardRepository`, `RegistrarViewModel.kt`, `DashboardViewModel`, `ConfiguracionViewModel`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `DashboardPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07525807525807526 - nodes in this community are weakly interconnected._