# Plan de trabajo paralelo — Abys Android

> Documento de coordinación. Define la **partición sin solapamiento de archivos**, los **contratos
> compartidos que deben congelarse** antes de repartir trabajo y el **plan de integración/verificación**.
> Contratos: [`api-contract.md`](./api-contract.md) · [`feature-matrix.md`](./feature-matrix.md) · [`data-model.md`](./data-model.md).

---

## 1. Decisiones de arquitectura (congeladas)

| Decisión | Valor | Motivo |
|---|---|---|
| Módulos Gradle | **Uno solo** (`:app`) con paquetes por capa | Build simple y rápido; el aislamiento para paralelizar se garantiza por **paquete**, no por módulo |
| Paquete raíz | `com.mikylab.abys` | Nombre de dominio propio del proyecto (cambiable antes de publicar) |
| Kotlin / AGP | Kotlin 2.2.20 · AGP 8.13.1 · Gradle 8.14.x · KSP 2.2.20-2.0.x | Estable y compatible (KGP 2.2.x soporta Gradle ≤ 8.14) |
| SDK | `compileSdk/targetSdk = 36`, `minSdk = 26` | Android 8.0+; evita duplicados de WorkManager legacy |
| JDK | Toolchain 17 (compila con el JDK instalado, p. ej. JDK 23) | Portabilidad |
| UI | Jetpack Compose + Material 3 (`compose-bom`) | Requisito del proyecto |
| DI | **Hilt** (KSP) | Escala a 6 features; cada agente declara su `@Module` |
| Serialización | **kotlinx.serialization** (Retrofit converter) | Sin reflection; `Long` exacto para centavos |
| Persistencia | **Room** (KSP) + `exportSchema = true` | Requisito offline-first |
| Red | **Retrofit + OkHttp** | Requisito |
| Seguridad | **EncryptedSharedPreferences** (`androidx.security:security-crypto`) | Requisito; tokens y URL base cifrados |
| Background | **WorkManager** | Requisito |
| Gráficos | **Canvas propio** (sin librería externa) | Decisión del usuario; control total del estilo |
| Imágenes | **Coil** (`coil-compose`) para logos/QR/comprobantes | Carga de `/uploads/*` |
| Tests | JUnit4 + kotlinx-coroutines-test + MockK; `room-testing` para DAO | Sin dependencias pesadas |

### 1.1 Versiones de dependencias (propuesta inicial, ajustar si el repo no resuelve)

```toml
agp = "8.13.1"
kotlin = "2.2.20"
ksp = "2.2.20-2.0.4"
hilt = "2.57.1"            # hilt-android + hilt-compiler (KSP)
room = "2.7.2"             # room-runtime, room-ktx, room-compiler (KSP)
retrofit = "2.11.0"
okhttp = "4.12.0"
kotlinx-serialization = "1.8.1"
compose-bom = "2025.06.00"
navigation-compose = "2.9.0"
lifecycle = "2.9.1"
workmanager = "2.10.1"
security-crypto = "1.1.0-alpha06"
coil = "2.7.0"
```

---

## 2. Estructura de paquetes (árbol oficial)

