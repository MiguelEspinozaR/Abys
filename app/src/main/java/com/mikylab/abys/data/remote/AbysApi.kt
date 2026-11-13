package com.mikylab.abys.data.remote

import com.mikylab.abys.data.remote.dto.ActualizarPagoRequest
import com.mikylab.abys.data.remote.dto.AgregarDiaRequest
import com.mikylab.abys.data.remote.dto.ApiEnvelope
import com.mikylab.abys.data.remote.dto.CambioTasaResponse
import com.mikylab.abys.data.remote.dto.CuentaDto
import com.mikylab.abys.data.remote.dto.CrearCuentaRequest
import com.mikylab.abys.data.remote.dto.CrearFuenteRequest
import com.mikylab.abys.data.remote.dto.CrearPagoRequest
import com.mikylab.abys.data.remote.dto.CrearPagoResponse
import com.mikylab.abys.data.remote.dto.EliminadoResponse
import com.mikylab.abys.data.remote.dto.FuenteDto
import com.mikylab.abys.data.remote.dto.GenerarSplitRequest
import com.mikylab.abys.data.remote.dto.HealthInfoDto
import com.mikylab.abys.data.remote.dto.HealthPingDto
import com.mikylab.abys.data.remote.dto.HistorialTasaDto
import com.mikylab.abys.data.remote.dto.LogoResponse
import com.mikylab.abys.data.remote.dto.PagoDto
import com.mikylab.abys.data.remote.dto.QrResponse
import com.mikylab.abys.data.remote.dto.SplitDto
import com.mikylab.abys.data.remote.dto.SplitSettingsDto
import com.mikylab.abys.data.remote.dto.SplitSettingsRequest
import com.mikylab.abys.data.remote.dto.SubirComprobanteResponse
import com.mikylab.abys.data.remote.dto.TransaccionDto
import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Contrato HTTP del backend Abys (`/api/v1`).
 *
 * Ver `docs/api-contract.md` para el detalle de cada endpoint.
 */
interface AbysApi {

    // ── Pagos ───────────────────────────────────────────────────────────────

    @GET("pagos")
    suspend fun listarPagos(
        @Query("fecha_inicio") fechaInicio: String? = null,
        @Query("fecha_fin") fechaFin: String? = null,
        @Query("fuente_id") fuenteId: Long? = null,
        @Query("metodo_pago") metodoPago: String? = null,
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20,
    ): ApiEnvelope<List<PagoDto>>

    @GET("pagos/{id}")
    suspend fun detallePago(@Path("id") id: Long): ApiEnvelope<PagoDto>

    @POST("pagos")
    suspend fun crearPago(@Body body: CrearPagoRequest): CrearPagoResponse

    @PUT("pagos/{id}")
    suspend fun actualizarPago(
        @Path("id") id: Long,
        @Body body: ActualizarPagoRequest,
    ): ApiEnvelope<PagoDto>

    @DELETE("pagos/{id}")
    suspend fun eliminarPago(@Path("id") id: Long): ApiEnvelope<EliminadoResponse>

    @POST("pagos/{id}/dias")
    suspend fun agregarDia(
        @Path("id") id: Long,
        @Body body: AgregarDiaRequest,
    ): ApiEnvelope<AgregarDiaResponse>

    @DELETE("pagos/{id}/dias/{diaId}")
    suspend fun eliminarDia(
        @Path("id") id: Long,
        @Path("diaId") diaId: Long,
    ): ApiEnvelope<EliminadoResponse>

    @Multipart
    @POST("pagos/{id}/comprobante")
    suspend fun subirComprobante(
        @Path("id") id: Long,
        @Part archivo: MultipartBody.Part,
    ): ApiEnvelope<SubirComprobanteResponse>

    @GET("pagos/{id}/split")
    suspend fun splitPorPago(@Path("id") id: Long): ApiEnvelope<SplitDto?>

    // ── Fuentes ─────────────────────────────────────────────────────────────

    @GET("fuentes")
    suspend fun listarFuentes(): ApiEnvelope<List<FuenteDto>>

    @POST("fuentes")
    suspend fun crearFuente(@Body body: CrearFuenteRequest): ApiEnvelope<FuenteDto>

    @PUT("fuentes/{id}")
    suspend fun actualizarFuente(
        @Path("id") id: Long,
        @Body body: CrearFuenteRequest,
    ): ApiEnvelope<ActualizadoResponse>

    @DELETE("fuentes/{id}")
    suspend fun eliminarFuente(@Path("id") id: Long): ApiEnvelope<EliminadoResponse>

