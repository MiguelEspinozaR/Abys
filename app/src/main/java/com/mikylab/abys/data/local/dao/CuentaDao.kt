package com.mikylab.abys.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.mikylab.abys.data.local.entity.CuentaEntity
import com.mikylab.abys.data.local.entity.HistorialTasaEntity
import com.mikylab.abys.domain.model.SyncState
import kotlinx.coroutines.flow.Flow

@Dao
interface CuentaDao {

    @Query("SELECT * FROM cuentas WHERE deletedAt IS NULL ORDER BY esGeneral DESC, alias COLLATE NOCASE")
    fun observeActivas(): Flow<List<CuentaEntity>>

    @Query("SELECT * FROM cuentas WHERE localId = :localId")
    fun observePorId(localId: String): Flow<CuentaEntity?>

    @Query("SELECT * FROM cuentas WHERE localId = :localId")
    suspend fun getPorId(localId: String): CuentaEntity?

    @Query("SELECT * FROM cuentas WHERE serverId = :serverId LIMIT 1")
    suspend fun getPorServerId(serverId: Long): CuentaEntity?

    @Query("SELECT * FROM cuentas")
    suspend fun getAll(): List<CuentaEntity>

    @Query("SELECT * FROM cuentas WHERE deletedAt IS NULL AND esGeneral = 1 ORDER BY serverId LIMIT 1")
    suspend fun getGeneral(): CuentaEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(cuenta: CuentaEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(cuentas: List<CuentaEntity>)

    @Query(
        """
        UPDATE cuentas
        SET syncState = :state, serverId = :serverId, updatedAtServer = :updatedAtServer,
            lastError = :lastError, tasaBps = :tasaBps, qrRuta = COALESCE(:qrRuta, qrRuta)
        WHERE localId = :localId
        """,
    )
    suspend fun marcarSincronizado(
        localId: String,
        state: SyncState,
        serverId: Long?,
        updatedAtServer: Long?,
        lastError: String?,
        tasaBps: Long? = null,
        qrRuta: String? = null,
    )

    @Query("UPDATE cuentas SET deletedAt = :deletedAt, syncState = :state, updatedAtLocal = :now WHERE localId = :localId")
    suspend fun marcarEliminado(localId: String, deletedAt: Long, state: SyncState, now: Long)

    @Query("UPDATE cuentas SET lastError = :lastError, syncState = :state WHERE localId = :localId")
    suspend fun marcarError(localId: String, lastError: String?, state: SyncState)

    @Query("SELECT * FROM cuentas WHERE syncState IN (:states) ORDER BY updatedAtLocal ASC")
    suspend fun pendientes(states: List<SyncState>): List<CuentaEntity>

    @Query("SELECT COUNT(*) FROM cuentas WHERE syncState IN (:states)")
    suspend fun contarPendientes(states: List<SyncState>): Int

    // ── Historial de tasas ──────────────────────────────────────────────────

    @Query("SELECT * FROM historial_tasas WHERE cuentaLocalId = :cuentaLocalId ORDER BY aplicadaDesde DESC, serverId DESC")
    fun observeHistorial(cuentaLocalId: String): Flow<List<HistorialTasaEntity>>

    @Query("SELECT * FROM historial_tasas WHERE cuentaLocalId = :cuentaLocalId ORDER BY aplicadaDesde DESC, serverId DESC")
    suspend fun getHistorial(cuentaLocalId: String): List<HistorialTasaEntity>

    @Query("SELECT * FROM historial_tasas")
    suspend fun getAllHistorial(): List<HistorialTasaEntity>

    @Query(
        """
        SELECT * FROM historial_tasas
        WHERE cuentaLocalId = :cuentaLocalId
        ORDER BY aplicadaDesde DESC, serverId DESC LIMIT 1
        """,
    )
    suspend fun tasaVigente(cuentaLocalId: String): HistorialTasaEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertHistorial(entradas: List<HistorialTasaEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertHistorialEntrada(entrada: HistorialTasaEntity)
}
