package com.mikylab.abys.data.remote

import com.mikylab.abys.core.network.ApiErrorParser
import com.mikylab.abys.core.result.AppError
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.core.security.BaseUrlStore
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Provee [AbysApi] con la **base URL actual** (editable en Ajustes).
 *
 * Cuando la URL cambia, se reconstruye Retrofit de forma perezosa; el `OkHttpClient`
 * (con el interceptor de auth, timeouts y pool de conexiones) se reutiliza.
 */
@Singleton
class AbysApiProvider @Inject constructor(
    private val baseUrlStore: BaseUrlStore,
    private val json: Json,
    private val okHttpClient: OkHttpClient,
) {

    @Volatile
    private var cachedBaseUrl: String? = null

    @Volatile
    private var cachedApi: AbysApi? = null

    @Synchronized
    fun api(): AbysApi {
        val base = baseUrlStore.current()
        val current = cachedApi
        if (current != null && cachedBaseUrl == base) return current

        val retrofit = Retrofit.Builder()
            .baseUrl(base)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

        val api = retrofit.create(AbysApi::class.java)
        cachedApi = api
        cachedBaseUrl = base
        return api
    }
}

/**
 * Ejecuta una llamada de red y traduce sus fallos a [AppResult].
 *
 * - Error HTTP → se parsea `{"error":{"code","message","details"}}`.
 * - Error de red (sin conexión, DNS, timeout) → [AppError.isNetwork].
 */
suspend fun <T> safeApiCall(block: suspend () -> T): AppResult<T> = try {
    AppResult.Success(block())
} catch (e: HttpException) {
    val body = runCatching { e.response()?.errorBody()?.string() }.getOrNull()
    AppResult.Failure(ApiErrorParser.parse(e.code(), body))
} catch (e: IOException) {
    AppResult.Failure(
        AppError.network(
            "No se pudo conectar con el servidor. Verifica que el backend esté activo.",
            e,
        ),
    )
} catch (e: Throwable) {
    AppResult.Failure(AppError.fromThrowable(e))
}
