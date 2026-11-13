package com.mikylab.abys.data.repository

import androidx.room.withTransaction
import com.mikylab.abys.core.result.AppError
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.AbysDatabase
import com.mikylab.abys.data.local.dao.CuentaDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.data.local.dao.SplitDao
import com.mikylab.abys.data.local.entity.SplitEntity
import com.mikylab.abys.data.local.entity.TransaccionEntity
import com.mikylab.abys.data.mapper.DomainMappers.toDomain
import com.mikylab.abys.data.sync.Operations
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.model.Split
import com.mikylab.abys.domain.model.SyncState
import com.mikylab.abys.domain.model.Transaccion
import com.mikylab.abys.domain.repository.SplitRepository
import com.mikylab.abys.domain.split.SplitCalculator
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repositorio de splits (local-first).
 *
 * El split se **calcula localmente** con [SplitCalculator] (mismo algoritmo que el backend)
 * para dar respuesta inmediata sin red; al sincronizarse, el servidor devuelve el split
 * autoritativo y sus transacciones, que reemplazan la vista local.
 */
@Singleton
class SplitRepositoryImpl @Inject constructor(
    private val db: AbysDatabase,
    private val splitDao: SplitDao,
    private val pagoDao: PagoDao,
    private val cuentaDao: CuentaDao,
    private val pendingWriter: PendingWriter,
) : SplitRepository {

    override fun observeSplits(): Flow<List<Split>> =
        combine(splitDao.observeTodos(), splitDao.observeTodasTransacciones()) { splits, txs ->
            val porSplit = txs.groupBy { it.splitLocalId }
            splits.map { split -> split.toDomain(porSplit[split.localId].orEmpty()) }
        }

    override fun observeSplitPorPago(pagoLocalId: String): Flow<Split?> =
        combine(
            splitDao.observePorPago(pagoLocalId),
            splitDao.observeTodasTransacciones(),
        ) { split, txs ->
            split?.toDomain(txs.filter { it.splitLocalId == split.localId })
        }

    override fun observeTransacciones(splitLocalId: String): Flow<List<Transaccion>> =
        splitDao.observeTransacciones(splitLocalId).map { lista -> lista.map { it.toDomain() } }

    override suspend fun generarSplit(pagoLocalId: String, modo: String): AppResult<Split> {
        val pago = pagoDao.getPorId(pagoLocalId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "pago no encontrado"))
        val existente = splitDao.getPorServerId(pago.serverId ?: -1L)
            ?: splitDao.observePorPago(pagoLocalId).let { null }
        if (existente != null) {
            return AppResult.Failure(
                AppError(
                    AppError.CODE_CONFLICT,
                    "el pago ya tiene un split (máximo 1 por pago)",
                ),
            )
        }

        val cuentas = cuentaDao.getAll().filter { it.deletedAt == null }
        val general = cuentas.firstOrNull { it.esGeneral }
            ?: return AppResult.Failure(
                AppError(AppError.CODE_CONFLICT, "no hay cuenta General configurada"),
            )
        val modoCalculo = ModoCalculo.fromWire(modo)
        val tasas = cuentas.map { cuenta ->
            SplitCalculator.TasaCuenta(
                cuentaLocalId = cuenta.localId,
                alias = cuenta.alias,
                tasaBps = if (cuenta.esGeneral) 0L else cuenta.tasaBps,
                esGeneral = cuenta.esGeneral,
            )
        }

        val calculo = runCatching {
            SplitCalculator.calcular(pago.montoEnteros, tasas, modoCalculo)
        }.getOrElse { error ->
            return AppResult.Failure(
                AppError(AppError.CODE_VALIDATION, error.message ?: "no se pudo calcular el split"),
            )
        }

        val localId = UUID.randomUUID().toString()
        val ahora = System.currentTimeMillis()
        val total = calculo.sumOf { it.montoCents }
        val entidad = SplitEntity(
            localId = localId,
            serverId = null,
            pagoLocalId = pagoLocalId,
            modoCalculo = modoCalculo.wire,
            totalPendiente = total,
            totalRealizado = 0L,
            createdAt = ahora,
            updatedAt = ahora,
            syncState = SyncState.PENDING_CREATE,
            updatedAtLocal = ahora,
            updatedAtServer = null,
            lastError = null,
        )
        val transacciones = calculo.map { calculada ->
            TransaccionEntity(
                localId = UUID.randomUUID().toString(),
                serverId = null,
                splitLocalId = localId,
                cuentaLocalId = calculada.cuentaLocalId,
                montoEnteros = calculada.montoCents,
                tasaBps = calculada.tasaBps,
                aliasSnapshot = calculada.alias,
                realizado = false,
                fechaRealizacion = null,
                createdAt = ahora,
                updatedAt = ahora,
                syncState = SyncState.PENDING_CREATE,
                updatedAtLocal = ahora,
                lastError = null,
            )
        }

        db.withTransaction {
            splitDao.upsert(entidad)
            splitDao.upsertTransacciones(transacciones)
            pendingWriter.encolar(Operations.TIPO_SPLIT, localId, Operations.OP_UPSERT)
        }

        return AppResult.Success(entidad.toDomain(transacciones))
    }

    override suspend fun recalcularSplit(splitLocalId: String): AppResult<Split> {
        val split = splitDao.getPorId(splitLocalId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "split no encontrado"))
        val pago = pagoDao.getPorId(split.pagoLocalId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "pago no encontrado"))
        val transacciones = splitDao.getTransacciones(splitLocalId)
        val cuentas = cuentaDao.getAll().associateBy { it.localId }

        val rec = transacciones.map { tx ->
            SplitCalculator.TransaccionRecalculo(
                id = tx.localId,
                cuentaLocalId = tx.cuentaLocalId.orEmpty(),
                alias = tx.aliasSnapshot,
                tasaBps = tx.tasaBps,
                montoCents = tx.montoEnteros,
                realizado = tx.realizado,
                esGeneral = tx.cuentaLocalId?.let { cuentas[it]?.esGeneral } ?: false,
            )
        }
        val tasasVigentes = cuentas.values
            .filter { !it.esGeneral && it.deletedAt == null }
            .associate { it.localId to it.tasaBps }

        val resultado = runCatching {
            SplitCalculator.recalcular(pago.montoEnteros, ModoCalculo.fromWire(split.modoCalculo), rec, tasasVigentes)
        }.getOrElse { error ->
            return AppResult.Failure(
                AppError(AppError.CODE_IMMUTABLE, error.message ?: "no se pudo recalcular el split"),
            )
        }

        val actualizadas = transacciones.map { tx ->
            val nuevo = resultado.indice[tx.localId] ?: return@map tx
            tx.copy(
                montoEnteros = nuevo.montoCents,
                tasaBps = nuevo.tasaBps,
                syncState = if (tx.realizado) tx.syncState else SyncState.PENDING_UPDATE,
                updatedAtLocal = System.currentTimeMillis(),
            )
        }
        db.withTransaction {
            splitDao.reemplazarTransacciones(splitLocalId, actualizadas)
            pendingWriter.encolar(
                Operations.TIPO_SPLIT,
                splitLocalId,
                Operations.OP_UPSERT,
                serverId = split.serverId,
            )
        }
        return AppResult.Success(split.copy(syncState = SyncState.PENDING_UPDATE).toDomain(actualizadas))
    }

    override suspend fun eliminarSplit(splitLocalId: String): AppResult<Unit> {
        val split = splitDao.getPorId(splitLocalId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "split no encontrado"))
        val tieneRealizadas = splitDao.getTransacciones(splitLocalId).any { it.realizado }
        if (tieneRealizadas) {
            return AppResult.Failure(
                AppError(
                    AppError.CODE_CONFLICT,
                    "no se puede eliminar un split con transacciones realizadas",
                ),
            )
        }
        db.withTransaction {
            if (split.serverId == null) {
                splitDao.borrar(splitLocalId)
            } else {
                splitDao.upsert(
                    split.copy(
                        syncState = SyncState.PENDING_DELETE,
                        updatedAtLocal = System.currentTimeMillis(),
                    ),
                )
                pendingWriter.encolar(
                    Operations.TIPO_SPLIT,
                    splitLocalId,
                    Operations.OP_DELETE,
                    serverId = split.serverId,
                )
            }
        }
        return AppResult.Success(Unit)
    }

    override suspend fun marcarRealizada(transaccionLocalId: String): AppResult<Transaccion> {
        val transaccion = splitDao.getTransaccion(transaccionLocalId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "transacción no encontrada"))
        val ahora = System.currentTimeMillis()
        db.withTransaction {
            splitDao.marcarRealizada(
                transaccionLocalId,
                realizado = true,
                fechaRealizacion = ahora,
                state = SyncState.PENDING_UPDATE,
                now = ahora,
            )
            pendingWriter.encolar(
                Operations.TIPO_TRANSACCION,
                transaccion.splitLocalId,
                Operations.OP_REALIZE,
                serverId = transaccion.serverId,
            )
        }
        return AppResult.Success(
            transaccion.copy(
                realizado = true,
                fechaRealizacion = ahora,
                syncState = SyncState.PENDING_UPDATE,
            ).toDomain(),
        )
    }
}
