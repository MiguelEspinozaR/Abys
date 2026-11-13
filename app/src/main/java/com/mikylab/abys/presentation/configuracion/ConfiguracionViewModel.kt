package com.mikylab.abys.presentation.configuracion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.security.BaseUrlStore
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.repository.CuentaRepository
import com.mikylab.abys.domain.repository.FuenteRepository
import com.mikylab.abys.domain.repository.SettingsRepository
import com.mikylab.abys.domain.repository.SyncStatusRepository
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

/** Estado unidireccional de la pantalla de configuración. */
data class ConfiguracionUiState(
    val cuentas: List<Cuenta> = emptyList(),
    val fuentes: List<Fuente> = emptyList(),
    val modoDefault: ModoCalculo = ModoCalculo.DEFAULT,
    val pendientesSync: Int = 0,
    val errorSync: String? = null,
    val baseUrl: String = "",
    val mensaje: String? = null,
) {
    /** Suma de tasas de las cuentas ≠ General (para la alerta "Suma de tasas > 100 %"). */
    val sumaTasasNoGeneral: Long
        get() = cuentas.filterNot { it.esGeneral }.sumOf { it.tasa.bps }
}

@HiltViewModel
class ConfiguracionViewModel @Inject constructor(
    private val cuentaRepository: CuentaRepository,
    private val fuenteRepository: FuenteRepository,
    private val settingsRepository: SettingsRepository,
    private val syncStatusRepository: SyncStatusRepository,
    private val baseUrlStore: BaseUrlStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ConfiguracionUiState(baseUrl = baseUrlStore.current()))
    val uiState: StateFlow<ConfiguracionUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                cuentaRepository.observeCuentas(),
                fuenteRepository.observeFuentes(),
                settingsRepository.observeSplitSettings(),
                syncStatusRepository.observeEstado(),
            ) { cuentas, fuentes, settings, sync ->
                ConfiguracionUiState(
                    cuentas = cuentas,
                    fuentes = fuentes,
                    modoDefault = settings.modoDefault,
                    pendientesSync = sync.pendientes,
                    errorSync = sync.ultimoError,
                    baseUrl = baseUrlStore.current(),
                )
            }.collect { estado ->
                _uiState.update { actual -> estado.copy(mensaje = actual.mensaje) }
            }
        }
    }

    fun cambiarModoDefault(modo: ModoCalculo) {
        viewModelScope.launch {
            settingsRepository.setModoDefault(modo.wire)
            _uiState.update { it.copy(mensaje = "Modo por defecto: ${modo.wire}") }
        }
    }

    fun actualizarBaseUrl(url: String) {
        val ok = baseUrlStore.update(url)
        _uiState.update {
            it.copy(
                baseUrl = baseUrlStore.current(),
                mensaje = if (ok) {
                    "URL del backend actualizada"
                } else {
                    "URL no válida (debe empezar por http:// o https://)"
                },
            )
        }
    }

    fun restaurarBaseUrl() {
        baseUrlStore.reset()
        _uiState.update {
            it.copy(baseUrl = baseUrlStore.current(), mensaje = "URL restaurada")
        }
    }

    fun sincronizarAhora() {
        viewModelScope.launch {
            syncStatusRepository.sincronizarAhora()
            _uiState.update { it.copy(mensaje = "Sincronización solicitada") }
        }
    }

    fun limpiarMensaje() = _uiState.update { it.copy(mensaje = null) }
}