```
app/src/main/java/com/mikylab/abys/
├── AbysApplication.kt                 @HiltAndroidApp
├── MainActivity.kt                    @AndroidEntryPoint
│
├── core/                              ── ÁREA A (core) ──
│   ├── result/AppResult.kt            Success | Failure(code,message,httpStatus)
│   ├── money/Money.kt                 value class (centavos) + formatBs + parseBs
│   ├── money/Percent.kt               value class (bps) + format + toBps
│   ├── time/DateFormats.kt            es-BO: fecha corta, día de semana, ISO
│   ├── time/LaPaz.kt                  ZoneId "America/La_Paz" + hoy()
│   ├── network/ApiClient.kt           Retrofit + OkHttp
│   ├── network/AuthInterceptor.kt     adjunta token si existe
│   ├── network/ApiException.kt        mapeo {error:{code,message,details}}
│   ├── network/NetworkModule.kt       @Module Hilt
│   ├── security/SecureStore.kt        EncryptedSharedPreferences
│   ├── security/TokenStore.kt
│   ├── security/BaseUrlStore.kt
│   └── di/AppModule.kt                @Module Hilt (DB, repos, sync)
│
├── domain/                            ── ÁREA E (dominio) ──
│   ├── model/                         Fuente, Pago, DiaTrabajado, Cuenta, HistorialTasa,
│   │                                  Split, Transaccion, MetodoPago, ModoCalculo,
│   │                                  SplitSettings, HealthInfo, DashboardSummary…
│   ├── repository/                    interfaces: PagoRepository, FuenteRepository,
│   │                                  CuentaRepository, SplitRepository, SettingsRepository,
│   │                                  HealthRepository
│   ├── usecase/                       CrearPagoUseCase, ActualizarPagoUseCase,
│   │                                  EliminarPagoUseCase, GenerarSplitUseCase,
│   │                                  MarcarRealizadaUseCase, CambiarTasaUseCase,
│   │                                  ValidarPagoUseCase, SincronizarAhoraUseCase
│   └── split/SplitCalculator.kt       cálculo puro (réplica de splitcalc.go)
│
├── data/                              ── ÁREAS B, C, D ──
│   ├── local/                         ── ÁREA B (Room) ──
│   │   ├── entity/                    10 entidades (ver data-model.md §3)
│   │   ├── dao/                       10 DAOs
│   │   ├── relation/                  PagoConDetalle, SplitConTransacciones, CuentaConHistorial
│   │   ├── AbysDatabase.kt
│   │   ├── Converters.kt
│   │   └── sync/SyncState.kt          enum SyncState
│   ├── remote/                        ── ÁREA C (Retrofit) ──
│   │   ├── dto/                       DTOs + envoltorios {data, meta}
│   │   ├── AbysApi.kt                 interfaz Retrofit (40 endpoints)
│   │   └── mapper/                    DTO → Entity
│   ├── mapper/                        Entity ↔ Domain
│   ├── repository/                    ── ÁREA D ──
│   │   ├── PagoRepositoryImpl.kt
│   │   ├── FuenteRepositoryImpl.kt
│   │   ├── CuentaRepositoryImpl.kt
│   │   ├── SplitRepositoryImpl.kt
│   │   ├── SettingsRepositoryImpl.kt
│   │   └── HealthRepositoryImpl.kt
│   └── sync/                          ── ÁREA D ──
│       ├── SyncScheduler.kt           encola push/pull/periodic
│       ├── SyncPushWorker.kt
│       ├── SyncPullWorker.kt
│       ├── SyncAllWorker.kt
│       ├── PushProcessor.kt           cola de pendientes → API
│       ├── PullProcessor.kt           API → Room
│       └── SyncWorkerFactory.kt       HiltWorkerFactory
│
└── presentation/                      ── ÁREAS F, G, H, I ──
    ├── navigation/                    Routes.kt, AbysNavHost.kt, AbysBottomBar.kt, AppTopBar.kt
    ├── theme/                         Color.kt, Theme.kt, Type.kt
    ├── components/                    KpiCard, EstadoVacio, ErrorState, LoadingState,
    │                                  ConfirmDialog, SyncBadge, Formatters
    ├── dashboard/                     DashboardScreen, DashboardViewModel, DashboardUiState, charts/
    ├── registrar/                     RegistrarScreen, RegistrarViewModel, RegistrarUiState
    ├── ingresos/                      IngresosScreen, IngresosViewModel, IngresosUiState
    ├── splits/                        SplitsScreen, SplitsViewModel, SplitsUiState
    ├── configuracion/                 ConfiguracionScreen + tabs Cuentas/Fuentes/Splits + Ajustes
    └── health/                        HealthScreen, HealthViewModel, HealthUiState
```

---

## 3. Contratos a congelar antes de paralelizar (Gate)

Ningún agente empieza a escribir código hasta que estos artefactos existan y no cambien sin aviso:

| # | Artefacto | Responsable | Estado |
|---|---|---|---|
| C1 | `docs/api-contract.md` | Arquitecto | ✅ Hecho |
| C2 | `docs/data-model.md` | Arquitecto | ✅ Hecho |
| C3 | `docs/feature-matrix.md` | Arquitecto | ✅ Hecho |
| C4 | `docs/parallel-plan.md` | Arquitecto | ✅ Hecho |
| C5 | `domain/model/**` + `domain/repository/**` (Kotlin) | Arquitecto | ⬜ Gate 1 |
| C6 | `data/local/entity/**` + `data/local/dao/**` (firma de DAO) | Arquitecto | ⬜ Gate 1 |
| C7 | `data/remote/dto/**` + `AbysApi.kt` (firma de la interfaz) | Arquitecto | ⬜ Gate 1 |
| C8 | `core/money`, `core/time`, `core/result` (API pública) | Arquitecto | ⬜ Gate 1 |
| C9 | `domain/split/SplitCalculator` (firma + reglas) | Arquitecto | ⬜ Gate 1 |
| C10 | Gradle: `libs.versions.toml`, `app/build.gradle.kts`, Hilt setup | Arquitecto | ⬜ Gate 1 |

> **Regla de oro**: si un agente necesita cambiar C5–C10, **no lo hace**: lo reporta al arquitecto,
> que lo centraliza y avisa al resto antes de continuar.

---

