package com.mikylab.abys.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import androidx.room.Transaction
import androidx.room.Update
import com.mikylab.abys.data.local.entity.FuenteEntity
import com.mikylab.abys.domain.model.SyncState
import kotlinx.coroutines.flow.Flow

@Dao
interface FuenteDao {

    @Query("SELECT * FROM fuentes WHERE deletedAt IS NULL ORDER BY alias COLLATE NOCASE")
    fun observeActivas(): Flow<List<FuenteEntity>>

    @Query("SELECT * FROM fuentes WHERE localId = :localId")
    fun observePorId(localId: String): Flow<FuenteEntity?>

    @Query("SELECT * FROM fuentes WHERE localId = :localId")
    suspend fun getPorId(localId: String): FuenteEntity?

    @Query("SELECT * FROM fuentes WHERE serverId = :serverId LIMIT 1")
    suspend fun getPorServerId(serverId: Long): FuenteEntity?

    @Query("SELECT * FROM fuentes")
    suspend fun getAll(): List<FuenteEntity>

    @Upsert
    suspend fun upsert(fuente: FuenteEntity)

    @Upsert
    suspend fun upsertAll(fuentes: List<FuenteEntity>)

    @Update
    suspend fun update(fuente: FuenteEntity)

    @Delete
    suspend fun delete(fuente: FuenteEntity)

    @Query(
        """
        UPDATE fuentes
        SET syncState = :state, serverId = :serverId, updatedAtServer = :updatedAtServer,
            lastError = :lastError
        WHERE localId = :localId
        """,
    )
    suspend fun marcarSincronizado(
        localId: String,
        state: SyncState,
        serverId: Long?,
        updatedAtServer: Long?,
        lastError: String?,
    )

    @Query("UPDATE fuentes SET deletedAt = :deletedAt, syncState = :state, updatedAtLocal = :now WHERE localId = :localId")
    suspend fun marcarEliminado(localId: String, deletedAt: Long, state: SyncState, now: Long)

    @Query("UPDATE fuentes SET lastError = :lastError, syncState = :state WHERE localId = :localId")
    suspend fun marcarError(localId: String, lastError: String?, state: SyncState)

    @Query("SELECT * FROM fuentes WHERE syncState IN (:states) ORDER BY updatedAtLocal ASC")
    suspend fun pendientes(states: List<SyncState>): List<FuenteEntity>

    @Query("SELECT COUNT(*) FROM fuentes WHERE syncState IN (:states)")
    suspend fun contarPendientes(states: List<SyncState>): Int
}
