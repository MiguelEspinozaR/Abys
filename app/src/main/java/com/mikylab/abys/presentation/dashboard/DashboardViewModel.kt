package com.mikylab.abys.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.time.LaPaz
import com.mikylab.abys.domain.model.BarraDia
import com.mikylab.abys.domain.model.BarraMes
import com.mikylab.abys.domain.model.BarraSemana
import com.mikylab.abys.domain.model.DashboardSummary
import com.mikylab.abys.domain.model.PuntoHistorial
import com.mikylab.abys.domain.repository.DashboardRepository
import com.mikylab.abys.domain.repository.SyncStatusRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

/** Estado unidireccional de la pantalla de dashboard. */
data class DashboardUiState(
    val cargando: Boolean = true,
    val mes: Int = LaPaz.hoy().monthValue,
    val anio: Int = LaPaz.hoy().year,
    val resumen: DashboardSummary? = null,
    val historial: List<PuntoHistorial> = emptyList(),
    val semana: List<BarraDia> = emptyList(),
    val semanasDelMes: List<BarraSemana> = emptyList(),
    val mesesDelAnio: List<BarraMes> = emptyList(),
    val pendientesSync: Int = 0,
    val errorSync: String? = null,
) {
    /** Total histórico (suma de todos los meses con actividad). */
    val totalHistorico: Long
        get() = historial.sumOf { it.total.centavos }

    /** Número de meses con actividad (detalle del KPI "Total histórico"). */
    val mesesActividad: Int get() = historial.size
}

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val dashboardRepository: DashboardRepository,
    private val syncStatusRepository: SyncStatusRepository,
) : ViewModel() {

    private val mesSeleccionado = MutableStateFlow(LaPaz.hoy().monthValue)
    private val anioSeleccionado = MutableStateFlow(LaPaz.hoy().year)
    private val semanaOffset = MutableStateFlow(0)

    @OptIn(ExperimentalCoroutinesApi::class)
    val uiState: StateFlow<DashboardUiState> = combine(
        mesSeleccionado,
        anioSeleccionado,
        semanaOffset,
        syncStatusRepository.observeEstado(),
    ) { mes, anio, offset, sync -> Seleccion(mes, anio, offset, sync.pendientes, sync.ultimoError) }
        .flatMapLatest { seleccion ->
            combine(
                dashboardRepository.observeResumen(seleccion.mes, seleccion.anio),
                dashboardRepository.observeHistorial(),
                dashboardRepository.observeSemana(LaPaz.hoy().plusWeeks(seleccion.semanaOffset.toLong())),
                dashboardRepository.observeMes(seleccion.mes, seleccion.anio),
                dashboardRepository.observeAnio(seleccion.anio),
            ) { resumen, historial, semana, semanas, meses ->
                DashboardUiState(
                    cargando = false,
                    mes = seleccion.mes,
                    anio = seleccion.anio,
                    resumen = resumen,
                    historial = historial,
                    semana = semana,
                    semanasDelMes = semanas,
                    mesesDelAnio = meses,
                    pendientesSync = seleccion.pendientes,
                    errorSync = seleccion.errorSync,
                )
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = DashboardUiState(),
        )

    fun mesAnterior() {
        if (mesSeleccionado.value == 1) {
            mesSeleccionado.value = 12
            anioSeleccionado.value = anioSeleccionado.value - 1
        } else {
            mesSeleccionado.value = mesSeleccionado.value - 1
        }
    }

    fun mesSiguiente() {
        if (mesSeleccionado.value == 12) {
            mesSeleccionado.value = 1
            anioSeleccionado.value = anioSeleccionado.value + 1
        } else {
            mesSeleccionado.value = mesSeleccionado.value + 1
        }
    }

    fun anioAnterior() { anioSeleccionado.value = anioSeleccionado.value - 1 }

    fun anioSiguiente() { anioSeleccionado.value = anioSeleccionado.value + 1 }

    fun semanaAnterior() { semanaOffset.value -= 1 }

    fun semanaSiguiente() { semanaOffset.value += 1 }

    private data class Seleccion(
        val mes: Int,
        val anio: Int,
        val semanaOffset: Int,
        val pendientes: Int,
        val errorSync: String?,
    )
}
