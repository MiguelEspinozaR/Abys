package com.mikylab.abys.data.repository

import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.dao.DashboardDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.data.local.dao.TotalesRango
import com.mikylab.abys.data.remote.AbysApi
import com.mikylab.abys.data.remote.AbysApiProvider
import com.mikylab.abys.data.remote.dto.ApiEnvelope
import com.mikylab.abys.data.remote.dto.DashboardSummaryDto
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Tests del repositorio de dashboard (flujo **Dashboard**): agregación local (offline-first)
 * y contraste con el resumen del servidor.
 */
class DashboardRepositoryImplTest {

    private lateinit var dashboardDao: DashboardDao
    private lateinit var pagoDao: PagoDao
    private lateinit var apiProvider: AbysApiProvider
    private lateinit var api: AbysApi
    private lateinit var repo: DashboardRepositoryImpl

    @Before
    fun setUp() {
        dashboardDao = mockk(relaxed = true)
        pagoDao = mockk(relaxed = true)
        api = mockk(relaxed = true)
        apiProvider = mockk(relaxed = true)
        coEvery { apiProvider.api() } returns api

        repo = DashboardRepositoryImpl(dashboardDao, pagoDao, apiProvider)
    }

    @Test
    fun `observeResumen agrega los totales locales del mes`() = runTest {
        every { dashboardDao.observeTotales(any(), any()) } returns
            flowOf(TotalesRango(total = 26_500L, cantidad = 2))
        every { dashboardDao.observeDiasTrabajados(any(), any()) } returns flowOf(3)

        val resumen = repo.observeResumen(8, 2026).first()

        assertEquals(26_500L, resumen.total.centavos)
        assertEquals(2, resumen.cantidadPagos)
        assertEquals(3, resumen.diasTrabajados)
        assertEquals(8, resumen.mes)
        assertEquals(2026, resumen.anio)
    }

    @Test
    fun `consultarServidor devuelve el resumen remoto`() = runTest {
        coEvery { api.dashboardSummary(8, 2026) } returns ApiEnvelope(
            data = DashboardSummaryDto(
                mes = 8,
                anio = 2026,
                totalCentavos = 40_000L,
                cantidadPagos = 4,
                diasTrabajados = 6,
            ),
        )

        val resultado = repo.consultarServidor(8, 2026)

        assertTrue(resultado is AppResult.Success)
        val datos = (resultado as AppResult.Success).data
        assertEquals(40_000L, datos.total.centavos)
        assertEquals(4, datos.cantidadPagos)
        assertEquals(6, datos.diasTrabajados)
        coVerify { api.dashboardSummary(8, 2026) }
    }

    @Test
    fun `consultarServidor propaga el error de red`() = runTest {
        coEvery { api.dashboardSummary(any(), any()) } throws java.io.IOException("sin red")

        val resultado = repo.consultarServidor(8, 2026)

        assertTrue(resultado is AppResult.Failure)
        assertTrue((resultado as AppResult.Failure).error.isNetwork)
    }
}
