package com.mikylab.abys.domain.usecase

import com.mikylab.abys.domain.model.ModoDistribucion
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Tests de la distribución equitativa: espeja `Abys/web/src/lib/distribuir.ts`
 * (y la semántica de `backend/internal/splitcalc`).
 */
class DistribuirUseCaseTest {

    private val redondeado = ModoDistribucion.REDONDEADO
    private val enteros = ModoDistribucion.ENTEROS
    private val preciso = ModoDistribucion.PRECISO

    @Test
    fun `preciso reparte en centavos y el ultimo absorbe el residuo`() {
        val montos = DistribuirUseCase.distribuir(10_000, 3, preciso)

        assertEquals(listOf(3_333L, 3_333L, 3_334L), montos)
        assertEquals(10_000L, montos.sum())
    }

    @Test
    fun `redondeado aplica half-up a 1 Bs`() {
        assertEquals(100L, DistribuirUseCase.aplicarModo(51, redondeado))
        assertEquals(100L, DistribuirUseCase.aplicarModo(50, redondeado))
        assertEquals(0L, DistribuirUseCase.aplicarModo(49, redondeado))
    }

    @Test
    fun `enteros trunca a 1 Bs`() {
        assertEquals(100L, DistribuirUseCase.aplicarModo(199, enteros))
        assertEquals(0L, DistribuirUseCase.aplicarModo(99, enteros))
    }

    @Test
    fun `redondeado con total grande reparte multiplos de 1 Bs`() {
        val montos = DistribuirUseCase.distribuir(10_000, 3, redondeado)

        // base = round(3333.33) = 3300 → 3300 + 3300 + 3400.
        assertEquals(listOf(3_300L, 3_300L, 3_400L), montos)
        assertEquals(10_000L, montos.sum())
        assertTodosMultiplosDe100(montos.dropLast(1))
    }

    @Test
    fun `totales muy pequenos no dejan al ultimo dia en negativo`() {
        // 250 centavos entre 4 días: el half-up de 62 → 100 no cabe (300 > 250).
        val montos = DistribuirUseCase.distribuir(250, 4, redondeado)

        assertEquals(4, montos.size)
        assertEquals(250L, montos.sum())
        assertEquals(true, montos.all { it >= 0 })
    }

    @Test
    fun `un solo dia recibe todo el total`() {
        assertEquals(listOf(26_500L), DistribuirUseCase.distribuir(26_500, 1, redondeado))
    }

    @Test
    fun `la suma siempre es el total en cualquier modo`() {
        listOf(redondeado, enteros, preciso).forEach { modo ->
            listOf(1L, 99L, 250L, 10_000L, 123_456L).forEach { total ->
                listOf(1, 2, 3, 7, 12).forEach { dias ->
                    val montos = DistribuirUseCase.distribuir(total, dias, modo)
                    assertEquals(
                        "total=$total dias=$dias modo=$modo",
                        total,
                        montos.sum(),
                    )
                }
            }
        }
    }

    private fun assertTodosMultiplosDe100(montos: List<Long>) {
        montos.forEach { assertEquals(0L, it % 100) }
    }
}
