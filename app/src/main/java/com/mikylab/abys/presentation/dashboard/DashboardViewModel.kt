package com.mikylab.abys.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.core.time.LaPaz
import com.mikylab.abys.domain.model.BarraDia
import com.mikylab.abys.domain.model.BarraMes
import com.mikylab.abys.domain.model.BloqueMes
import com.mikylab.abys.domain.model.DashboardSummary
import com.mikylab.abys.domain.model.Distribucion
import com.mikylab.abys.domain.model.PuntoHistorial
import com.mikylab.abys.domain.repository.DashboardRepository
import com.mikylab.abys.domain.repository.SyncStatusRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject

/**
 * Rango visible del gráfico **Histórico** (mes/año, inclusive).
 *
 * Por defecto son los últimos 12 meses **con datos**; la navegación desplaza el rango
 * 12 meses hacia atrás o hacia adelante (como `moverHist` del web).
 */
data class RangoHistorial(val desde: YearMonth, val hasta: YearMonth) {

    /** Desplaza el rango `meses` meses (positivo = hacia adelante). */
    fun desplazar(meses: Long): RangoHistorial =
        RangoHistorial(desde.plusMonths(meses), hasta.plusMonths(meses))
}

/** Lunes de la semana que contiene la fecha (semana ISO, lunes→domingo). */
private fun inicioDeSemana(fecha: LocalDate): LocalDate =
    fecha.minusDays((fecha.dayOfWeek.value - 1).toLong())

/** Selección de navegación del dashboard. */
private data class Seleccion(
    val semanaInicio: LocalDate,
    val mes: Int,
    val anio: Int,
    val anioGrafico: Int,
    val rango: RangoHistorial?,
)

/** Datos de los charts, ya agregados por el repositorio. */
private data class Datos(
    val resumen: DashboardSummary,
    val historial: List<PuntoHistorial>,
    val semana: List<BarraDia>,
    val bloques: List<BloqueMes>,
    val meses: List<BarraMes>,
    val distribucionMes: Distribucion?,
    val distribucionAnio: Distribucion?,
)

