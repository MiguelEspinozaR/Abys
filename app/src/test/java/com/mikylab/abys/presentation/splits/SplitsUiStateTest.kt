package com.mikylab.abys.presentation.splits

import com.mikylab.abys.core.money.Money
import com.mikylab.abys.core.money.Percent
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.model.Split
import com.mikylab.abys.domain.model.Transaccion
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Tests de la agregación de la pantalla de **Splits** (pendiente por cuenta).
 */
class SplitsUiStateTest {

    @Test
    fun `el pendiente por cuenta suma solo las transacciones no realizadas`() {
        val state = SplitsUiState(
            splits = listOf(
                splitCon(
                    transaccion("cuenta-a", 10_000L, realizado = false),
                    transaccion("cuenta-a", 5_000L, realizado = true),
                    transaccion("cuenta-b", 7_500L, realizado = false),
                ),
                splitCon(
                    transaccion("cuenta-a", 2_500L, realizado = false),
                ),
            ),
        )

        assertEquals(12_500L, state.pendientePorCuenta["cuenta-a"])
        assertEquals(7_500L, state.pendientePorCuenta["cuenta-b"])
    }

    @Test
    fun `el total pendiente y realizado suman todos los splits`() {
        val state = SplitsUiState(
            splits = listOf(
                splitCon(
                    transaccion("cuenta-a", 10_000L, realizado = false),
                    transaccion("cuenta-a", 5_000L, realizado = true),
                ),
                splitCon(
                    transaccion("cuenta-b", 7_500L, realizado = false),
                ),
            ),
        )

        assertEquals(17_500L, state.totalPendiente)
        assertEquals(5_000L, state.totalRealizado)
    }

    @Test
    fun `el pendiente por cuenta excluye la cuenta General`() {
        val state = SplitsUiState(
            cuentas = listOf(
                CuentaConQr(cuenta("cuenta-a"), null),
                CuentaConQr(cuenta("general", esGeneral = true), null),
            ),
            splits = listOf(
                splitCon(
                    transaccion("cuenta-a", 10_000L, realizado = false),
                    transaccion("general", 300L, realizado = false),
                ),
            ),
        )

        assertEquals(10_000L, state.pendientePorCuenta["cuenta-a"])
        assertNull(state.pendientePorCuenta["general"])
        assertEquals(
            listOf("cuenta-a"),
            state.pendientesDe("cuenta-a").map { it.cuentaLocalId },
        )
    }

    @Test
    fun `cuentaDe devuelve null si la transaccion no tiene cuenta`() {
        val state = SplitsUiState(
            cuentas = listOf(CuentaConQr(cuenta("cuenta-a"), null)),
        )

        assertNull(state.cuentaDe(null))
        assertEquals("cuenta-a", state.cuentaDe("cuenta-a")?.cuenta?.localId)
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private fun splitCon(vararg transacciones: Transaccion) = SplitConPago(
        split = Split(
            localId = "split-1",
            serverId = 1L,
            pagoLocalId = "pago-1",
            modoCalculo = ModoCalculo.PRECISO,
            transacciones = transacciones.toList(),
            totalPendiente = Money(transacciones.filterNot { it.realizado }.sumOf { it.monto.centavos }),
            totalRealizado = Money(transacciones.filter { it.realizado }.sumOf { it.monto.centavos }),
        ),
        pago = null,
    )

    private fun transaccion(cuentaLocalId: String, centavos: Long, realizado: Boolean) = Transaccion(
        localId = "tx-$cuentaLocalId-$centavos-$realizado",
        serverId = null,
        splitLocalId = "split-1",
        cuentaLocalId = cuentaLocalId,
        monto = Money(centavos),
        tasa = Percent(2_000L),
        aliasSnapshot = cuentaLocalId,
        realizado = realizado,
        fechaRealizacion = null,
    )

    private fun cuenta(localId: String, esGeneral: Boolean = false) = Cuenta(
        localId = localId,
        serverId = null,
        alias = localId,
        numero = null,
        banco = null,
        qrRuta = null,
        esGeneral = esGeneral,
        tasa = Percent(2_000L),
    )
}
