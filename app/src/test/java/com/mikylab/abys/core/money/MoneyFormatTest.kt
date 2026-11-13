package com.mikylab.abys.core.money

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Tests de paridad con `Abys/web/src/lib/format.test.ts` (formatBs, bsToCents, formatTasaBps).
 */
class MoneyFormatTest {

    @Test
    fun `formatBs usa separadores es-BO`() {
        assertEquals("265,00 Bs", Money.format(26_500))
        assertEquals("1.234,56 Bs", Money.format(123_456))
        assertEquals("0,00 Bs", Money.format(0))
        assertEquals("0,01 Bs", Money.format(1))
    }

    @Test
    fun `formatBs usa el signo menos tipografico`() {
        assertEquals("−0,50 Bs", Money.format(-50))
    }

    @Test
    fun `bsToCents parsea formato es-BO`() {
        assertEquals(123_456L, parseBsToCents("1.234,56"))
        assertEquals(123_456L, parseBsToCents("1234,56"))
        assertEquals(123_456L, parseBsToCents("1,234.56"))
        assertEquals(123_456L, parseBsToCents("1234.56"))
    }

    @Test
    fun `bsToCents acepta enteros y sufijo Bs`() {
        assertEquals(26_500L, parseBsToCents("265"))
        assertEquals(26_500L, parseBsToCents("265 Bs"))
        assertEquals(1_234L, parseBsToCents("12,34 Bs"))
    }

    @Test
    fun `bsToCents rechaza vacio no numerico y negativos`() {
        assertNull(parseBsToCents(""))
        assertNull(parseBsToCents("abc"))
        assertNull(parseBsToCents("-50"))
    }

    @Test
    fun `bsToCents redondea fracciones de centavo`() {
        assertEquals(1_235L, parseBsToCents("12.345"))
    }

    @Test
    fun `formatTasaBps muestra porcentaje con espacio`() {
        assertEquals("20 %", Percent.format(2_000))
        assertEquals("30,5 %", Percent.format(3_050))
    }

    @Test
    fun `conversion de porcentaje a bps`() {
        assertEquals(20.0, 2_000L.toPercentNumber(), 0.0001)
        assertEquals(30.5, 3_050L.toPercentNumber(), 0.0001)
        assertEquals(2_050L, 20.5.toBps())
    }
}
