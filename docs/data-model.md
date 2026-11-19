# Modelo de datos — Abys Android (Room) y estrategia de sincronización

> **Fuente de verdad**: `Abys/backend/migrations/*.sql`, `internal/model/models.go`,
> `internal/repository/*`, `internal/splitcalc/splitcalc.go`, `Abys/backlog/reglas-de-negocio.md`.
> Contrato HTTP en [`api-contract.md`](./api-contract.md).

---

## 1. Principios

1. **Room es la única fuente de verdad para la UI.** La UI nunca lee del servidor directamente:
   observa `Flow` de Room. El servidor alimenta Room mediante el sync.
2. **Identidad local-first**: cada fila tiene un `localId` (UUID, generado en el dispositivo) y un
   `serverId` (`Long?`, nulo mientras la fila no exista en el backend). Esto permite crear entidades
   sin conexión y reconciliar después.
3. **Montos en `Long` (centavos)** y **tasas en `Long` (bps)** en toda la capa local. Conversión a
   decimales **solo en la capa de presentación** (`core/money`).
4. **Doble marca de tiempo**: `updatedAtLocal` (cuándo se modificó en el dispositivo) y
   `updatedAtServer` (`updated_at` del backend). Sirven para detectar divergencias y ordenar el push.
5. **El servidor manda en las reglas monetarias.** El split se calcula localmente para responder al
   instante, pero el servidor es la autoridad: tras un push, las transacciones se **reemplazan** por
   las que devuelve la API.
6. **Nada de borrado físico en local**: el soft delete se replica con `deletedAt` + estado
   `PENDING_DELETE`, igual que el backend.

---

## 2. Tablas backend → entidades Room

| Tabla PG | Entidad Room | PK local | Clave foránea | Notas |
|---|---|---|---|---|
| `fuentes` | `FuenteEntity` | `localId` (TEXT) | — | `splitAuto`, `splitAutoModo` (nullable) |
| `pagos` | `PagoEntity` | `localId` (TEXT) | `fuenteId → fuentes.localId` | `montoEnteros: Long`, `fechaPago: String` |
| `dias_trabajados` | `DiaTrabajadoEntity` | `localId` (TEXT) | `pagoId → pagos.localId` | `montoEnteros: Long`, `UNIQUE(pagoId, fecha)` |
| `cuentas` | `CuentaEntity` | `localId` (TEXT) | — | `tasaBps` **derivada** (última del historial o General) |
| `historial_tasas` | `HistorialTasaEntity` | `localId` (TEXT) | `cuentaId → cuentas.localId` | `tasaBps`, `aplicadaDesde` |
| `splits` | `SplitEntity` | `localId` (TEXT) | `pagoId → pagos.localId` | 0..1 por pago; `modoCalculo` |
| `transacciones` | `TransaccionEntity` | `localId` (TEXT) | `splitId → splits.localId`, `cuentaId → cuentas.localId?` | `aliasSnapshot`, `tasaBps` congelados |
| `app_settings` | `AppSettingEntity` | `clave` (TEXT) | — | `split_modo_default` |
| — (local) | `PendingOperationEntity` | `id` (autoinc) | — | cola de operaciones pendientes |
| — (local) | `SyncStateEntity` | `id` = 1 (singleton) | — | metadatos del sync (último sync, error) |

### 2.1 Columnas de sincronización (comunes a todas las entidades de negocio)

```kotlin
// SyncState.kt  (data/local/sync/SyncState.kt)
enum class SyncState { SYNCED, PENDING_CREATE, PENDING_UPDATE, PENDING_DELETE, FAILED }
```

| Columna | Tipo | Significado |
|---|---|---|
| `localId` | `String` (PK) | UUID generado en el dispositivo; estable durante toda la vida de la fila |
| `serverId` | `Long?` | ID del backend; `null` mientras no exista en el servidor |
| `syncState` | `SyncState` | Estado de la fila respecto al servidor |
| `updatedAtLocal` | `Long` | Epoch millis de la última modificación local |
| `updatedAtServer` | `Long?` | `updated_at` del backend (epoch millis) |
| `deletedAt` | `Long?` | Soft delete local (epoch millis) |
| `lastError` | `String?` | Último error de sync asociado a la fila |

