package com.mikylab.abys.data.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Encola el trabajo de sincronización con **WorkManager**.
 *
 * Modelo de sincronización (ver `docs/feature-matrix.md` §8.2):
 *
 * | Disparador | Trabajo | Qué hace |
 * |---|---|---|
 * | Cada mutación local | [requestPush] | Sube la cola de pendientes (1 shot). |
 * | App abierta | [requestPull] | Refresca Room desde el servidor. |
 * | Conectividad recuperada | [onConnectivityRestored] | Push + pull (el device estuvo offline). |
 * | Manual (Ajustes) | [requestFullSync] | Push + pull. |
 * | Periódico (15 min) | [schedulePeriodicPull] | Refresca Room desde el servidor. |
 * | Periódico (30 min) | [schedulePeriodic] | Push + pull. |
 *
 * Todos los trabajos exigen `NetworkType.CONNECTED`: si no hay red, WorkManager los **aplaza**
 * (no fallan) y los ejecuta al recuperar la conectividad.
 */
@Singleton
class SyncScheduler @Inject constructor(
    @param:ApplicationContext private val context: Context,
) {

    private val workManager: WorkManager get() = WorkManager.getInstance(context)

    private val connectedConstraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    /** Push inmediato de la cola de pendientes (tras cada mutación local). */
    fun requestPush() {
        val request = OneTimeWorkRequestBuilder<SyncPushWorker>()
            .setConstraints(connectedConstraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        // `APPEND_OR_REPLACE`: si ya hay un push en curso, el nuevo se encadena detrás, de modo
        // que ninguna operación queda sin subir (el worker drena toda la cola en cada pasada).
        workManager.enqueueUniqueWork(WORK_PUSH, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
    }

    /** Pull (refresh) desde el servidor. */
    fun requestPull() {
        val request = OneTimeWorkRequestBuilder<SyncPullWorker>()
            .setConstraints(connectedConstraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        workManager.enqueueUniqueWork(WORK_PULL, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
    }

    /** Push + pull (sincronización manual desde Ajustes). */
    fun requestFullSync() {
        val request = OneTimeWorkRequestBuilder<SyncAllWorker>()
            .setConstraints(connectedConstraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        workManager.enqueueUniqueWork(WORK_ALL, ExistingWorkPolicy.REPLACE, request)
    }

    /**
     * Sincronización al **recuperar la conectividad**.
     *
     * Se usa `KEEP`: si ya hay una sincronización en curso o pendiente, no se encola otra
     * (la que está en curso ya arrastrará los cambios acumulados).
     */
    fun onConnectivityRestored() {
        val request = OneTimeWorkRequestBuilder<SyncAllWorker>()
            .setConstraints(connectedConstraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        workManager.enqueueUniqueWork(WORK_ALL, ExistingWorkPolicy.KEEP, request)
    }

    /** Work periódico (cada 30 min) que hace push + pull. */
    fun schedulePeriodic() {
        val request = PeriodicWorkRequestBuilder<SyncAllWorker>(30, TimeUnit.MINUTES)
            .setConstraints(connectedConstraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.MINUTES)
            .build()
        workManager.enqueueUniquePeriodicWork(
            WORK_PERIODIC,
            // `UPDATE`: al actualizar la app se aplica el nuevo periodo/configuración.
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }

    /** Work periódico de **pull** (cada 15 min): mantiene Room al día con el servidor. */
    fun schedulePeriodicPull() {
        val request = PeriodicWorkRequestBuilder<SyncPullWorker>(15, TimeUnit.MINUTES)
            .setConstraints(connectedConstraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.MINUTES)
            .build()
        workManager.enqueueUniquePeriodicWork(
            WORK_PERIODIC_PULL,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }

    companion object {
        const val WORK_PUSH = "abys-sync-push"
        const val WORK_PULL = "abys-sync-pull"
        const val WORK_ALL = "abys-sync-all"
        const val WORK_PERIODIC = "abys-sync-periodic"
        const val WORK_PERIODIC_PULL = "abys-sync-periodic-pull"
    }
}
