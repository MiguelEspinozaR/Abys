package com.mikylab.abys.presentation.splits

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.Split
import com.mikylab.abys.domain.repository.CuentaRepository
import com.mikylab.abys.domain.repository.SplitRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Estado unidireccional de la pantalla de splits. */
data class SplitsUiState(
    val cargando: Boolean = true,
    val splits: List<Split> = emptyList(),
    val cuentas: List<Cuenta> = emptyList(),
    val expandidos: Set<String> = emptySet(),
    val error: String? = null,
) {
    val totalPendiente: Long get() = splits.sumOf { it.totalPendiente.centavos }
    val totalRealizado: Long get() = splits.sumOf { it.totalRealizado.centavos }

    /** Pendiente agregado por cuenta (como en el web). */
    val pendientePorCuenta: Map<String, Long>
        get() = splits
            .flatMap { it.transacciones }
            .filter { !it.realizado && it.cuentaLocalId != null }
            .groupBy { it.cuentaLocalId.orEmpty() }
            .mapValues { (_, transacciones) -> transacciones.sumOf { it.monto.centavos } }
}

@HiltViewModel
class SplitsViewModel @Inject constructor(
    private val splitRepository: SplitRepository,
    private val cuentaRepository: CuentaRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SplitsUiState())
    val uiState: StateFlow<SplitsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                splitRepository.observeSplits(),
                cuentaRepository.observeCuentas(),
            ) { splits, cuentas -> splits to cuentas }
                .collect { (splits, cuentas) ->
                    _uiState.update {
                        it.copy(cargando = false, splits = splits, cuentas = cuentas)
                    }
                }
        }
    }

    fun toggleExpandido(localId: String) = _uiState.update { estado ->
        val nuevos = estado.expandidos.toMutableSet()
        if (!nuevos.add(localId)) nuevos.remove(localId)
        estado.copy(expandidos = nuevos)
    }

    fun marcarRealizada(transaccionLocalId: String) {
        viewModelScope.launch {
            when (val resultado = splitRepository.marcarRealizada(transaccionLocalId)) {
                is AppResult.Failure -> _uiState.update { it.copy(error = resultado.error.message) }
                is AppResult.Success -> _uiState.update { it.copy(error = null) }
            }
        }
    }

    fun eliminarSplit(localId: String) {
        viewModelScope.launch {
            when (val resultado = splitRepository.eliminarSplit(localId)) {
                is AppResult.Failure -> _uiState.update { it.copy(error = resultado.error.message) }
                is AppResult.Success -> _uiState.update { it.copy(error = null) }
            }
        }
    }

    fun limpiarError() = _uiState.update { it.copy(error = null) }
}
