package com.mikylab.abys.presentation.ingresos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.domain.model.FiltroPagos
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.Pago
import com.mikylab.abys.domain.repository.FuenteRepository
import com.mikylab.abys.domain.repository.PagoRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/** Estado unidireccional de la pantalla de ingresos. */
data class IngresosUiState(
    val cargando: Boolean = true,
    val pagosPorAnio: Map<Int, List<Pago>> = emptyMap(),
    val totalPagos: Int = 0,
    val expanded: Set<String> = emptySet(),
    val filtrosAplicados: FiltroPagos = FiltroPagos(),
    val fechaInicio: LocalDate? = null,
    val fechaFin: LocalDate? = null,
    val fuenteLocalId: String? = null,
    val metodoPago: MetodoPago? = null,
    val error: String? = null,
)

@HiltViewModel
class IngresosViewModel @Inject constructor(
    private val pagoRepository: PagoRepository,
    private val fuenteRepository: FuenteRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(IngresosUiState())
    val uiState: StateFlow<IngresosUiState> = _uiState.asStateFlow()

    private val filtros = MutableStateFlow(FiltroPagos(pageSize = 100))

    val fuentes: StateFlow<List<Fuente>> = fuenteRepository.observeFuentes()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        viewModelScope.launch {
            filtros
                .flatMapLatest { filtro -> pagoRepository.observePagos(filtro) }
                .collect { pagos ->
                    _uiState.update { estado ->
                        estado.copy(
                            cargando = false,
                            pagosPorAnio = pagos.groupBy { it.fechaPago.year },
                            totalPagos = pagos.size,
                        )
                    }
                }
        }
    }

    fun cambiarFechaInicio(fecha: LocalDate?) = _uiState.update { it.copy(fechaInicio = fecha) }

    fun cambiarFechaFin(fecha: LocalDate?) = _uiState.update { it.copy(fechaFin = fecha) }

    fun cambiarFuente(localId: String?) = _uiState.update { it.copy(fuenteLocalId = localId) }

    fun cambiarMetodo(metodo: MetodoPago?) = _uiState.update { it.copy(metodoPago = metodo) }

    fun aplicarFiltros() {
        val estado = _uiState.value
        filtros.value = FiltroPagos(
            fechaInicio = estado.fechaInicio,
            fechaFin = estado.fechaFin,
            fuenteLocalId = estado.fuenteLocalId,
            metodoPago = estado.metodoPago,
            pageSize = 100,
        )
        _uiState.update { it.copy(filtrosAplicados = filtros.value) }
    }

    fun limpiarFiltros() {
        _uiState.update {
            it.copy(
                fechaInicio = null,
                fechaFin = null,
                fuenteLocalId = null,
                metodoPago = null,
                filtrosAplicados = FiltroPagos(),
            )
        }
        filtros.value = FiltroPagos(pageSize = 100)
    }

    fun toggleExpandido(localId: String) = _uiState.update { estado ->
        val nuevos = estado.expanded.toMutableSet()
        if (!nuevos.add(localId)) nuevos.remove(localId)
        estado.copy(expanded = nuevos)
    }

    fun eliminarPago(localId: String) {
        viewModelScope.launch {
            when (val resultado = pagoRepository.eliminarPago(localId)) {
                is AppResult.Failure -> _uiState.update { it.copy(error = resultado.error.message) }
                is AppResult.Success -> _uiState.update { it.copy(error = null) }
            }
        }
    }

    fun limpiarError() = _uiState.update { it.copy(error = null) }
}