**Regla de push**: se envían al servidor las filas con `syncState ∈ {PENDING_CREATE, PENDING_UPDATE}`
ordenadas por `updatedAtLocal` ascendente. Las dependencias se respetan por el **orden de推 push**
(fuentes → cuentas → pagos → días → splits → transacciones), ver §7.

---

## 3. Entidades Room (esquema v2)

> **v2 (contrato API 0.3.0)**: `dias_trabajados.montoEnteros` — cada día lleva su monto en
> centavos y el `montoEnteros` del pago es **derivado** (Σ de los días). Migración
> `MIGRATION_1_2` (`ALTER TABLE dias_trabajados ADD COLUMN montoEnteros INTEGER NOT NULL DEFAULT 0`)
> registrada en `DataModule`. Los esquemas exportados están en `app/schemas/.../1.json` y `2.json`.

```kotlin
// ─────────────────────────── fuentes ───────────────────────────
@Entity(
    tableName = "fuentes",
    indices = [Index(value = ["serverId"], unique = true)]
)
data class FuenteEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val alias: String,
    val color: String,                 // "#rrggbb"
    val logoRuta: String?,             // ruta relativa servida por /uploads
    val splitAuto: Boolean,
    val splitAutoModo: String?,        // "redondeado" | "enteros" | "preciso" | null
    val createdAt: Long,
    val updatedAt: Long,
    val deletedAt: Long?,
    val syncState: SyncState,
    val updatedAtLocal: Long,
    val updatedAtServer: Long?,
    val lastError: String?,
)

// ─────────────────────────── pagos ───────────────────────────
@Entity(
    tableName = "pagos",
    foreignKeys = [ForeignKey(
        entity = FuenteEntity::class,
        parentColumns = ["localId"],
        childColumns = ["fuenteLocalId"],
        onDelete = ForeignKey.RESTRICT
    )],
    indices = [Index("fuenteLocalId"), Index("serverId", unique = true), Index("fechaPago")]
)
data class PagoEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val fuenteLocalId: String,
    val fechaPago: String,              // "YYYY-MM-DD"
    val montoEnteros: Long,             // centavos
    val metodoPago: String,             // "efectivo" | "qr" | "transaccion"
    val notas: String?,
    val imagenRuta: String?,            // comprobante
    val createdAt: Long,
    val updatedAt: Long,
    val deletedAt: Long?,
    val syncState: SyncState,
    val updatedAtLocal: Long,
    val updatedAtServer: Long?,
    val lastError: String?,
)

// ─────────────────────── días trabajados ───────────────────────
@Entity(
    tableName = "dias_trabajados",
    foreignKeys = [ForeignKey(
        entity = PagoEntity::class,
        parentColumns = ["localId"],
        childColumns = ["pagoLocalId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("pagoLocalId"), Index(value = ["pagoLocalId", "fecha"], unique = true)]
)
data class DiaTrabajadoEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val pagoLocalId: String,
    val fecha: String,                  // "YYYY-MM-DD"
    val montoEnteros: Long,             // v2: monto del día en centavos (>= 0)
    val syncState: SyncState,
    val updatedAtLocal: Long,
)

// ─────────────────────────── cuentas ───────────────────────────
@Entity(
    tableName = "cuentas",
    indices = [Index(value = ["serverId"], unique = true)]
)
data class CuentaEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val alias: String,
    val numero: String?,
    val banco: String?,
    val qrRuta: String?,
    val esGeneral: Boolean,
    val tasaBps: Long,                  // derivada: vigente del historial o 10000 - Σ otras
    val createdAt: Long,
    val updatedAt: Long,
    val deletedAt: Long?,
    val syncState: SyncState,
    val updatedAtLocal: Long,
    val updatedAtServer: Long?,
    val lastError: String?,
)

// ─────────────────────── historial de tasas ───────────────────────
@Entity(
    tableName = "historial_tasas",
    foreignKeys = [ForeignKey(
        entity = CuentaEntity::class,
        parentColumns = ["localId"],
        childColumns = ["cuentaLocalId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("cuentaLocalId")]
)
data class HistorialTasaEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val cuentaLocalId: String,
    val tasaBps: Long,
    val aplicadaDesde: Long,            // epoch millis
    val createdAt: Long,
    val syncState: SyncState,
    val updatedAtLocal: Long,
)

// ─────────────────────────── splits ───────────────────────────
@Entity(
    tableName = "splits",
    foreignKeys = [ForeignKey(
        entity = PagoEntity::class,
        parentColumns = ["localId"],
        childColumns = ["pagoLocalId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("pagoLocalId", unique = true), Index("serverId", unique = true)]
)
data class SplitEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val pagoLocalId: String,
    val modoCalculo: String,            // "redondeado" | "enteros" | "preciso"
    val totalPendiente: Long,           // cacheado del servidor
    val totalRealizado: Long,
    val createdAt: Long,
    val updatedAt: Long,
    val syncState: SyncState,
    val updatedAtLocal: Long,
    val updatedAtServer: Long?,
    val lastError: String?,
)

// ─────────────────────── transacciones ───────────────────────
@Entity(
    tableName = "transacciones",
    foreignKeys = [
        ForeignKey(SplitEntity::class, ["localId"], ["splitLocalId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(CuentaEntity::class, ["localId"], ["cuentaLocalId"], onDelete = ForeignKey.SET_NULL)
    ],
    indices = [Index("splitLocalId"), Index("cuentaLocalId"), Index("serverId", unique = true)]
)
data class TransaccionEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val splitLocalId: String,
    val cuentaLocalId: String?,         // null si la cuenta fue eliminada
    val montoEnteros: Long,
    val tasaBps: Long,                  // snapshot congelado
    val aliasSnapshot: String,          // snapshot congelado
    val realizado: Boolean,
    val fechaRealizacion: Long?,        // epoch millis
    val createdAt: Long,
    val updatedAt: Long,
    val syncState: SyncState,
    val updatedAtLocal: Long,
    val lastError: String?,
)

// ─────────────────────── settings (clave/valor) ───────────────────────
@Entity(tableName = "app_settings")
data class AppSettingEntity(
    @PrimaryKey val clave: String,      // "split_modo_default"
    val valor: String,
    val updatedAt: Long,
    val syncState: SyncState,
)

// ─────────────────────── cola de pendientes ───────────────────────
@Entity(
    tableName = "pending_operations",
    indices = [Index("entityType"), Index("nextAttemptAt")]
)
data class PendingOperationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val entityType: String,             // "pago" | "dia" | "fuente" | "cuenta" | "tasa" | "split" | "transaccion" | "comprobante" | "logo" | "qr" | "settings"
    val entityLocalId: String,          // "" para operaciones globales
    val operacion: String,              // "UPSERT" | "DELETE" | "UPLOAD" | "SET_RATE" | "RECALC" | "REALIZE"
    val payloadJson: String?,           // datos de la petición (p. ej. {"tasa":20.5,"aplicar_pendientes":false})
    val serverId: Long?,                // id del servidor cuando ya existe
    val intentos: Int = 0,
    val ultimoError: String?,
    val createdAt: Long,
    val nextAttemptAt: Long
)

// ─────────────────────── metadatos de sync ───────────────────────
@Entity(tableName = "sync_state")
data class SyncStateEntity(
    @PrimaryKey val id: Int = 1,       // singleton
    val ultimoSyncOk: Long?,
    val ultimoIntento: Long?,
    val ultimoError: String?,
    val pendientes: Int = 0
)
```

