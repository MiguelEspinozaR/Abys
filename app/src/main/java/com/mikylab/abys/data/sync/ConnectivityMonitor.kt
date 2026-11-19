package com.mikylab.abys.data.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Detecta la **recuperación de la conectividad** para disparar una sincronización.
 *
 * WorkManager ya aplaza los trabajos con `NetworkType.CONNECTED` mientras no hay red, pero solo
 * ejecuta **uno** de ellos al volver la conexión. Este monitor encola un push + pull completo
 * en ese momento, de modo que los cambios acumulados offline se suben en cuanto se puede.
 *
 * Solo se dispara cuando la red pasa de "no disponible" a "disponible" (`habaRed`), para no
 * encolar sincronizaciones duplicadas cuando el sistema cambia de red (wifi ↔ datos).
 */
@Singleton
class ConnectivityMonitor @Inject constructor(
    @param:ApplicationContext private val context: Context,
    private val syncScheduler: SyncScheduler,
) {

    private val connectivityManager: ConnectivityManager? =
        context.getSystemService(ConnectivityManager::class.java)

    private val hayRed = AtomicBoolean(false)
    private var callback: ConnectivityManager.NetworkCallback? = null

    /** Empieza a observar los cambios de conectividad. Es idempotente. */
    fun start() {
        if (callback != null) return
        val manager = connectivityManager ?: return

        val nuevoCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                // `compareAndSet` evita disparar dos veces por la misma transición.
                if (hayRed.compareAndSet(false, true)) {
                    Log.i(TAG, "Conectividad recuperada: encolando sincronización")
                    syncScheduler.onConnectivityRestored()
                }
            }

            override fun onLost(network: Network) {
                // Puede haber otra red disponible (wifi ↔ datos): solo se marca sin red si
                // el sistema confirma que no queda ninguna.
                if (!hayConectividad()) {
                    hayRed.set(false)
                }
            }
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        try {
            // El estado inicial se fija **antes** de registrar: si ya hay red al arrancar,
            // `onAvailable` no debe disparar una sincronización extra.
            hayRed.set(hayConectividad())
            manager.registerNetworkCallback(request, nuevoCallback)
            callback = nuevoCallback
        } catch (e: SecurityException) {
            // Falta `ACCESS_NETWORK_STATE`: la sincronización periódica sigue funcionando.
            Log.w(TAG, "No se pudo observar la conectividad: ${e.message}")
        }
    }

    /** ¿Hay alguna red con salida a Internet disponible ahora mismo? */
    private fun hayConectividad(): Boolean {
        val manager = connectivityManager ?: return false
        val network = manager.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /** Deja de observar los cambios de conectividad. */
    fun stop() {
        val manager = connectivityManager ?: return
        callback?.let { runCatching { manager.unregisterNetworkCallback(it) } }
        callback = null
        hayRed.set(false)
    }

    private companion object {
        const val TAG = "AbysSync"
    }
}