/** Estado unidireccional de la pantalla de dashboard (v0.3.0). */
data class DashboardUiState(
    val cargando: Boolean = true,
    /** Semana del gráfico **Semanal** (lunes). */
    val semanaInicio: LocalDate = inicioDeSemana(LaPaz.hoy()),
    /** Mes de los gráficos **Mensual** y **Distribución del mes**. */
    val mes: Int = LaPaz.hoy().monthValue,
    val anio: Int = LaPaz.hoy().year,
    /** Año del gráfico **Anual** y **Distribución del año**. */
    val anioGrafico: Int = LaPaz.hoy().year,
    /** Resumen (v0.3.0): últimos 30 días + total histórico. */
    val resumen: DashboardSummary? = null,
    /** Puntos del histórico **visibles** en el rango seleccionado. */
    val historial: List<PuntoHistorial> = emptyList(),
    /** Rango visible del histórico (`null` si no hay datos). */
    val rangoHistorial: RangoHistorial? = null,
    /** Número de meses con actividad (detalle del KPI "Total histórico"). */
    val mesesActividad: Int = 0,
    val semana: List<BarraDia> = emptyList(),
    val bloquesDelMes: List<BloqueMes> = emptyList(),
    val mesesDelAnio: List<BarraMes> = emptyList(),
    val distribucionMes: Distribucion? = null,
    val distribucionAnio: Distribucion? = null,
    val pendientesSync: Int = 0,
    val errorSync: String? = null,
    /**
     * `true` cuando el servidor tiene más datos que el espejo local: faltan pagos por
     * sincronizar (p. ej. la app se instaló en otro dispositivo o el push falló).
     */
    val faltanDatos: Boolean = false,
    /** Total de 30 días según el servidor (detalle del aviso "Faltan datos"). */
    val total30dServidor: Long = 0,
    val consultandoServidor: Boolean = false,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val dashboardRepository: DashboardRepository,
    private val syncStatusRepository: SyncStatusRepository,
) : ViewModel() {

    private val semanaInicio = MutableStateFlow(inicioDeSemana(LaPaz.hoy()))
    private val mesSeleccionado = MutableStateFlow(LaPaz.hoy().monthValue)
    private val anioSeleccionado = MutableStateFlow(LaPaz.hoy().year)

    /** Año del gráfico Anual y de la Distribución del año (navegación propia). */
    private val anioGrafico = MutableStateFlow(LaPaz.hoy().year)

    /** Rango del histórico elegido por el usuario (`null` = el de por defecto). */
    private val rangoOverride = MutableStateFlow<RangoHistorial?>(null)

    /** Estado de la consulta al servidor (contraste con los totales locales). */
    private val _servidor = MutableStateFlow(Servidor())

    private val historialFlow = dashboardRepository.observeHistorial()

    /** Selección de navegación (semana / mes / año / rango histórico). */
    private val seleccionFlow: kotlinx.coroutines.flow.Flow<Seleccion> =
        combine(
            semanaInicio,
            mesSeleccionado,
            anioSeleccionado,
            anioGrafico,
        ) { semana, mes, anio, anioGraf ->
            Seleccion(semana, mes, anio, anioGraf, null)
        }.combine(rangoOverride) { seleccion, rango -> seleccion.copy(rango = rango) }

    /** Datos de los charts del dashboard, ya agregados. */
    private fun datos(seleccion: Seleccion): kotlinx.coroutines.flow.Flow<Datos> =
        combine(
            dashboardRepository.observeResumen(),
            historialFlow,
            dashboardRepository.observeSemana(seleccion.semanaInicio),
            dashboardRepository.observeMes(seleccion.mes, seleccion.anio),
            dashboardRepository.observeAnio(seleccion.anioGrafico),
        ) { resumen, historial, semana, bloques, meses ->
            Datos(resumen, historial, semana, bloques, meses, null, null)
        }.combine(
            dashboardRepository.observeDistribucionMes(seleccion.mes, seleccion.anio),
        ) { datos, distMes -> datos.copy(distribucionMes = distMes) }
            .combine(
                dashboardRepository.observeDistribucionAnio(seleccion.anioGrafico),
            ) { datos, distAnio -> datos.copy(distribucionAnio = distAnio) }

    @OptIn(ExperimentalCoroutinesApi::class)
    val uiState: StateFlow<DashboardUiState> = combine(
        seleccionFlow,
        _servidor,
        syncStatusRepository.observeEstado(),
    ) { seleccion, servidor, sync ->
        Triple(seleccion, servidor, sync)
    }
        .flatMapLatest { (seleccion, servidor, sync) ->
            datos(seleccion).map { d ->
                // El rango por defecto son los últimos 12 meses **con datos**.
                val rango = seleccion.rango ?: rangoPorDefecto(d.historial)
                val visibles = if (rango == null) {
                    d.historial
                } else {
                    d.historial.filter { punto ->
                        val mes = YearMonth.of(punto.anio, punto.mes)
                        mes >= rango.desde && mes <= rango.hasta
                    }
                }
                DashboardUiState(
                    cargando = false,
                    semanaInicio = seleccion.semanaInicio,
                    mes = seleccion.mes,
                    anio = seleccion.anio,
                    anioGrafico = seleccion.anioGrafico,
                    resumen = d.resumen,
                    historial = visibles,
                    rangoHistorial = rango,
                    mesesActividad = d.historial.size,
                    semana = d.semana,
                    bloquesDelMes = d.bloques,
                    mesesDelAnio = d.meses,
                    distribucionMes = d.distribucionMes,
                    distribucionAnio = d.distribucionAnio,
                    pendientesSync = sync.pendientes,
                    errorSync = sync.ultimoError,
                    faltanDatos = servidor.faltanDatos,
                    total30dServidor = servidor.total30d,
                    consultandoServidor = servidor.consultando,
                )
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = DashboardUiState(),
        )

    init {
        // Primera apertura sin datos (instalación nueva): pedir una sincronización completa
        // para que los gráficos se llenen sin esperar al trabajo periódico.
        viewModelScope.launch {
            val estado = uiState.first { !it.cargando }
            if (estado.resumen?.totalHistorico?.centavos == 0L) {
                syncStatusRepository.sincronizarAhora()
            }
        }
    }

    fun semanaAnterior() {
        semanaInicio.value = semanaInicio.value.minusWeeks(1)
    }

    fun semanaSiguiente() {
        semanaInicio.value = semanaInicio.value.plusWeeks(1)
    }

    fun mesAnterior() {
        val mes = YearMonth.of(anioSeleccionado.value, mesSeleccionado.value).minusMonths(1)
        mesSeleccionado.value = mes.monthValue
        anioSeleccionado.value = mes.year
        limpiarServidor()
    }

    fun mesSiguiente() {
        val mes = YearMonth.of(anioSeleccionado.value, mesSeleccionado.value).plusMonths(1)
        mesSeleccionado.value = mes.monthValue
        anioSeleccionado.value = mes.year
        limpiarServidor()
    }

    /** Año del gráfico **Anual** / **Distribución del año**: un año atrás. */
    fun anioAnterior() {
        anioGrafico.value -= 1
    }

    /** Año del gráfico **Anual** / **Distribución del año**: un año adelante. */
    fun anioSiguiente() {
        anioGrafico.value += 1
    }

    /** Desplaza el rango del histórico 12 meses hacia atrás. */
    fun historialAnterior() = moverHistorial(-12)

    /** Desplaza el rango del histórico 12 meses hacia adelante. */
    fun historialSiguiente() = moverHistorial(12)

    private fun moverHistorial(meses: Long) {
        viewModelScope.launch {
            val historial = historialFlow.first()
            val actual = rangoOverride.value ?: rangoPorDefecto(historial) ?: return@launch
            rangoOverride.value = actual.desplazar(meses)
        }
    }

    /**
     * Contrasta los totales **locales** (calculados sobre Room) con los del **servidor**.
     *
     * Si el servidor tiene más importes de los que hay en el espejo local (últimos 30 días),
     * se avisa al usuario y se encola una sincronización completa (push + pull).
     */
    fun refrescar() {
        viewModelScope.launch {
            _servidor.value = _servidor.value.copy(consultando = true)
            when (val resultado = dashboardRepository.consultarServidor()) {
                is AppResult.Success -> {
                    val local = dashboardRepository.observeResumen().first()
                    val faltan = resultado.data.totalUltimos30Dias.centavos >
                        local.totalUltimos30Dias.centavos
                    _servidor.value = Servidor(
                        faltanDatos = faltan,
                        total30d = resultado.data.totalUltimos30Dias.centavos,
                        consultando = false,
                    )
                    if (faltan) syncStatusRepository.sincronizarAhora()
                }

                is AppResult.Failure -> {
                    // Sin red el dashboard sigue funcionando con los datos locales.
                    _servidor.value = Servidor(consultando = false)
                }
            }
        }
    }

    /** Fuerza una sincronización completa (push + pull) desde el dashboard. */
    fun sincronizarAhora() {
        viewModelScope.launch { syncStatusRepository.sincronizarAhora() }
    }

    private fun limpiarServidor() {
        _servidor.value = Servidor()
    }

    private data class Servidor(
        val faltanDatos: Boolean = false,
        val total30d: Long = 0,
        val consultando: Boolean = false,
    )

    private companion object {

        /** Últimos 12 meses con datos (rango por defecto del web). */
        fun rangoPorDefecto(historial: List<PuntoHistorial>): RangoHistorial? {
            val ultimo = historial.lastOrNull() ?: return null
            val hasta = YearMonth.of(ultimo.anio, ultimo.mes)
            return RangoHistorial(desde = hasta.minusMonths(11), hasta = hasta)
        }
    }
}