### 3.1 Relaciones Room

```kotlin
// data/local/relation/*.kt
data class PagoConDetalle(
    @Embedded val pago: PagoEntity,
    @Relation(parentColumn = "fuenteLocalId", entityColumn = "localId") val fuente: FuenteEntity?,
    @Relation(parentColumn = "localId", entityColumn = "pagoLocalId") val dias: List<DiaTrabajadoEntity>,
    @Relation(parentColumn = "localId", entityColumn = "pagoLocalId") val split: SplitEntity?
)

data class SplitConTransacciones(
    @Embedded val split: SplitEntity,
    @Relation(parentColumn = "localId", entityColumn = "splitLocalId") val transacciones: List<TransaccionEntity>
)

data class CuentaConHistorial(
    @Embedded val cuenta: CuentaEntity,
    @Relation(parentColumn = "localId", entityColumn = "cuentaLocalId") val historial: List<HistorialTasaEntity>
)
```

---

## 4. DAOs previstos

| DAO | Observables (Flow) | Escrituras | Notas |
|---|---|---|---|
| `FuenteDao` | `observeActivas()`, `observePorId(localId)` | `upsert`, `upsertAll`, `marcarSincronizado`, `softDelete`, `pendientes()` | |
| `PagoDao` | `observePagos(filtros, limit, offset)`, `observePorId`, `observeTodosLosDias()` | `upsert`, `upsertAll`, `marcarSincronizado`, `marcarEliminado`, `pendientes()` | Filtros: fecha, fuente, método; paginación `limit/offset`; `contarPagos(filtros)` para el total |
| `DiaTrabajadoDao` | `observePorPago(pagoLocalId)` | `upsertAll`, `reemplazarDias`, `borrarPorPago` | `reemplazarDias` es atómica |
| `CuentaDao` | `observeActivas()`, `observeGeneral()` | `upsert`, `upsertAll`, `softDelete` | |
| `HistorialTasaDao` | `observePorCuenta(cuentaLocalId)` | `insert`, `tasaVigente(cuentaLocalId)` | vigente = `aplicadaDesde DESC, id DESC` |
| `SplitDao` | `observePorPago`, `observeTodos` | `upsert`, `reemplazarTransacciones` | 1 split por pago (índice único); `getPorPago(pagoLocalId)` para la comprobación local (BR-030) |
| `TransaccionDao` | `observePorSplit`, `pendientes()` | `upsertAll`, `marcarRealizada`, `replacePorSplit` | `contarTransaccionesRealizadas(pagoLocalId)` replica `HasTransaccionesRealizadas` (BR-005) |
| `SettingDao` | `observeModoDefault()` | `upsert` | |
| `PendingOperationDao` | `pendientes()` | `encolar`, `completar`, `actualizarIntento` | orden por `createdAt` |
| `SyncStateDao` | `observe()` | `upsert` | singleton |

