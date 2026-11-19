package com.mikylab.abys.domain.usecase

import com.mikylab.abys.core.money.Money
import com.mikylab.abys.domain.model.DiaTrabajadoDraft
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.PagoDraft
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/**
 * Tests de paridad con `Abys/backend/internal/service/validations.go` v0.3.0
 * (BR-001, BR-002, BR-006, BR-007, BR-010; días con monto y total derivado).
 */
class ValidarPagoUseCaseTest {

    private fun dia(fecha: LocalDate, monto: Long) = DiaTrabajadoDraft(fecha, Money(monto))

    private fun draft(
        dias: List<DiaTrabajadoDraft> = listOf(
            dia(LocalDate.of(2026, 8, 27), 26_500),
        ),
        metodo: MetodoPago = MetodoPago.EFECTIVO,
    ) = PagoDraft(
        fuenteLocalId = "fuente-1",
        fechaPago = LocalDate.of(2026, 8, 27),
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
    fun `el total es la suma de los dias`() {
        val borrador = draft(
            dias = listOf(
                dia(LocalDate.of(2026, 8, 26), 10_000),
                dia(LocalDate.of(2026, 8, 27), 16_500),
            ),
        )

        assertEquals(26_500L, borrador.monto.centavos)
    }

    @Test
    fun `rechaza monto negativo en un dia`() {
        val resultado = ValidarPagoUseCase.validar(
            draft(dias = listOf(dia(LocalDate.of(2026, 8, 27), -1))),
        )
        assertEquals(
            "el monto de un día no puede ser negativo",
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
    fun `rechaza un total de cero`() {
        val resultado = ValidarPagoUseCase.validar(
            draft(dias = listOf(dia(LocalDate.of(2026, 8, 27), 0))),
        )
        assertEquals(
            "El total del pago debe ser mayor a 0",
            (resultado as ValidarPagoUseCase.Resultado.Error).mensaje,
        )
    }

    @Test
    fun `rechaza fechas de trabajo duplicadas`() {
        val resultado = ValidarPagoUseCase.validar(
            draft(
                dias = listOf(
                    dia(LocalDate.of(2026, 8, 27), 1_000),
                    dia(LocalDate.of(2026, 8, 27), 2_000),
                ),
            ),
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
        assertFalse(ValidarPagoUseCase.montoValido(0))
        assertTrue(ValidarPagoUseCase.montoValido(1))
    }
}
