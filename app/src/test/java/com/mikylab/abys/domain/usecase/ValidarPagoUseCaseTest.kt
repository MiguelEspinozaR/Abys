package com.mikylab.abys.domain.usecase

import com.mikylab.abys.core.money.Money
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.PagoDraft
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/**
 * Tests de paridad con `Abys/backend/internal/service/validations.go`
 * (BR-001, BR-002, BR-006, BR-007, BR-010).
 */
class ValidarPagoUseCaseTest {

    private fun draft(
        monto: Long = 26_500,
        metodo: MetodoPago = MetodoPago.EFECTIVO,
        dias: List<LocalDate> = listOf(LocalDate.of(2026, 8, 27)),
    ) = PagoDraft(
        fuenteLocalId = "fuente-1",
        fechaPago = LocalDate.of(2026, 8, 27),
        monto = Money(monto),
        metodoPago = metodo,
        notas = null,
        diasTrabajados = dias,
    )

    @Test
    fun `acepta un pago valido`() {
        val resultado = ValidarPagoUseCase.validar(draft())
        assertTrue(resultado is ValidarPagoUseCase.Resultado.Ok)
    }

    @Test
    fun `rechaza monto negativo`() {
        val resultado = ValidarPagoUseCase.validar(draft(monto = -1))
        assertEquals(
            "el monto del pago no puede ser negativo",
            (resultado as ValidarPagoUseCase.Resultado.Error).mensaje,
        )
    }

    @Test
    fun `rechaza pago sin dias trabajados`() {
        val resultado = ValidarPagoUseCase.validar(draft(dias = emptyList()))
        assertEquals(
            "un pago debe tener al menos un día trabajado",
            (resultado as ValidarPagoUseCase.Resultado.Error).mensaje,
        )
    }

    @Test
    fun `rechaza fechas de trabajo duplicadas`() {
        val resultado = ValidarPagoUseCase.validar(
            draft(dias = listOf(LocalDate.of(2026, 8, 27), LocalDate.of(2026, 8, 27))),
        )
        assertTrue(
            (resultado as ValidarPagoUseCase.Resultado.Error).mensaje
                .startsWith("fechas de trabajo duplicadas dentro del mismo pago"),
        )
    }

    @Test
    fun `no se puede editar el monto si el pago tiene split`() {
        assertFalse(ValidarPagoUseCase.puedeEditarMonto(tieneSplit = true))
        assertTrue(ValidarPagoUseCase.puedeEditarMonto(tieneSplit = false))
    }

    @Test
    fun `no se puede quitar el ultimo dia trabajado`() {
        assertFalse(ValidarPagoUseCase.puedeQuitarDia(1))
        assertTrue(ValidarPagoUseCase.puedeQuitarDia(2))
    }

    @Test
    fun `el monto debe ser mayor que cero para guardar`() {
        assertFalse(ValidarPagoUseCase.montoValido(Money(0)))
        assertTrue(ValidarPagoUseCase.montoValido(Money(1)))
    }
}
