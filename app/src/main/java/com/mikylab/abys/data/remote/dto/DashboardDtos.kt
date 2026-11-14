package com.mikylab.abys.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTOs del dashboard (rutas `dashboard/summary`, `dashboard/weekly`, `dashboard/monthly`,
 * `dashboard/yearly` e `history` bajo el prefijo `/api/v1`).
 *
 * El dashboard **no se persiste**: la app lo calcula localmente sobre Room para funcionar sin
 * conexión (misma agregación que el backend). Estas DTOs se usan para **contrastar** el total
 * local con el del servidor y avisar de que faltan datos por sincronizar.
 *
 * Formas reales (ver `Abys/backend/internal/service/dashboard_service.go`).
 */

@Serializable
data class DashboardSummaryDto(
    val mes: Int = 0,
    val anio: Int = 0,
    @SerialName("total_centavos") val totalCentavos: Long = 0,
    @SerialName("cantidad_pagos") val cantidadPagos: Int = 0,
    @SerialName("dias_trabajados") val diasTrabajados: Int = 0,
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
    @SerialName("cantidad_pagos") val cantidadPagos: Int = 0,
)

@Serializable
data class DashboardMonthlyDto(
    val mes: Int = 0,
    val anio: Int = 0,
    val semanas: List<DashboardSemanaDto> = emptyList(),
)

@Serializable
data class DashboardSemanaDto(
    val semana: Int = 0,
    val inicio: String = "",
    val fin: String = "",
    @SerialName("total_centavos") val totalCentavos: Long = 0,
    @SerialName("cantidad_pagos") val cantidadPagos: Int = 0,
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
    @SerialName("cantidad_pagos") val cantidadPagos: Int = 0,
)

@Serializable
data class DashboardHistoryDto(
    @SerialName("por_mes") val porMes: List<DashboardPuntoDto> = emptyList(),
    val tendencia: DashboardTendenciaDto? = null,
)

@Serializable
data class DashboardPuntoDto(
    val anio: Int = 0,
    val mes: Int = 0,
    @SerialName("total_centavos") val totalCentavos: Long = 0,
    @SerialName("cantidad_pagos") val cantidadPagos: Int = 0,
)

@Serializable
data class DashboardTendenciaDto(
    val pendiente: Double = 0.0,
    val interseccion: Double = 0.0,
    @SerialName("prox_mes_est") val proxMesEst: Double = 0.0,
    val creciendo: Boolean = false,
)
