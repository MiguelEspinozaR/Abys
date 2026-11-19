package com.mikylab.abys.data.di

import android.content.Context
import androidx.room.Room
import com.mikylab.abys.data.local.AbysDatabase
import com.mikylab.abys.data.local.RoomTransactionRunner
import com.mikylab.abys.data.local.TransactionRunner
import com.mikylab.abys.data.local.dao.CuentaDao
import com.mikylab.abys.data.local.dao.DashboardDao
import com.mikylab.abys.data.local.dao.FuenteDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.data.local.dao.PendingOperationDao
import com.mikylab.abys.data.local.dao.SettingDao
import com.mikylab.abys.data.local.dao.SplitDao
import com.mikylab.abys.data.local.dao.SyncStateDao
import com.mikylab.abys.data.repository.CuentaRepositoryImpl
import com.mikylab.abys.data.repository.DashboardRepositoryImpl
import com.mikylab.abys.data.repository.FuenteRepositoryImpl
import com.mikylab.abys.data.repository.HealthRepositoryImpl
import com.mikylab.abys.data.repository.PagoRepositoryImpl
import com.mikylab.abys.data.repository.SettingsRepositoryImpl
import com.mikylab.abys.data.repository.SplitRepositoryImpl
import com.mikylab.abys.data.repository.SyncStatusRepositoryImpl
import com.mikylab.abys.domain.repository.CuentaRepository
import com.mikylab.abys.domain.repository.DashboardRepository
import com.mikylab.abys.domain.repository.FuenteRepository
import com.mikylab.abys.domain.repository.HealthRepository
import com.mikylab.abys.domain.repository.PagoRepository
import com.mikylab.abys.domain.repository.SettingsRepository
import com.mikylab.abys.domain.repository.SplitRepository
import com.mikylab.abys.domain.repository.SyncStatusRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/** Base de datos Room y sus DAOs. */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AbysDatabase =
        Room.databaseBuilder(context, AbysDatabase::class.java, AbysDatabase.NAME)
            // El histórico es información de negocio: nunca se destruye de forma automática.
            .addMigrations(AbysDatabase.MIGRATION_1_2)
            .build()

    @Provides fun provideFuenteDao(db: AbysDatabase): FuenteDao = db.fuenteDao()
    @Provides fun providePagoDao(db: AbysDatabase): PagoDao = db.pagoDao()
    @Provides fun provideCuentaDao(db: AbysDatabase): CuentaDao = db.cuentaDao()
    @Provides fun provideSplitDao(db: AbysDatabase): SplitDao = db.splitDao()
    @Provides fun provideSettingDao(db: AbysDatabase): SettingDao = db.settingDao()
    @Provides fun providePendingOperationDao(db: AbysDatabase): PendingOperationDao =
        db.pendingOperationDao()
    @Provides fun provideSyncStateDao(db: AbysDatabase): SyncStateDao = db.syncStateDao()
    @Provides fun provideDashboardDao(db: AbysDatabase): DashboardDao = db.dashboardDao()
}

/** Enlace de las interfaces de repositorio con sus implementaciones. */
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds abstract fun bindPagoRepository(impl: PagoRepositoryImpl): PagoRepository
    @Binds abstract fun bindFuenteRepository(impl: FuenteRepositoryImpl): FuenteRepository
    @Binds abstract fun bindCuentaRepository(impl: CuentaRepositoryImpl): CuentaRepository
    @Binds abstract fun bindSplitRepository(impl: SplitRepositoryImpl): SplitRepository
    @Binds abstract fun bindSettingsRepository(impl: SettingsRepositoryImpl): SettingsRepository
    @Binds abstract fun bindHealthRepository(impl: HealthRepositoryImpl): HealthRepository
    @Binds abstract fun bindDashboardRepository(impl: DashboardRepositoryImpl): DashboardRepository
    @Binds abstract fun bindSyncStatusRepository(impl: SyncStatusRepositoryImpl): SyncStatusRepository

    /** Frontera transaccional de Room (permite testear los repositorios sin Android). */
    @Binds @Singleton
    abstract fun bindTransactionRunner(impl: RoomTransactionRunner): TransactionRunner
}
