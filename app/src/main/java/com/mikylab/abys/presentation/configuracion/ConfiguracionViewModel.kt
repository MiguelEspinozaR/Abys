package com.mikylab.abys.presentation.configuracion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.core.security.BaseUrlStore
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.model.ModoRegistro
import com.mikylab.abys.domain.model.RegistrarSettings
import com.mikylab.abys.domain.model.SyncState
import com.mikylab.abys.domain.repository.CuentaRepository
import com.mikylab.abys.domain.repository.FuenteRepository
import com.mikylab.abys.domain.repository.HealthRepository
import com.mikylab.abys.domain.repository.SettingsRepository
import com.mikylab.abys.domain.repository.SyncStatusRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Resultado de "Probar conexión" (se muestra junto a la URL del backend). */
data class PruebaConexion(
    val ok: Boolean,
    val mensaje: String,
)

/** Estado unidireccional de la pantalla de configuración. */
data class ConfiguracionUiState(
    val cuentas: List<Cuenta> = emptyList(),
    val fuentes: List<Fuente> = emptyList(),
    val modoDefault: ModoCalculo = ModoCalculo.DEFAULT,
    /** Defaults de registro (`/settings/registrar`, v0.4.0). */
    val registrarSettings: RegistrarSettings = RegistrarSettings(),
    /** `true` mientras se persisten los defaults de registro. */
    val guardandoRegistrar: Boolean = false,
    /** Error inline de la pestaña Registro (revierte a los valores previos). */
    val errorRegistrar: String? = null,
    val pendientesSync: Int = 0,
    val errorSync: String? = null,
    val baseUrl: String = "",
    val mensaje: String? = null,
    /** `true` mientras se ejecuta "Probar conexión". */
    val probandoConexion: Boolean = false,
    /** Resultado de la última prueba de conexión. */
    val pruebaConexion: PruebaConexion? = null,
    /** `true` mientras se pide una sincronización manual. */
    val sincronizando: Boolean = false,
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
    private val healthRepository: HealthRepository,
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
                settingsRepository.observeRegistrarSettings(),
                syncStatusRepository.observeEstado(),
            ) { cuentas, fuentes, settings, registrar, sync ->
                ConfiguracionUiState(
                    cuentas = cuentas,
                    fuentes = fuentes,
                    modoDefault = settings.modoDefault,
                    registrarSettings = registrar,
                    pendientesSync = sync.pendientes,
                    errorSync = sync.ultimoError,
                    baseUrl = baseUrlStore.current(),
                )
            }.collect { estado ->
                // Los campos efímeros (mensaje, prueba de conexión) los controla la UI.
                _uiState.update { actual ->
                    estado.copy(
                        mensaje = actual.mensaje,
                        probandoConexion = actual.probandoConexion,
                        pruebaConexion = actual.pruebaConexion,
                        sincronizando = actual.sincronizando,
                        guardandoRegistrar = actual.guardandoRegistrar,
                        errorRegistrar = actual.errorRegistrar,
                    )
                }
            }
        }
    }

    /** URL del preset de emulador (backend local en el host). */
    fun emulatorUrl(): String = baseUrlStore.emulatorUrl()

    /** URL del backend público. */
    fun productionUrl(): String = baseUrlStore.productionUrl()

    fun cambiarModoDefault(modo: ModoCalculo) {
        viewModelScope.launch {
            settingsRepository.setModoDefault(modo.wire)
            _uiState.update { it.copy(mensaje = "Modo por defecto: ${modo.wire}") }
        }
    }

    /**
     * Defaults de registro (v0.4.0): actualización **optimista** con reversión si la
     * persistencia local falla (R3.5 del web). El push al backend va por la cola.
     */
    fun cambiarMetodoRegistrar(metodo: MetodoPago) {
        val actual = _uiState.value
        if (actual.guardandoRegistrar || actual.registrarSettings.metodo == metodo) return
        guardarRegistrar(metodo, actual.registrarSettings.modo)
    }

    fun cambiarModoRegistrar(modo: ModoRegistro) {
        val actual = _uiState.value
        if (actual.guardandoRegistrar || actual.registrarSettings.modo == modo) return
        guardarRegistrar(actual.registrarSettings.metodo, modo)
    }

    private fun guardarRegistrar(metodo: MetodoPago, modo: ModoRegistro) {
        val previo = _uiState.value.registrarSettings
        _uiState.update {
            it.copy(
                registrarSettings = RegistrarSettings(metodo, modo, SyncState.PENDING_UPDATE),
                guardandoRegistrar = true,
                errorRegistrar = null,
            )
        }
        viewModelScope.launch {
            when (val resultado = settingsRepository.setRegistrarSettings(metodo, modo)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(
                        guardandoRegistrar = false,
                        mensaje = "Defaults de registro actualizados",
                    )
                }

                is AppResult.Failure -> _uiState.update {
                    it.copy(
                        guardandoRegistrar = false,
                        registrarSettings = previo,
                        errorRegistrar = resultado.error.message.ifBlank {
                            "No se pudieron guardar los defaults de registro. Inténtalo de nuevo."
                        },
                    )
                }
            }
        }
    }

    /**
     * Guarda la URL y **verifica la conexión al instante**: al cambiar de backend hay que
     * descargar los datos, así que se encola una sincronización y se hace un ping.
     */
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
                pruebaConexion = null,
            )
        }
        if (ok) afterUrlChanged()
    }

    /** Preset: backend público (`https://test3.mikylab.com/api/v1`). */
    fun usarProduccion() = aplicarPreset(baseUrlStore.usarProduccion(), "Backend público")

    /** Preset: backend local del emulador (`http://10.0.2.2:8080/api/v1`). */
    fun usarEmulador() = aplicarPreset(baseUrlStore.usarEmulador(), "Backend local (emulador)")

    private fun aplicarPreset(ok: Boolean, nombre: String) {
        _uiState.update {
            it.copy(
                baseUrl = baseUrlStore.current(),
                mensaje = if (ok) "Usando $nombre" else "No se pudo aplicar el preset",
                pruebaConexion = null,
            )
        }
        if (ok) afterUrlChanged()
    }

    fun restaurarBaseUrl() {
        baseUrlStore.reset()
        _uiState.update {
            it.copy(
                baseUrl = baseUrlStore.current(),
                mensaje = "URL restaurada",
                pruebaConexion = null,
            )
        }
        afterUrlChanged()
    }

    /** Tras cambiar la URL: ping inmediato + sincronización completa. */
    private fun afterUrlChanged() {
        probarConexion()
        sincronizarAhora()
    }

    /** Ping a `GET /health` con la URL configurada. */
    fun probarConexion() {
        viewModelScope.launch {
            _uiState.update { it.copy(probandoConexion = true, pruebaConexion = null) }
            val url = baseUrlStore.current()
            val resultado = when (val ping = healthRepository.consultarPing()) {
                is AppResult.Success -> PruebaConexion(
                    ok = true,
                    mensaje = "Conectado a $url",
                )

                is AppResult.Failure -> PruebaConexion(
                    ok = false,
                    mensaje = "${ping.error.message} · $url",
                )
            }
            _uiState.update {
                it.copy(probandoConexion = false, pruebaConexion = resultado)
            }
        }
    }

    fun sincronizarAhora() {
        viewModelScope.launch {
            _uiState.update { it.copy(sincronizando = true) }
            syncStatusRepository.sincronizarAhora()
            _uiState.update {
                it.copy(sincronizando = false, mensaje = "Sincronización solicitada")
            }
        }
    }

    fun limpiarMensaje() = _uiState.update { it.copy(mensaje = null) }
}
