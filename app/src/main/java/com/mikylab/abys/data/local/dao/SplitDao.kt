package com.mikylab.abys.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import androidx.room.Transaction
import com.mikylab.abys.data.local.entity.SplitEntity
import com.mikylab.abys.data.local.entity.TransaccionEntity
import com.mikylab.abys.domain.model.SyncState
import kotlinx.coroutines.flow.Flow

@Dao
interface SplitDao {

    @Query("SELECT * FROM splits")
    fun observeTodos(): Flow<List<SplitEntity>>

    @Query("SELECT * FROM splits WHERE pagoLocalId = :pagoLocalId LIMIT 1")
    fun observePorPago(pagoLocalId: String): Flow<SplitEntity?>

    /** Split de un pago (consulta puntual, no reactiva). */
    @Query("SELECT * FROM splits WHERE pagoLocalId = :pagoLocalId LIMIT 1")
    suspend fun getPorPago(pagoLocalId: String): SplitEntity?

    @Query("SELECT * FROM splits WHERE localId = :localId")
    fun observePorId(localId: String): Flow<SplitEntity?>

    @Query("SELECT * FROM splits WHERE localId = :localId")
    suspend fun getPorId(localId: String): SplitEntity?

    @Query("SELECT * FROM splits WHERE serverId = :serverId LIMIT 1")
    suspend fun getPorServerId(serverId: Long): SplitEntity?

    @Query("SELECT * FROM splits")
    suspend fun getAll(): List<SplitEntity>

    @Upsert
    suspend fun upsert(split: SplitEntity)

    @Upsert
    suspend fun upsertAll(splits: List<SplitEntity>)

    @Query(
        """
        UPDATE splits
        SET syncState = :state, serverId = :serverId, updatedAtServer = :updatedAtServer,
            lastError = :lastError, totalPendiente = :totalPendiente, totalRealizado = :totalRealizado
        WHERE localId = :localId
        """,
    )
    suspend fun marcarSincronizado(
        localId: String,
        state: SyncState,
        serverId: Long?,
        updatedAtServer: Long?,
        lastError: String?,
        totalPendiente: Long,
        totalRealizado: Long,
    )

    @Query("UPDATE splits SET lastError = :lastError, syncState = :state WHERE localId = :localId")
    suspend fun marcarError(localId: String, lastError: String?, state: SyncState)

    @Query("DELETE FROM splits WHERE localId = :localId")
    suspend fun borrar(localId: String)

    @Query("SELECT * FROM splits WHERE syncState IN (:states) ORDER BY updatedAtLocal ASC")
    suspend fun pendientes(states: List<SyncState>): List<SplitEntity>

    @Query("SELECT COUNT(*) FROM splits WHERE syncState IN (:states)")
    suspend fun contarPendientes(states: List<SyncState>): Int

    // ── Transacciones ───────────────────────────────────────────────────────

    @Query("SELECT * FROM transacciones WHERE splitLocalId = :splitLocalId ORDER BY serverId ASC")
    fun observeTransacciones(splitLocalId: String): Flow<List<TransaccionEntity>>

    @Query("SELECT * FROM transacciones")
    fun observeTodasTransacciones(): Flow<List<TransaccionEntity>>

    @Query("SELECT * FROM transacciones WHERE splitLocalId = :splitLocalId ORDER BY serverId ASC")
    suspend fun getTransacciones(splitLocalId: String): List<TransaccionEntity>

    @Query("SELECT * FROM transacciones WHERE localId = :localId")
    suspend fun getTransaccion(localId: String): TransaccionEntity?

    @Query("SELECT * FROM transacciones WHERE serverId = :serverId LIMIT 1")
    suspend fun getTransaccionPorServerId(serverId: Long): TransaccionEntity?

    @Query("SELECT * FROM transacciones")
    suspend fun getAllTransacciones(): List<TransaccionEntity>

    @Upsert
    suspend fun upsertTransacciones(transacciones: List<TransaccionEntity>)

    @Upsert
    suspend fun upsertTransaccion(transaccion: TransaccionEntity)

    @Query(
        """
        UPDATE transacciones
        SET realizado = :realizado, fechaRealizacion = :fechaRealizacion,
            syncState = :state, updatedAtLocal = :now
        WHERE localId = :localId
        """,
    )
    suspend fun marcarRealizada(
        localId: String,
        realizado: Boolean,
        fechaRealizacion: Long?,
        state: SyncState,
        now: Long,
    )

    @Query("UPDATE transacciones SET lastError = :lastError, syncState = :state WHERE localId = :localId")
    suspend fun marcarErrorTransaccion(localId: String, lastError: String?, state: SyncState)

    @Query("SELECT * FROM transacciones WHERE syncState IN (:states) ORDER BY updatedAtLocal ASC")
    suspend fun pendientesTransacciones(states: List<SyncState>): List<TransaccionEntity>

    @Query("SELECT COUNT(*) FROM transacciones WHERE syncState IN (:states)")
    suspend fun contarPendientesTransacciones(states: List<SyncState>): Int

    /** Reemplaza las transacciones de un split por las confirmadas por el servidor. */
    @Transaction
    suspend fun reemplazarTransacciones(
        splitLocalId: String,
        transacciones: List<TransaccionEntity>,
    ) {
        borrarDelSplit(splitLocalId)
        if (transacciones.isNotEmpty()) upsertTransacciones(transacciones)
    }

    @Query("DELETE FROM transacciones WHERE splitLocalId = :splitLocalId")
    suspend fun borrarDelSplit(splitLocalId: String)

    /**
     * Nº de transacciones **realizadas** de un pago (a través de su split).
     * Replica `PagoRepo.HasTransaccionesRealizadas` (BR-005) para poder validar el borrado
     * de un pago **sin red**.
     */
    @Query(
        """
        SELECT COUNT(*) FROM transacciones t
        JOIN splits s ON s.localId = t.splitLocalId
        WHERE s.pagoLocalId = :pagoLocalId AND t.realizado = 1
        """,
    )
    suspend fun contarTransaccionesRealizadas(pagoLocalId: String): Int
}
