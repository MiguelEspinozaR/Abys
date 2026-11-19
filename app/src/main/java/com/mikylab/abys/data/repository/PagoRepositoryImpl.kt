package com.mikylab.abys.data.repository

import com.mikylab.abys.core.result.AppError
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.TransactionRunner
import com.mikylab.abys.data.local.dao.FuenteDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.data.local.dao.SplitDao
import com.mikylab.abys.data.local.entity.DiaTrabajadoEntity
import com.mikylab.abys.data.local.entity.PagoEntity
import com.mikylab.abys.data.mapper.DomainMappers.toDomain
import com.mikylab.abys.data.sync.Operations
import com.mikylab.abys.domain.model.FiltroPagos
import com.mikylab.abys.domain.model.Pago
import com.mikylab.abys.domain.model.PagoDraft
import com.mikylab.abys.domain.model.SyncState
import com.mikylab.abys.domain.repository.PagoRepository
import com.mikylab.abys.domain.usecase.ValidarPagoUseCase
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repositorio de pagos (flujo **Ingresos**): **local-first**.
 *
 * Toda escritura va primero a Room (junto con su operación en la cola de pendientes, en la
 * misma transacción); la red la consume el worker de sync.
 *
 * Reglas replicadas del backend:
 * - BR-001/002/006/007/010 → validadas por [ValidarPagoUseCase] antes de escribir.
 * - BR-005 → un pago con transacciones realizadas no se puede eliminar (se comprueba **local**,
 *   sin esperar al servidor, con el mismo mensaje que devuelve el backend).
 * - BR-081 → el monto no se puede cambiar si el pago tiene split (el backend responde 422).
 */
