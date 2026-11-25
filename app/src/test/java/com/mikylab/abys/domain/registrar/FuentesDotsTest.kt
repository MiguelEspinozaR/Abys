package com.mikylab.abys.domain.registrar

import com.mikylab.abys.core.money.Money
import com.mikylab.abys.domain.model.DiaTrabajado
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.Pago
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/** Puntos por fuente del calendario de Registrar (réplica de `fuentesDots.ts`). */
class FuentesDotsTest {

    private fun fuente(
        localId: String,
        serverId: Long?,
        alias: String,
        color: String,
    ) = Fuente(
        localId = localId,
        serverId = serverId,
        alias = alias,
        color = color,
        logoRuta = null,
        splitAuto = false,
        splitAutoModo = null,
    )

    private fun pago(
        localId: String,
        fuente: Fuente,
        fechaPago: LocalDate,
        dias: List<Pair<LocalDate, Long>>,
    ) = Pago(
        localId = localId,
        serverId = null,
        fuente = fuente,
        fechaPago = fechaPago,
        monto = Money(dias.sumOf { it.second }),
        metodoPago = MetodoPago.EFECTIVO,
        notas = null,
        imagenRuta = null,
        diasTrabajados = dias.mapIndexed { indice, (fecha, monto) ->
            DiaTrabajado(
                localId = "$localId-d$indice",
                serverId = null,
                fecha = fecha,
                monto = Money(monto),
            )
        },
        splitId = null,
        splitModo = null,
        tieneSplit = false,
    )

    @Test
    fun `acumula montos de la misma fuente y dia`() {
        val a = fuente("f-a", 1, "Trabajo", "#112233")
        val mapa = construirFuentesPorDia(
            pagos = listOf(
                pago("p1", a, LocalDate.of(2026, 1, 5), listOf(LocalDate.of(2026, 1, 2) to 1_000)),
                pago("p2", a, LocalDate.of(2026, 1, 6), listOf(LocalDate.of(2026, 1, 2) to 2_500)),
            ),
            fuentes = listOf(a),
        )

        val dia = mapa.getValue(LocalDate.of(2026, 1, 2))
        assertEquals(1, dia.size)
        assertEquals(3_500L, dia.getValue("f-a").totalCentavos)
    }

    @Test
    fun `top3 ordena por total descendente y desempata por fuente id`() {
        val a = fuente("f-a", 10, "A", "#111111")
        val b = fuente("f-b", 5, "B", "#222222")
        val c = fuente("f-c", 7, "C", "#333333")
        val d = fuente("f-d", 1, "D", "#444444")
        val dia = LocalDate.of(2026, 2, 1)
        val mapa = construirFuentesPorDia(
            pagos = listOf(
                pago("p1", a, dia, listOf(dia to 100)),
                pago("p2", b, dia, listOf(dia to 300)),
                pago("p3", c, dia, listOf(dia to 300)),
                pago("p4", d, dia, listOf(dia to 50)),
            ),
            fuentes = listOf(a, b, c, d),
        )

        val top = top3Fuentes(mapa, dia)
        assertEquals(listOf(5L, 7L, 10L), top.map { it.fuenteId })
        assertEquals(3, top.size)
    }

    @Test
    fun `color invalido cae al gris de reserva`() {
        val a = fuente("f-a", 1, "A", "no-es-hex")
        val dia = LocalDate.of(2026, 3, 1)
        val mapa = construirFuentesPorDia(
            pagos = listOf(pago("p1", a, dia, listOf(dia to 100))),
            fuentes = listOf(a),
        )

        assertEquals(COLOR_FUENTE_FALLBACK, mapa.getValue(dia).getValue("f-a").color)
    }

    @Test
    fun `leyenda deduplica por fuente y ordena por id`() {
        val a = fuente("f-a", 2, "A", "#111111")
        val b = fuente("f-b", 1, "B", "#222222")
        val mapa = construirFuentesPorDia(
            pagos = listOf(
                pago("p1", a, LocalDate.of(2026, 4, 1), listOf(LocalDate.of(2026, 4, 1) to 100)),
                pago("p2", a, LocalDate.of(2026, 4, 2), listOf(LocalDate.of(2026, 4, 2) to 100)),
                pago("p3", b, LocalDate.of(2026, 4, 1), listOf(LocalDate.of(2026, 4, 1) to 100)),
            ),
            fuentes = listOf(a, b),
        )

        val leyenda = fuentesParaLeyenda(mapa)
        assertEquals(listOf("f-b", "f-a"), leyenda.map { it.localId })
    }

    @Test
    fun `valida solo hex rrggbb`() {
        assertTrue(esColorHex("#A1B2C3"))
        assertFalse(esColorHex("#A1B2C3D4"))
        assertFalse(esColorHex("red"))
        assertFalse(esColorHex(null))
    }
}