## 4. Partición por áreas (sin solapamiento de archivos)

Cada área tiene un **dueño** y un **conjunto de rutas exclusivo**. Los archivos compartidos
(`MainActivity`, `AbysApplication`, `libs.versions.toml`, `app/build.gradle.kts`) son **exclusivos del arquitecto**.

| Área | Rutas exclusivas | Contenido | Depende de |
|---|---|---|---|
| **A — Core/Red/Seguridad** | `core/**` | Money/Percent/DateFormats, `ApiClient`, `AuthInterceptor`, `ApiException`, `SecureStore`, `TokenStore`, `BaseUrlStore` | C8 |
| **B — Room** | `data/local/**` | Entidades, DAOs, `AbysDatabase`, `Converters`, `SyncState` | C6 |
| **C — Remoto** | `data/remote/**` | DTOs, `AbysApi`, mappers DTO→Entity | C7, B |
| **D — Repos + Sync** | `data/repository/**`, `data/sync/**`, `data/mapper/**` | Implementaciones offline-first, cola de pendientes, workers | A, B, C, E |
| **E — Dominio** | `domain/**` | Modelos, interfaces de repositorio, casos de uso, `SplitCalculator` | C5 |
| **F — Presentación base** | `presentation/navigation/**`, `presentation/theme/**`, `presentation/components/**` | Rutas, `NavHost`, bottom bar, tema M3, componentes comunes | A |
| **G — Dashboard** | `presentation/dashboard/**` | KPIs, gráficos Canvas, ViewModel | B, E, F |
| **H — Registrar + Ingresos** | `presentation/registrar/**`, `presentation/ingresos/**` | Formulario, calendario, lista, filtros | B, D, E, F |
| **I — Splits + Configuración + Health** | `presentation/splits/**`, `presentation/configuracion/**`, `presentation/health/**` | Splits, cuentas/fuentes/splits/ajustes, health | B, D, E, F |

### 4.1 Reglas de convivencia

1. Un agente **solo** escribe en sus rutas. Cualquier necesidad de tocar otra ruta → solicitud al arquitecto.
2. Los **ViewModels** consumen **solo** interfaces de `domain/repository` (nunca DAOs ni Retrofit).
3. Las **pantallas** no llaman a la red directamente.
4. Los cambios en `domain` (contratos) son **centralizados**.
5. Cada agente entrega: (a) código compilable, (b) `unit test` de su lógica pura, (c) resumen de cambios.

---

## 5. Orden de implementación

| Fase | Contenido | Parallelismo |
|---|---|---|
| **F0 — Análisis** | Los 4 docs de `docs/` | Secuencial (1 agente) ✅ |
| **F1 — Gate** | Gradle + `libs.versions.toml` + contratos C5–C10 + `core` mínimo (C8) + esqueleto de `domain` | Secuencial (arquitecto) |
| **F2 — Datos** | Áreas **B** (Room), **C** (Retrofit), **E** (Dominio) | Paralelo (3 agentes) |
| **F3 — Lógica** | Áreas **D** (repos + sync), **A** (resto de core/red) | Paralelo (2 agentes), tras B/C/E |
| **F4 — UI** | Áreas **F** (base), luego **G**, **H**, **I** en paralelo | Paralelo (3-4 agentes), tras F |
| **F5 — Integración** | Merge, resolución de conflictos, `assembleDebug`, `test`, `lint`, `assembleRelease` | Secuencial (arquitecto) |
| **F6 — Validación E2E** | App contra el backend real (emulador + `adb`) | Manual + scripts |

### 5.1 Dependencias entre fases (grafo)

```
F1 (contratos + gradle)
   ├── F2.B (Room) ──┐
   ├── F2.C (Retrofit)├──► F3.D (repos + sync) ──┐
   ├── F2.E (dominio) ─┘                         ├──► F4.F (base UI) ──► F4.G/H/I (pantallas)
   └── F3.A (core/red) ──────────────────────────┘
```

---

## 6. Estrategia de ramas / worktrees

| Escenario | Estrategia |
|---|---|
| 2–3 agentes, cambios pocos | Ramas por área desde `main`: `feat/area-b-room`, `feat/area-c-remoto`…; merge secuencial a `main` |
| ≥ 4 agentes o conflictos frecuentes | **Worktrees** de OpenCode (`opencode worktree`), uno por área, para evitar tocar el mismo directorio de trabajo |
| Cambios en contratos (C5–C10) | Siempre en `main` por el arquitecto, con mensaje en el chat antes de continuar |

---

## 7. Plan de verificación

### 7.1 Por commit / por área

```bash
cd <worktree-del-agente>
./gradlew :app:compileDebugKotlin      # compila rápido
./gradlew :app:testDebugUnitTest        # tests unitarios
./gradlew :app:lintDebug                # lint
```

