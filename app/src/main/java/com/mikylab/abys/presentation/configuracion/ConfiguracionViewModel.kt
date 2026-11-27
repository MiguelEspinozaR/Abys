package com.mikylab.abys.presentation.configuracion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.core.security.BaseUrlStore
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.HistorialTasa
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
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.File
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
    /** Error inline de los diálogos de cuenta. */
    val errorCuenta: String? = null,
    /** Error inline de los diálogos de fuente. */
    val errorFuente: String? = null,
    /** `true` mientras se guarda una cuenta o fuente. */
    val guardandoCuenta: Boolean = false,
    val guardandoFuente: Boolean = false,
    /** Cuenta cuyo historial de tasas está abierto (null = diálogo cerrado). */
    val historialCuenta: Cuenta? = null,
    val historial: List<HistorialTasa> = emptyList(),
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
                        errorCuenta = actual.errorCuenta,
                        errorFuente = actual.errorFuente,
                        guardandoCuenta = actual.guardandoCuenta,
                        guardandoFuente = actual.guardandoFuente,
                        historialCuenta = actual.historialCuenta,
                        historial = actual.historial,
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

    // ── Cuentas ────────────────────────────────────────────────────────────

    fun crearCuenta(
        alias: String,
        banco: String?,
        numero: String?,
        onExito: () -> Unit,
    ) = guardarCuenta(null, alias, banco, numero, onExito)

    fun actualizarCuenta(
        localId: String,
        alias: String,
        banco: String?,
        numero: String?,
        onExito: () -> Unit,
    ) = guardarCuenta(localId, alias, banco, numero, onExito)

    private fun guardarCuenta(
        localId: String?,
        alias: String,
        banco: String?,
        numero: String?,
        onExito: () -> Unit,
    ) {
        if (_uiState.value.guardandoCuenta) return
        _uiState.update { it.copy(guardandoCuenta = true, errorCuenta = null) }
        viewModelScope.launch {
            val resultado = if (localId == null) {
                cuentaRepository.crearCuenta(alias, banco, numero)
            } else {
                cuentaRepository.actualizarCuenta(localId, alias, banco, numero)
            }
            when (resultado) {
                is AppResult.Success -> {
                    _uiState.update {
                        it.copy(
                            guardandoCuenta = false,
                            mensaje = if (localId == null) {
                                "Cuenta creada"
                            } else {
                                "Cuenta actualizada"
                            },
                        )
                    }
                    onExito()
                }

                is AppResult.Failure -> _uiState.update {
                    it.copy(
                        guardandoCuenta = false,
                        errorCuenta = resultado.error.message.ifBlank { MENSAJE_GUARDAR_CUENTA },
                    )
                }
            }
        }
    }

    fun eliminarCuenta(localId: String) {
        viewModelScope.launch {
            when (val resultado = cuentaRepository.eliminarCuenta(localId)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(mensaje = "Cuenta eliminada", errorCuenta = null)
                }

                is AppResult.Failure -> _uiState.update {
                    it.copy(errorCuenta = resultado.error.message.ifBlank { MENSAJE_ELIMINAR })
                }
            }
        }
    }

    fun cambiarTasa(
        localId: String,
        tasaPorcentaje: Double,
        aplicarPendientes: Boolean,
        onExito: () -> Unit,
    ) {
        if (_uiState.value.guardandoCuenta) return
        _uiState.update { it.copy(guardandoCuenta = true, errorCuenta = null) }
        viewModelScope.launch {
            when (val resultado = cuentaRepository.cambiarTasa(
                localId,
                tasaPorcentaje,
                aplicarPendientes,
            )) {
                is AppResult.Success -> {
                    _uiState.update {
                        it.copy(guardandoCuenta = false, mensaje = "Tasa actualizada")
                    }
                    onExito()
                }

                is AppResult.Failure -> _uiState.update {
                    it.copy(
                        guardandoCuenta = false,
                        errorCuenta = resultado.error.message.ifBlank { MENSAJE_TASA },
                    )
                }
            }
        }
    }

    /** Guarda el QR localmente; la subida real la hace el worker de sincronización. */
    fun subirQr(localId: String, rutaArchivo: String) {
        viewModelScope.launch {
            when (val resultado = cuentaRepository.subirQr(localId, rutaArchivo)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(
                        mensaje = "QR guardado; se subirá con la próxima sincronización",
                        errorCuenta = null,
                    )
                }

                is AppResult.Failure -> _uiState.update {
                    it.copy(errorCuenta = resultado.error.message.ifBlank { MENSAJE_ARCHIVO })
                }
            }
        }
    }

    fun eliminarQr(localId: String) {
        viewModelScope.launch {
            when (val resultado = cuentaRepository.eliminarQr(localId)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(mensaje = "QR quitado", errorCuenta = null)
                }

                is AppResult.Failure -> _uiState.update {
                    it.copy(errorCuenta = resultado.error.message.ifBlank { MENSAJE_ARCHIVO })
                }
            }
        }
    }

    private var historialJob: Job? = null

    fun abrirHistorial(cuenta: Cuenta) {
        historialJob?.cancel()
        _uiState.update { it.copy(historialCuenta = cuenta, historial = emptyList()) }
        historialJob = viewModelScope.launch {
            cuentaRepository.observeHistorial(cuenta.localId).collect { lista ->
                _uiState.update { it.copy(historial = lista) }
            }
        }
    }

    fun cerrarHistorial() {
        historialJob?.cancel()
        historialJob = null
        _uiState.update { it.copy(historialCuenta = null, historial = emptyList()) }
    }

    // ── Fuentes ────────────────────────────────────────────────────────────

    fun crearFuente(
        alias: String,
        color: String,
        splitAuto: Boolean,
        splitAutoModo: String?,
        onExito: () -> Unit,
    ) = guardarFuente(null, alias, color, splitAuto, splitAutoModo, onExito)

    fun actualizarFuente(
        localId: String,
        alias: String,
        color: String,
        splitAuto: Boolean,
        splitAutoModo: String?,
        onExito: () -> Unit,
    ) = guardarFuente(localId, alias, color, splitAuto, splitAutoModo, onExito)

    private fun guardarFuente(
        localId: String?,
        alias: String,
        color: String,
        splitAuto: Boolean,
        splitAutoModo: String?,
        onExito: () -> Unit,
    ) {
        if (_uiState.value.guardandoFuente) return
        val colorLimpio = color.trim()
        if (!Regex("^#[0-9a-fA-F]{6}$").matches(colorLimpio)) {
            _uiState.update {
                it.copy(errorFuente = "Ingresa un color hexadecimal válido, p. ej. #3b82f6")
            }
            return
        }
        _uiState.update { it.copy(guardandoFuente = true, errorFuente = null) }
        viewModelScope.launch {
            val resultado = if (localId == null) {
                fuenteRepository.crearFuente(alias, colorLimpio, splitAuto, splitAutoModo)
            } else {
                fuenteRepository.actualizarFuente(
                    localId,
                    alias,
                    colorLimpio,
                    splitAuto,
                    splitAutoModo,
                )
            }
            when (resultado) {
                is AppResult.Success -> {
                    _uiState.update {
                        it.copy(
                            guardandoFuente = false,
                            mensaje = if (localId == null) {
                                "Fuente creada"
                            } else {
                                "Fuente actualizada"
                            },
                        )
                    }
                    onExito()
                }

                is AppResult.Failure -> _uiState.update {
                    it.copy(
                        guardandoFuente = false,
                        errorFuente = resultado.error.message.ifBlank { MENSAJE_GUARDAR_FUENTE },
                    )
                }
            }
        }
    }

    fun eliminarFuente(localId: String) {
        viewModelScope.launch {
            when (val resultado = fuenteRepository.eliminarFuente(localId)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(mensaje = "Fuente eliminada", errorFuente = null)
                }

                is AppResult.Failure -> _uiState.update {
                    it.copy(errorFuente = resultado.error.message.ifBlank { MENSAJE_ELIMINAR })
                }
            }
        }
    }

    fun subirLogo(localId: String, rutaArchivo: String) {
        viewModelScope.launch {
            when (val resultado = fuenteRepository.subirLogo(localId, rutaArchivo)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(
                        mensaje = "Logo guardado; se subirá con la próxima sincronización",
                        errorFuente = null,
                    )
                }

                is AppResult.Failure -> _uiState.update {
                    it.copy(errorFuente = resultado.error.message.ifBlank { MENSAJE_ARCHIVO })
                }
            }
        }
    }

    fun eliminarLogo(localId: String) {
        viewModelScope.launch {
            when (val resultado = fuenteRepository.eliminarLogo(localId)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(mensaje = "Logo quitado", errorFuente = null)
                }

                is AppResult.Failure -> _uiState.update {
                    it.copy(errorFuente = resultado.error.message.ifBlank { MENSAJE_ARCHIVO })
                }
            }
        }
    }

    fun limpiarErrorCuenta() = _uiState.update { it.copy(errorCuenta = null) }

    fun limpiarErrorFuente() = _uiState.update { it.copy(errorFuente = null) }

    /**
     * Modelo para Coil: [java.io.File] si la ruta es local (aún sin subir) o la URL
     * absoluta del backend si ya es `/uploads/...`.
     */
    fun modeloImagen(ruta: String?): Any? {
        if (ruta.isNullOrBlank()) return null
        if (ruta.startsWith("http://") || ruta.startsWith("https://")) return ruta
        if (ruta.startsWith("/uploads/")) return baseUrlStore.assetUrl(ruta)
        return File(ruta)
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

    private companion object {
        const val MENSAJE_GUARDAR_CUENTA = "No se pudo guardar la cuenta. Inténtalo de nuevo."
        const val MENSAJE_GUARDAR_FUENTE = "No se pudo guardar la fuente. Inténtalo de nuevo."
        const val MENSAJE_ELIMINAR = "No se pudo eliminar. Inténtalo de nuevo."
        const val MENSAJE_TASA = "No se pudo guardar la tasa. Inténtalo de nuevo."
        const val MENSAJE_ARCHIVO = "No se pudo procesar el archivo. Inténtalo de nuevo."
    }
}
