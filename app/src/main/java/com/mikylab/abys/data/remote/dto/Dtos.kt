package com.mikylab.abys.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Envoltorio de éxito del backend: `{"data": ...}` (+ `meta` en `GET /pagos`).
 */
@Serializable
data class ApiEnvelope<T>(
    val data: T? = null,
    val meta: PagosMeta? = null,
)

@Serializable
data class PagosMeta(
    val page: Int = 1,
    @SerialName("page_size") val pageSize: Int = 20,
    val total: Int = 0,
    @SerialName("total_pages") val totalPages: Int = 0,
)

/** Envoltorio de error: `{"error":{"code","message","details?"}}`. */
@Serializable
data class ApiErrorEnvelope(
    val error: ApiErrorBody? = null,
)

@Serializable
data class ApiErrorBody(
    val code: String = "ERROR",
    val message: String = "",
    val details: JsonElement? = null,
)

@Serializable
data class FuenteDto(
    val id: Long,
    val alias: String,
    val color: String = "#3b82f6",
    @SerialName("logo_ruta") val logoRuta: String? = null,
    @SerialName("split_auto") val splitAuto: Boolean = false,
    @SerialName("split_auto_modo") val splitAutoModo: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class DiaTrabajadoDto(
    val id: Long = 0,
    @SerialName("pago_id") val pagoId: Long = 0,
    val fecha: String,
    /** Monto del día en centavos (v0.3.0). */
    @SerialName("monto_enteros") val montoEnteros: Long = 0,
)

@Serializable
data class PagoDto(
    val id: Long,
    @SerialName("fuente_id") val fuenteId: Long,
    @SerialName("fecha_pago") val fechaPago: String,
    @SerialName("monto_enteros") val montoEnteros: Long,
    @SerialName("metodo_pago") val metodoPago: String,
    val notas: String? = null,
    @SerialName("imagen_ruta") val imagenRuta: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("fuente_alias") val fuenteAlias: String? = null,
    @SerialName("fuente_color") val fuenteColor: String? = null,
    @SerialName("dias_trabajados") val diasTrabajados: List<DiaTrabajadoDto> = emptyList(),
    @SerialName("split_id") val splitId: Long? = null,
    @SerialName("split_modo") val splitModo: String? = null,
)

@Serializable
data class CuentaDto(
    val id: Long,
    val alias: String,
    val numero: String? = null,
    val banco: String? = null,
    @SerialName("qr_ruta") val qrRuta: String? = null,
    @SerialName("es_general") val esGeneral: Boolean = false,
    @SerialName("tasa_bps") val tasaBps: Long = 0,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class HistorialTasaDto(
    val id: Long,
    @SerialName("cuenta_id") val cuentaId: Long,
    @SerialName("tasa_bps") val tasaBps: Long,
    @SerialName("aplicada_desde") val aplicadaDesde: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class TransaccionDto(
    val id: Long,
    @SerialName("split_id") val splitId: Long,
    @SerialName("cuenta_id") val cuentaId: Long? = null,
    @SerialName("monto_enteros") val montoEnteros: Long,
    @SerialName("tasa_bps") val tasaBps: Long,
    @SerialName("alias_snapshot") val aliasSnapshot: String,
    val realizado: Boolean = false,
    @SerialName("fecha_realizacion") val fechaRealizacion: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class SplitDto(
    val id: Long,
    @SerialName("pago_id") val pagoId: Long,
    @SerialName("modo_calculo") val modoCalculo: String = "preciso",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    val transacciones: List<TransaccionDto> = emptyList(),
    @SerialName("total_realizado") val totalRealizado: Long = 0,
    @SerialName("total_pendiente") val totalPendiente: Long = 0,
)

@Serializable
data class CambioTasaResponse(
    @SerialName("tasa_bps") val tasaBps: Long,
    @SerialName("splits_recalculados") val splitsRecalculados: Int = 0,
    val registrado: Boolean = true,
)

@Serializable
data class EliminadoResponse(
    val eliminado: Boolean = false,
    val id: Long = 0,
)

@Serializable
data class SplitSettingsDto(
    @SerialName("modo_default") val modoDefault: String = "preciso",
)

@Serializable
data class HealthPingDto(
    val status: String = "ok",
    val time: String? = null,
)

@Serializable
data class HealthInfoDto(
    val conexion: String = "error",
    @SerialName("latencia_ms") val latenciaMs: Double = 0.0,
    @SerialName("version_pg") val versionPg: String = "",
    @SerialName("tamano_db") val tamanoDb: String = "",
    val tablas: List<TablaDto> = emptyList(),
)

@Serializable
data class TablaDto(
    val nombre: String,
    val registros: Long = 0,
)

@Serializable
data class SubirComprobanteResponse(
    val id: Long = 0,
    @SerialName("imagen_ruta") val imagenRuta: String? = null,
)

@Serializable
data class LogoResponse(
    val id: Long = 0,
    @SerialName("logo_ruta") val logoRuta: String? = null,
)

@Serializable
data class QrResponse(
    val id: Long = 0,
    @SerialName("qr_ruta") val qrRuta: String? = null,
)

/**
 * Respuesta de `POST /pagos`: el backend añade campos **fuera** de `data`
 * (`split_auto`, `split_id`, `split_warning`).
 */
@Serializable
data class CrearPagoResponse(
    val data: PagoDto,
    @SerialName("split_auto") val splitAuto: Boolean? = null,
    @SerialName("split_id") val splitId: Long? = null,
    @SerialName("split_warning") val splitWarning: String? = null,
)
