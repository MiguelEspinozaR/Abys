package com.mikylab.abys.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import androidx.room.Transaction
import com.mikylab.abys.data.local.entity.DiaTrabajadoEntity
import com.mikylab.abys.data.local.entity.PagoEntity
import com.mikylab.abys.domain.model.SyncState
import kotlinx.coroutines.flow.Flow

@Dao
interface PagoDao {

    /**
     * Listado paginado de pagos (mismo contrato que `GET /pagos`).
     *
     * `limit = Int.MAX_VALUE` equivale a "sin paginación"; `offset = (page - 1) * pageSize`.
     */
    @Query(
        """
        SELECT p.* FROM pagos p
        JOIN fuentes f ON f.localId = p.fuenteLocalId
        WHERE p.deletedAt IS NULL
          AND (:fechaInicio IS NULL OR p.fechaPago >= :fechaInicio)
          AND (:fechaFin IS NULL OR p.fechaPago <= :fechaFin)
          AND (:fuenteLocalId IS NULL OR p.fuenteLocalId = :fuenteLocalId)
          AND (:metodoPago IS NULL OR p.metodoPago = :metodoPago)
        ORDER BY p.fechaPago DESC, p.serverId DESC
        LIMIT :limit OFFSET :offset
        """,
    )
    fun observePagos(
        fechaInicio: String?,
        fechaFin: String?,
        fuenteLocalId: String?,
        metodoPago: String?,
        limit: Int,
        offset: Int,
    ): Flow<List<PagoEntity>>

    /** Total de pagos que cumplen el filtro (para la paginación de Ingresos). */
    @Query(
        """
        SELECT COUNT(*) FROM pagos p
        JOIN fuentes f ON f.localId = p.fuenteLocalId
        WHERE p.deletedAt IS NULL
          AND (:fechaInicio IS NULL OR p.fechaPago >= :fechaInicio)
          AND (:fechaFin IS NULL OR p.fechaPago <= :fechaFin)
          AND (:fuenteLocalId IS NULL OR p.fuenteLocalId = :fuenteLocalId)
          AND (:metodoPago IS NULL OR p.metodoPago = :metodoPago)
        """,
    )
    suspend fun contarPagos(
        fechaInicio: String?,
        fechaFin: String?,
        fuenteLocalId: String?,
        metodoPago: String?,
    ): Int

    @Query("SELECT * FROM pagos WHERE localId = :localId")
    fun observePorId(localId: String): Flow<PagoEntity?>

    @Query("SELECT * FROM pagos WHERE localId = :localId")
    suspend fun getPorId(localId: String): PagoEntity?

    @Query("SELECT * FROM pagos WHERE serverId = :serverId LIMIT 1")
    suspend fun getPorServerId(serverId: Long): PagoEntity?

    @Query("SELECT * FROM pagos WHERE deletedAt IS NULL")
    suspend fun getAll(): List<PagoEntity>

    @Upsert
    suspend fun upsert(pago: PagoEntity)

    @Upsert
    suspend fun upsertAll(pagos: List<PagoEntity>)

    @Query(
        """
        UPDATE pagos
        SET syncState = :state, serverId = :serverId, updatedAtServer = :updatedAtServer,
            lastError = :lastError, imagenRuta = COALESCE(:imagenRuta, imagenRuta)
        WHERE localId = :localId
        """,
    )
    suspend fun marcarSincronizado(
        localId: String,
        state: SyncState,
        serverId: Long?,
        updatedAtServer: Long?,
        lastError: String?,
        imagenRuta: String? = null,
    )

    @Query("UPDATE pagos SET deletedAt = :deletedAt, syncState = :state, updatedAtLocal = :now WHERE localId = :localId")
    suspend fun marcarEliminado(localId: String, deletedAt: Long, state: SyncState, now: Long)

    @Query("UPDATE pagos SET lastError = :lastError, syncState = :state WHERE localId = :localId")
    suspend fun marcarError(localId: String, lastError: String?, state: SyncState)

    @Query("SELECT * FROM pagos WHERE syncState IN (:states) ORDER BY updatedAtLocal ASC")
    suspend fun pendientes(states: List<SyncState>): List<PagoEntity>

    @Query("SELECT COUNT(*) FROM pagos WHERE syncState IN (:states)")
    suspend fun contarPendientes(states: List<SyncState>): Int

    // ── Días trabajados ─────────────────────────────────────────────────────

    @Query("SELECT * FROM dias_trabajados WHERE pagoLocalId = :pagoLocalId ORDER BY fecha ASC")
    fun observeDias(pagoLocalId: String): Flow<List<DiaTrabajadoEntity>>

    @Query("SELECT * FROM dias_trabajados ORDER BY fecha ASC")
    fun observeTodosLosDias(): Flow<List<DiaTrabajadoEntity>>

    @Query("SELECT * FROM dias_trabajados WHERE pagoLocalId = :pagoLocalId ORDER BY fecha ASC")
    suspend fun getDias(pagoLocalId: String): List<DiaTrabajadoEntity>

    @Query("SELECT * FROM dias_trabajados")
    suspend fun getAllDias(): List<DiaTrabajadoEntity>

    @Upsert
    suspend fun upsertDias(dias: List<DiaTrabajadoEntity>)

    @Upsert
    suspend fun upsertDia(dia: DiaTrabajadoEntity)

    @Query("DELETE FROM dias_trabajados WHERE pagoLocalId = :pagoLocalId")
    suspend fun borrarDiasDe(pagoLocalId: String)

    @Query("DELETE FROM dias_trabajados WHERE localId = :localId")
    suspend fun borrarDia(localId: String)

    /** Reemplaza atómicamente los días de un pago (usado por el push de `PUT /pagos/:id`). */
    @Transaction
    suspend fun reemplazarDias(pagoLocalId: String, dias: List<DiaTrabajadoEntity>) {
        borrarDiasDe(pagoLocalId)
        if (dias.isNotEmpty()) upsertDias(dias)
    }
}
