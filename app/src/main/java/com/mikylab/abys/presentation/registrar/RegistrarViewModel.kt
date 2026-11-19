package com.mikylab.abys.presentation.registrar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mikylab.abys.core.money.Money
import com.mikylab.abys.core.money.parseBsToCents
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.core.time.LaPaz
import com.mikylab.abys.domain.model.DiaTrabajadoDraft
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.ModoDistribucion
import com.mikylab.abys.domain.model.PagoDraft
import com.mikylab.abys.domain.repository.FuenteRepository
import com.mikylab.abys.domain.repository.PagoRepository
import com.mikylab.abys.domain.usecase.DistribuirUseCase
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

/**
 * Modo de carga de montos (R4.1/R4.2 del web):
 * - **Detallado**: el usuario ingresa el monto de cada día; el total se calcula solo.
 * - **Distribuido**: el usuario ingresa el total y el sistema lo reparte entre los días.
 */
enum class ModoRegistro(val label: String) {
    DETALLADO("Detallado"),
    DISTRIBUIDO("Distribuido"),
}

/** Estado unidireccional del formulario de registro de pago (v0.3.0). */
data class RegistrarUiState(
    val fuentes: List<Fuente> = emptyList(),
    val fuenteLocalId: String? = null,
    val metodoPago: MetodoPago = MetodoPago.EFECTIVO,
    val modoRegistro: ModoRegistro = ModoRegistro.DETALLADO,
    /** Modo detallado: monto ingresado por día (`fecha → texto en Bs`). */
    val montosDia: Map<LocalDate, String> = emptyMap(),
    /** Modo distribuido: total a repartir y modo de redondeo. */
    val totalDistribuidoTexto: String = "",
    val modoRedondeo: ModoDistribucion = ModoDistribucion.PRECISO,
    val notas: String = "",
    val fechaPago: LocalDate = LaPaz.hoy(),
    val diasTrabajados: Set<LocalDate> = emptySet(),
    val mesCalendario: YearMonth = YearMonth.from(LaPaz.hoy()),
    val guardando: Boolean = false,
    val error: String? = null,
    val exito: String? = null,
) {
    /** Días seleccionados, ordenados. */
    val diasOrdenados: List<LocalDate>
        get() = diasTrabajados.sorted()

    val fuenteSeleccionada: Fuente?
        get() = fuentes.firstOrNull { it.localId == fuenteLocalId }

    /** Días con su monto según el modo; lista vacía si falta algún monto (payload inválido). */
    val diasPayload: List<DiaTrabajadoDraft>
        get() = when (modoRegistro) {
            ModoRegistro.DISTRIBUIDO -> {
                val total = totalDistribuidoCentavos
                if (diasOrdenados.isEmpty() || total == null) {
                    emptyList()
                } else {
                    DistribuirUseCase
                        .distribuir(total, diasOrdenados.size, modoRedondeo)
                        .mapIndexed { indice, monto ->
                            DiaTrabajadoDraft(diasOrdenados[indice], Money(monto))
                        }
                }
            }

            ModoRegistro.DETALLADO -> {
                val montos = diasOrdenados.map { fecha -> montosDia[fecha]?.let(::parseBsToCents) }
                if (montos.any { it == null }) {
                    emptyList()
                } else {
                    diasOrdenados.zip(montos.map { Money(it ?: 0L) }) { fecha, monto ->
                        DiaTrabajadoDraft(fecha, monto)
                    }
                }
            }
        }

    /** Σ de los montos por día: el total del pago (derivado). */
    val totalCentavos: Long
        get() = diasPayload.sumOf { it.monto.centavos }

    /** Total del modo distribuido como centavos (`null` si el texto es inválido). */
    val totalDistribuidoCentavos: Long?
        get() = totalDistribuidoTexto.takeIf { modoRegistro == ModoRegistro.DISTRIBUIDO }
            ?.let(::parseBsToCents)

    /** Montos ya distribuidos para la vista previa (`null` si no hay distribución válida). */
    val montosDistribuidos: List<Long>?
        get() {
            if (modoRegistro != ModoRegistro.DISTRIBUIDO) return null
            val total = totalDistribuidoCentavos ?: return null
            if (diasOrdenados.isEmpty()) return null
            return DistribuirUseCase.distribuir(total, diasOrdenados.size, modoRedondeo)
        }

    /** Error del bloque de montos (como `validarMontos` del web). */
    val errorMontos: String?
        get() {
            if (diasOrdenados.isEmpty()) return null
            return when (modoRegistro) {
                ModoRegistro.DISTRIBUIDO ->
                    if (totalDistribuidoCentavos == null) {
                        "Ingresa un monto válido, p. ej. 150,00"
                    } else {
                        null
                    }

                ModoRegistro.DETALLADO -> {
                    if (diasOrdenados.any { parseBsToCents(montosDia[it] ?: "") == null }) {
                        "Ingresa el monto de cada día seleccionado, p. ej. 150,00"
                    } else if (montosDia.values.sumOf { parseBsToCents(it) ?: 0L } <= 0) {
                        "El total del pago debe ser mayor a 0"
                    } else {
                        null
                    }
                }
            }
        }

    /** El botón "Guardar pago" exige fuente, fecha, total > 0 y al menos un día (como el web). */
    val puedeGuardar: Boolean
        get() = fuenteLocalId != null &&
            fechaPago != LocalDate.MIN &&
            diasPayload.isNotEmpty() &&
            totalCentavos > 0 &&
            !guardando
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

    fun seleccionarModoRegistro(modo: ModoRegistro) =
        _uiState.update { it.copy(modoRegistro = modo) }

    fun cambiarMontoDia(fecha: LocalDate, texto: String) = _uiState.update { estado ->
        estado.copy(montosDia = estado.montosDia + (fecha to texto))
    }

    fun cambiarTotalDistribuido(texto: String) =
        _uiState.update { it.copy(totalDistribuidoTexto = texto) }

    fun cambiarModoRedondeo(modo: ModoDistribucion) =
        _uiState.update { it.copy(modoRedondeo = modo) }

    fun cambiarNotas(notas: String) = _uiState.update { it.copy(notas = notas) }

    fun cambiarFechaPago(fecha: LocalDate) = _uiState.update {
        it.copy(fechaPago = fecha, mesCalendario = YearMonth.from(fecha))
    }

    fun cambiarMes(delta: Int) = _uiState.update { estado ->
        estado.copy(mesCalendario = estado.mesCalendario.plusMonths(delta.toLong()))
    }

    /** Herramienta "Trabajo": alterna el día trabajado (y su monto en modo detallado). */
    fun marcarDia(fecha: LocalDate) = _uiState.update { estado ->
        val nuevos = estado.diasTrabajados.toMutableSet()
        val montos = estado.montosDia.toMutableMap()
        if (!nuevos.add(fecha)) {
            nuevos.remove(fecha)
            montos.remove(fecha)
        }
        estado.copy(diasTrabajados = nuevos, montosDia = montos)
    }

    /** Herramienta "Quitar": elimina el día (y limpia la fecha de pago si coincidía). */
    fun quitarDia(fecha: LocalDate) = _uiState.update { estado ->
        estado.copy(
            diasTrabajados = estado.diasTrabajados - fecha,
            montosDia = estado.montosDia - fecha,
            fechaPago = if (estado.fechaPago == fecha) LocalDate.MIN else estado.fechaPago,
        )
    }

    fun limpiarMensajes() = _uiState.update { it.copy(error = null, exito = null) }

    fun guardar() {
        val estado = _uiState.value
        val fuenteLocalId = estado.fuenteLocalId ?: return
        val dias = estado.diasPayload
        if (dias.isEmpty() || estado.totalCentavos <= 0) return
        _uiState.update { it.copy(guardando = true, error = null) }

        viewModelScope.launch {
            val draft = PagoDraft(
                fuenteLocalId = fuenteLocalId,
                fechaPago = estado.fechaPago,
                metodoPago = estado.metodoPago,
                notas = estado.notas.trim().takeIf { it.isNotEmpty() },
                diasTrabajados = dias,
            )
            when (val resultado = pagoRepository.crearPago(draft)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(
                        guardando = false,
                        exito = "Pago registrado. Se sincronizará cuando haya conexión.",
                        notas = "",
                        diasTrabajados = emptySet(),
                        montosDia = emptyMap(),
                        totalDistribuidoTexto = "",
                    )
                }
                is AppResult.Failure -> _uiState.update {
                    it.copy(guardando = false, error = resultado.error.message)
                }
            }
        }
    }
}
