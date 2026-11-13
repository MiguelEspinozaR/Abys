package com.mikylab.abys.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/** Proyección agregada de un mes (histórico). */
data class FilaHistorial(
    val anio: String,
    val mes: String,
    val total: Long,
    val cantidad: Int,
)

/** Totales de un rango de fechas. */
data class TotalesRango(
    val total: Long,
    val cantidad: Int,
)

/**
 * Consultas agregadas para el dashboard.
 *
 * Se calculan **localmente** sobre Room (misma semántica que los endpoints de dashboard),
 * de modo que el dashboard funciona sin conexión.
 */
@Dao
interface DashboardDao {

    @Query(
        """
        SELECT COALESCE(SUM(montoEnteros), 0) AS total, COUNT(*) AS cantidad
        FROM pagos
        WHERE deletedAt IS NULL AND fechaPago BETWEEN :inicio AND :fin
        """,
    )
    fun observeTotales(inicio: String, fin: String): Flow<TotalesRango>

    @Query(
        """
        SELECT COUNT(DISTINCT d.fecha) FROM dias_trabajados d
        JOIN pagos p ON p.localId = d.pagoLocalId
        WHERE p.deletedAt IS NULL AND d.fecha BETWEEN :inicio AND :fin
        """,
    )
    fun observeDiasTrabajados(inicio: String, fin: String): Flow<Int>

    @Query(
        """
        SELECT substr(fechaPago, 1, 4) AS anio, substr(fechaPago, 6, 2) AS mes,
               COALESCE(SUM(montoEnteros), 0) AS total, COUNT(*) AS cantidad
        FROM pagos
        WHERE deletedAt IS NULL
        GROUP BY anio, mes
        ORDER BY anio ASC, mes ASC
        """,
    )
    fun observeHistorial(): Flow<List<FilaHistorial>>

    @Query(
        """
        SELECT substr(fechaPago, 1, 4) AS anio, substr(fechaPago, 6, 2) AS mes,
               COALESCE(SUM(montoEnteros), 0) AS total, COUNT(*) AS cantidad
        FROM pagos
        WHERE deletedAt IS NULL AND fechaPago BETWEEN :inicio AND :fin
        GROUP BY anio, mes
        ORDER BY anio ASC, mes ASC
        """,
    )
    fun observeHistorialRango(inicio: String, fin: String): Flow<List<FilaHistorial>>
}
