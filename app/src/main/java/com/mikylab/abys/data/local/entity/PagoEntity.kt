package com.mikylab.abys.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.mikylab.abys.domain.model.SyncState

/**
 * Pago (tabla `pagos`). Montos en **centavos** (`monto_enteros`).
 */
@Entity(
    tableName = "pagos",
    foreignKeys = [
        ForeignKey(
            entity = FuenteEntity::class,
            parentColumns = ["localId"],
            childColumns = ["fuenteLocalId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
    indices = [
        Index("fuenteLocalId"),
        Index(value = ["serverId"], unique = true),
        Index("fechaPago"),
        Index("syncState"),
    ],
)
data class PagoEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val fuenteLocalId: String,
    /** `YYYY-MM-DD` */
    val fechaPago: String,
    val montoEnteros: Long,
    val metodoPago: String,
    val notas: String?,
    val imagenRuta: String?,
    val createdAt: Long,
    val updatedAt: Long,
    val deletedAt: Long?,
    val syncState: SyncState,
    val updatedAtLocal: Long,
    val updatedAtServer: Long?,
    val lastError: String?,
)

/**
 * Día trabajado (tabla `dias_trabajados`): fecha única por pago (BR-010).
 *
 * Desde la v0.3.0 del API cada día lleva su monto en centavos (`monto_enteros`); el
 * `montoEnteros` del pago es derivado (Σ de los días).
 */
@Entity(
    tableName = "dias_trabajados",
    foreignKeys = [
        ForeignKey(
            entity = PagoEntity::class,
            parentColumns = ["localId"],
            childColumns = ["pagoLocalId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [
        Index("pagoLocalId"),
        Index(value = ["pagoLocalId", "fecha"], unique = true),
    ],
)
data class DiaTrabajadoEntity(
    @PrimaryKey val localId: String,
    val serverId: Long?,
    val pagoLocalId: String,
    /** `YYYY-MM-DD` */
    val fecha: String,
    /** Monto del día en centavos (`monto_enteros`, >= 0). */
    val montoEnteros: Long,
    val syncState: SyncState,
    val updatedAtLocal: Long,
)
