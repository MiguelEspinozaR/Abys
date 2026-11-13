package com.mikylab.abys.data.local.relation

import androidx.room.Embedded
import androidx.room.Relation
import com.mikylab.abys.data.local.entity.CuentaEntity
import com.mikylab.abys.data.local.entity.DiaTrabajadoEntity
import com.mikylab.abys.data.local.entity.FuenteEntity
import com.mikylab.abys.data.local.entity.HistorialTasaEntity
import com.mikylab.abys.data.local.entity.PagoEntity
import com.mikylab.abys.data.local.entity.SplitEntity
import com.mikylab.abys.data.local.entity.TransaccionEntity

/** Pago con su fuente, sus días trabajados y su split (si existe). */
data class PagoConDetalle(
    @Embedded val pago: PagoEntity,
    @Relation(parentColumn = "fuenteLocalId", entityColumn = "localId")
    val fuente: FuenteEntity?,
    @Relation(parentColumn = "localId", entityColumn = "pagoLocalId")
    val dias: List<DiaTrabajadoEntity>,
    @Relation(parentColumn = "localId", entityColumn = "pagoLocalId")
    val split: SplitEntity?,
)

/** Split con sus transacciones. */
data class SplitConTransacciones(
    @Embedded val split: SplitEntity,
    @Relation(parentColumn = "localId", entityColumn = "splitLocalId")
    val transacciones: List<TransaccionEntity>,
)

/** Cuenta con su historial de tasas. */
data class CuentaConHistorial(
    @Embedded val cuenta: CuentaEntity,
    @Relation(parentColumn = "localId", entityColumn = "cuentaLocalId")
    val historial: List<HistorialTasaEntity>,
)
