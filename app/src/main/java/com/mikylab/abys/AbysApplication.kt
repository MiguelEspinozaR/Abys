package com.mikylab.abys

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.mikylab.abys.data.sync.ConnectivityMonitor
import com.mikylab.abys.data.sync.SyncScheduler
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

/**
 * Application de Abys.
 *
 * - Hilt para la inyección de dependencias.
 * - `Configuration.Provider` para que WorkManager use el [HiltWorkerFactory]
 *   (necesario para los workers con dependencias como `PushProcessor`).
 * - Se programa la sincronización automática: periódica (pull 15 min / push+pull 30 min),
 *   refresco al abrir la app y sincronización al recuperar la conectividad.
 */
@HiltAndroidApp
class AbysApplication : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    @Inject lateinit var syncScheduler: SyncScheduler

    @Inject lateinit var connectivityMonitor: ConnectivityMonitor

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .setMinimumLoggingLevel(if (BuildConfig.DEBUG) android.util.Log.DEBUG else android.util.Log.INFO)
            .build()

    override fun onCreate() {
        super.onCreate()
        // Sincronización periódica (push + pull) + refresco inmediato al abrir la app.
        syncScheduler.schedulePeriodic()
        syncScheduler.schedulePeriodicPull()
        syncScheduler.requestPull()
        // Sincronización automática al recuperar la conectividad (el device estuvo offline).
        connectivityMonitor.start()
    }
}
