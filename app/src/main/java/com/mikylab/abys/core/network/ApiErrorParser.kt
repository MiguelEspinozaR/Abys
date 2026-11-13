package com.mikylab.abys.core.network

import com.mikylab.abys.core.result.AppError
import com.mikylab.abys.core.result.AppErrorException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Convierte una respuesta de error del backend (`{"error":{"code","message","details"}}`)
 * en un [AppError] normalizado.
 *
 * Ver `Abys/backend/internal/handler/errors.go`.
 */
object ApiErrorParser {

    private val json = Json { ignoreUnknownKeys = true }

    /**
     * @param httpStatus código HTTP de la respuesta.
     * @param body cuerpo de la respuesta (puede ser `null`).
     */
    fun parse(httpStatus: Int, body: String?): AppError {
        val error = body?.let { extract(it) }
        return if (error != null) {
            AppError(
                code = error.code,
                message = error.message,
                httpStatus = httpStatus,
                details = error.details,
            )
        } else {
            AppError(
                code = defaultCode(httpStatus),
                message = defaultMessage(httpStatus),
                httpStatus = httpStatus,
            )
        }
    }

    /** Lanza la excepción normalizada (usada dentro de los repositorios). */
    fun throwAsException(httpStatus: Int, body: String?): Nothing {
        val error = parse(httpStatus, body)
        throw AppErrorException(error.code, error.message, error.httpStatus, error.details)
    }

    private data class ParsedError(val code: String, val message: String, val details: String?)

    private fun extract(body: String): ParsedError? = runCatching {
        val root = json.parseToJsonElement(body) as? JsonObject ?: return null
        val error = root["error"] as? JsonObject ?: return null
        val code = error["code"]?.jsonPrimitive?.contentOrNullSafe()
        val message = error["message"]?.jsonPrimitive?.contentOrNullSafe()
        val details = error["details"]?.jsonPrimitive?.contentOrNullSafe()
        ParsedError(
            code = code ?: defaultCode(0),
            message = message ?: "Error HTTP",
            details = details,
        )
    }.getOrNull()

    private fun kotlinx.serialization.json.JsonPrimitive.contentOrNullSafe(): String? =
        runCatching { content }.getOrNull()?.takeIf { it != "null" }

    private fun defaultCode(httpStatus: Int): String = when (httpStatus) {
        400 -> AppError.CODE_VALIDATION
        404 -> AppError.CODE_NOT_FOUND
        409 -> AppError.CODE_CONFLICT
        422 -> AppError.CODE_IMMUTABLE
        503 -> "DB_UNAVAILABLE"
        in 500..599 -> AppError.CODE_INTERNAL
        else -> AppError.CODE_UNKNOWN
    }

    private fun defaultMessage(httpStatus: Int): String = when (httpStatus) {
        0 -> "No se pudo conectar con el servidor. Verifica que el backend esté activo."
        in 500..599 -> "Error del servidor ($httpStatus). Intenta de nuevo."
        else -> "Error HTTP $httpStatus"
    }
}
