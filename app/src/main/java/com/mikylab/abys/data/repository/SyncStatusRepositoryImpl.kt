package com.mikylab.abys.data.repository

import com.mikylab.abys.data.local.dao.PendingOperationDao
import com.mikylab.abys.data.local.dao.SyncStateDao
import com.mikylab.abys.data.sync.SyncScheduler
import com.mikylab.abys.domain.repository.SyncEstado
import com.mikylab.abys.domain.repository.SyncStatusRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import javax.inject.Inject
import javax.inject.Singleton

/** Estado de la cola de pendientes y del último intento de sincronización. */
@Singleton
class SyncStatusRepositoryImpl @Inject constructor(
    private val pendingDao: PendingOperationDao,
    private val syncStateDao: SyncStateDao,
    private val syncScheduler: SyncScheduler,
) : SyncStatusRepository {

    override fun observeEstado(): Flow<SyncEstado> =
        combine(
            pendingDao.observeCantidad(),
            syncStateDao.observe(),
        ) { pendientes, estado ->
            SyncEstado(
                ultimoSyncOk = estado?.ultimoSyncOk,
                ultimoIntento = estado?.ultimoIntento,
                ultimoError = estado?.ultimoError,
                pendientes = pendientes,
            )
        }

    override suspend fun sincronizarAhora() {
        syncScheduler.requestFullSync()
    }
}
