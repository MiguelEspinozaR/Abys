package com.mikylab.abys.domain.split

import com.mikylab.abys.domain.model.ModoCalculo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Tests de paridad con `Abys/backend/internal/splitcalc/splitcalc_test.go`.
 *
 * Cada caso replica exactamente un test del backend: si el cálculo offline cambia,
 * este test falla (y con él, la paridad con el servidor).
 */
class SplitCalculatorTest {

    private fun tasasBase() = listOf(
        SplitCalculator.TasaCuenta("2", "Box", 2_000, esGeneral = false),
        SplitCalculator.TasaCuenta("1", "Business", 3_000, esGeneral = false),
        SplitCalculator.TasaCuenta("3", "General", 0, esGeneral = true),
    )

    private fun SplitCalculator.calcularPorAlias(
        monto: Long,
        tasas: List<SplitCalculator.TasaCuenta>,
        modo: ModoCalculo,
    ): Map<String, Long> {
        val txs = SplitCalculator.calcular(monto, tasas, modo)
        assertEquals(monto, txs.sumOf { it.montoCents }) // BR-081: la suma es el monto del pago
        txs.forEach { tx ->
            if (tx.tasaBps == 0L && tx.alias != "General") {
                throw AssertionError("solo General puede tener tasa 0; ${tx.alias} tiene tasa 0")
            }
        }
        return txs.associate { it.alias to it.montoCents }
    }

    @Test
    fun `calcular split redondeado`() {
        val m = SplitCalculator.calcularPorAlias(63_300, tasasBase(), ModoCalculo.REDONDEADO)
        assertEquals(19_000L, m["Business"])
        assertEquals(12_700L, m["Box"])
        assertEquals(31_600L, m["General"])
    }

    @Test
    fun `calcular split enteros`() {
        val m = SplitCalculator.calcularPorAlias(63_300, tasasBase(), ModoCalculo.ENTEROS)
        assertEquals(18_900L, m["Business"])
        assertEquals(12_600L, m["Box"])
        assertEquals(31_800L, m["General"])
    }

    @Test
    fun `calcular split preciso`() {
        val m = SplitCalculator.calcularPorAlias(63_300, tasasBase(), ModoCalculo.PRECISO)
        assertEquals(18_990L, m["Business"])
        assertEquals(12_660L, m["Box"])
        assertEquals(31_650L, m["General"])
    }

    @Test
    fun `calcular split con una cuenta al 100 por ciento`() {
        val tasas = listOf(
            SplitCalculator.TasaCuenta("1", "Business", 10_000, esGeneral = false),
            SplitCalculator.TasaCuenta("3", "General", 0, esGeneral = true),
        )
        val m = SplitCalculator.calcularPorAlias(50_000, tasas, ModoCalculo.PRECISO)
        assertEquals(50_000L, m["Business"])
        assertEquals(0L, m["General"])
    }

    @Test
    fun `calcular split con un centavo`() {
        val tasas100 = listOf(
            SplitCalculator.TasaCuenta("1", "Business", 10_000, esGeneral = false),
            SplitCalculator.TasaCuenta("3", "General", 0, esGeneral = true),
        )
        val m1 = SplitCalculator.calcularPorAlias(1, tasas100, ModoCalculo.PRECISO)
        assertEquals(1L, m1["Business"])
        assertEquals(0L, m1["General"])

        val m2 = SplitCalculator.calcularPorAlias(100, tasasBase(), ModoCalculo.ENTEROS)
        assertEquals(0L, m2["Business"])
        assertEquals(0L, m2["Box"])
        assertEquals(100L, m2["General"])
    }

    @Test
    fun `calcular split rechaza tasas que suman mas de 100`() {
        val tasas = listOf(
            SplitCalculator.TasaCuenta("1", "Business", 6_000, esGeneral = false),
            SplitCalculator.TasaCuenta("2", "Box", 5_000, esGeneral = false),
            SplitCalculator.TasaCuenta("3", "General", 0, esGeneral = true),
        )
        val error = runCatching {
            SplitCalculator.calcular(50_000, tasas, ModoCalculo.PRECISO)
        }.exceptionOrNull()
        assertTrue(error is SplitCalculator.CalculoException)
        assertEquals("la suma de tasas supera 100% (10.000 bps)", error?.message)
    }

    @Test
    fun `calcular split exige la cuenta General`() {
        val tasas = listOf(
            SplitCalculator.TasaCuenta("1", "Business", 6_000, esGeneral = false),
        )
        val error = runCatching {
            SplitCalculator.calcular(50_000, tasas, ModoCalculo.PRECISO)
        }.exceptionOrNull()
        assertTrue(error is SplitCalculator.CalculoException)
        assertEquals("se requiere la cuenta General para absorber el residuo", error?.message)
    }

