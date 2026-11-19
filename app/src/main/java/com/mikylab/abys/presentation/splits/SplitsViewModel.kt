package com.mikylab.abys.presentation.splits

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.core.security.BaseUrlStore
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.FiltroPagos
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.model.Pago
import com.mikylab.abys.domain.model.Split
import com.mikylab.abys.domain.repository.CuentaRepository
import com.mikylab.abys.domain.repository.PagoRepository
import com.mikylab.abys.domain.repository.SplitRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Split junto con el pago al que pertenece (fuente, fecha, días y monto). */
data class SplitConPago(val split: Split, val pago: Pago?)

/** Cuenta con la URL absoluta de su QR (`/uploads/...`), listo para Coil. */
data class CuentaConQr(val cuenta: Cuenta, val qrUrl: String?)

/** Estado unidireccional de la pantalla de splits. */
data class SplitsUiState(
    val cargando: Boolean = true,
    val splits: List<SplitConPago> = emptyList(),
    val cuentas: List<CuentaConQr> = emptyList(),
    /** Pagos **sin** split: se ofrecen para generarlo (como en el web). */
    val pagosSinSplit: List<Pago> = emptyList(),
    val expandidos: Set<String> = emptySet(),
    val error: String? = null,
    val mensaje: String? = null,
) {
    val totalPendiente: Long get() = splits.sumOf { it.split.totalPendiente.centavos }
    val totalRealizado: Long get() = splits.sumOf { it.split.totalRealizado.centavos }

    /** Pendiente agregado por cuenta (como en el web). */
    val pendientePorCuenta: Map<String, Long>
        get() = splits
            .flatMap { it.split.transacciones }
            .filter { !it.realizado && it.cuentaLocalId != null }
            .groupBy { it.cuentaLocalId.orEmpty() }
            .mapValues { (_, transacciones) -> transacciones.sumOf { it.monto.centavos } }

    /** Cuenta destino de una transacción (para el diálogo de transferencia). */
    fun cuentaDe(localId: String?): CuentaConQr? =
        if (localId == null) null else cuentas.firstOrNull { it.cuenta.localId == localId }
}

@HiltViewModel
class SplitsViewModel @Inject constructor(
    private val splitRepository: SplitRepository,
    private val cuentaRepository: CuentaRepository,
    private val pagoRepository: PagoRepository,
    private val baseUrlStore: BaseUrlStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SplitsUiState())
    val uiState: StateFlow<SplitsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                splitRepository.observeSplits(),
                cuentaRepository.observeCuentas(),
                pagoRepository.observePagos(FiltroPagos(pageSize = PAGINA_MAXIMA)),
            ) { splits, cuentas, pagos ->
                Triple(splits, cuentas, pagos)
            }.collect { (splits, cuentas, pagos) ->
                val pagosPorId = pagos.associateBy { it.localId }
                _uiState.update {
                    it.copy(
                        cargando = false,
                        splits = splits.map { split ->
                            SplitConPago(split, pagosPorId[split.pagoLocalId])
                        },
                        cuentas = cuentas.map { cuenta ->
                            CuentaConQr(cuenta, baseUrlStore.assetUrl(cuenta.qrRuta))
                        },
                        pagosSinSplit = pagos.filter { pago -> !pago.tieneSplit },
                    )
                }
            }
        }
    }

    fun toggleExpandido(localId: String) = _uiState.update { estado ->
        val nuevos = estado.expandidos.toMutableSet()
        if (!nuevos.add(localId)) nuevos.remove(localId)
        estado.copy(expandidos = nuevos)
    }

    /**
     * Marca una transacción como **realizada** (BR-072: irreversible; congela monto y tasa).
     */
    fun marcarRealizada(transaccionLocalId: String) {
        viewModelScope.launch {
            when (val resultado = splitRepository.marcarRealizada(transaccionLocalId)) {
                is AppResult.Failure -> _uiState.update {
                    it.copy(error = resultado.error.message, mensaje = null)
                }

                is AppResult.Success -> _uiState.update {
                    it.copy(error = null, mensaje = "Transferencia marcada como realizada")
                }
            }
        }
    }

    /**
     * Elimina un split (BR-036: no se puede si tiene transacciones realizadas).
     */
    fun eliminarSplit(localId: String) {
        viewModelScope.launch {
            when (val resultado = splitRepository.eliminarSplit(localId)) {
                is AppResult.Failure -> _uiState.update {
                    it.copy(error = resultado.error.message, mensaje = null)
                }

                is AppResult.Success -> _uiState.update {
                    it.copy(error = null, mensaje = "Split eliminado")
                }
            }
        }
    }

    /** Genera el split de un pago (BR-030: como máximo uno por pago). */
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

    fun limpiarError() = _uiState.update { it.copy(error = null) }

    fun limpiarMensaje() = _uiState.update { it.copy(mensaje = null) }

    private companion object {
        /** Máximo de pagos cargados (el web usa `page_size: 500`). */
        const val PAGINA_MAXIMA = 500
    }
}
