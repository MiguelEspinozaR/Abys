package com.mikylab.abys.core.security

import com.mikylab.abys.BuildConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Base URL del backend, configurable **en runtime** (Configuración → App) y persistida cifrada.
 *
 * - Default de build: `https://test3.mikylab.com/api/v1` (backend público).
 * - Preset de desarrollo: `http://10.0.2.2:8080/api/v1` (emulador → `localhost` del host).
 *
 * No hay secretos aquí: solo la URL del backend.
 */
@Singleton
class BaseUrlStore @Inject constructor(
    private val secureStore: SecureStore,
) {

    private val _baseUrl = MutableStateFlow(readInitial())

    /** URL actual (siempre terminada en `/api/v1`, sin barra final duplicada). */
    val baseUrl: StateFlow<String> = _baseUrl.asStateFlow()

    /** URL actual leída de forma síncrona (para construir el cliente HTTP). */
    fun current(): String = _baseUrl.value

    /** Cambia la URL y la persiste cifrada. Devuelve `true` si el valor es válido. */
    fun update(raw: String): Boolean {
        val normalized = normalize(raw) ?: return false
        secureStore.putString(KEY_BASE_URL, normalized)
        _baseUrl.value = normalized
        return true
    }

    /** Restaura la URL de build por defecto (backend público). */
    fun reset() {
        secureStore.remove(KEY_BASE_URL)
        _baseUrl.value = BuildConfig.DEFAULT_BASE_URL
    }

    /** Preset: backend público. */
    fun usarProduccion(): Boolean = update(BuildConfig.PRODUCTION_BASE_URL)

    /** Preset: backend local del emulador (`10.0.2.2` → host). */
    fun usarEmulador(): Boolean = update(BuildConfig.EMULATOR_BASE_URL)

    /** URL del preset de emulador (para mostrarla en la UI). */
    fun emulatorUrl(): String = BuildConfig.EMULATOR_BASE_URL

    /** URL del backend público (para mostrarla en la UI). */
    fun productionUrl(): String = BuildConfig.PRODUCTION_BASE_URL

    /**
     * Base raíz (sin `/api/v1`) para resolver los estáticos `/uploads/...`.
     */
    fun assetBase(): String = current().replace(Regex("/api/v1/?$"), "")

    /** URL absoluta de un recurso estático (`imagen_ruta`, `logo_ruta`, `qr_ruta`). */
    fun assetUrl(ruta: String?): String? {
        if (ruta.isNullOrBlank()) return null
        if (ruta.startsWith("http://") || ruta.startsWith("https://")) return ruta
        val base = assetBase()
        return base + if (ruta.startsWith("/")) ruta else "/$ruta"
    }

    private fun readInitial(): String =
        secureStore.getString(KEY_BASE_URL) ?: BuildConfig.DEFAULT_BASE_URL

    private companion object {
        const val KEY_BASE_URL = "base_url"

        /** Normaliza la URL: recorta espacios y exige que termine en `/api/v1`. */
        fun normalize(raw: String): String? {
            val trimmed = raw.trim().trimEnd('/')
            if (trimmed.isEmpty()) return null
            if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null
            return if (trimmed.endsWith("/api/v1")) trimmed else "$trimmed/api/v1"
        }
    }
}