    @Multipart
    @POST("fuentes/{id}/logo")
    suspend fun subirLogo(
        @Path("id") id: Long,
        @Part archivo: MultipartBody.Part,
    ): ApiEnvelope<LogoResponse>

    @DELETE("fuentes/{id}/logo")
    suspend fun eliminarLogo(@Path("id") id: Long): ApiEnvelope<LogoResponse>

    // ── Cuentas ─────────────────────────────────────────────────────────────

    @GET("cuentas")
    suspend fun listarCuentas(): ApiEnvelope<List<CuentaDto>>

    @GET("cuentas/{id}")
    suspend fun detalleCuenta(@Path("id") id: Long): ApiEnvelope<CuentaDto>

    @POST("cuentas")
    suspend fun crearCuenta(@Body body: CrearCuentaRequest): ApiEnvelope<CuentaDto>

    @PUT("cuentas/{id}")
    suspend fun actualizarCuenta(
        @Path("id") id: Long,
        @Body body: CrearCuentaRequest,
    ): ApiEnvelope<CuentaDto>

    @DELETE("cuentas/{id}")
    suspend fun eliminarCuenta(@Path("id") id: Long): ApiEnvelope<EliminadoResponse>

    @Multipart
    @POST("cuentas/{id}/qr")
    suspend fun subirQr(
        @Path("id") id: Long,
        @Part archivo: MultipartBody.Part,
    ): ApiEnvelope<QrResponse>

    @DELETE("cuentas/{id}/qr")
    suspend fun eliminarQr(@Path("id") id: Long): ApiEnvelope<QrResponse>

    @GET("cuentas/{id}/historial-tasas")
    suspend fun historialTasas(@Path("id") id: Long): ApiEnvelope<List<HistorialTasaDto>>

    @PUT("cuentas/{id}/tasa")
    suspend fun cambiarTasa(
        @Path("id") id: Long,
        @Body body: com.mikylab.abys.data.remote.dto.CambiarTasaRequest,
    ): ApiEnvelope<CambioTasaResponse>

    // ── Splits y transacciones ──────────────────────────────────────────────

    @GET("splits")
    suspend fun listarSplits(): ApiEnvelope<List<SplitDto>>

    @GET("splits/{id}")
    suspend fun detalleSplit(@Path("id") id: Long): ApiEnvelope<SplitDto>

    @POST("splits")
    suspend fun generarSplit(@Body body: GenerarSplitRequest): ApiEnvelope<SplitDto>

    @PUT("splits/{id}")
    suspend fun recalcularSplit(@Path("id") id: Long): ApiEnvelope<SplitDto>

    @DELETE("splits/{id}")
    suspend fun eliminarSplit(@Path("id") id: Long): ApiEnvelope<EliminadoResponse>

    @GET("transacciones")
    suspend fun listarTransacciones(
        @Query("split_id") splitId: Long? = null,
        @Query("cuenta_id") cuentaId: Long? = null,
        @Query("realizado") realizado: Boolean? = null,
    ): ApiEnvelope<List<TransaccionDto>>

    @PUT("transacciones/{id}/realizar")
    suspend fun marcarRealizada(@Path("id") id: Long): ApiEnvelope<TransaccionDto>

    // ── Configuración ───────────────────────────────────────────────────────

    @GET("settings/split")
    suspend fun obtenerSplitSettings(): ApiEnvelope<SplitSettingsDto>

    @PUT("settings/split")
    suspend fun actualizarSplitSettings(
        @Body body: SplitSettingsRequest,
    ): ApiEnvelope<SplitSettingsDto>

    // ── Health ──────────────────────────────────────────────────────────────

    @GET("health")
    suspend fun health(): HealthPingDto

    @GET("health/db")
    suspend fun healthDb(): HealthDbResponse
}

/** Respuesta de `POST /pagos/:id/dias`. */
@kotlinx.serialization.Serializable
data class AgregarDiaResponse(
    @kotlinx.serialization.SerialName("pago_id") val pagoId: Long = 0,
    val fecha: String = "",
    val agregado: Boolean = false,
)

/** Respuesta de `PUT /fuentes/:id` (no devuelve la entidad, solo el ok). */
@kotlinx.serialization.Serializable
data class ActualizadoResponse(
    val id: Long = 0,
    val actualizado: Boolean = false,
)

/** Respuesta de `GET /health/db` (200 con `data`, 503 con `error`). */
@kotlinx.serialization.Serializable
data class HealthDbResponse(
    val status: String = "error",
    val data: HealthInfoDto? = null,
    val error: com.mikylab.abys.data.remote.dto.ApiErrorBody? = null,
)
