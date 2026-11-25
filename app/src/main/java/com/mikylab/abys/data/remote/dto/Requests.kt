package com.mikylab.abys.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Día trabajado enviado en POST/PUT de pagos (v0.3.0: con monto en centavos). */
@Serializable
data class DiaInputRequest(
    val fecha: String,
    @SerialName("monto_enteros") val montoEnteros: Long,
)

/**
 * Body de `POST /pagos` (v0.3.0).
 *
 * `montoEnteros` es **opcional**: el backend deriva el total de Σ días y **lo ignora**;
 * omitirlo (`null`) evita el 422 `TOTAL_DESINCRONIZADO` (R3.2 del web).
 */
@Serializable
data class CrearPagoRequest(
    @SerialName("fuente_id") val fuenteId: Long,
    @SerialName("fecha_pago") val fechaPago: String,
    @SerialName("monto_enteros") val montoEnteros: Long? = null,
    @SerialName("metodo_pago") val metodoPago: String,
    val notas: String? = null,
    @SerialName("dias_trabajados") val diasTrabajados: List<DiaInputRequest>,
)

/**
 * Body de `PUT /pagos/:id`.
 *
 * `diasTrabajados = null` ⇒ **no se envían** (el backend no toca los días);
 * lista vacía ⇒ el backend responde 400 (debe quedar al menos 1 día).
 * El total del pago es derivado (Σ días): `montoEnteros` se omite.
 */
@Serializable
data class ActualizarPagoRequest(
    @SerialName("fuente_id") val fuenteId: Long,
    @SerialName("fecha_pago") val fechaPago: String,
    @SerialName("monto_enteros") val montoEnteros: Long? = null,
    @SerialName("metodo_pago") val metodoPago: String,
    val notas: String? = null,
    @SerialName("dias_trabajados") val diasTrabajados: List<DiaInputRequest>? = null,
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

/** Body de `PUT /settings/registrar` (v0.4.0): ambos campos son obligatorios. */
@Serializable
data class RegistrarSettingsRequest(
    @SerialName("metodo_default") val metodoDefault: String,
    @SerialName("modo_default") val modoDefault: String,
)

/** Body de `POST /pagos/:id/dias` (v0.3.0: día con monto en centavos). */
@Serializable
data class AgregarDiaRequest(
    val fecha: String,
    @SerialName("monto_enteros") val montoEnteros: Long,
)
