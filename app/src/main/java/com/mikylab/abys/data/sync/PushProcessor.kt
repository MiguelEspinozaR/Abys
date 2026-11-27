package com.mikylab.abys.data.sync

import com.mikylab.abys.core.result.AppError
import com.mikylab.abys.data.local.dao.CuentaDao
import com.mikylab.abys.data.local.dao.FuenteDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.data.local.dao.PendingOperationDao
import com.mikylab.abys.data.local.dao.SettingDao
import com.mikylab.abys.data.local.dao.SplitDao
import com.mikylab.abys.data.local.dao.SyncStateDao
import com.mikylab.abys.data.local.entity.PendingOperationEntity
import com.mikylab.abys.data.remote.AbysApi
import com.mikylab.abys.data.remote.AbysApiProvider
import com.mikylab.abys.data.remote.dto.ActualizarPagoRequest
import com.mikylab.abys.data.remote.dto.CambiarTasaRequest
import com.mikylab.abys.data.remote.dto.CrearCuentaRequest
import com.mikylab.abys.data.remote.dto.CrearFuenteRequest
import com.mikylab.abys.data.remote.dto.CrearPagoRequest
import com.mikylab.abys.data.remote.dto.DiaInputRequest
import com.mikylab.abys.data.remote.dto.GenerarSplitRequest
import com.mikylab.abys.data.remote.dto.RegistrarSettingsRequest
import com.mikylab.abys.data.remote.dto.SplitSettingsRequest
import com.mikylab.abys.domain.model.SettingsKeys
import com.mikylab.abys.domain.model.SyncState
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Procesa la **cola de pendientes**: envía al backend las operaciones pendientes de Room.
 *
 * Cada operación se ejecuta en orden (`createdAt ASC`); ante un error reintentable (sin red,
 * 5xx) se detiene la cola y se reintenta más tarde con backoff exponencial.
 * Ante un error terminal (400/404/409/422) la fila queda en `FAILED` y la UI pide decisión
 * al usuario (ver `docs/data-model.md` §9).
 */
