package com.mikylab.abys.presentation.dashboard

import com.mikylab.abys.core.money.Money
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.domain.model.DashboardSummary
import com.mikylab.abys.domain.model.Distribucion
import com.mikylab.abys.domain.model.PuntoHistorial
import com.mikylab.abys.domain.repository.DashboardRepository
import com.mikylab.abys.domain.repository.SyncEstado
import com.mikylab.abys.domain.repository.SyncStatusRepository
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.YearMonth

/**
 * Tests de la pantalla de **Dashboard v0.3.0**: navegación de periodos, rango del histórico
 * y contraste con el resumen del servidor.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class DashboardViewModelTest {

    private val dispatcher = UnconfinedTestDispatcher()

    private lateinit var dashboardRepository: DashboardRepository
    private lateinit var syncStatusRepository: SyncStatusRepository

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)

        dashboardRepository = mockk()
        syncStatusRepository = mockk(relaxed = true)

        every { syncStatusRepository.observeEstado() } returns flowOf(SyncEstado())
        every { dashboardRepository.observeHistorial() } returns flowOf(historial())
        every { dashboardRepository.observeResumen() } returns flowOf(
            DashboardSummary(
                totalUltimos30Dias = Money(85_000L),
                totalHistorico = Money(1_155_000L),
            ),
        )
        every { dashboardRepository.observeSemana(any()) } returns flowOf(emptyList())
        every { dashboardRepository.observeMes(any(), any()) } returns flowOf(emptyList())
        every { dashboardRepository.observeAnio(any()) } returns flowOf(emptyList())
        every { dashboardRepository.observeDistribucionMes(any(), any()) } returns
            flowOf(Distribucion(total = Money.ZERO, porFuente = emptyList()))
        every { dashboardRepository.observeDistribucionAnio(any()) } returns
            flowOf(Distribucion(total = Money.ZERO, porFuente = emptyList()))
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `el rango del historico por defecto son los ultimos 12 meses con datos`() = runTest {
        val vm = DashboardViewModel(dashboardRepository, syncStatusRepository)

        val state = vm.uiState.first { !it.cargando }

        assertEquals(12, state.historial.size)
        assertEquals(YearMonth.of(2026, 1), state.rangoHistorial?.desde)
        assertEquals(YearMonth.of(2026, 12), state.rangoHistorial?.hasta)
        // Los meses con actividad cuentan **todos**, no solo los visibles.
        assertEquals(14, state.mesesActividad)
    }

    @Test
    fun `el resumen usa los totales del repositorio`() = runTest {
        val vm = DashboardViewModel(dashboardRepository, syncStatusRepository)

        val state = vm.uiState.first { !it.cargando }

        assertEquals(85_000L, state.resumen?.totalUltimos30Dias?.centavos)
        assertEquals(1_155_000L, state.resumen?.totalHistorico?.centavos)
    }

    @Test
    fun `desplazar el rango mueve 12 meses y normaliza el ano`() {
        val rango = RangoHistorial(
            desde = YearMonth.of(2026, 3),
            hasta = YearMonth.of(2026, 12),
        )

        val anterior = rango.desplazar(-12)
        assertEquals(YearMonth.of(2025, 3), anterior.desde)
        assertEquals(YearMonth.of(2025, 12), anterior.hasta)

        val siguiente = rango.desplazar(12)
        assertEquals(YearMonth.of(2027, 3), siguiente.desde)
        assertEquals(YearMonth.of(2027, 12), siguiente.hasta)
    }

    @Test
    fun `mesSiguiente avanza un mes y ajusta el ano al cruzar diciembre`() = runTest {
        val vm = DashboardViewModel(dashboardRepository, syncStatusRepository)
        val inicial = vm.uiState.first { !it.cargando }

        vm.mesSiguiente()

        val mesEsperado = if (inicial.mes == 12) 1 else inicial.mes + 1
        val anioEsperado = if (inicial.mes == 12) inicial.anio + 1 else inicial.anio
        val nuevo = vm.uiState.first { it.mes == mesEsperado }

        assertEquals(mesEsperado, nuevo.mes)
        assertEquals(anioEsperado, nuevo.anio)
    }

    @Test
    fun `anioSiguiente solo cambia el grafico anual`() = runTest {
        val vm = DashboardViewModel(dashboardRepository, syncStatusRepository)
        val inicial = vm.uiState.first { !it.cargando }

        vm.anioSiguiente()

        val nuevo = vm.uiState.first { it.anioGrafico == inicial.anioGrafico + 1 }

        assertEquals(inicial.anio, nuevo.anio)
        assertEquals(inicial.mes, nuevo.mes)
    }

    @Test
    fun `historialSiguiente desplaza el rango 12 meses`() = runTest {
        val vm = DashboardViewModel(dashboardRepository, syncStatusRepository)
        val inicial = vm.uiState.first { !it.cargando }

        vm.historialSiguiente()

        val nuevo = vm.uiState.first { it.rangoHistorial != inicial.rangoHistorial }

        assertEquals(inicial.rangoHistorial?.hasta?.plusMonths(12), nuevo.rangoHistorial?.hasta)
        assertEquals(inicial.rangoHistorial?.desde?.plusMonths(12), nuevo.rangoHistorial?.desde)
    }

    @Test
    fun `refrescar avisa cuando el servidor tiene mas datos que el espejo local`() = runTest {
        coEvery { dashboardRepository.consultarServidor() } returns AppResult.Success(
            DashboardSummary(
                totalUltimos30Dias = Money(120_000L),
                totalHistorico = Money(1_500_000L),
            ),
        )
        val vm = DashboardViewModel(dashboardRepository, syncStatusRepository)
        vm.uiState.first { !it.cargando }

        vm.refrescar()

        val nuevo = vm.uiState.first { it.faltanDatos }
        assertTrue(nuevo.faltanDatos)
        assertEquals(120_000L, nuevo.total30dServidor)
    }

    @Test
    fun `refrescar sin diferencias no avisa y sin red mantiene los datos locales`() = runTest {
        coEvery { dashboardRepository.consultarServidor() } returns AppResult.Success(
            DashboardSummary(
                totalUltimos30Dias = Money(50_000L),
                totalHistorico = Money(1_155_000L),
            ),
        )
        val vm = DashboardViewModel(dashboardRepository, syncStatusRepository)
        vm.uiState.first { !it.cargando }

        vm.refrescar()

        val nuevo = vm.uiState.first { !it.consultandoServidor }
        assertFalse(nuevo.faltanDatos)
        assertEquals(85_000L, nuevo.resumen?.totalUltimos30Dias?.centavos)
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** 14 meses con actividad: de 2025-11 a 2026-12. */
    private fun historial(): List<PuntoHistorial> =
        (0 until 14).map { index ->
            val mes = YearMonth.of(2025, 11).plusMonths(index.toLong())
            punto(mes.year, mes.monthValue, 50_000L + index * 5_000L)
        }

    private fun punto(anio: Int, mes: Int, centavos: Long) =
        PuntoHistorial(anio = anio, mes = mes, total = Money(centavos))
}