### 7.2 Integración (F5)

```bash
./gradlew clean assembleDebug            # build completo
./gradlew test                           # todos los tests
./gradlew lint                           # lint de todo el proyecto
./gradlew assembleRelease                # build de release (minify + reglas ProGuard)
```

### 7.3 Validación contra el backend (F6)

```bash
# 1. Backend local
cd Abys/backend && go run ./cmd/server     # :8080

# 2. Emulador Android
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.mikylab.abys/.MainActivity

# 3. La app usa http://10.0.2.2:8080/api/v1 (emulador → host)
adb logcat | grep -i "AbysSync"
```

Checks manuales mínimos:

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | Abrir la app sin red | La UI carga con datos locales (o vacío) **sin crashear**; banner "sin conexión" |
| 2 | Crear un pago offline | Se guarda en Room, aparece en Ingresos, badge "pendiente de sincronizar" |
| 3 | Conectar red | El sync sube el pago; `serverId` se rellena; badge desaparece |
| 4 | Crear pago con monto y días | El servidor devuelve el mismo `monto_enteros` y los mismos días |
| 5 | Generar un split | El total de transacciones = monto del pago (invariante BR-081) |
| 6 | Marcar una transacción como realizada | Se congela; el monto ya realizado no cambia tras un recálculo |
| 7 | Cambiar una tasa con "aplicar a pendientes" | `splits_recalculados > 0`; las realizadas no cambian |
| 8 | Eliminar un pago con realizadas | Error 409 mostrado con el mensaje del backend |
| 9 | Eliminar un pago sin split | 200; desaparece de Ingresos y del dashboard |
| 10 | Health | Muestra conexión, latencia, versión PG, tamaño y conteos |

### 7.4 Tests de paridad obligatorios

| Test | Origen |
|---|---|
| `SplitCalculatorTest` | `Abys/backend/internal/splitcalc/splitcalc_test.go` (mismos casos y resultados esperados) |
| `MoneyFormatTest` | `Abys/web/src/lib/format.test.ts` (`formatBs`, `bsToCents`, `formatTasaBps`) |
| `DateFormatTest` | `Abys/web/src/lib/format.test.ts` (`formatearFechaEs`, `diaSemanaEs`, `toISODate`) |
| `PagoValidationTest` | `internal/service/validations.go` (BR-001/002/006/007/010) |

---

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Divergencia entre el cálculo local de splits y el del servidor | Montos incorrectos | Test de paridad con los casos del backend; el servidor **reemplaza** el split local tras el push |
| El backend no tiene login y no valida tokens | Ninguno hoy; riesgo a futuro | `TokenStore` cifrado + interceptor listos; añadir `Authorization` es un cambio de una línea |
| `PUT /cuentas/{id}/tasa` con `tasa: 0` → 400 | UX confusa | Validación local que avisa antes de enviar |
| `PUT /fuentes/{id}` sin `color` → `color = ''` | Fuentes sin color | El repositorio **siempre** envía `color` |
| `POST /pagos` devuelve `split_warning` sin ser error | Split ausente | Se muestra como advertencia, no como fallo; el pago queda creado |
| Cambios de tasa fuera de transacción en el backend | Tasa registrada aunque el recálculo falle | Tras un 422 en el recálculo, releer `historial-tasas` y avisar |
| Room + KSP + Hilt = builds lentos | Tiempo de build | Un solo módulo; `org.gradle.parallel=true`, caché de build activo |
| Subagentes con modelos gratuitos lentos | Retraso | Lotes acotados (1–2 áreas por tanda) y verificación local con `./gradlew` |

---

## 9. Definition of Done (Fase 1 / scaffold navegable)

- [ ] `./gradlew assembleDebug` compila sin errores ni warnings bloqueantes.
- [ ] `./gradlew test` pasa (tests de formato, fechas, validación y `SplitCalculator`).
- [ ] La app arranca y navega entre **Dashboard, Registrar, Ingresos, Splits, Configuración y Health**.
- [ ] Room crea el esquema v1 con las 10 tablas y la cola de pendientes.
- [ ] Retrofit/OkHttp configurados contra la base URL configurable; los errores se mapean a `AppResult.Failure`.
- [ ] `EncryptedSharedPreferences` storing token (vacío) y base URL; se puede cambiar la URL en Ajustes.
- [ ] `WorkManager` encola push/pull; un pago creado offline aparece en la cola y se sube al recuperar red.
- [ ] Las 6 pantallas leen **exclusivamente** de Room (vía ViewModel) y muestran estados vacío/cargando/error.
- [ ] `docs/` actualizado con cualquier detalle nuevo descubierto durante la implementación.
