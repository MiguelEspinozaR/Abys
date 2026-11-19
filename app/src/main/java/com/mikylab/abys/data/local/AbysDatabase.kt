package com.mikylab.abys.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.mikylab.abys.data.local.dao.CuentaDao
import com.mikylab.abys.data.local.dao.DashboardDao
import com.mikylab.abys.data.local.dao.FuenteDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.data.local.dao.PendingOperationDao
import com.mikylab.abys.data.local.dao.SettingDao
import com.mikylab.abys.data.local.dao.SplitDao
import com.mikylab.abys.data.local.dao.SyncStateDao
import com.mikylab.abys.data.local.entity.AppSettingEntity
import com.mikylab.abys.data.local.entity.CuentaEntity
import com.mikylab.abys.data.local.entity.DiaTrabajadoEntity
import com.mikylab.abys.data.local.entity.FuenteEntity
import com.mikylab.abys.data.local.entity.HistorialTasaEntity
import com.mikylab.abys.data.local.entity.PagoEntity
import com.mikylab.abys.data.local.entity.PendingOperationEntity
import com.mikylab.abys.data.local.entity.SplitEntity
import com.mikylab.abys.data.local.entity.SyncStateEntity
import com.mikylab.abys.data.local.entity.TransaccionEntity
import com.mikylab.abys.domain.model.SyncState

/**
 * Base de datos local (Room). Es la **única fuente de verdad** para la UI.
 *
 * Esquema v2 — ver `docs/data-model.md`. La v2 añade `dias_trabajados.montoEnteros`
 * (contrato v0.3.0: montos por día trabajado).
 */
@Database(
    entities = [
        FuenteEntity::class,
        PagoEntity::class,
        DiaTrabajadoEntity::class,
        CuentaEntity::class,
        HistorialTasaEntity::class,
        SplitEntity::class,
        TransaccionEntity::class,
        AppSettingEntity::class,
        PendingOperationEntity::class,
        SyncStateEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class AbysDatabase : RoomDatabase() {
    abstract fun fuenteDao(): FuenteDao
    abstract fun pagoDao(): PagoDao
    abstract fun cuentaDao(): CuentaDao
    abstract fun splitDao(): SplitDao
    abstract fun settingDao(): SettingDao
    abstract fun pendingOperationDao(): PendingOperationDao
    abstract fun syncStateDao(): SyncStateDao
    abstract fun dashboardDao(): DashboardDao

    companion object {
        const val NAME = "abys.db"

        /**
         * v1 → v2: cada día trabajado lleva su monto en centavos. Los datos existentes
         * (días sin monto) quedan en 0; el próximo pull del pago los corrige con Σ del servidor.
         */
        val MIGRATION_1_2 = object : androidx.room.migration.Migration(1, 2) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL(
                    "ALTER TABLE dias_trabajados ADD COLUMN montoEnteros INTEGER NOT NULL DEFAULT 0",
                )
            }
        }
    }
}

/** Conversores de tipo de Room. */
class Converters {
    @TypeConverter
    fun fromSyncState(value: SyncState?): String? = value?.name

    @TypeConverter
    fun toSyncState(value: String?): SyncState? =
        value?.let { runCatching { SyncState.valueOf(it) }.getOrNull() }
}
