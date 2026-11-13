package com.mikylab.abys.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.mikylab.abys.data.local.entity.AppSettingEntity
import com.mikylab.abys.data.local.entity.PendingOperationEntity
import com.mikylab.abys.data.local.entity.SyncStateEntity
import com.mikylab.abys.domain.model.SyncState
import kotlinx.coroutines.flow.Flow

@Dao
interface SettingDao {

    @Query("SELECT * FROM app_settings WHERE clave = :clave")
    fun observe(clave: String): Flow<AppSettingEntity?>

    @Query("SELECT * FROM app_settings WHERE clave = :clave")
    suspend fun get(clave: String): AppSettingEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(setting: AppSettingEntity)
}

@Dao
interface PendingOperationDao {

    @Query("SELECT * FROM pending_operations WHERE nextAttemptAt <= :now ORDER BY createdAt ASC")
    suspend fun pendientes(now: Long): List<PendingOperationEntity>

    @Query("SELECT COUNT(*) FROM pending_operations")
    fun observeCantidad(): Flow<Int>

    @Query("SELECT COUNT(*) FROM pending_operations")
    suspend fun contar(): Int

    @Insert
    suspend fun encolar(operacion: PendingOperationEntity): Long

    @Query("DELETE FROM pending_operations WHERE id = :id")
    suspend fun completar(id: Long)

    @Query(
        """
        UPDATE pending_operations
        SET intentos = intentos + 1, ultimoError = :error, nextAttemptAt = :nextAttemptAt
        WHERE id = :id
        """,
    )
    suspend fun registrarIntento(id: Long, error: String?, nextAttemptAt: Long)

    @Query("DELETE FROM pending_operations WHERE entityLocalId = :localId AND entityType = :tipo")
    suspend fun eliminarPorEntidad(tipo: String, localId: String)

    @Query("DELETE FROM pending_operations")
    suspend fun limpiar()
}

@Dao
interface SyncStateDao {

    @Query("SELECT * FROM sync_state WHERE id = 1")
    fun observe(): Flow<SyncStateEntity?>

    @Query("SELECT * FROM sync_state WHERE id = 1")
    suspend fun get(): SyncStateEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(estado: SyncStateEntity)

    @Query("UPDATE sync_state SET ultimoSyncOk = :ok, ultimoIntento = :intento, ultimoError = :error, pendientes = :pendientes WHERE id = 1")
    suspend fun actualizar(ok: Long?, intento: Long?, error: String?, pendientes: Int)
}
