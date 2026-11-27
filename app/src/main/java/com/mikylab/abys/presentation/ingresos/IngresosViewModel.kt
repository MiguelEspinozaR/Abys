package com.mikylab.abys.presentation.ingresos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.core.security.BaseUrlStore
import com.mikylab.abys.domain.model.FiltroPagos
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.model.Pago
import com.mikylab.abys.domain.repository.FuenteRepository
import com.mikylab.abys.domain.repository.PagoRepository
import com.mikylab.abys.domain.repository.SplitRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
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
    /** Nº total de pagos que cumplen el filtro (puede ser mayor que los cargados). */
    val totalFiltrados: Int = 0,
    val pagina: Int = 1,
    val hayMas: Boolean = false,
    val expanded: Set<String> = emptySet(),
    val filtrosAplicados: FiltroPagos = FiltroPagos(),
    val fechaInicio: LocalDate? = null,
    val fechaFin: LocalDate? = null,
    val fuenteLocalId: String? = null,
    val metodoPago: MetodoPago? = null,
    /** Error de la última operación (mensaje literal del backend). */
    val error: String? = null,
    /** Confirmación de la última operación. */
    val mensaje: String? = null,
)

@HiltViewModel
class IngresosViewModel @Inject constructor(
    private val pagoRepository: PagoRepository,
    private val fuenteRepository: FuenteRepository,
    private val splitRepository: SplitRepository,
    private val baseUrlStore: BaseUrlStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(IngresosUiState())
    val uiState: StateFlow<IngresosUiState> = _uiState.asStateFlow()

    private val filtros = MutableStateFlow(FiltroPagos(pageSize = TAMANO_PAGINA))

    /** Pagos cargados (se acumulan al pedir más páginas). */
    private val _pagos = MutableStateFlow<List<Pago>>(emptyList())

    val fuentes: StateFlow<List<Fuente>> = fuenteRepository.observeFuentes()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        viewModelScope.launch {
            @OptIn(ExperimentalCoroutinesApi::class)
            filtros
                .flatMapLatest { filtro -> pagoRepository.observePagos(filtro.copy(page = 1)) }
                .collect { primeraPagina ->
                    _pagos.value = primeraPagina
                    _uiState.update { estado ->
                        estado.copy(
                            cargando = false,
                            pagosPorAnio = primeraPagina.groupBy { it.fechaPago.year },
                            totalPagos = primeraPagina.size,
                            pagina = 1,
                            hayMas = primeraPagina.size < estado.totalFiltrados,
                        )
                    }
                }
        }
        viewModelScope.launch {
            filtros.collect { filtro ->
                val total = pagoRepository.contarPagos(filtro)
                _uiState.update { it.copy(totalFiltrados = total, hayMas = it.totalPagos < total) }
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
            pageSize = TAMANO_PAGINA,
        )
        _uiState.update { it.copy(filtrosAplicados = filtros.value) }
    }

    fun limpiarFiltros() {
        filtros.value = FiltroPagos(pageSize = TAMANO_PAGINA)
        _uiState.update {
            it.copy(
                fechaInicio = null,
                fechaFin = null,
                fuenteLocalId = null,
                metodoPago = null,
                filtrosAplicados = filtros.value,
            )
        }
    }

    /** Carga la siguiente página de pagos (el espejo local puede ser grande). */
    fun cargarMas() {
        val estado = _uiState.value
        if (!estado.hayMas) return
        viewModelScope.launch {
            val siguientePagina = estado.pagina + 1
            val siguientes = pagoRepository
                .observePagos(filtros.value.copy(page = siguientePagina))
                .first()
            if (siguientes.isEmpty()) {
                _uiState.update { it.copy(hayMas = false) }
                return@launch
            }
            val acumulados = _pagos.value + siguientes
            _pagos.value = acumulados
            _uiState.update {
                it.copy(
                    pagosPorAnio = acumulados.groupBy { pago -> pago.fechaPago.year },
                    totalPagos = acumulados.size,
                    pagina = siguientePagina,
                    hayMas = acumulados.size < it.totalFiltrados,
                )
            }
        }
    }

    fun toggleExpandido(localId: String) = _uiState.update { estado ->
        val nuevos = estado.expanded.toMutableSet()
        if (!nuevos.add(localId)) nuevos.remove(localId)
        estado.copy(expanded = nuevos)
    }

    /**
     * Actualiza un pago (offline-first: se marca en Room y el worker lo propaga al servidor).
     *
     * BR-081 (v0.3.0): no se puede cambiar la suma de los días de un pago con split
     * (el backend responde 422 `IMMUTABLE_DATA`); el repositorio lo valida en local.
     */
    fun actualizarPago(localId: String, draft: com.mikylab.abys.domain.model.PagoDraft) {
        viewModelScope.launch {
            when (val resultado = pagoRepository.actualizarPago(localId, draft)) {
                is AppResult.Failure -> _uiState.update {
                    it.copy(error = resultado.error.message, mensaje = null)
                }

                is AppResult.Success -> _uiState.update {
                    it.copy(error = null, mensaje = "Pago actualizado")
                }
            }
        }
    }

    /**
     * Elimina un pago (offline-first: se marca en Room y el worker lo propaga al servidor).
     *
     * El backend **rechaza** (409) borrar un pago con transacciones realizadas; esa
     * comprobación se hace también en local para no perder tiempo esperando la red.
     */
    fun eliminarPago(localId: String) {
        viewModelScope.launch {
            when (val resultado = pagoRepository.eliminarPago(localId)) {
                is AppResult.Failure -> _uiState.update {
                    it.copy(error = resultado.error.message, mensaje = null)
                }

                is AppResult.Success -> _uiState.update {
                    it.copy(error = null, mensaje = "Pago eliminado")
                }
            }
        }
    }

    /**
     * Genera el split de un pago (BR-030: como máximo uno por pago).
     *
     * El cálculo es **local** ([SplitCalculator]); el servidor valida y confirma al sincronizar.
     */
    fun generarSplit(pagoLocalId: String, modo: ModoCalculo) {
        viewModelScope.launch {
            when (val resultado = splitRepository.generarSplit(pagoLocalId, modo.wire)) {
                is AppResult.Failure -> _uiState.update {
                    it.copy(error = resultado.error.message, mensaje = null)
                }

                is AppResult.Success -> _uiState.update {
                    it.copy(error = null, mensaje = "Split generado")
                }
            }
        }
    }

    /**
     * Modelo para Coil del comprobante: URL absoluta si ya está en `/uploads/...` o
     * [java.io.File] si es una ruta local aún pendiente de subir.
     */
    fun urlComprobante(pago: Pago): Any? {
        val ruta = pago.imagenRuta ?: return null
        return if (ruta.startsWith("/uploads/") || ruta.startsWith("http://") ||
            ruta.startsWith("https://")
        ) {
            baseUrlStore.assetUrl(ruta)
        } else {
            java.io.File(ruta)
        }
    }

    fun limpiarError() = _uiState.update { it.copy(error = null) }

    fun limpiarMensaje() = _uiState.update { it.copy(mensaje = null) }

    private companion object {
        const val TAMANO_PAGINA = 50
    }
}
