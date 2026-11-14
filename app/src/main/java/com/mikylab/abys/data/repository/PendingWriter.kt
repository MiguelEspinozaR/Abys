package com.mikylab.abys.data.repository

import com.mikylab.abys.data.local.dao.PendingOperationDao
import com.mikylab.abys.data.local.entity.PendingOperationEntity
import com.mikylab.abys.data.sync.SyncScheduler
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Encola operaciones pendientes en la cola de sync y dispara el push.
 *
 * La fila afectada y su operación se escriben **en la misma transacción** de Room,
 * de modo que nunca queda un cambio local sin operación pendiente.
 */
@Singleton
class PendingWriter @Inject constructor(
    private val pendingDao: PendingOperationDao,
    private val syncScheduler: SyncScheduler,
) {

    suspend fun encolar(
        entityType: String,
        entityLocalId: String,
        operacion: String,
        payloadJson: String? = null,
        serverId: Long? = null,
    ) {
        val ahora = System.currentTimeMillis()
        pendingDao.encolar(
            PendingOperationEntity(
                entityType = entityType,
                entityLocalId = entityLocalId,
                operacion = operacion,
                payloadJson = payloadJson,
                serverId = serverId,
                createdAt = ahora,
                nextAttemptAt = ahora,
            ),
        )
        syncScheduler.requestPush()
    }
}
