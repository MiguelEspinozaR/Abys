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
import com.mikylab.abys.domain.model.Transaccion
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

    /** `localId` de las cuentas General (nunca por id fijo, R7.1). */
    val cuentasGenerales: Set<String>
        get() = cuentas.filter { it.cuenta.esGeneral }.map { it.cuenta.localId }.toSet()

    /**
     * Pendiente agregado por cuenta (como en el web v0.4.0).
     *
     * Excluye la cuenta General: su monto es una **reserva de redondeo** y no se transfiere,
     * por lo que tampoco entra en el "Pendiente total".
     */
    val pendientePorCuenta: Map<String, Long>
        get() {
            val generales = cuentasGenerales
            return splits
                .flatMap { it.split.transacciones }
                .filter { !it.realizado && it.cuentaLocalId != null && it.cuentaLocalId !in generales }
                .groupBy { it.cuentaLocalId.orEmpty() }
                .mapValues { (_, transacciones) -> transacciones.sumOf { it.monto.centavos } }
        }

    /** Transacciones **pendientes** de una cuenta (para "Realizar masivo"). */
    fun pendientesDe(cuentaLocalId: String): List<Transaccion> =
        splits
            .flatMap { it.split.transacciones }
            .filter { !it.realizado && it.cuentaLocalId == cuentaLocalId }

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
     * Marca varias transacciones como realizadas ("Realizar masivo", v0.4.1).
     *
     * Se procesa **una por una** en local-first (el backend no tiene endpoint bulk); cada
     * `marcarRealizada` encola su `PUT /transacciones/{id}/realizar`. [onResultado] recibe
     * los `localId` que se marcaron y los que fallaron (para reintentar solo estos).
     */
    fun marcarRealizadas(
        ids: List<String>,
        onResultado: (ok: List<String>, fallidos: List<String>) -> Unit,
    ) {
        if (ids.isEmpty()) return
        viewModelScope.launch {
            val ok = mutableListOf<String>()
            val fallidos = mutableListOf<String>()
            ids.forEach { id ->
                when (splitRepository.marcarRealizada(id)) {
                    is AppResult.Success -> ok += id
                    is AppResult.Failure -> fallidos += id
                }
            }
            _uiState.update {
                it.copy(
                    error = if (fallidos.isEmpty()) null else {
                        "${ok.size} de ${ids.size} transacciones marcadas. " +
                            "Fallaron ${fallidos.size}."
                    },
                    mensaje = if (fallidos.isEmpty()) {
                        "${ok.size} transacciones marcadas como realizadas"
                    } else {
                        null
                    },
                )
            }
            onResultado(ok, fallidos)
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
