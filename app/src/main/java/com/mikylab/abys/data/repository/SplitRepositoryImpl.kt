package com.mikylab.abys.data.repository

import com.mikylab.abys.core.result.AppError
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.TransactionRunner
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
 * Repositorio de splits (flujo **Splits**): local-first.
 *
 * El split se **calcula localmente** con [SplitCalculator] (mismo algoritmo que el backend)
 * para dar respuesta inmediata sin red; al sincronizarse, el servidor devuelve el split
 * autoritativo y sus transacciones, que **reemplazan** la vista local conservando el
 * `localId` de las filas que ya existían (para no perder operaciones pendientes).
 *
 * Reglas:
 * - BR-030/031 → como máximo **un** split por pago (índice único en Room y en el backend).
 * - BR-036 → no se puede eliminar un split con transacciones realizadas.
 * - BR-060/061 → al recalcular, las realizadas quedan **congeladas**.
 * - BR-072 → marcar una transacción como realizada es irreversible.
 */
@Singleton
class SplitRepositoryImpl @Inject constructor(
    private val splitDao: SplitDao,
    private val pagoDao: PagoDao,
    private val cuentaDao: CuentaDao,
    private val pendingWriter: PendingWriter,
    private val transactions: TransactionRunner,
) : SplitRepository {

    override fun observeSplits(): Flow<List<Split>> =
        combine(
            splitDao.observeTodos(),
            splitDao.observeTodasTransacciones(),
            cuentaDao.observeActivas(),
        ) { splits, txs, cuentas ->
            val generales = cuentas.filter { it.esGeneral }.map { it.localId }.toSet()
            val porSplit = txs.groupBy { it.splitLocalId }
            splits.map { split ->
                split.toDomainConTotales(porSplit[split.localId].orEmpty(), generales)
            }
        }

    override fun observeSplitPorPago(pagoLocalId: String): Flow<Split?> =
        combine(
            splitDao.observePorPago(pagoLocalId),
            splitDao.observeTodasTransacciones(),
            cuentaDao.observeActivas(),
        ) { split, txs, cuentas ->
            split?.let {
                val generales = cuentas.filter { cuenta -> cuenta.esGeneral }.map { cuenta -> cuenta.localId }.toSet()
                it.toDomainConTotales(txs.filter { tx -> tx.splitLocalId == it.localId }, generales)
            }
        }

    override fun observeTransacciones(splitLocalId: String): Flow<List<Transaccion>> =
        splitDao.observeTransacciones(splitLocalId).map { lista -> lista.map { it.toDomain() } }

    override suspend fun generarSplit(pagoLocalId: String, modo: String): AppResult<Split> {
        val pago = pagoDao.getPorId(pagoLocalId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "pago no encontrado"))

        // BR-030: máximo un split por pago (el backend responde 409 en el POST /splits).
        val existente = splitDao.getPorPago(pagoLocalId)
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
        // v0.4.0: el pendiente excluye la cuenta General (reserva de redondeo), igual que
        // `totalesSplit` en `Abys/backend/internal/handler/split_handler.go`.
        val totalPendiente = calculo
            .filterNot { it.cuentaLocalId == general.localId }
            .sumOf { it.montoCents }
        val entidad = SplitEntity(
            localId = localId,
            serverId = null,
            pagoLocalId = pagoLocalId,
            modoCalculo = modoCalculo.wire,
            totalPendiente = totalPendiente,
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

        transactions.run {
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

        val ahora = System.currentTimeMillis()
        // Las realizadas quedan congeladas (BR-021/060): solo se actualizan las pendientes.
        val actualizadas = transacciones.map { tx ->
            val nuevo = resultado.indice[tx.localId] ?: return@map tx
            if (tx.realizado) {
                tx
            } else {
                tx.copy(
                    montoEnteros = nuevo.montoCents,
                    tasaBps = nuevo.tasaBps,
                    syncState = SyncState.PENDING_UPDATE,
                    updatedAtLocal = ahora,
                )
            }
        }
        val generales = cuentas.values.filter { it.esGeneral }.map { it.localId }.toSet()
        val splitActualizado = split.copy(
            totalPendiente = actualizadas
                .filter { !it.realizado && it.cuentaLocalId !in generales }
                .sumOf { it.montoEnteros },
            totalRealizado = actualizadas.filter { it.realizado }.sumOf { it.montoEnteros },
            updatedAt = ahora,
            syncState = SyncState.PENDING_UPDATE,
            updatedAtLocal = ahora,
            lastError = null,
        )

        transactions.run {
            splitDao.upsert(splitActualizado)
            splitDao.reemplazarTransacciones(splitLocalId, actualizadas)
            pendingWriter.encolar(
                Operations.TIPO_SPLIT,
                splitLocalId,
                Operations.OP_UPSERT,
                serverId = split.serverId,
            )
        }
        return AppResult.Success(splitActualizado.toDomain(actualizadas))
    }

    override suspend fun eliminarSplit(splitLocalId: String): AppResult<Unit> {
        val split = splitDao.getPorId(splitLocalId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "split no encontrado"))
        // BR-036: no se puede eliminar un split con transacciones realizadas.
        val tieneRealizadas = splitDao.getTransacciones(splitLocalId).any { it.realizado }
        if (tieneRealizadas) {
            return AppResult.Failure(
                AppError(
                    AppError.CODE_CONFLICT,
                    "no se puede eliminar un split con transacciones realizadas",
                ),
            )
        }
        transactions.run {
            if (split.serverId == null) {
                splitDao.borrarDelSplit(splitLocalId)
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
        if (transaccion.realizado) {
            // BR-072: marcar como realizada es irreversible.
            return AppResult.Success(transaccion.toDomain())
        }
        val ahora = System.currentTimeMillis()
        transactions.run {
            splitDao.marcarRealizada(
                transaccionLocalId,
                realizado = true,
                fechaRealizacion = ahora,
                state = SyncState.PENDING_UPDATE,
                now = ahora,
            )
            // La operación se encola por el `localId` de la transacción: el worker la resuelve
            // contra el servidor cuando la transacción ya tenga `serverId` (BR-072).
            pendingWriter.encolar(
                Operations.TIPO_TRANSACCION,
                transaccionLocalId,
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

    /**
     * Convierte el split a dominio recalculando los agregados desde las transacciones,
     * excluyendo la cuenta General del **pendiente** (v0.4.0).
     *
     * Es la misma semántica que `totalesSplit` del backend: `realizado` suma todas las
     * realizadas y `pendiente` excluye las no realizadas de General.
     */
    private fun SplitEntity.toDomainConTotales(
        transacciones: List<TransaccionEntity>,
        generales: Set<String>,
    ): Split {
        val base = toDomain(transacciones)
        val pendiente = transacciones
            .filter { !it.realizado && (it.cuentaLocalId == null || it.cuentaLocalId !in generales) }
            .sumOf { it.montoEnteros }
        val realizado = transacciones.filter { it.realizado }.sumOf { it.montoEnteros }
        return base.copy(
            totalPendiente = com.mikylab.abys.core.money.Money(pendiente),
            totalRealizado = com.mikylab.abys.core.money.Money(realizado),
        )
    }
}