### 4.1 Frontera transaccional

Las escrituras offline-first (fila + operación en la cola) deben ser **atómicas**. Para poder
testear los repositorios en la JVM (sin Android), esa frontera se abstrae:

```kotlin
// data/local/TransactionRunner.kt
interface TransactionRunner {
    suspend fun <R> run(block: suspend () -> R): R
}

class RoomTransactionRunner @Inject constructor(private val db: AbysDatabase) : TransactionRunner {
    override suspend fun <R> run(block: suspend () -> R): R = db.withTransaction { block() }
}
```

En producción se inyecta `RoomTransactionRunner` (Hilt); en los tests, un doble que ejecuta el
bloque directamente (`app/src/test/.../data/repository/*Test.kt`).

Consultas clave:

```kotlin
// PagoDao
@Query("""
  SELECT p.* FROM pagos p
  JOIN fuentes f ON f.localId = p.fuenteLocalId
  WHERE p.deletedAt IS NULL
    AND (:fechaInicio IS NULL OR p.fechaPago >= :fechaInicio)
    AND (:fechaFin IS NULL OR p.fechaPago <= :fechaFin)
    AND (:fuenteLocalId IS NULL OR p.fuenteLocalId = :fuenteLocalId)
    AND (:metodoPago IS NULL OR p.metodoPago = :metodoPago)
  ORDER BY p.fechaPago DESC, p.serverId DESC
""")
fun observePaginados(...): Flow<List<PagoEntity>>
```

---

## 5. Capa de dominio (modelos de negocio)

Los modelos de `domain` **no** llevan metadatos de sync; son la vista "limpia" que consume la UI.

```kotlin
// domain/model/*
data class Fuente(val id: Long?, val localId: String, val alias: String, val color: String,
                 val logoRuta: String?, val splitAuto: Boolean, val splitAutoModo: ModoCalculo?,
                 val syncState: SyncState)

data class Pago(val id: Long?, val localId: String, val fuente: Fuente, val fechaPago: LocalDate,
                val monto: Money, val metodoPago: MetodoPago, val notas: String?,
                val diasTrabajados: List<LocalDate>, val splitId: Long?, val splitModo: ModoCalculo?,
                val syncState: SyncState)

data class Cuenta(val id: Long?, val localId: String, val alias: String, val numero: String?,
                  val banco: String?, val qrRuta: String?, val esGeneral: Boolean,
                  val tasa: Percent, val syncState: SyncState)

data class Split(val id: Long?, val localId: String, val pagoLocalId: String, val modo: ModoCalculo,
                val transacciones: List<Transaccion>, val totalPendiente: Money,
                val totalRealizado: Money, val syncState: SyncState)

data class Transaccion(val id: Long?, val localId: String, val cuentaAlias: String, val monto: Money,
                       val tasa: Percent, val realizado: Boolean, val fechaRealizacion: Instant?)
```