    @Test
    fun `calcular split acepta pago cero`() {
        // BR-035: un pago de 0 Bs genera transacciones en 0.
        val m = SplitCalculator.calcularPorAlias(0, tasasBase(), ModoCalculo.PRECISO)
        assertEquals(0L, m["Business"])
        assertEquals(0L, m["Box"])
        assertEquals(0L, m["General"])
    }

    @Test
    fun `recalcular interp B deja General absorbing el remanente`() {
        val rec = listOf(
            SplitCalculator.TransaccionRecalculo("10", "2", "Box", 6_000, 50_000, realizado = true, esGeneral = false),
            SplitCalculator.TransaccionRecalculo("11", "1", "Business", 3_000, 50_000, realizado = false, esGeneral = false),
            SplitCalculator.TransaccionRecalculo("12", "3", "General", 5_000, 0, realizado = false, esGeneral = true),
        )
        val res = SplitCalculator.recalcular(
            montoCents = 100_000,
            modo = ModoCalculo.PRECISO,
            txns = rec,
            tasasVigentes = mapOf("1" to 4_000L, "2" to 6_000L),
        )
        assertEquals(100_000L, res.suma + 50_000)
        assertEquals(40_000L, res.indice["11"]?.montoCents)
        assertEquals(10_000L, res.indice["12"]?.montoCents)
    }

    @Test
    fun `recalcular sin General pendiente que no cuadra falla`() {
        val rec = listOf(
            SplitCalculator.TransaccionRecalculo("11", "1", "Business", 3_000, 18_990, realizado = false, esGeneral = false),
            SplitCalculator.TransaccionRecalculo("12", "2", "Box", 2_000, 12_660, realizado = false, esGeneral = false),
        )
        val error = runCatching {
            SplitCalculator.recalcular(
                63_300,
                ModoCalculo.PRECISO,
                rec,
                mapOf("1" to 3_000L, "2" to 2_000L),
            )
        }.exceptionOrNull()
        assertTrue(error is SplitCalculator.CalculoException)
    }

    @Test
    fun `recalcular con residuo negativo es inmutable`() {
        val rec = listOf(
            SplitCalculator.TransaccionRecalculo("10", "2", "Box", 6_000, 90_000, realizado = true, esGeneral = false),
            SplitCalculator.TransaccionRecalculo("11", "1", "Business", 3_000, 10_000, realizado = false, esGeneral = false),
            SplitCalculator.TransaccionRecalculo("12", "3", "General", 5_000, 0, realizado = false, esGeneral = true),
        )
        val error = runCatching {
            SplitCalculator.recalcular(100_000, ModoCalculo.PRECISO, rec, mapOf("1" to 4_000L))
        }.exceptionOrNull()
        assertTrue(error is SplitCalculator.CalculoException)
        assertEquals("el monto restante no alcanza para cubrir las cuotas recalculadas", error?.message)
    }

    @Test
    fun `recalcular sin tasa vigente falla`() {
        val rec = listOf(
            SplitCalculator.TransaccionRecalculo("11", "1", "Business", 3_000, 50_000, realizado = false, esGeneral = false),
            SplitCalculator.TransaccionRecalculo("12", "3", "General", 5_000, 0, realizado = false, esGeneral = true),
        )
        val error = runCatching {
            SplitCalculator.recalcular(100_000, ModoCalculo.PRECISO, rec, emptyMap())
        }.exceptionOrNull()
        assertTrue(error is SplitCalculator.CalculoException)
        assertTrue(error?.message?.contains("no tiene tasa vigente") == true)
    }

    @Test
    fun `recalcular congela las transacciones realizadas`() {
        val rec = listOf(
            SplitCalculator.TransaccionRecalculo("10", "2", "Box", 2_000, 20_000, realizado = true, esGeneral = false),
            SplitCalculator.TransaccionRecalculo("11", "1", "Business", 3_000, 30_000, realizado = false, esGeneral = false),
            SplitCalculator.TransaccionRecalculo("12", "3", "General", 0, 0, realizado = false, esGeneral = true),
        )
        val res = SplitCalculator.recalcular(
            50_000,
            ModoCalculo.PRECISO,
            rec,
            mapOf("1" to 6_000L, "2" to 4_000L),
        )
        // "10" está realizada: no aparece en el índice (queda congelada).
        assertTrue(res.indice["10"] == null)
        assertEquals(30_000L, res.indice["11"]?.montoCents)
        assertEquals(0L, res.indice["12"]?.montoCents)
    }
}
