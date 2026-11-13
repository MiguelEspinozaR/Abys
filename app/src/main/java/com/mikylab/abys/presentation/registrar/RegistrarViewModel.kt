package com.mikylab.abys.presentation.registrar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.money.Money
import com.mikylab.abys.core.money.parseBsToCents
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.core.time.LaPaz
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.PagoDraft
import com.mikylab.abys.domain.repository.FuenteRepository
import com.mikylab.abys.domain.repository.PagoRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject

/** Estado unidireccional del formulario de registro de pago. */
data class RegistrarUiState(
    val fuentes: List<Fuente> = emptyList(),
    val fuenteLocalId: String? = null,
    val metodoPago: MetodoPago = MetodoPago.EFECTIVO,
    val montoTexto: String = "",
    val notas: String = "",
    val fechaPago: LocalDate = LaPaz.hoy(),
    val diasTrabajados: Set<LocalDate> = emptySet(),
    val mesCalendario: YearMonth = YearMonth.from(LaPaz.hoy()),
    val guardando: Boolean = false,
    val error: String? = null,
    val exito: String? = null,
) {
    val montoCentavos: Long? get() = parseBsToCents(montoTexto)

    val fuenteSeleccionada: Fuente?
        get() = fuentes.firstOrNull { it.localId == fuenteLocalId }

    /** El botón "Guardar pago" exige fuente, fecha, monto > 0 y al menos un día (como el web). */
    val puedeGuardar: Boolean
        get() = fuenteLocalId != null &&
            (montoCentavos ?: 0L) > 0L &&
            diasTrabajados.isNotEmpty() &&
            !guardando

    val montoAuxiliar: String
        get() {
            val centavos = montoCentavos ?: return "Ingresa un monto válido, p. ej. 265,00"
            return "= $centavos centavos (${com.mikylab.abys.core.money.centsToEditableBs(centavos)} Bs)"
        }
}

@HiltViewModel
class RegistrarViewModel @Inject constructor(
    private val pagoRepository: PagoRepository,
    private val fuenteRepository: FuenteRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegistrarUiState())
    val uiState: StateFlow<RegistrarUiState> = _uiState.asStateFlow()

    val fuentes: StateFlow<List<Fuente>> = fuenteRepository.observeFuentes()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        viewModelScope.launch {
            fuentes.collect { lista ->
                _uiState.update { estado ->
                    estado.copy(
                        fuentes = lista,
                        fuenteLocalId = estado.fuenteLocalId
                            ?: lista.firstOrNull()?.localId,
                    )
                }
            }
        }
    }

    fun seleccionarFuente(localId: String) = _uiState.update { it.copy(fuenteLocalId = localId) }

    fun seleccionarMetodo(metodo: MetodoPago) = _uiState.update { it.copy(metodoPago = metodo) }

    fun cambiarMonto(texto: String) = _uiState.update { it.copy(montoTexto = texto) }

    fun cambiarNotas(notas: String) = _uiState.update { it.copy(notas = notas) }

    fun cambiarFechaPago(fecha: LocalDate) = _uiState.update {
        it.copy(fechaPago = fecha, mesCalendario = YearMonth.from(fecha))
    }

    fun cambiarMes(delta: Int) = _uiState.update { estado ->
        estado.copy(mesCalendario = estado.mesCalendario.plusMonths(delta.toLong()))
    }

    /** Herramienta "Trabajo": alterna el día trabajado. */
    fun marcarDia(fecha: LocalDate) = _uiState.update { estado ->
        val nuevos = estado.diasTrabajados.toMutableSet()
        if (!nuevos.add(fecha)) nuevos.remove(fecha)
        estado.copy(diasTrabajados = nuevos)
    }

    /** Herramienta "Quitar": elimina el día (y limpia la fecha de pago si coincidía). */
    fun quitarDia(fecha: LocalDate) = _uiState.update { estado ->
        estado.copy(
            diasTrabajados = estado.diasTrabajados - fecha,
            fechaPago = if (estado.fechaPago == fecha) LocalDate.MIN else estado.fechaPago,
        )
    }

    fun limpiarMensajes() = _uiState.update { it.copy(error = null, exito = null) }

    fun guardar() {
        val estado = _uiState.value
        val fuenteLocalId = estado.fuenteLocalId ?: return
        val centavos = estado.montoCentavos ?: return
        _uiState.update { it.copy(guardando = true, error = null) }

        viewModelScope.launch {
            val draft = PagoDraft(
                fuenteLocalId = fuenteLocalId,
                fechaPago = estado.fechaPago,
                monto = Money(centavos),
                metodoPago = estado.metodoPago,
                notas = estado.notas.trim().takeIf { it.isNotEmpty() },
                diasTrabajados = estado.diasTrabajados.sorted(),
            )
            when (val resultado = pagoRepository.crearPago(draft)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(
                        guardando = false,
                        exito = "Pago registrado. Se sincronizará cuando haya conexión.",
                        montoTexto = "",
                        notas = "",
                        diasTrabajados = emptySet(),
                    )
                }
                is AppResult.Failure -> _uiState.update {
                    it.copy(guardando = false, error = resultado.error.message)
                }
            }
        }
    }
}
