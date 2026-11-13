package com.mikylab.abys.core.security

import javax.inject.Inject
import javax.inject.Singleton

/**
 * Token de acceso de la API.
 *
 * El backend v1 **no tiene login** (regla de negocio BR-030), así que hoy el token está vacío.
 * La infraestructura queda lista: cuando el backend añada autenticación, basta con guardar el
 * token aquí y el [com.mikylab.abys.core.network.AuthInterceptor] lo añadirá a cada petición.
 */
@Singleton
class TokenStore @Inject constructor(
    private val secureStore: SecureStore,
) {

    var token: String?
        get() = secureStore.getString(KEY_TOKEN)?.takeIf { it.isNotBlank() }
        set(value) = secureStore.putString(KEY_TOKEN, value)

    fun clear() = secureStore.remove(KEY_TOKEN)

    private companion object {
        const val KEY_TOKEN = "api_token"
    }
}
