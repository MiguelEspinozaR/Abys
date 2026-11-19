package com.mikylab.abys.data.repository

import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.dao.DashboardDao
import com.mikylab.abys.data.local.dao.FilaDiaFuente
import com.mikylab.abys.data.local.dao.FilaMesHistorial
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
import java.time.LocalDate

/**
 * Tests del repositorio de dashboard v0.3.0 (flujo **Dashboard**): agregación local
 * (offline-first) por `dias_trabajados.fecha` y contraste con el resumen del servidor.
 */
class DashboardRepositoryImplTest {

    private lateinit var dashboardDao: DashboardDao
    private lateinit var apiProvider: AbysApiProvider
    private lateinit var api: AbysApi
    private lateinit var repo: DashboardRepositoryImpl

    @Before
    fun setUp() {
        dashboardDao = mockk(relaxed = true)
        api = mockk(relaxed = true)
        apiProvider = mockk(relaxed = true)
        coEvery { apiProvider.api() } returns api

        repo = DashboardRepositoryImpl(dashboardDao, apiProvider)
    }

    @Test
    fun `observeResumen suma los ultimos 30 dias y el historico`() = runTest {
        every { dashboardDao.observeTotalDias(any(), any()) } returns flowOf(26_500L)
        every { dashboardDao.observeTotalHistorico() } returns flowOf(155_000L)

        val resumen = repo.observeResumen().first()

        assertEquals(26_500L, resumen.totalUltimos30Dias.centavos)
        assertEquals(155_000L, resumen.totalHistorico.centavos)
    }

    @Test
    fun `observeMes reparte los dias en bloques de 7 (5 bloques en un mes de 31)`() = runTest {
        every { dashboardDao.observeFilasPorDiaFuente(any(), any()) } returns flowOf(
            listOf(
                fila("2026-08-02", 10_000L),
                fila("2026-08-09", 5_000L),
                fila("2026-08-31", 7_000L),
            ),
        )

        val bloques = repo.observeMes(8, 2026).first()

        assertEquals(5, bloques.size)
        assertEquals(1, bloques[0].bloque)
        assertEquals(LocalDate.of(2026, 8, 1), bloques[0].inicio)
        assertEquals(LocalDate.of(2026, 8, 7), bloques[0].fin)
        assertEquals(10_000L, bloques[0].total.centavos)
        assertEquals(5_000L, bloques[1].total.centavos)
        assertEquals(LocalDate.of(2026, 8, 29), bloques[4].inicio)
        assertEquals(LocalDate.of(2026, 8, 31), bloques[4].fin)
        assertEquals(7_000L, bloques[4].total.centavos)
    }

    @Test
    fun `observeMes usa 4 bloques en febrero`() = runTest {
        every { dashboardDao.observeFilasPorDiaFuente(any(), any()) } returns flowOf(emptyList())

        val bloques = repo.observeMes(2, 2026).first()

        assertEquals(4, bloques.size)
        assertEquals(LocalDate.of(2026, 2, 22), bloques[3].inicio)
        assertEquals(LocalDate.of(2026, 2, 28), bloques[3].fin)
    }

    @Test
    fun `observeSemana devuelve 7 dias y ordena por fuente por total descendente`() = runTest {
        every { dashboardDao.observeFilasPorDiaFuente(any(), any()) } returns flowOf(
            listOf(
                fila("2026-08-24", 5_000L, "fuente-a", 10L, "A", "#111111"),
                fila("2026-08-24", 20_000L, "fuente-b", 11L, "B", "#222222"),
                fila("2026-08-26", 7_000L, "fuente-a", 10L, "A", "#111111"),
            ),
        )

        val semana = repo.observeSemana(LocalDate.of(2026, 8, 26)).first()

        assertEquals(7, semana.size)
        assertEquals(LocalDate.of(2026, 8, 24), semana.first().fecha)
        assertEquals(25_000L, semana.first().total.centavos)
        // `por_fuente` ordenado por total desc: B (20.000) antes que A (5.000).
        assertEquals(listOf("B", "A"), semana.first().porFuente.map { it.alias })
        assertEquals(0L, semana[1].total.centavos)
        assertEquals(7_000L, semana[2].total.centavos)
    }

    @Test
    fun `observeDistribucionMes suma por fuente y ordena por total`() = runTest {
        every { dashboardDao.observeFilasPorDiaFuente(any(), any()) } returns flowOf(
            listOf(
                fila("2026-08-02", 5_000L, "fuente-a", 10L, "A", "#111111"),
                fila("2026-08-03", 5_000L, "fuente-a", 10L, "A", "#111111"),
                fila("2026-08-04", 30_000L, "fuente-b", 11L, "B", "#222222"),
            ),
        )

        val distribucion = repo.observeDistribucionMes(8, 2026).first()

        assertEquals(40_000L, distribucion.total.centavos)
        assertEquals(listOf("B", "A"), distribucion.porFuente.map { it.alias })
        assertEquals(10_000L, distribucion.porFuente.first { it.alias == "A" }.total.centavos)
    }

    @Test
    fun `observeHistorial respeta el orden de los meses`() = runTest {
        every { dashboardDao.observeHistorial() } returns flowOf(
            listOf(
                FilaMesHistorial(anio = "2026", mes = "01", total = 100L),
                FilaMesHistorial(anio = "2026", mes = "02", total = 200L),
            ),
        )

        val historial = repo.observeHistorial().first()

        assertEquals(2, historial.size)
        assertEquals(1, historial[0].mes)
        assertEquals(200L, historial[1].total.centavos)
    }

    @Test
    fun `consultarServidor devuelve el resumen remoto`() = runTest {
        coEvery { api.dashboardSummary() } returns ApiEnvelope(
            data = DashboardSummaryDto(
                total30dCentavos = 40_000L,
                totalHistoricoCentavos = 900_000L,
            ),
        )

        val resultado = repo.consultarServidor()

        assertTrue(resultado is AppResult.Success)
        val datos = (resultado as AppResult.Success).data
        assertEquals(40_000L, datos.totalUltimos30Dias.centavos)
        assertEquals(900_000L, datos.totalHistorico.centavos)
        coVerify { api.dashboardSummary() }
    }

    @Test
    fun `consultarServidor propaga el error de red`() = runTest {
        coEvery { api.dashboardSummary() } throws java.io.IOException("sin red")

        val resultado = repo.consultarServidor()

        assertTrue(resultado is AppResult.Failure)
        assertTrue((resultado as AppResult.Failure).error.isNetwork)
    }

    /** Fila `(día, fuente)` de la agregación local. */
    private fun fila(
        fecha: String,
        total: Long,
        fuenteLocalId: String = "fuente-1",
        fuenteServerId: Long = 10L,
        alias: String = "Principal",
        color: String = "#3b82f6",
    ) = FilaDiaFuente(
        fecha = fecha,
        fuenteLocalId = fuenteLocalId,
        fuenteServerId = fuenteServerId,
        alias = alias,
        color = color,
        total = total,
    )
}
