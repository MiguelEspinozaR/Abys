package com.mikylab.abys.data.sync

import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

/**
 * Worker de **push**: envía la cola de operaciones pendientes al backend.
 */
@HiltWorker
class SyncPushWorker @AssistedInject constructor(
    @Assisted appContext: android.content.Context,
    @Assisted params: WorkerParameters,
    private val pushProcessor: PushProcessor,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = pushProcessor.push()
}

/**
 * Worker de **pull**: refresca Room con los datos del servidor.
 */
@HiltWorker
class SyncPullWorker @AssistedInject constructor(
    @Assisted appContext: android.content.Context,
    @Assisted params: WorkerParameters,
    private val pullProcessor: PullProcessor,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = pullProcessor.pull()
}

/**
 * Worker completo: push + pull.
 */
@HiltWorker
class SyncAllWorker @AssistedInject constructor(
    @Assisted appContext: android.content.Context,
    @Assisted params: WorkerParameters,
    private val pushProcessor: PushProcessor,
    private val pullProcessor: PullProcessor,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val push = pushProcessor.push()
        if (push == Result.failure()) return push
        val pull = pullProcessor.pull()
        if (pull == Result.failure()) return pull
        return Result.success()
    }
}
