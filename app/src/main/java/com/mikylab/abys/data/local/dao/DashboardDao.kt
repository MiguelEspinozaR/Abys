package com.mikylab.abys.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * Fila de la agregación `(día trabajado, fuente)` del dashboard (v0.3.0).
 *
 * Espeja la semántica de los endpoints `dashboard` del backend: los montos se agrupan por
 * `dias_trabajados.fecha`, uniendo `pagos` **activos** con `fuentes` (incluye fuentes
 * eliminadas para preservar `alias` y `color` históricos).
 */
data class FilaDiaFuente(
    /** `YYYY-MM-DD` del día trabajado. */
    val fecha: String,
    /** `localId` de la fuente del pago. */
    val fuenteLocalId: String,
    /** `id` del servidor de la fuente (para el orden determinista de `por_fuente`). */
    val fuenteServerId: Long?,
    val alias: String,
    val color: String,
    /** Σ de los montos de los días de esa fecha pagados con esa fuente. */
    val total: Long,
)

/** Mes del histórico: `anio` y `mes` como texto (`substr` de la fecha ISO). */
data class FilaMesHistorial(
    val anio: String,
    val mes: String,
    val total: Long,
)

/**
 * Consultas agregadas para el dashboard (v0.3.0).
 *
 * Se calculan **localmente** sobre Room (misma semántica que los endpoints de dashboard),
 * de modo que el dashboard funciona sin conexión. A diferencia de la v1, todo se agrupa
 * por `dias_trabajados.fecha` (no por `fechaPago`) y los montos salen de
 * `dias_trabajados.montoEnteros`.
 */
@Dao
interface DashboardDao {

    /** Σ de los montos de los días trabajados en el rango (pagos activos). */
    @Query(
        """
        SELECT COALESCE(SUM(d.montoEnteros), 0) FROM dias_trabajados d
        JOIN pagos p ON p.localId = d.pagoLocalId
        WHERE p.deletedAt IS NULL AND d.fecha BETWEEN :inicio AND :fin
        """,
    )
    fun observeTotalDias(inicio: String, fin: String): Flow<Long>

    /** Σ histórica de todos los días trabajados (pagos activos). */
    @Query(
        """
        SELECT COALESCE(SUM(d.montoEnteros), 0) FROM dias_trabajados d
        JOIN pagos p ON p.localId = d.pagoLocalId
        WHERE p.deletedAt IS NULL
        """,
    )
    fun observeTotalHistorico(): Flow<Long>

    /**
     * Filas `(día, fuente)` del rango: base del gráfico semanal (apilado por fuente) y de
     * las distribuciones por fuente.
     */
    @Query(
        """
        SELECT d.fecha AS fecha, p.fuenteLocalId AS fuenteLocalId,
               f.serverId AS fuenteServerId, f.alias AS alias, f.color AS color,
               COALESCE(SUM(d.montoEnteros), 0) AS total
        FROM dias_trabajados d
        JOIN pagos p ON p.localId = d.pagoLocalId
        JOIN fuentes f ON f.localId = p.fuenteLocalId
        WHERE p.deletedAt IS NULL AND d.fecha BETWEEN :inicio AND :fin
        GROUP BY d.fecha, p.fuenteLocalId
        ORDER BY d.fecha ASC
        """,
    )
    fun observeFilasPorDiaFuente(inicio: String, fin: String): Flow<List<FilaDiaFuente>>

    /** Histórico mensual: Σ por `(anio, mes)` del **día trabajado** (pagos activos). */
    @Query(
        """
        SELECT substr(d.fecha, 1, 4) AS anio, substr(d.fecha, 6, 2) AS mes,
               COALESCE(SUM(d.montoEnteros), 0) AS total
        FROM dias_trabajados d
        JOIN pagos p ON p.localId = d.pagoLocalId
        WHERE p.deletedAt IS NULL
        GROUP BY anio, mes
        ORDER BY anio ASC, mes ASC
        """,
    )
    fun observeHistorial(): Flow<List<FilaMesHistorial>>
}
