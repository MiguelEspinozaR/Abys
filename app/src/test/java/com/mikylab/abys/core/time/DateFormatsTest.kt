package com.mikylab.abys.core.time

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate

/** Tests de paridad con `Abys/web/src/lib/format.test.ts` (fechas) y con el backend. */
class DateFormatsTest {

    @Test
    fun `dia de la semana en espanol sin shift UTC`() {
        assertEquals("jueves", DateFormats.diaSemana("2026-08-27"))
        assertEquals("viernes", DateFormats.diaSemana("2026-09-11"))
    }

    @Test
    fun `fecha corta en formato es-BO`() {
        assertEquals("jue 27 ago 2026", DateFormats.fechaCorta("2026-08-27"))
    }

    @Test
    fun `toIso no desplaza la zona horaria`() {
        assertEquals("2026-09-07", DateFormats.toIso(LocalDate.of(2026, 9, 7)))
        assertEquals(LocalDate.of(2026, 9, 7), DateFormats.parseIso("2026-09-07"))
    }

    @Test
    fun `parseIso rechaza fechas invalidas`() {
        assertNull(DateFormats.parseIso("2026-02-31"))
        assertNull(DateFormats.parseIso("no-es-fecha"))
    }

    @Test
    fun `parseInstant acepta RFC3339 con offset`() {
        // 2026-07-30T09:49:26.843281-04:00 → 2026-07-30T13:49:26Z
        val instant = DateFormats.parseInstant("2026-07-30T09:49:26.843281-04:00")
        assertEquals(1_785_419_366L, instant?.epochSecond)
    }

    @Test
    fun `meses abreviados en espanol`() {
        assertEquals("ago", mesesAbrev[7])
        assertEquals("dic", mesesAbrev[11])
    }
}
