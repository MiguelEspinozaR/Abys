package com.mikylab.abys.core.result

/**
 * Resultado uniforme de las operaciones de la app.
 *
 * - [Success] = operación correcta.
 * - [Failure] = error con el código/mensaje del backend (o de red).
 *
 * El mensaje de [AppError.message] es **el literal del backend** (`error.message`), de modo que
 * la UI pueda mostrarlo tal cual, igual que hace el frontend web.
 */
sealed interface AppResult<out T> {

    data class Success<out T>(val data: T) : AppResult<T>

    data class Failure(val error: AppError) : AppResult<Nothing>

    val isSuccess: Boolean get() = this is Success

    fun getOrNull(): T? = (this as? Success)?.data

    fun errorOrNull(): AppError? = (this as? Failure)?.error

    companion object {
        inline fun <T> of(block: () -> T): AppResult<T> = try {
            Success(block())
        } catch (e: Throwable) {
            Failure(AppError.fromThrowable(e))
        }
    }
}

/** Transforma el valor de éxito (útil en cadenas de `flatMap`). */
inline fun <T, R> AppResult<T>.map(transform: (T) -> R): AppResult<R> = when (this) {
    is AppResult.Success -> AppResult.Success(transform(data))
    is AppResult.Failure -> this
}

/** Ejecuta [action] solo si el resultado es un éxito. */
inline fun <T> AppResult<T>.onSuccess(action: (T) -> Unit): AppResult<T> {
    if (this is AppResult.Success) action(data)
    return this
}

/** Ejecuta [action] solo si el resultado es un error. */
inline fun <T> AppResult<T>.onFailure(action: (AppError) -> Unit): AppResult<T> {
    if (this is AppResult.Failure) action(error)
    return this
}

/**
 * Error de la aplicación. Replica los códigos de `Abys/backend/internal/apperr`:
 * `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `BUSINESS_RULE_CONFLICT` (409),
 * `IMMUTABLE_DATA` (422), `INTERNAL_ERROR` (500), `DB_UNAVAILABLE` (503).
 */
data class AppError(
    val code: String,
    val message: String,
    val httpStatus: Int = 0,
    val details: String? = null,
    val cause: Throwable? = null,
) {
    /** No se pudo hablar con el servidor (sin red, DNS, timeout, base URL inválida). */
    val isNetwork: Boolean get() = code == CODE_NETWORK

    /** 422: el backend rechazó la operación por datos inmutables. */
    val isImmutable: Boolean get() = code == CODE_IMMUTABLE

    /** 409: regla de negocio. */
    val isConflict: Boolean get() = code == CODE_CONFLICT

    /** 400: error de validación (no reintentable). */
    val isValidation: Boolean get() = code == CODE_VALIDATION

    /** El error requiere decisión del usuario: no se reintenta automáticamente. */
    val isTerminal: Boolean
        get() = isValidation || isConflict || isImmutable || httpStatus == 404

    companion object {
        const val CODE_NETWORK = "NETWORK_ERROR"
        const val CODE_VALIDATION = "VALIDATION_ERROR"
        const val CODE_NOT_FOUND = "NOT_FOUND"
        const val CODE_CONFLICT = "BUSINESS_RULE_CONFLICT"
        const val CODE_IMMUTABLE = "IMMUTABLE_DATA"
        const val CODE_INTERNAL = "INTERNAL_ERROR"
        const val CODE_UNKNOWN = "ERROR"

        fun network(message: String, cause: Throwable? = null) = AppError(
            code = CODE_NETWORK,
            message = message,
            cause = cause,
        )

        fun fromThrowable(e: Throwable): AppError = when (e) {
            is AppErrorException -> AppError(e.code, e.message, e.httpStatus, e.details, e)
            else -> AppError(
                code = CODE_UNKNOWN,
                message = e.message ?: "Error inesperado",
                cause = e,
            )
        }
    }
}

/** Excepción interna que transporta un error ya normalizado del backend. */
class AppErrorException(
    val code: String,
    override val message: String,
    val httpStatus: Int = 0,
    val details: String? = null,
) : Exception(message)
