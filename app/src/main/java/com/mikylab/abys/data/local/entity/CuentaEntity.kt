package com.mikylab.abys.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.mikylab.abys.domain.model.SyncState

/**
 * Cuenta de distribución (tabla `cuentas`).
 *
 * `tasaBps` es **derivada**: la vigente del historial o `10000 − Σ otras` para General (BR-040).
 */
@Entity(
    tableName = "cuentas",
    indices = [
        Index(value = ["serverId"], unique = true),
        Index("syncState"),
    ],
)
data class CuentaEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val alias: String,
    val numero: String?,
    val banco: String?,
    val qrRuta: String?,
    val esGeneral: Boolean,
    val tasaBps: Long,
    val createdAt: Long,
    val updatedAt: Long,
    val deletedAt: Long?,
    val syncState: SyncState,
    val updatedAtLocal: Long,
    val updatedAtServer: Long?,
    val lastError: String?,
)

/**
 * Historial de tasas (tabla `historial_tasas`): append-only.
 * La tasa vigente es la última registrada (`aplicadaDesde DESC, id DESC`).
 */
@Entity(
    tableName = "historial_tasas",
    foreignKeys = [
        ForeignKey(
            entity = CuentaEntity::class,
            parentColumns = ["localId"],
            childColumns = ["cuentaLocalId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("cuentaLocalId"), Index("syncState")],
)
data class HistorialTasaEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val cuentaLocalId: String,
    val tasaBps: Long,
    val aplicadaDesde: Long,
    val createdAt: Long,
    val syncState: SyncState,
    val updatedAtLocal: Long,
)