Value objects (evitan magia numérica):

```kotlin
@JvmInline value class Money(val centavos: Long)          // 26500 → 265,00 Bs
@JvmInline value class Percent(val bps: Long)             // 2000 → 20 %
enum class MetodoPago { EFECTIVO, QR, TRANSACCION }
enum class ModoCalculo { REDONDEADO, ENTEROS, PRECISO }
```

---

## 6. Cálculo de splits replicado en Kotlin (dominio puro)

Se replica `internal/splitcalc/splitcalc.go` para permitir el preview offline **sin** red.
Es una traducción 1:1 (mismo redondeo, mismo residuo, mismos errores):

```kotlin
object SplitCalculator {
    fun calcular(montoCents: Long, tasas: List<TasaCuenta>, modo: ModoCalculo): Result<List<TransaccionCalculada>>
    fun recalcular(montoCents: Long, modo: ModoCalculo, txns: List<TransaccionRecalculo>,
                   tasasVigentes: Map<Long, Long>): Result<ResultadoRecalculo>
}

private fun rawCents(monto: Long, tasaBps: Long): Long = monto * tasaBps / 10000   // trunca
private fun aplicarModo(raw: Long, modo: ModoCalculo): Long = when (modo) {
    ModoCalculo.REDONDEADO -> ((raw + 50) / 100) * 100     // half-up al Bs
    ModoCalculo.ENTEROS    -> (raw / 100) * 100            // trunca al Bs
    ModoCalculo.PRECISO    -> raw                          // centavos exactos
}
```

Reglas que **debe** respetar (idénticas al backend):

- `General` = `monto − Σ(no-General)`; nunca negativo (si lo es → error "las cuotas superan el monto del pago").
- Σ transacciones = monto del pago, **siempre** (invariante monitoring).
- Recálculo: realizadas **congeladas**; pendientes recalculadas con tasas vigentes; el remanente
  `monto − Σ(realizadas)` se reparte; si no alcanza → `IMMUTABLE_DATA` (422).
- Una cuenta sin tasa vigente → `BUSINESS_RULE_CONFLICT` (409).

> **Tests de paridad**: los casos de `Abys/backend/internal/splitcalc/splitcalc_test.go` se replican
> como tests unitarios Kotlin (`app/src/test/.../SplitCalculatorTest.kt`) para garantizar que el
> cálculo offline coincide byte a byte con el del servidor.

---

## 7. Algoritmo de sincronización

### 7.1 Disparadores (WorkManager)

| Worker | Periodicidad | Trigger | Responsabilidad |
|---|---|---|---|
| `SyncPushWorker` | — | `NetworkType.CONNECTED` + enqueue manual | **Push**: cola de pendientes → servidor |
| `SyncPullWorker` | 15 min (mínimo) | `NetworkType.CONNECTED` + al abrir app | **Pull**: servidor → Room (refresh) |
| `SyncAllWorker` | 30 min | `NetworkType.CONNECTED` | push + pull + limpieza de huérfanos |

- Restricción de red: `Constraints(NetworkType.CONNECTED)`.
- Reintentos: `Result.retry()` con backoff exponencial (`BackoffPolicy.EXPONENTIAL`, 30 s → máx. 5 h).
- Sync manual: botón "Sincronizar ahora" en Ajustes → `OneTimeWorkRequest` con `ExistingWorkPolicy.REPLACE`.

### 7.2 Push (Room → servidor), por tipo de operación