@Singleton
class PagoRepositoryImpl @Inject constructor(
    private val pagoDao: PagoDao,
    private val fuenteDao: FuenteDao,
    private val splitDao: SplitDao,
    private val pendingWriter: PendingWriter,
    private val transactions: TransactionRunner,
) : PagoRepository {

    override fun observePagos(filtro: FiltroPagos): Flow<List<Pago>> {
        val pagos = pagoDao.observePagos(
            fechaInicio = filtro.fechaInicio?.toString(),
            fechaFin = filtro.fechaFin?.toString(),
            fuenteLocalId = filtro.fuenteLocalId,
            metodoPago = filtro.metodoPago?.wire,
            limit = limiteDe(filtro),
            offset = desplazamientoDe(filtro),
        )
        return combine(
            pagos,
            fuenteDao.observeActivas(),
            pagoDao.observeTodosLosDias(),
            splitDao.observeTodos(),
        ) { lista, fuentes, dias, splits ->
            val fuentesPorId = fuentes.associateBy { it.localId }
            val diasPorPago = dias.groupBy { it.pagoLocalId }
            val splitPorPago = splits.associateBy { it.pagoLocalId }
            lista.map { pago ->
                pago.toDomain(
                    fuente = fuentesPorId[pago.fuenteLocalId],
                    dias = diasPorPago[pago.localId].orEmpty(),
                    split = splitPorPago[pago.localId],
                )
            }
        }
    }

    override fun observePago(localId: String): Flow<Pago?> =
        combine(
            pagoDao.observePorId(localId),
            fuenteDao.observeActivas(),
            pagoDao.observeTodosLosDias(),
            splitDao.observeTodos(),
        ) { pago, fuentes, dias, splits ->
            pago?.toDomain(
                fuente = fuentes.firstOrNull { it.localId == pago.fuenteLocalId },
                dias = dias.filter { it.pagoLocalId == localId },
                split = splits.firstOrNull { it.pagoLocalId == localId },
            )
        }

    override fun observePagosPorAnio(): Flow<Map<Int, List<Pago>>> =
        observePagos(FiltroPagos(pageSize = 500)).map { pagos ->
            pagos.groupBy { it.fechaPago.year }
        }

    override suspend fun contarPagos(filtro: FiltroPagos): Int = pagoDao.contarPagos(
        fechaInicio = filtro.fechaInicio?.toString(),
        fechaFin = filtro.fechaFin?.toString(),
        fuenteLocalId = filtro.fuenteLocalId,
        metodoPago = filtro.metodoPago?.wire,
    )

    override suspend fun crearPago(draft: PagoDraft): AppResult<Pago> {
        val validacion = ValidarPagoUseCase.validar(draft)
        if (validacion is ValidarPagoUseCase.Resultado.Error) {
            return AppResult.Failure(
                AppError(AppError.CODE_VALIDATION, validacion.mensaje),
            )
        }

        val fuente = fuenteDao.getPorId(draft.fuenteLocalId)
            ?: return AppResult.Failure(
                AppError(AppError.CODE_VALIDATION, "la fuente indicada no existe"),
            )

        val localId = UUID.randomUUID().toString()
        val ahora = System.currentTimeMillis()
        val entidad = PagoEntity(
            localId = localId,
            serverId = null,
            fuenteLocalId = draft.fuenteLocalId,
            fechaPago = draft.fechaPago.toString(),
            // El total del pago es **derivado**: Σ de los días (v0.3.0).
            montoEnteros = draft.monto.centavos,
            metodoPago = draft.metodoPago.wire,
            notas = draft.notas?.takeIf { it.isNotBlank() },
            imagenRuta = null,
            createdAt = ahora,
            updatedAt = ahora,
            deletedAt = null,
            syncState = SyncState.PENDING_CREATE,
            updatedAtLocal = ahora,
            updatedAtServer = null,
            lastError = null,
        )
        val dias = draft.diasTrabajados
            .distinctBy { it.fecha }
            .sortedBy { it.fecha }
            .map { dia ->
                DiaTrabajadoEntity(
                    localId = UUID.randomUUID().toString(),
                    serverId = null,
                    pagoLocalId = localId,
                    fecha = dia.fecha.toString(),
                    montoEnteros = dia.monto.centavos,
                    syncState = SyncState.PENDING_CREATE,
                    updatedAtLocal = ahora,
                )
            }

        transactions.run {
            pagoDao.upsert(entidad)
            pagoDao.upsertDias(dias)
            pendingWriter.encolar(Operations.TIPO_PAGO, localId, Operations.OP_UPSERT)
        }

        return AppResult.Success(entidad.toDomain(fuente, dias, null))
    }

    override suspend fun actualizarPago(localId: String, draft: PagoDraft): AppResult<Pago> {
        val validacion = ValidarPagoUseCase.validar(draft)
        if (validacion is ValidarPagoUseCase.Resultado.Error) {
            return AppResult.Failure(
                AppError(AppError.CODE_VALIDATION, validacion.mensaje),
            )
        }
        val existente = pagoDao.getPorId(localId)
            ?: return AppResult.Failure(
                AppError(AppError.CODE_NOT_FOUND, "pago no encontrado"),
            )
        val fuente = fuenteDao.getPorId(draft.fuenteLocalId)
            ?: return AppResult.Failure(
                AppError(AppError.CODE_VALIDATION, "la fuente indicada no existe"),
            )

        // BR-081 (v0.3.0): no se puede cambiar la **suma de los días** de un pago con split
        // (el backend responde 422 `IMMUTABLE_DATA`).
        val tieneSplit = splitDao.getPorPago(localId) != null
        if (tieneSplit && existente.montoEnteros != draft.monto.centavos) {
            return AppResult.Failure(
                AppError(
                    AppError.CODE_IMMUTABLE,
                    "no se puede cambiar el monto de un pago con split; " +
                        "elimina o recalcula el split primero",
                ),
            )
        }

        val ahora = System.currentTimeMillis()
        val actualizada = existente.copy(
            fuenteLocalId = draft.fuenteLocalId,
            fechaPago = draft.fechaPago.toString(),
            montoEnteros = draft.monto.centavos,
            metodoPago = draft.metodoPago.wire,
            notas = draft.notas?.takeIf { it.isNotBlank() },
            updatedAt = ahora,
            syncState = SyncState.PENDING_UPDATE,
            updatedAtLocal = ahora,
            lastError = null,
        )

        // Los días se **reemplazan** (el backend borra y reinserta los días en `PUT /pagos/:id`).
        // Se conservan las filas locales cuya fecha no cambia, para no perder su `serverId`.
        val (diasConservados, diasNuevos) = reconciliarDias(existente, draft, ahora)

        transactions.run {
            pagoDao.upsert(actualizada)
            pagoDao.reemplazarDias(localId, diasConservados + diasNuevos)
            pendingWriter.encolar(Operations.TIPO_PAGO, localId, Operations.OP_UPSERT)
        }

        return AppResult.Success(
            actualizada.toDomain(fuente, diasConservados + diasNuevos, null),
        )
    }

    override suspend fun eliminarPago(localId: String): AppResult<Unit> {
        val existente = pagoDao.getPorId(localId)
            ?: return AppResult.Failure(
                AppError(AppError.CODE_NOT_FOUND, "pago no encontrado"),
            )

        // BR-005: no se puede eliminar un pago con transacciones realizadas.
        // Se comprueba en local para dar la respuesta inmediata (sin esperar al servidor).
        if (splitDao.contarTransaccionesRealizadas(localId) > 0) {
            return AppResult.Failure(
                AppError(
                    AppError.CODE_CONFLICT,
                    "no se puede eliminar un pago con transacciones realizadas",
                ),
            )
        }

        val ahora = System.currentTimeMillis()
        transactions.run {
            if (existente.serverId == null) {
                // Nunca llegó al servidor: se borra localmente (pago, días y split).
                pagoDao.borrarDiasDe(localId)
                splitDao.getPorPago(localId)?.let { split ->
                    splitDao.borrarDelSplit(split.localId)
                    splitDao.borrar(split.localId)
                }
                pagoDao.marcarEliminado(localId, ahora, SyncState.SYNCED, ahora)
            } else {
                pagoDao.marcarEliminado(localId, ahora, SyncState.PENDING_DELETE, ahora)
                pendingWriter.encolar(
                    Operations.TIPO_PAGO,
                    localId,
                    Operations.OP_DELETE,
                    serverId = existente.serverId,
                )
            }
        }
        return AppResult.Success(Unit)
    }

    override suspend fun subirComprobante(localId: String, rutaArchivo: String): AppResult<String> {
        val existente = pagoDao.getPorId(localId)
            ?: return AppResult.Failure(
                AppError(AppError.CODE_NOT_FOUND, "pago no encontrado"),
            )
        val payload = """{"${Operations.PAYLOAD_ARCHIVO}":"$rutaArchivo"}"""
        transactions.run {
            pagoDao.upsert(
                existente.copy(
                    imagenRuta = rutaArchivo,
                    syncState = if (existente.serverId == null) {
                        SyncState.PENDING_CREATE
                    } else {
                        SyncState.PENDING_UPDATE
                    },
                    updatedAtLocal = System.currentTimeMillis(),
                ),
            )
            pendingWriter.encolar(
                Operations.TIPO_PAGO,
                localId,
                Operations.OP_UPLOAD,
                payloadJson = payload,
                serverId = existente.serverId,
            )
        }
        return AppResult.Success(rutaArchivo)
    }

    /**
     * Calcula el diff de días trabajados: las fechas que se mantienen conservan su fila local
     * (con su `serverId`) y **actualizan su monto** con el del borrador; las nuevas se insertan
     * y las que desaparecen se descartan.
     */
    private suspend fun reconciliarDias(
        existente: PagoEntity,
        draft: PagoDraft,
        ahora: Long,
    ): Pair<List<DiaTrabajadoEntity>, List<DiaTrabajadoEntity>> {
        val actuales = pagoDao.getDias(existente.localId).associateBy { it.fecha }
        val deseados = draft.diasTrabajados.distinctBy { it.fecha }.sortedBy { it.fecha }
        val conservados = deseados.mapNotNull { dia ->
            actuales[dia.fecha.toString()]?.copy(
                montoEnteros = dia.monto.centavos,
                syncState = SyncState.PENDING_UPDATE,
                updatedAtLocal = ahora,
            )
        }
        val nuevas = deseados
            .filter { dia -> actuales[dia.fecha.toString()] == null }
            .map { dia ->
                DiaTrabajadoEntity(
                    localId = UUID.randomUUID().toString(),
                    serverId = null,
                    pagoLocalId = existente.localId,
                    fecha = dia.fecha.toString(),
                    montoEnteros = dia.monto.centavos,
                    syncState = SyncState.PENDING_UPDATE,
                    updatedAtLocal = ahora,
                )
            }
        return conservados to nuevas
    }

    private fun limiteDe(filtro: FiltroPagos): Int =
        if (filtro.pageSize <= 0) Int.MAX_VALUE else filtro.pageSize

    private fun desplazamientoDe(filtro: FiltroPagos): Int {
        val pagina = if (filtro.page <= 0) 1 else filtro.page
        val size = if (filtro.pageSize <= 0) 20 else filtro.pageSize
        return (pagina - 1) * size
    }
}
