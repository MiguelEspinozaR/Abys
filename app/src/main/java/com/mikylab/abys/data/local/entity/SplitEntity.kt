package com.mikylab.abys.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.mikylab.abys.domain.model.SyncState

/**
 * Split de un pago (tabla `splits`). Como máximo uno por pago (índice único).
 */
@Entity(
    tableName = "splits",
    foreignKeys = [
        ForeignKey(
            entity = PagoEntity::class,
            parentColumns = ["localId"],
            childColumns = ["pagoLocalId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [
        Index(value = ["pagoLocalId"], unique = true),
        Index(value = ["serverId"], unique = true),
        Index("syncState"),
    ],
)
data class SplitEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val pagoLocalId: String,
    /** `redondeado` | `enteros` | `preciso` */
    val modoCalculo: String,
    val totalPendiente: Long,
    val totalRealizado: Long,
    val createdAt: Long,
    val updatedAt: Long,
    val syncState: SyncState,
    val updatedAtLocal: Long,
    val updatedAtServer: Long?,
    val lastError: String?,
)

/**
 * Transacción (tabla `transacciones`): snapshot congelado de alias y tasa (BR-043).
 */
@Entity(
    tableName = "transacciones",
    foreignKeys = [
        ForeignKey(
            entity = SplitEntity::class,
            parentColumns = ["localId"],
            childColumns = ["splitLocalId"],
            onDelete = ForeignKey.CASCADE,
        ),
        ForeignKey(
            entity = CuentaEntity::class,
            parentColumns = ["localId"],
            childColumns = ["cuentaLocalId"],
            onDelete = ForeignKey.SET_NULL,
        ),
    ],
    indices = [
        Index("splitLocalId"),
        Index("cuentaLocalId"),
        Index(value = ["serverId"], unique = true),
        Index("syncState"),
    ],
)
data class TransaccionEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val splitLocalId: String,
    val cuentaLocalId: String?,
    val montoEnteros: Long,
    val tasaBps: Long,
    val aliasSnapshot: String,
    val realizado: Boolean,
    val fechaRealizacion: Long?,
    val createdAt: Long,
    val updatedAt: Long,
    val syncState: SyncState,
    val updatedAtLocal: Long,
    val lastError: String?,
)
