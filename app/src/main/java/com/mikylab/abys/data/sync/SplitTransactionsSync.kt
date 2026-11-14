package com.mikylab.abys.data.sync

import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.data.local.dao.CuentaDao
import com.mikylab.abys.data.local.dao.SplitDao
import com.mikylab.abys.data.local.entity.TransaccionEntity
import com.mikylab.abys.data.remote.dto.SplitDto
import com.mikylab.abys.data.remote.mapper.RemoteMappers
import com.mikylab.abys.domain.model.SyncState
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Aplica al espejo local las **transacciones devueltas por el servidor** para un split.
 *
 * El servidor es la autoridad del split (BR-081: Σ transacciones = monto del pago). Tras el
 * push o el pull, sus transacciones **reemplazan** la vista local, pero conservando el
 * `localId` de las filas que ya existían:
 *
 * - así no se duplican transacciones,
 * - las operaciones de la cola que apuntan a una transacción por `localId`
 *   (p. ej. "marcar como realizada") siguen resolviendo a la misma fila.
 *
 * Una realización marcada **en local** (pendiente de push) no se deshace: gana el cambio local
 * (ver `docs/data-model.md` §9).
 */
@Singleton
class SplitTransactionsSync @Inject constructor(
    private val splitDao: SplitDao,
    private val cuentaDao: CuentaDao,
) {

    /**
     * Reemplaza las transacciones locales de [splitLocalId] por las del servidor.
     * Devuelve las entidades resultantes (ya persistidas).
     */
    suspend fun aplicar(splitLocalId: String, dto: SplitDto): List<TransaccionEntity> {
        val ahora = System.currentTimeMillis()
        val locales = splitDao.getTransacciones(splitLocalId)
        val cuentasPorServerId = cuentaDao.getAll().associateBy { it.serverId }
        val usados = mutableSetOf<String>()

        val entidades = dto.transacciones.map { tx ->
            val cuentaLocalId = tx.cuentaId?.let { cuentasPorServerId[it]?.localId }
            val local = locales.firstOrNull {
                it.localId !in usados && cuentaLocalId != null && it.cuentaLocalId == cuentaLocalId
            } ?: locales.firstOrNull {
                it.localId !in usados && it.aliasSnapshot == tx.aliasSnapshot
            }
            local?.let { usados += it.localId }

            val base = local ?: TransaccionEntity(
                localId = RemoteMappers.serverLocalId(tx.id),
                serverId = tx.id,
                splitLocalId = splitLocalId,
                cuentaLocalId = cuentaLocalId,
                montoEnteros = tx.montoEnteros,
                tasaBps = tx.tasaBps,
                aliasSnapshot = tx.aliasSnapshot,
                realizado = tx.realizado,
                fechaRealizacion = null,
                createdAt = ahora,
                updatedAt = ahora,
                syncState = SyncState.SYNCED,
                updatedAtLocal = ahora,
                lastError = null,
            )

            base.copy(
                serverId = tx.id,
                splitLocalId = splitLocalId,
                cuentaLocalId = base.cuentaLocalId ?: cuentaLocalId,
                montoEnteros = tx.montoEnteros,
                tasaBps = tx.tasaBps,
                aliasSnapshot = tx.aliasSnapshot,
                realizado = base.realizado || tx.realizado,
                fechaRealizacion = base.fechaRealizacion
                    ?: DateFormats.parseInstant(tx.fechaRealizacion)?.toEpochMilli(),
                syncState = if (base.syncState.isPending) base.syncState else SyncState.SYNCED,
                updatedAt = ahora,
                updatedAtLocal = ahora,
                lastError = if (base.syncState.isPending) base.lastError else null,
            )
        }

        splitDao.reemplazarTransacciones(splitLocalId, entidades)
        return entidades
    }
}
