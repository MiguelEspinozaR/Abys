package com.mikylab.abys.domain.usecase

/**
 * Validación local de cuentas (v1.0.0).
 *
 * El backend aplica `binding:"required,max=100"` al alias y `max=50/100` a número/banco
 * (`internal/handler/cuenta_handler.go`). Validar en cliente evita un viaje de red y un 400
 * con el mensaje genérico de Gin; los textos son los de la app (es-BO).
 */
object ValidarCuentaUseCase {

    const val MAX_ALIAS = 100
    const val MAX_NUMERO = 50
    const val MAX_BANCO = 100

    /**
     * Devuelve el mensaje de error o `null` si la cuenta es válida.
     * Los valores se evalúan ya recortados (el repositorio guarda `trim()`).
     */
    fun validar(alias: String, banco: String?, numero: String?): String? {
        val aliasLimpio = alias.trim()
        if (aliasLimpio.isEmpty()) {
            return "el alias de la cuenta es obligatorio"
        }
        if (aliasLimpio.length > MAX_ALIAS) {
            return "el alias no puede superar los $MAX_ALIAS caracteres"
        }
        if (numero != null && numero.trim().length > MAX_NUMERO) {
            return "el número de cuenta no puede superar los $MAX_NUMERO caracteres"
        }
        if (banco != null && banco.trim().length > MAX_BANCO) {
            return "el banco no puede superar los $MAX_BANCO caracteres"
        }
        return null
    }
}
