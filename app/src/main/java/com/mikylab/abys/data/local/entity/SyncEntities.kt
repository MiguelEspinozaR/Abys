package com.mikylab.abys.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.mikylab.abys.domain.model.SyncState

/**
 * Configuración global clave/valor (tabla `app_settings`).
 * Hoy solo se usa `split_modo_default`.
 */
@Entity(tableName = "app_settings")
data class AppSettingEntity(
    @PrimaryKey val clave: String,
    val valor: String,
    val updatedAt: Long,
    val syncState: SyncState,
)

/**
 * Cola de operaciones pendientes (tabla local, sin equivalente en el backend).
 *
 * Cada mutación local encola aquí su operación de red; el worker la procesa en orden.
 * Ver `docs/data-model.md` §7.4.
 */
@Entity(
    tableName = "pending_operations",
    indices = [Index("entityType"), Index("nextAttemptAt"), Index("createdAt")],
)
data class PendingOperationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    /** `pago` | `dia` | `fuente` | `cuenta` | `tasa` | `split` | `transaccion` | `comprobante` | `logo` | `qr` | `settings` */
    val entityType: String,
    val entityLocalId: String,
    /** `UPSERT` | `DELETE` | `UPLOAD` | `SET_RATE` | `RECALC` | `REALIZE` */
    val operacion: String,
    val payloadJson: String? = null,
    val serverId: Long? = null,
    val intentos: Int = 0,
    val ultimoError: String? = null,
    val createdAt: Long,
    val nextAttemptAt: Long,
)

/** Metadatos del estado de sincronización (singleton). */
@Entity(tableName = "sync_state")
data class SyncStateEntity(
    @PrimaryKey val id: Int = 1,
    val ultimoSyncOk: Long?,
    val ultimoIntento: Long?,
    val ultimoError: String?,
    val pendientes: Int = 0,
)
