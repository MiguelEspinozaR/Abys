package com.mikylab.abys.presentation.health

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.domain.model.HealthInfo
import com.mikylab.abys.domain.repository.HealthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Estado unidireccional de la pantalla de salud del sistema. */
data class HealthUiState(
    val cargando: Boolean = false,
    val info: HealthInfo? = null,
    val error: String? = null,
    val ultimaComprobacion: Long? = null,
)

@HiltViewModel
class HealthViewModel @Inject constructor(
    private val healthRepository: HealthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HealthUiState())
    val uiState: StateFlow<HealthUiState> = _uiState.asStateFlow()

    init { refrescar() }

    fun refrescar() {
        _uiState.update { it.copy(cargando = true, error = null) }
        viewModelScope.launch {
            when (val resultado = healthRepository.consultarHealth()) {
                is AppResult.Success -> _uiState.update {
                    it.copy(
                        cargando = false,
                        info = resultado.data,
                        error = null,
                        ultimaComprobacion = System.currentTimeMillis(),
                    )
                }
                is AppResult.Failure -> _uiState.update {
                    it.copy(cargando = false, error = resultado.error.message)
                }
            }
        }
    }
}
