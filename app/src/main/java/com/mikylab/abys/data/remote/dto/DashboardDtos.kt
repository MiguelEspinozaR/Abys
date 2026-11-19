package com.mikylab.abys.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTOs del dashboard **v0.3.0** (`summary`, `weekly`, `monthly`, `yearly`, `history`,
 * `distribution/monthly` y `distribution/yearly` bajo `/api/v1`).
 *
 * El dashboard **no se persiste**: la app lo calcula localmente sobre Room para funcionar sin
 * conexión (misma agregación que el backend). Estas DTOs se usan para **contrastar** los totales
 * locales con los del servidor y avisar de que faltan datos por sincronizar.
 *
 * Formas reales (ver `Abys/backend/internal/service/dashboard_service.go`): todos los importes
 * van en centavos y se agrupan por `dias_trabajados.fecha`; `por_fuente` incluye fuentes
 * soft-deleted para preservar alias/color históricos.
 */

@Serializable
data class DashboardSummaryDto(
    @SerialName("total_30d_centavos") val total30dCentavos: Long = 0,
    @SerialName("total_historico_centavos") val totalHistoricoCentavos: Long = 0,
)

/** Desglose por fuente presente en `weekly` y en las distribuciones. */
@Serializable
data class FuenteTotalDto(
    @SerialName("fuente_id") val fuenteId: Long = 0,
    val alias: String = "",
    val color: String = "",
    @SerialName("total_centavos") val totalCentavos: Long = 0,
)

@Serializable
data class DashboardWeeklyDto(
    @SerialName("semana_inicio") val semanaInicio: String = "",
    @SerialName("semana_fin") val semanaFin: String = "",
    val dias: List<DashboardDiaDto> = emptyList(),
)

@Serializable
data class DashboardDiaDto(
    val fecha: String = "",
    @SerialName("total_centavos") val totalCentavos: Long = 0,
    @SerialName("por_fuente") val porFuente: List<FuenteTotalDto> = emptyList(),
)

/** Bloques 1–7, 8–14, 15–21, 22–28 y 29–fin de mes. */
@Serializable
data class DashboardMonthlyDto(
    val mes: Int = 0,
    val anio: Int = 0,
    val bloques: List<DashboardBloqueDto> = emptyList(),
)

@Serializable
data class DashboardBloqueDto(
    val bloque: Int = 0,
    val inicio: String = "",
    val fin: String = "",
    @SerialName("total_centavos") val totalCentavos: Long = 0,
)

@Serializable
data class DashboardYearlyDto(
    val anio: Int = 0,
    val meses: List<DashboardMesDto> = emptyList(),
)

@Serializable
data class DashboardMesDto(
    val mes: Int = 0,
    @SerialName("total_centavos") val totalCentavos: Long = 0,
)

/** Histórico: sólo totales mensuales (sin tendencia desde 0.3.0). */
@Serializable
data class DashboardHistoryDto(
    @SerialName("por_mes") val porMes: List<DashboardPuntoDto> = emptyList(),
)

@Serializable
data class DashboardPuntoDto(
    val anio: Int = 0,
    val mes: Int = 0,
    @SerialName("total_centavos") val totalCentavos: Long = 0,
)

/** `GET /dashboard/distribution/monthly?mes=&anio=`. */
@Serializable
data class DistributionMonthlyDto(
    val mes: Int = 0,
    val anio: Int = 0,
    @SerialName("total_centavos") val totalCentavos: Long = 0,
    @SerialName("por_fuente") val porFuente: List<FuenteTotalDto> = emptyList(),
)

/** `GET /dashboard/distribution/yearly?anio=`. */
@Serializable
data class DistributionYearlyDto(
    val anio: Int = 0,
    @SerialName("total_centavos") val totalCentavos: Long = 0,
    @SerialName("por_fuente") val porFuente: List<FuenteTotalDto> = emptyList(),
)
