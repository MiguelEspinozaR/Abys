package com.mikylab.abys.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Body de `POST /pagos`. */
@Serializable
data class CrearPagoRequest(
    @SerialName("fuente_id") val fuenteId: Long,
    @SerialName("fecha_pago") val fechaPago: String,
    @SerialName("monto_enteros") val montoEnteros: Long,
    @SerialName("metodo_pago") val metodoPago: String,
    val notas: String? = null,
    @SerialName("dias_trabajados") val diasTrabajados: List<String>,
)

/**
 * Body de `PUT /pagos/:id`.
 *
 * `diasTrabajados = null` ⇒ **no se envían** (el backend no toca los días);
 * lista vacía ⇒ el backend responde 400 (debe quedar al menos 1 día).
 */
@Serializable
data class ActualizarPagoRequest(
    @SerialName("fuente_id") val fuenteId: Long,
    @SerialName("fecha_pago") val fechaPago: String,
    @SerialName("monto_enteros") val montoEnteros: Long,
    @SerialName("metodo_pago") val metodoPago: String,
    val notas: String? = null,
    @SerialName("dias_trabajados") val diasTrabajados: List<String>? = null,
)

@Serializable
data class CrearFuenteRequest(
    val alias: String,
    val color: String = "#3b82f6",
    @SerialName("logo_ruta") val logoRuta: String? = null,
    @SerialName("split_auto") val splitAuto: Boolean = false,
    @SerialName("split_auto_modo") val splitAutoModo: String? = null,
)

@Serializable
data class CrearCuentaRequest(
    val alias: String,
    val numero: String? = null,
    val banco: String? = null,
)

@Serializable
data class GenerarSplitRequest(
    @SerialName("pago_id") val pagoId: Long,
    @SerialName("modo_calculo") val modoCalculo: String,
)

/** Body de `PUT /cuentas/:id/tasa` — `tasa` en **porcentaje** (20.5 = 20,5 %). */
@Serializable
data class CambiarTasaRequest(
    val tasa: Double,
    @SerialName("aplicar_pendientes") val aplicarPendientes: Boolean = false,
)

@Serializable
data class SplitSettingsRequest(
    @SerialName("modo_default") val modoDefault: String,
)

@Serializable
data class AgregarDiaRequest(
    val fecha: String,
)
