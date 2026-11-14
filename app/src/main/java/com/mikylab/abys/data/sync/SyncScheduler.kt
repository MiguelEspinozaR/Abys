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
 * Encola el trabajo de sincronización.
 *
 * - [requestPush]: sube las operaciones pendientes (tras cada mutación local).
 * - [requestPull]: refresca Room desde el servidor (al abrir la app y periódicamente).
 * - [requestFullSync]: push + pull + limpieza.
 */
@Singleton
class SyncScheduler @Inject constructor(
    @param:ApplicationContext private val context: Context,
) {

    private val workManager: WorkManager get() = WorkManager.getInstance(context)

    private val connectedConstraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    /** Push inmediato de la cola de pendientes. */
    fun requestPush() {
        val request = OneTimeWorkRequestBuilder<SyncPushWorker>()
            .setConstraints(connectedConstraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
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

    /** Work periódico (cada 30 min) que hace push + pull. */
    fun schedulePeriodic() {
        val request = PeriodicWorkRequestBuilder<SyncAllWorker>(30, TimeUnit.MINUTES)
            .setConstraints(connectedConstraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.MINUTES)
            .build()
        workManager.enqueueUniquePeriodicWork(
            WORK_PERIODIC,
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }

    companion object {
        const val WORK_PUSH = "abys-sync-push"
        const val WORK_PULL = "abys-sync-pull"
        const val WORK_ALL = "abys-sync-all"
        const val WORK_PERIODIC = "abys-sync-periodic"
    }
}
