package com.mikylab.abys.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.mikylab.abys.domain.model.SyncState

/**
 * Fuente de ingreso (tabla `fuentes`).
 *
 * `localId` es el UUID generado en el dispositivo (identidad local-first);
 * `serverId` es el id del backend (`null` mientras no exista en el servidor).
 */
@Entity(
    tableName = "fuentes",
    indices = [Index(value = ["serverId"], unique = true)],
)
data class FuenteEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val alias: String,
    val color: String,
    val logoRuta: String?,
    val splitAuto: Boolean,
    val splitAutoModo: String?,
    val createdAt: Long,
    val updatedAt: Long,
    val deletedAt: Long?,
    val syncState: SyncState,
    val updatedAtLocal: Long,
    val updatedAtServer: Long?,
    val lastError: String?,
)
