package com.mikylab.abys.data.sync

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.ListenableWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

/**
 * Worker de **push**: envía la cola de operaciones pendientes al backend.
 *
 * Devuelve `retry()` cuando el fallo es reintentable (sin red, 5xx): WorkManager reintenta
 * con backoff exponencial. Los errores terminales (400/404/409/422) los marca `PushProcessor`
 * como `FAILED` en la fila local (la UI pide decisión al usuario).
 */
@HiltWorker
class SyncPushWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val pushProcessor: PushProcessor,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        Log.i(TAG, "Push: subiendo la cola de pendientes")
        val resultado = pushProcessor.push()
        Log.i(TAG, "Push: finalizado con $resultado")
        return resultado.aResultado()
    }

    private companion object {
        const val TAG = "AbysSync"
    }
}

/**
 * Worker de **pull**: refresca Room con los datos del servidor.
 */
@HiltWorker
class SyncPullWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val pullProcessor: PullProcessor,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        Log.i(TAG, "Pull: refrescando los datos del servidor")
        val resultado = pullProcessor.pull()
        Log.i(TAG, "Pull: finalizado con $resultado")
        return resultado.aResultado()
    }

    private companion object {
        const val TAG = "AbysSync"
    }
}

/**
 * Worker completo: push + pull.
 *
 * Si el push falla de forma reintentable se devuelve `retry()` **sin** hacer pull: el pull
 * tampoco podría completarse sin red y se dejarían las operaciones sin subir hasta el
 * siguiente reintento de WorkManager.
 */
@HiltWorker
class SyncAllWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val pushProcessor: PushProcessor,
    private val pullProcessor: PullProcessor,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        Log.i(TAG, "Sync: push + pull")

        when (pushProcessor.push()) {
            SyncOutcome.OK -> Unit
            SyncOutcome.RETRY -> {
                Log.w(TAG, "Sync: el push es reintentable; se omite el pull")
                return Result.retry()
            }

            SyncOutcome.FATAL -> {
                Log.w(TAG, "Sync: el push falló de forma terminal; se omite el pull")
                return Result.failure()
            }
        }

        val pull = pullProcessor.pull()
        Log.i(TAG, "Sync: push correcto, pull=$pull")
        return pull.aResultado()
    }

    private companion object {
        const val TAG = "AbysSync"
    }
}

/** Traduce el resultado de la capa de datos al resultado de WorkManager. */
private fun SyncOutcome.aResultado(): ListenableWorker.Result = when (this) {
    SyncOutcome.OK -> ListenableWorker.Result.success()
    SyncOutcome.RETRY -> ListenableWorker.Result.retry()
    SyncOutcome.FATAL -> ListenableWorker.Result.failure()
}