@Singleton
class PushProcessor @Inject constructor(
    private val apiProvider: AbysApiProvider,
    private val fuenteDao: FuenteDao,
    private val pagoDao: PagoDao,
    private val cuentaDao: CuentaDao,
    private val splitDao: SplitDao,
    private val settingDao: SettingDao,
    private val pendingDao: PendingOperationDao,
    private val syncStateDao: SyncStateDao,
    private val splitTransactionsSync: SplitTransactionsSync,
) {

    private sealed interface OpResult {
        data object Done : OpResult
        data class Retry(val mensaje: String) : OpResult
        data class Fatal(val mensaje: String) : OpResult
    }

    suspend fun push(): SyncOutcome {
        val api = try {
            apiProvider.api()
        } catch (e: IllegalArgumentException) {
            // URL del backend inválida: no es reintentable hasta que el usuario la corrija.
            registrarEstado(error = "URL del backend inválida: ${e.message}")
            return SyncOutcome.FATAL
        } catch (e: Throwable) {
            registrarEstado(error = e.message ?: "No se pudo preparar el cliente HTTP")
            return SyncOutcome.RETRY
        }
        val ahora = System.currentTimeMillis()
        val operaciones = pendingDao.pendientes(ahora)

        for (op in operaciones) {
            when (val resultado = ejecutar(api, op)) {
                is OpResult.Done -> pendingDao.completar(op.id)
                is OpResult.Retry -> {
                    val siguiente = ahora + Operations.backoffMillis(op.intentos)
                    pendingDao.registrarIntento(op.id, resultado.mensaje, siguiente)
                    registrarEstado(error = resultado.mensaje)
                    return SyncOutcome.RETRY
                }
                is OpResult.Fatal -> {
                    pendingDao.registrarIntento(op.id, resultado.mensaje, ahora + Operations.backoffMillis(op.intentos))
                    marcarErrorEnEntidad(op, resultado.mensaje)
                    pendingDao.completar(op.id)
                }
            }
        }
        registrarEstado(error = null)
        return SyncOutcome.OK
    }

    // ── Despacho por tipo de operación ──────────────────────────────────────

    private suspend fun ejecutar(api: AbysApi, op: PendingOperationEntity): OpResult = when (op.entityType) {
        Operations.TIPO_FUENTE -> ejecutarFuente(api, op)
        Operations.TIPO_CUENTA -> ejecutarCuenta(api, op)
        Operations.TIPO_PAGO -> ejecutarPago(api, op)
        Operations.TIPO_SPLIT -> ejecutarSplit(api, op)
        Operations.TIPO_TRANSACCION -> ejecutarTransaccion(api, op)
        Operations.TIPO_SETTINGS -> ejecutarSettings(api, op)
        else -> OpResult.Fatal("Operación desconocida: ${op.entityType}")
    }

    private suspend fun ejecutarFuente(api: AbysApi, op: PendingOperationEntity): OpResult {
        val fuente = fuenteDao.getPorId(op.entityLocalId)
            ?: return OpResult.Done // la fila ya no existe: nada que enviar

        return when (op.operacion) {
            Operations.OP_DELETE -> {
                val serverId = fuente.serverId
                    ?: return OpResult.Done.also { fuenteDao.marcarSincronizado(fuente.localId, SyncState.SYNCED, null, null, null) }
                when (val res = call { api.eliminarFuente(serverId) }) {
                    is CallResult.Error -> classify(res.error)
                    is CallResult.Ok -> {
                        fuenteDao.marcarSincronizado(fuente.localId, SyncState.SYNCED, serverId, null, null)
                        OpResult.Done
                    }
                }
            }

            Operations.OP_UPLOAD -> {
                val serverId = fuente.serverId ?: return OpResult.Retry("La fuente aún no existe en el servidor")
                val archivo = op.payloadJson?.let { leerPayload(it) } ?: return OpResult.Fatal("Archivo no encontrado")
                val part = archivoPart(archivo) ?: return OpResult.Fatal("Archivo no encontrado: $archivo")
                when (val res = call { api.subirLogo(serverId, part) }) {
                    is CallResult.Error -> classify(res.error)
                    is CallResult.Ok -> {
                        val ruta = res.value.data?.logoRuta
                        fuenteDao.upsert(fuente.copy(logoRuta = ruta, syncState = SyncState.SYNCED))
                        OpResult.Done
                    }
                }
            }

            Operations.OP_DELETE_LOGO -> {
                val serverId = fuente.serverId
                if (serverId == null) {
                    fuenteDao.upsert(fuente.copy(logoRuta = null, syncState = SyncState.SYNCED))
                    return OpResult.Done
                }
                when (val res = call { api.eliminarLogo(serverId) }) {
                    is CallResult.Error -> classify(res.error)
                    is CallResult.Ok -> {
                        fuenteDao.upsert(fuente.copy(logoRuta = null, syncState = SyncState.SYNCED))
                        OpResult.Done
                    }
                }
            }

            else -> {
                val body = CrearFuenteRequest(
                    alias = fuente.alias,
                    color = fuente.color.ifBlank { "#3b82f6" }, // quirk Q2: siempre enviar color
                    // Solo rutas del servidor: un archivo local aún pendiente de subir no debe
                    // viajar como `logo_ruta`.
                    logoRuta = fuente.logoRuta?.takeIf {
                        it.startsWith("/uploads/") || it.startsWith("http://") || it.startsWith("https://")
                    },
                    splitAuto = fuente.splitAuto,
                    splitAutoModo = fuente.splitAutoModo,
                )
                if (fuente.serverId == null) {
                    when (val res = call { api.crearFuente(body) }) {
                        is CallResult.Error -> classify(res.error)
                        is CallResult.Ok -> {
                            val dto = res.value.data
                            if (dto != null) {
                                fuenteDao.upsert(
                                    fuente.copy(
                                        serverId = dto.id,
                                        alias = dto.alias,
                                        color = dto.color,
                                        logoRuta = dto.logoRuta ?: fuente.logoRuta,
                                        splitAuto = dto.splitAuto,
                                        splitAutoModo = dto.splitAutoModo,
                                        syncState = SyncState.SYNCED,
                                        updatedAtServer = System.currentTimeMillis(),
                                        lastError = null,
                                    ),
                                )
                            }
                            OpResult.Done
                        }
                    }
                } else {
                    when (val res = call { api.actualizarFuente(fuente.serverId, body) }) {
                        is CallResult.Error -> classify(res.error)
                        is CallResult.Ok -> {
                            fuenteDao.marcarSincronizado(
                                fuente.localId, SyncState.SYNCED, fuente.serverId,
                                System.currentTimeMillis(), null,
                            )
                            OpResult.Done
                        }
                    }
                }
            }
        }
    }

    private suspend fun ejecutarCuenta(api: AbysApi, op: PendingOperationEntity): OpResult {
        val cuenta = cuentaDao.getPorId(op.entityLocalId)
            ?: return OpResult.Done

        return when (op.operacion) {
            Operations.OP_DELETE -> {
                val serverId = cuenta.serverId
                    ?: return OpResult.Done.also { cuentaDao.marcarSincronizado(cuenta.localId, SyncState.SYNCED, null, null, null, null, null) }
                when (val res = call { api.eliminarCuenta(serverId) }) {
                    is CallResult.Error -> classify(res.error)
                    is CallResult.Ok -> {
                        cuentaDao.marcarSincronizado(cuenta.localId, SyncState.SYNCED, serverId, null, null, null, null)
                        OpResult.Done
                    }
                }
            }

            Operations.OP_UPLOAD -> {
                val serverId = cuenta.serverId ?: return OpResult.Retry("La cuenta aún no existe en el servidor")
                val archivo = op.payloadJson?.let { leerPayload(it) } ?: return OpResult.Fatal("Archivo no encontrado")
                val part = archivoPart(archivo) ?: return OpResult.Fatal("Archivo no encontrado: $archivo")
                when (val res = call { api.subirQr(serverId, part) }) {
                    is CallResult.Error -> classify(res.error)
                    is CallResult.Ok -> {
                        val ruta = res.value.data?.qrRuta
                        cuentaDao.upsert(cuenta.copy(qrRuta = ruta, syncState = SyncState.SYNCED))
                        OpResult.Done
                    }
                }
            }

            Operations.OP_DELETE_QR -> {
                val serverId = cuenta.serverId
                if (serverId == null) {
                    cuentaDao.upsert(cuenta.copy(qrRuta = null, syncState = SyncState.SYNCED))
                    return OpResult.Done
                }
                when (val res = call { api.eliminarQr(serverId) }) {
                    is CallResult.Error -> classify(res.error)
                    is CallResult.Ok -> {
                        cuentaDao.upsert(cuenta.copy(qrRuta = null, syncState = SyncState.SYNCED))
                        OpResult.Done
                    }
                }
            }

            Operations.OP_SET_RATE -> {
                val serverId = cuenta.serverId ?: return OpResult.Retry("La cuenta aún no existe en el servidor")
                val payload = op.payloadJson?.let { leerPayloadJson(it) }
                val tasa = payload?.get(Operations.PAYLOAD_TASA)?.jsonPrimitive?.doubleOrNull ?: 0.0
                val aplicar = payload?.get(Operations.PAYLOAD_APLICAR)?.jsonPrimitive?.booleanOrNull ?: false
                when (val res = call { api.cambiarTasa(serverId, CambiarTasaRequest(tasa, aplicar)) }) {
                    is CallResult.Error -> classify(res.error)
                    is CallResult.Ok -> {
                        val bps = res.value.data?.tasaBps
                        if (bps != null) {
                            cuentaDao.upsert(cuenta.copy(tasaBps = bps, syncState = SyncState.SYNCED, lastError = null))
                        } else {
                            cuentaDao.marcarSincronizado(cuenta.localId, SyncState.SYNCED, serverId, null, null)
                        }
                        OpResult.Done
                    }
                }
            }

            else -> {
                val body = CrearCuentaRequest(
                    alias = cuenta.alias,
                    numero = cuenta.numero,
                    banco = cuenta.banco,
                )
                if (cuenta.serverId == null) {
                    when (val res = call { api.crearCuenta(body) }) {
                        is CallResult.Error -> classify(res.error)
                        is CallResult.Ok -> {
                            val dto = res.value.data
                            if (dto != null) {
                                cuentaDao.upsert(
                                    cuenta.copy(
                                        serverId = dto.id,
                                        alias = dto.alias,
                                        numero = dto.numero,
                                        banco = dto.banco,
                                        qrRuta = dto.qrRuta ?: cuenta.qrRuta,
                                        tasaBps = dto.tasaBps,
                                        syncState = SyncState.SYNCED,
                                        updatedAtServer = System.currentTimeMillis(),
                                        lastError = null,
                                    ),
                                )
                            }
                            OpResult.Done
                        }
                    }
                } else {
                    when (val res = call { api.actualizarCuenta(cuenta.serverId, body) }) {
                        is CallResult.Error -> classify(res.error)
                        is CallResult.Ok -> {
                            val dto = res.value.data
                            cuentaDao.upsert(
                                cuenta.copy(
                                    alias = dto?.alias ?: cuenta.alias,
                                    numero = dto?.numero,
                                    banco = dto?.banco,
                                    tasaBps = dto?.tasaBps ?: cuenta.tasaBps,
                                    syncState = SyncState.SYNCED,
                                    updatedAtServer = System.currentTimeMillis(),
                                    lastError = null,
                                ),
                            )
                            OpResult.Done
                        }
                    }
                }
            }
        }
    }

    private suspend fun ejecutarPago(api: AbysApi, op: PendingOperationEntity): OpResult {
        val pago = pagoDao.getPorId(op.entityLocalId) ?: return OpResult.Done

        return when (op.operacion) {
            Operations.OP_DELETE -> {
                val serverId = pago.serverId
                    ?: return OpResult.Done.also { pagoDao.marcarSincronizado(pago.localId, SyncState.SYNCED, null, null, null) }
                when (val res = call { api.eliminarPago(serverId) }) {
                    is CallResult.Error -> classify(res.error)
                    is CallResult.Ok -> {
                        // El servidor hace soft delete: los días quedan huérfanos y se limpian.
                        pagoDao.borrarDiasDe(pago.localId)
                        pagoDao.marcarSincronizado(pago.localId, SyncState.SYNCED, serverId, null, null)
                        OpResult.Done
                    }
                }
            }

            Operations.OP_UPLOAD -> {
                val serverId = pago.serverId ?: return OpResult.Retry("El pago aún no existe en el servidor")
                val archivo = op.payloadJson?.let { leerPayload(it) } ?: return OpResult.Fatal("Archivo no encontrado")
                val part = archivoPart(archivo) ?: return OpResult.Fatal("Archivo no encontrado: $archivo")
                when (val res = call { api.subirComprobante(serverId, part) }) {
                    is CallResult.Error -> classify(res.error)
                    is CallResult.Ok -> {
                        val ruta = res.value.data?.imagenRuta
                        if (ruta != null) {
                            pagoDao.upsert(pago.copy(imagenRuta = ruta, syncState = SyncState.SYNCED))
                        }
                        OpResult.Done
                    }
                }
            }

            else -> {
                val dias = pagoDao.getDias(pago.localId)
                // La fuente debe existir en el servidor antes que el pago (orden de push).
                val fuente = fuenteDao.getPorId(pago.fuenteLocalId)
                val fuenteServerId = fuente?.serverId
                    ?: return OpResult.Retry("La fuente del pago aún no existe en el servidor")
                // v0.3.0: los días llevan su monto y el total es **derivado** (Σ días);
                // se omite `monto_enteros` para evitar el 422 TOTAL_DESINCRONIZADO (R3.2).
                val diasInput = dias.map { DiaInputRequest(it.fecha, it.montoEnteros) }
                val body = CrearPagoRequest(
                    fuenteId = fuenteServerId,
                    fechaPago = pago.fechaPago,
                    montoEnteros = null,
                    metodoPago = pago.metodoPago,
                    notas = pago.notas,
                    diasTrabajados = diasInput,
                )
                if (pago.serverId == null) {
                    when (val res = call { api.crearPago(body) }) {
                        is CallResult.Error -> classify(res.error)
                        is CallResult.Ok -> {
                            val dto = res.value.data
                            pagoDao.upsert(
                                pago.copy(
                                    serverId = dto.id,
                                    fechaPago = dto.fechaPago,
                                    montoEnteros = dto.montoEnteros,
                                    metodoPago = dto.metodoPago,
                                    notas = dto.notas,
                                    imagenRuta = dto.imagenRuta ?: pago.imagenRuta,
                                    syncState = SyncState.SYNCED,
                                    updatedAtServer = System.currentTimeMillis(),
                                    lastError = null,
                                ),
                            )
                            // Días con ids y montos del servidor
                            sincronizarDiasLocales(pago.localId, dto.diasTrabajados)
                            OpResult.Done
                        }
                    }
                } else {
                    val bodyUpdate = ActualizarPagoRequest(
                        fuenteId = fuenteServerId,
                        fechaPago = pago.fechaPago,
                        montoEnteros = null,
                        metodoPago = pago.metodoPago,
                        notas = pago.notas,
                        diasTrabajados = diasInput.ifEmpty { null },
                    )
                    when (val res = call { api.actualizarPago(pago.serverId, bodyUpdate) }) {
                        is CallResult.Error -> classify(res.error)
                        is CallResult.Ok -> {
                            val dto = res.value.data
                                ?: return OpResult.Retry("Respuesta vacía del servidor")
                            pagoDao.upsert(
                                pago.copy(
                                    serverId = dto.id,
                                    fechaPago = dto.fechaPago,
                                    montoEnteros = dto.montoEnteros,
                                    metodoPago = dto.metodoPago,
                                    notas = dto.notas,
                                    imagenRuta = dto.imagenRuta ?: pago.imagenRuta,
                                    syncState = SyncState.SYNCED,
                                    updatedAtServer = System.currentTimeMillis(),
                                    lastError = null,
                                ),
                            )
                            // El backend reemplaza los días: se sincronizan ids y montos.
                            sincronizarDiasLocales(pago.localId, dto.diasTrabajados)
                            OpResult.Done
                        }
                    }
                }
            }
        }
    }

    /** Aplica ids y montos de los días del servidor a las filas locales (por fecha). */
    private suspend fun sincronizarDiasLocales(
        pagoLocalId: String,
        diasServidor: List<com.mikylab.abys.data.remote.dto.DiaTrabajadoDto>,
    ) {
        val datosPorFecha = diasServidor.associateBy { it.fecha }
        pagoDao.getDias(pagoLocalId).forEach { dia ->
            val delServidor = datosPorFecha[dia.fecha] ?: return@forEach
            pagoDao.upsertDia(
                dia.copy(
                    serverId = delServidor.id,
                    montoEnteros = delServidor.montoEnteros,
                    syncState = SyncState.SYNCED,
                    updatedAtLocal = System.currentTimeMillis(),
                ),
            )
        }
    }

    private suspend fun ejecutarSplit(api: AbysApi, op: PendingOperationEntity): OpResult {
        val split = splitDao.getPorId(op.entityLocalId) ?: return OpResult.Done

        return when (op.operacion) {
            Operations.OP_DELETE -> {
                val serverId = split.serverId
                    ?: return OpResult.Done.also { splitDao.borrar(split.localId) }
                when (val res = call { api.eliminarSplit(serverId) }) {
                    is CallResult.Error -> classify(res.error)
                    is CallResult.Ok -> {
                        splitDao.borrar(split.localId)
                        OpResult.Done
                    }
                }
            }

            else -> {
                if (split.serverId == null) {
                    val pago = pagoDao.getPorId(split.pagoLocalId)
                        ?: return OpResult.Retry("El pago del split aún no existe en el servidor")
                    when (val res = call { api.generarSplit(GenerarSplitRequest(pago.serverId ?: 0L, split.modoCalculo)) }) {
                        is CallResult.Error -> classify(res.error)
                        is CallResult.Ok -> {
                            val dto = res.value.data ?: return OpResult.Done
                            splitDao.upsert(
                                split.copy(
                                    serverId = dto.id,
                                    modoCalculo = dto.modoCalculo,
                                    totalPendiente = dto.totalPendiente,
                                    totalRealizado = dto.totalRealizado,
                                    syncState = SyncState.SYNCED,
                                    updatedAtServer = System.currentTimeMillis(),
                                    lastError = null,
                                ),
                            )
                            // El servidor es la autoridad del split: sus transacciones
                            // reemplazan a las locales (conservando su `localId`).
                            splitTransactionsSync.aplicar(split.localId, dto)
                            OpResult.Done
                        }
                    }
                } else {
                    when (val res = call { api.recalcularSplit(split.serverId) }) {
                        is CallResult.Error -> classify(res.error)
                        is CallResult.Ok -> {
                            val dto = res.value.data ?: return OpResult.Done
                            splitDao.upsert(
                                split.copy(
                                    modoCalculo = dto.modoCalculo,
                                    totalPendiente = dto.totalPendiente,
                                    totalRealizado = dto.totalRealizado,
                                    syncState = SyncState.SYNCED,
                                    updatedAtServer = System.currentTimeMillis(),
                                    lastError = null,
                                ),
                            )
                            splitTransactionsSync.aplicar(split.localId, dto)
                            OpResult.Done
                        }
                    }
                }
            }
        }
    }

    private suspend fun ejecutarTransaccion(api: AbysApi, op: PendingOperationEntity): OpResult {
        // La operación apunta al `localId` de la transacción: se resuelve en el momento del push
        // porque su `serverId` puede existir ya (el split se sube antes) o no (aún no sincronizado).
        val transaccion = splitDao.getTransaccion(op.entityLocalId)
            ?: return OpResult.Done // la fila ya no existe: nada que enviar
        if (transaccion.realizado && transaccion.syncState == SyncState.SYNCED) {
            return OpResult.Done // ya está marcada como realizada en el servidor
        }
        val serverId = transaccion.serverId
            ?: return OpResult.Retry("La transacción aún no existe en el servidor")
        return when (val res = call { api.marcarRealizada(serverId) }) {
            is CallResult.Error -> classify(res.error)
            is CallResult.Ok -> {
                val dto = res.value.data
                if (dto != null) {
                    // Se actualiza **la misma fila local** (no se crea una nueva).
                    splitDao.upsertTransaccion(
                        transaccion.copy(
                            serverId = dto.id,
                            montoEnteros = dto.montoEnteros,
                            tasaBps = dto.tasaBps,
                            aliasSnapshot = dto.aliasSnapshot,
                            realizado = true,
                            fechaRealizacion = transaccion.fechaRealizacion
                                ?: com.mikylab.abys.core.time.DateFormats.parseInstant(dto.fechaRealizacion)
                                    ?.toEpochMilli(),
                            syncState = SyncState.SYNCED,
                            updatedAtLocal = System.currentTimeMillis(),
                            lastError = null,
                        ),
                    )
                }
                OpResult.Done
            }
        }
    }

    private suspend fun ejecutarSettings(api: AbysApi, op: PendingOperationEntity): OpResult {
        val raw = op.payloadJson ?: return OpResult.Fatal("Payload de settings ausente")
        val elemento = runCatching { json.parseToJsonElement(raw) }.getOrNull()
            ?: return OpResult.Fatal("Payload de settings inválido")

        // v0.4.0: `PUT /settings/registrar` viaja como objeto con los dos defaults.
        if (elemento is JsonObject) {
            val metodo = elemento[SettingsKeys.PAYLOAD_METODO]?.jsonPrimitive?.contentOrNull
            val modo = elemento[SettingsKeys.PAYLOAD_MODO]?.jsonPrimitive?.contentOrNull
            if (metodo == null || modo == null) {
                return OpResult.Fatal("Defaults de registro incompletos")
            }
            return when (
                val res = call { api.actualizarRegistrarSettings(RegistrarSettingsRequest(metodo, modo)) }
            ) {
                is CallResult.Error -> classify(res.error)
                is CallResult.Ok -> {
                    val dto = res.value.data
                    val ahora = System.currentTimeMillis()
                    settingDao.upsert(
                        com.mikylab.abys.data.local.entity.AppSettingEntity(
                            clave = SettingsKeys.REGISTRAR_METODO_DEFAULT,
                            valor = dto?.metodoDefault ?: metodo,
                            updatedAt = ahora,
                            syncState = SyncState.SYNCED,
                        ),
                    )
                    settingDao.upsert(
                        com.mikylab.abys.data.local.entity.AppSettingEntity(
                            clave = SettingsKeys.REGISTRAR_MODO_DEFAULT,
                            valor = dto?.modoDefault ?: modo,
                            updatedAt = ahora,
                            syncState = SyncState.SYNCED,
                        ),
                    )
                    OpResult.Done
                }
            }
        }

        val modo = runCatching { elemento.jsonPrimitive.content }.getOrNull()
            ?: return OpResult.Fatal("Modo no especificado")
        return when (val res = call { api.actualizarSplitSettings(SplitSettingsRequest(modo)) }) {
            is CallResult.Error -> classify(res.error)
            is CallResult.Ok -> {
                settingDao.upsert(
                    com.mikylab.abys.data.local.entity.AppSettingEntity(
                        clave = SettingsKeys.SPLIT_MODO_DEFAULT,
                        valor = modo,
                        updatedAt = System.currentTimeMillis(),
                        syncState = SyncState.SYNCED,
                    ),
                )
                OpResult.Done
            }
        }
    }

    // ── Utilidades ──────────────────────────────────────────────────────────

    private sealed interface CallResult<out T> {
        data class Ok<T>(val value: T) : CallResult<T>
        data class Error(val error: AppError) : CallResult<Nothing>
    }

    private suspend fun <T> call(block: suspend () -> T): CallResult<T> = try {
        CallResult.Ok(block())
    } catch (e: retrofit2.HttpException) {
        val body = runCatching { e.response()?.errorBody()?.string() }.getOrNull()
        CallResult.Error(com.mikylab.abys.core.network.ApiErrorParser.parse(e.code(), body))
    } catch (e: java.io.IOException) {
        CallResult.Error(
            AppError.network("No se pudo conectar con el servidor. Verifica que el backend esté activo.", e),
        )
    } catch (e: Throwable) {
        CallResult.Error(AppError.fromThrowable(e))
    }

    private fun classify(error: AppError): OpResult = when {
        error.isNetwork -> OpResult.Retry(error.message)
        error.httpStatus >= 500 -> OpResult.Retry(error.message)
        else -> OpResult.Fatal(error.message)
    }

    private suspend fun marcarErrorEnEntidad(op: PendingOperationEntity, mensaje: String) {
        when (op.entityType) {
            Operations.TIPO_FUENTE -> fuenteDao.marcarError(op.entityLocalId, mensaje, SyncState.FAILED)
            Operations.TIPO_CUENTA -> cuentaDao.marcarError(op.entityLocalId, mensaje, SyncState.FAILED)
            Operations.TIPO_PAGO -> pagoDao.marcarError(op.entityLocalId, mensaje, SyncState.FAILED)
            Operations.TIPO_SPLIT -> splitDao.marcarError(op.entityLocalId, mensaje, SyncState.FAILED)
            Operations.TIPO_TRANSACCION ->
                splitDao.marcarErrorTransaccion(op.entityLocalId, mensaje, SyncState.FAILED)
        }
    }

    private suspend fun registrarEstado(error: String?) {
        val pendientes = pendingDao.contar()
        val estado = syncStateDao.get()
        syncStateDao.upsert(
            com.mikylab.abys.data.local.entity.SyncStateEntity(
                id = 1,
                ultimoSyncOk = if (error == null) System.currentTimeMillis() else estado?.ultimoSyncOk,
                ultimoIntento = System.currentTimeMillis(),
                ultimoError = error,
                pendientes = pendientes,
            ),
        )
    }

    private fun archivoPart(ruta: String): MultipartBody.Part? {
        val file = File(ruta)
        if (!file.exists()) return null
        val mime = when (file.extension.lowercase()) {
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "webp" -> "image/webp"
            "gif" -> "image/gif"
            else -> "application/octet-stream"
        }
        val body = file.asRequestBody(mime.toMediaTypeOrNull())
        return MultipartBody.Part.createFormData("archivo", file.name, body)
    }

    private val json = Json { ignoreUnknownKeys = true }

    private fun leerPayload(payload: String): String? =
        runCatching { json.parseToJsonElement(payload) as? JsonObject }
            .getOrNull()
            ?.get(Operations.PAYLOAD_ARCHIVO)
            ?.let { runCatching { it.jsonPrimitive.content }.getOrNull() }

    private fun leerPayloadJson(payload: String): JsonObject? =
        runCatching { json.parseToJsonElement(payload) as? JsonObject }.getOrNull()

    companion object {
        const val CLAVE_MODO_DEFAULT = SettingsKeys.SPLIT_MODO_DEFAULT
    }
}
