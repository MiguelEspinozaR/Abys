package com.mikylab.abys.data.repository

import androidx.room.withTransaction
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.AbysDatabase
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
 * Repositorio de pagos: **local-first**.
 *
 * Las escrituras van primero a Room (con su operación en la cola de pendientes);
 * la red la consume el worker de sync.
 */
@Singleton
class PagoRepositoryImpl @Inject constructor(
    private val db: AbysDatabase,
    private val pagoDao: PagoDao,
    private val fuenteDao: FuenteDao,
    private val splitDao: SplitDao,
    private val pendingWriter: PendingWriter,
) : PagoRepository {

    override fun observePagos(filtro: FiltroPagos): Flow<List<Pago>> {
        val pagos = pagoDao.observePagos(
            fechaInicio = filtro.fechaInicio?.toString(),
            fechaFin = filtro.fechaFin?.toString(),
            fuenteLocalId = filtro.fuenteLocalId,
            metodoPago = filtro.metodoPago?.wire,
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

    override suspend fun crearPago(draft: PagoDraft): AppResult<Pago> {
        val validacion = ValidarPagoUseCase.validar(draft)
        if (validacion is ValidarPagoUseCase.Resultado.Error) {
            return AppResult.Failure(
                com.mikylab.abys.core.result.AppError(
                    code = com.mikylab.abys.core.result.AppError.CODE_VALIDATION,
                    message = validacion.mensaje,
                ),
            )
        }

        val fuente = fuenteDao.getPorId(draft.fuenteLocalId)
            ?: return AppResult.Failure(
                com.mikylab.abys.core.result.AppError(
                    code = com.mikylab.abys.core.result.AppError.CODE_VALIDATION,
                    message = "la fuente indicada no existe",
                ),
            )

        val localId = UUID.randomUUID().toString()
        val ahora = System.currentTimeMillis()
        val entidad = PagoEntity(
            localId = localId,
            serverId = null,
            fuenteLocalId = draft.fuenteLocalId,
            fechaPago = draft.fechaPago.toString(),
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
        val dias = draft.diasTrabajados.distinct().sorted().map { fecha ->
            DiaTrabajadoEntity(
                localId = UUID.randomUUID().toString(),
                serverId = null,
                pagoLocalId = localId,
                fecha = fecha.toString(),
                syncState = SyncState.PENDING_CREATE,
                updatedAtLocal = ahora,
            )
        }

        db.withTransaction {
            pagoDao.upsert(entidad)
            pagoDao.upsertDias(dias)
            pendingWriter.encolar(Operations.TIPO_PAGO, localId, Operations.OP_UPSERT)
        }

        return AppResult.Success(
            entidad.toDomain(fuente, dias, null),
        )
    }

    override suspend fun actualizarPago(localId: String, draft: PagoDraft): AppResult<Pago> {
        val validacion = ValidarPagoUseCase.validar(draft)
        if (validacion is ValidarPagoUseCase.Resultado.Error) {
            return AppResult.Failure(
                com.mikylab.abys.core.result.AppError(
                    code = com.mikylab.abys.core.result.AppError.CODE_VALIDATION,
                    message = validacion.mensaje,
                ),
            )
        }
        val existente = pagoDao.getPorId(localId)
            ?: return AppResult.Failure(
                com.mikylab.abys.core.result.AppError(
                    code = com.mikylab.abys.core.result.AppError.CODE_NOT_FOUND,
                    message = "pago no encontrado",
                ),
            )
        val fuente = fuenteDao.getPorId(draft.fuenteLocalId)
            ?: return AppResult.Failure(
                com.mikylab.abys.core.result.AppError(
                    code = com.mikylab.abys.core.result.AppError.CODE_VALIDATION,
                    message = "la fuente indicada no existe",
                ),
            )

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
        val dias = draft.diasTrabajados.distinct().sorted().map { fecha ->
            DiaTrabajadoEntity(
                localId = UUID.randomUUID().toString(),
                serverId = null,
                pagoLocalId = localId,
                fecha = fecha.toString(),
                syncState = SyncState.PENDING_UPDATE,
                updatedAtLocal = ahora,
            )
        }

        db.withTransaction {
            pagoDao.upsert(actualizada)
            pagoDao.reemplazarDias(localId, dias)
            pendingWriter.encolar(Operations.TIPO_PAGO, localId, Operations.OP_UPSERT)
        }

        return AppResult.Success(actualizada.toDomain(fuente, dias, null))
    }

    override suspend fun eliminarPago(localId: String): AppResult<Unit> {
        val existente = pagoDao.getPorId(localId)
            ?: return AppResult.Failure(
                com.mikylab.abys.core.result.AppError(
                    code = com.mikylab.abys.core.result.AppError.CODE_NOT_FOUND,
                    message = "pago no encontrado",
                ),
            )
        val ahora = System.currentTimeMillis()
        db.withTransaction {
            if (existente.serverId == null) {
                // Nunca llegó al servidor: se borra localmente.
                pagoDao.borrarDiasDe(localId)
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
                com.mikylab.abys.core.result.AppError(
                    code = com.mikylab.abys.core.result.AppError.CODE_NOT_FOUND,
                    message = "pago no encontrado",
                ),
            )
        val payload = """{"${Operations.PAYLOAD_ARCHIVO}":"$rutaArchivo"}"""
        db.withTransaction {
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
}
