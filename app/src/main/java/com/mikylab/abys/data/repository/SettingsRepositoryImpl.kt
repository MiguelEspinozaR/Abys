package com.mikylab.abys.data.repository

import com.mikylab.abys.core.result.AppError
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.TransactionRunner
import com.mikylab.abys.data.local.dao.SettingDao
import com.mikylab.abys.data.local.entity.AppSettingEntity
import com.mikylab.abys.data.remote.AbysApiProvider
import com.mikylab.abys.data.remote.safeApiCall
import com.mikylab.abys.data.sync.Operations
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.model.SplitSettings
import com.mikylab.abys.domain.model.SyncState
import com.mikylab.abys.domain.repository.HealthRepository
import com.mikylab.abys.domain.repository.SettingsRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/** Configuración global (modo de split por defecto). */
@Singleton
class SettingsRepositoryImpl @Inject constructor(
    private val settingDao: SettingDao,
    private val pendingWriter: PendingWriter,
    private val transactions: TransactionRunner,
) : SettingsRepository {

    override fun observeSplitSettings(): Flow<SplitSettings> =
        settingDao.observe(CLAVE_MODO_DEFAULT).map { entity ->
            SplitSettings(
                modoDefault = entity?.valor?.let { ModoCalculo.fromWire(it) } ?: ModoCalculo.DEFAULT,
                syncState = entity?.syncState ?: SyncState.SYNCED,
            )
        }

    override suspend fun setModoDefault(modo: String): AppResult<Unit> {
        val modoCalculo = ModoCalculo.fromWire(modo)
        transactions.run {
            settingDao.upsert(
                AppSettingEntity(
                    clave = CLAVE_MODO_DEFAULT,
                    valor = modoCalculo.wire,
                    updatedAt = System.currentTimeMillis(),
                    syncState = SyncState.PENDING_UPDATE,
                ),
            )
            pendingWriter.encolar(
                Operations.TIPO_SETTINGS,
                CLAVE_MODO_DEFAULT,
                Operations.OP_UPSERT,
                payloadJson = "\"${modoCalculo.wire}\"",
            )
        }
        return AppResult.Success(Unit)
    }

    companion object {
        const val CLAVE_MODO_DEFAULT = "split_modo_default"
    }
}

/**
 * Salud del backend. **No se cachea**: es una lectura en vivo del servidor
 * (mismo criterio que la pantalla "Salud del sistema" del web).
 */
@Singleton
class HealthRepositoryImpl @Inject constructor(
    private val apiProvider: AbysApiProvider,
) : HealthRepository {

    override suspend fun consultarHealth(): AppResult<com.mikylab.abys.domain.model.HealthInfo> =
        safeApiCall {
            val response = apiProvider.api().healthDb()
            if (response.status != "ok" || response.data == null) {
                throw com.mikylab.abys.core.result.AppErrorException(
                    code = response.error?.code ?: "DB_UNAVAILABLE",
                    message = response.error?.message
                        ?: "No se pudo conectar con la base de datos.",
                    httpStatus = 503,
                )
            }
            val data = response.data
            com.mikylab.abys.domain.model.HealthInfo(
                conexion = data.conexion,
                latenciaMs = data.latenciaMs,
                versionPg = data.versionPg,
                tamanoDb = data.tamanoDb,
                tablas = data.tablas.map {
                    com.mikylab.abys.domain.model.TablaInfo(it.nombre, it.registros)
                },
            )
        }
}
