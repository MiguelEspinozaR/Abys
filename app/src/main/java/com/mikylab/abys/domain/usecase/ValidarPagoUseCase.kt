package com.mikylab.abys.domain.usecase

import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.PagoDraft
import java.time.LocalDate

/**
 * Validación de pagos en cliente (reglas BR-001, BR-002, BR-006, BR-007, BR-010).
 *
 * Replica `Abys/backend/internal/service/validations.go` (v0.3.0: días con monto). Los
 * mensajes son los del backend, para que la UI muestre siempre el mismo texto.
 */
object ValidarPagoUseCase {

    sealed interface Resultado {
        data class Ok(val draft: PagoDraft) : Resultado
        data class Error(val mensaje: String) : Resultado
    }

    private val metodosPermitidos = MetodoPago.entries.map { it.wire }

    fun validar(draft: PagoDraft): Resultado {
        if (draft.diasTrabajados.isEmpty()) {
            return Resultado.Error("un pago debe tener al menos un día trabajado")
        }
        val duplicados = draft.diasTrabajados
            .groupingBy { it.fecha }
            .eachCount()
            .filterValues { it > 1 }
        if (duplicados.isNotEmpty()) {
            return Resultado.Error(
                "fechas de trabajo duplicadas dentro del mismo pago: ${duplicados.keys.first()}",
            )
        }
        val negativo = draft.diasTrabajados.firstOrNull { it.monto.centavos < 0 }
        if (negativo != null) {
            return Resultado.Error("el monto de un día no puede ser negativo")
        }
        if (draft.monto.centavos <= 0) {
            return Resultado.Error("El total del pago debe ser mayor a 0")
        }
        if (!metodosPermitidos.contains(draft.metodoPago.wire)) {
            return Resultado.Error(
                "método de pago inválido; use: ${metodosPermitidos.joinToString(", ")}",
            )
        }
        return Resultado.Ok(draft)
    }

    /** `monto_enteros` no puede cambiar si el pago ya tiene split (el backend responde 422). */
    fun puedeEditarMonto(tieneSplit: Boolean): Boolean = !tieneSplit

    /** No se puede eliminar el último día trabajado (BR-002). */
    fun puedeQuitarDia(cantidadActual: Int): Boolean = cantidadActual > 1

    /** El web exige `total > 0` (Σ de los días) para habilitar el guardado. */
    fun montoValido(totalCentavos: Long): Boolean = totalCentavos > 0

    /** Fecha válida y real (rechaza 31/02). */
    fun fechaValida(fecha: LocalDate?): Boolean = fecha != null
}