| Operación | Endpoint | Notas |
|---|---|---|
| Crear fuente | `POST /fuentes` | Guarda `serverId` devuelto |
| Actualizar fuente | `PUT /fuentes/{id}` | Respuesta `{id, actualizado}` |
| Eliminar fuente | `DELETE /fuentes/{id}` | |
| Subir logo | `POST /fuentes/{id}/logo` (multipart `archivo`) | Requiere archivo local pendiente |
| Crear cuenta | `POST /cuentas` | |
| Actualizar cuenta | `PUT /cuentas/{id}` | |
| Eliminar cuenta | `DELETE /cuentas/{id}` | |
| QR | `POST/DELETE /cuentas/{id}/qr` | Multipart |
| Cambiar tasa | `PUT /cuentas/{id}/tasa` `{tasa, aplicar_pendientes}` | El backend registra el historial |
| Crear pago | `POST /pagos` | Días como `{fecha, monto_enteros}` en el mismo body; **se omite el total** (derivado, R3.2) |
| Actualizar pago | `PUT /pagos/{id}` | Enviar `dias_trabajados` (con monto) solo si cambiaron; total omitido |
| Eliminar pago | `DELETE /pagos/{id}` | 409 si hay realizadas → la fila queda `FAILED` con el mensaje |
| Añadir/quitar día | `POST /pagos/{id}/dias`, `DELETE /pagos/{id}/dias/{diaId}` | Solo para pagos ya en servidor |
| Comprobante | `POST /pagos/{id}/comprobante` (multipart `archivo`) | |
| Crear split | `POST /splits` | Tras el push, **se reemplaza** el split local por el del servidor |
| Recalcular split | `PUT /splits/{id}` | |
| Eliminar split | `DELETE /splits/{id}` | 409 si hay realizadas |
| Marcar realizada | `PUT /transacciones/{id}/realizar` | Irreversible: al fallar, la UI avisa. La operación se encola por el `localId` de la transacción: en el push se resuelve su `serverId` (puede no existir todavía → reintento tras subir el split) |
| Modo por defecto | `PUT /settings/split` | |

**Orden de push** (respeta dependencias): `fuentes → cuentas → pagos → días → splits → transacciones → settings`.

**Respuesta del servidor como autoridad**: tras `POST /splits` o `PUT /splits/:id`, las
transacciones devueltas por el servidor **reemplazan** a las locales (`SplitTransactionsSync`),
conservando el `localId` de las filas que ya existían. Así:
- no se duplican transacciones,
- las operaciones encoladas por `localId` (p. ej. "marcar como realizada") siguen resolviendo a
  la misma fila,
- una realización marcada **en local** no se deshace (gana el cambio local).

**Idempotencia**: cada operación lleva `serverId` cuando ya existe; las operaciones de tipo
`PENDING_CREATE` se reintentan con el mismo payload. Si el servidor responde `404` al actualizar,
se degrada a `PENDING_CREATE` (la fila se recrea). Si responde `409`/`422`, la operación queda
`FAILED` y **no se reintenta automáticamente** (requiere decisión del usuario; ver §9).

### 7.3 Pull (servidor → Room)

Orden de refresco: `fuentes → cuentas (+historial) → pagos (+días) → splits (+transacciones) → settings`.
El dashboard **no** se persiste: se calcula **localmente** sobre Room con la semántica v0.3.0
(`DashboardDao`: `observeTotalDias`, `observeTotalHistorico`, `observeFilasPorDiaFuente`,
`observeHistorial`) — todo agrupado por `dias_trabajados.fecha`, montos de
`dias_trabajados.montoEnteros`, `por_fuente` con fuentes soft-deleted — de modo que funciona
offline. El endpoint `GET /dashboard/summary` (sin parámetros) se usa para **contrastar** el
total de los últimos 30 días local con el del servidor (`DashboardRepository.consultarServidor`):
si el servidor tiene más, la UI avisa de que faltan datos y se encola una sincronización completa.

**Identidad de la reconciliación**: la fila local y la remota se emparejan por **`serverId`**
(nunca por `localId`, porque una fila creada en el dispositivo tiene UUID y la descargada del
servidor `srv-<id>`). Si no se emparejasen por `serverId`, el pull insertaría una fila duplicada
y chocaría con el índice único `serverId`.

Reconciliación pull:

| Situación | Acción |
|---|---|
| Fila local `SYNCED` y el servidor trae cambios (`updated_at` > `updatedAtServer`) | Sobrescribir local (conservando su `localId`), `syncState = SYNCED` |
| Fila local `PENDING_*` | **No** sobrescribir (el cambio local gana); se encola el pull después del push |
| Fila en el servidor que no existe local | Insertar (`SYNCED`) |
| Fila local `SYNCED` que ya no está en el servidor | Soft delete local (`deletedAt`) |
| Fila local `PENDING_DELETE` confirmada por el servidor | Marcar `SYNCED` + `deletedAt` |
| Transacciones del split | Se reemplazan por las del servidor conservando el `localId` (§7.2) |

