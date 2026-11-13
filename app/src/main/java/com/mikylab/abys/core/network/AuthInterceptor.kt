package com.mikylab.abys.core.network

import com.mikylab.abys.core.security.TokenStore
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Añade el header `Authorization` cuando hay un token guardado.
 *
 * El backend v1 no exige autenticación (BR-030), por lo que el token normalmente es `null`
 * y este interceptor es transparente. Si el backend añade auth en el futuro, solo hay que
 * guardar el token en [TokenStore].
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenStore: TokenStore,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenStore.token
        val request = if (token.isNullOrBlank()) {
            chain.request()
        } else {
            chain.request().newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        }
        return chain.proceed(request)
    }
}