> El borrado lógico por ausencia solo se aplica cuando la respuesta del servidor cubrió **todos**
> los registros (`meta.total <= tamaño de la respuesta`); si la paginación quedó incompleta, no se
> marca nada como eliminado (se registra un aviso en el log).

### 7.4 Cola de pendientes (`pending_operations`)

- Cada mutación local escribe **en la misma transacción Room** la fila afectada (`syncState`) y la
  operación en `pending_operations`. Escritura atómica: nunca queda una fila modificada sin operación.
- El worker procesa las operaciones **en orden** (`createdAt ASC`), parando en el primer fallo
  reintentable (para no romper dependencias).
- Backoff por operación: `nextAttemptAt = now + 2^intentos × 30 s`, tope 5 h.
- `intentos >= 5` → `FAILED` (la UI muestra el badge de error con el mensaje del backend).

---

## 8. Reglas de negocio codificadas en la app

| Regla | Dónde | Comportamiento |
|---|---|---|
| BR-001 pago ≥ 1 día | `ValidarPagoUseCase` + servidor | No se permite guardar sin días |
| BR-002 mínimo 1 día al quitar | UI + `400` del servidor | Botón deshabilitado con el último día |
| BR-005 pago con realizadas no se elimina | `EliminarPagoUseCase` | Confirmación con advertencia + `409` |
| BR-006 monto ≥ 0, fecha válida | `ValidarPagoUseCase` | Inline errors antes de red |
| BR-007 métodos fijos | `enum MetodoPago` | Solo 3 opciones en el selector |
| BR-010 fecha única por pago | UI + `UNIQUE` local | No se puede añadir 2 veces la misma fecha |
| BR-013 transacción de 0 Bs | UI | Warning visual (no bloqueante) |
| BR-021–022 realizadas inmutables | UI + `422` | Monto/tasa de realizadas no editables; recalcular solo pendientes |
| BR-040 General derivada | `CuentaEntity.tasaBps` | Se muestra como `100 % − Σ otras`, no editable |
| BR-041 Σ tasas ≤ 100 % | `CambiarTasaUseCase` | Validación previa + `409` del servidor |
| BR-050 cada cambio de tasa genera historial | `PUT /cuentas/{id}/tasa` | El historial se relee tras el push |
| BR-051 aplicar a pendientes | `aplicar_pendientes` | Flag explícito en la UI (switch) |
| BR-081 Σ transacciones = monto del pago | `SplitCalculator` + test | Invariante local verificada antes de guardar |
| BR-084 soft delete | `deletedAt` en todas las entidades | Nada se borra físicamente |

---

## 9. Conflictos y decisiones del usuario

| Conflicto | Detección | Resolución |
|---|---|---|
| El servidor cambió una fila que local está `PENDING_UPDATE` | `updatedAtServer` > `updatedAtLocal` y `syncState != SYNCED` | **Gana el local**: se reenvía el cambio local (última escritura del usuario). Se registra en `lastError`/log para trazabilidad |
| El servidor rechaza la operación local (`409`/`422`) | Push | La fila queda `FAILED`; la UI muestra el mensaje literal del backend y ofrece **"Descartar cambio local"** (revierte al estado del servidor) |
| El servidor eliminó una fila que local modificó | Pull con `deletedAt` remoto | Se conserva el cambio local y se reintenta el push; si el servidor responde `404`, se marca `FAILED` |
| Transacción marcada "realizada" offline mientras el servidor la recalculó | Pull detecta `monto` distinto con `realizado=true` | Gana el servidor en el monto (BR-021: las realizadas son inmutables); la app marca la fila `FAILED` pidiendo revisión |
| Cambio de tasa que invalida splits locales | `CambiarTasaUseCase` | Se recalcula localmente con el mismo algoritmo y se marca `aplicar_pendientes` |

---

## 10. Migraciones Room

- Versión inicial: **1** (esquema completo de §3).
- `exportSchema = true` en el builder → los esquemas se versionan en `app/schemas/`.
- Migraciones futuras: `Migration(n, n+1)` explícita + `fallbackToDestructiveMigration` **desactivado**
  (el histórico es datos de negocio; no se puede perder).
- Regla: toda columna `syncState`/`updatedAtLocal` se añade con `DEFAULT` para poder migrar sin reescribir.
