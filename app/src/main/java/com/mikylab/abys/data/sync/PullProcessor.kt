package com.mikylab.abys.data.sync

import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.data.local.AbysDatabase
import com.mikylab.abys.data.local.dao.CuentaDao
import com.mikylab.abys.data.local.dao.FuenteDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.data.local.dao.SettingDao
import com.mikylab.abys.data.local.dao.SplitDao
import com.mikylab.abys.data.local.dao.SyncStateDao
import com.mikylab.abys.data.local.entity.AppSettingEntity
import com.mikylab.abys.data.local.entity.DiaTrabajadoEntity
import com.mikylab.abys.data.remote.AbysApi
import com.mikylab.abys.data.remote.AbysApiProvider
import com.mikylab.abys.data.remote.mapper.RemoteMappers
import com.mikylab.abys.data.remote.mapper.RemoteMappers.toEntity
import com.mikylab.abys.domain.model.SyncState
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Refresca Room con los datos del servidor (pull).
 *
 * Reglas de reconciliación (ver `docs/data-model.md` §7.3):
 * - si la fila local está `PENDING_*`, **no** se sobrescribe (gana el cambio local);
 * - si el servidor trae una fila que no existe local, se inserta como `SYNCED`;
 * - si la fila local está `SYNCED` y el servidor ya no la tiene, se marca eliminada.
 */
@Singleton
class PullProcessor @Inject constructor(
    private val db: AbysDatabase,
    private val apiProvider: AbysApiProvider,
    private val fuenteDao: FuenteDao,
    private val pagoDao: PagoDao,
    private val cuentaDao: CuentaDao,
    private val splitDao: SplitDao,
    private val settingDao: SettingDao,
    private val syncStateDao: SyncStateDao,
    private val generalRateHelper: GeneralRateHelper,
) {

    suspend fun pull(): androidx.work.ListenableWorker.Result {
        val api = apiProvider.api()
        return try {
            pullFuentes(api)
            pullCuentas(api)
            pullPagos(api)
            pullSplits(api)
            pullSettings(api)
            generalRateHelper.recalcular()
            registrarEstado(error = null)
            androidx.work.ListenableWorker.Result.success()
        } catch (e: retrofit2.HttpException) {
            registrarEstado(error = "Error HTTP ${e.code()}")
            androidx.work.ListenableWorker.Result.retry()
        } catch (e: java.io.IOException) {
            registrarEstado(error = "Sin conexión con el servidor")
            androidx.work.ListenableWorker.Result.retry()
        } catch (e: Throwable) {
            registrarEstado(error = e.message)
            androidx.work.ListenableWorker.Result.failure()
        }
    }

    private suspend fun pullFuentes(api: AbysApi) {
        val remoto = api.listarFuentes().data ?: return
        val locales = fuenteDao.getAll().associateBy { it.localId }
        for (dto in remoto) {
            val entidad = dto.toEntity()
            val existente = locales[entidad.localId]
            if (existente != null && existente.syncState.isPending) continue
            fuenteDao.upsert(entidad)
        }
    }

    private suspend fun pullCuentas(api: AbysApi) {
        val remoto = api.listarCuentas().data ?: return
        val locales = cuentaDao.getAll().associateBy { it.localId }
        for (dto in remoto) {
            val entidad = dto.toEntity()
            val existente = locales[entidad.localId]
            if (existente != null && existente.syncState.isPending) continue
            cuentaDao.upsert(entidad)
            // Historial de tasas de la cuenta
            runCatching { api.historialTasas(dto.id).data }.getOrNull()?.forEach { h ->
                val historial = h.toEntity(entidad.localId)
                val previo = cuentaDao.getHistorial(entidad.localId)
                if (previo.none { it.localId == historial.localId }) {
                    cuentaDao.upsertHistorialEntrada(historial)
                }
            }
        }
    }

    private suspend fun pullPagos(api: AbysApi) {
        val remoto = api.listarPagos(page = 1, pageSize = 500).data ?: return
        val fuentesPorServerId = fuenteDao.getAll().associateBy { it.serverId }
        val locales = pagoDao.getAll().associateBy { it.localId }

        for (dto in remoto) {
            val fuente = fuentesPorServerId[dto.fuenteId]
            if (fuente == null) continue // la fuente aún no está en local
            val entidad = dto.toEntity(fuente.localId)
            val existente = locales[entidad.localId]
            if (existente != null && existente.syncState.isPending) continue
            pagoDao.upsert(entidad)
            val diasLocales = pagoDao.getDias(entidad.localId).map { it.fecha }.toSet()
            val diasRemotos = dto.diasTrabajados.map { it.fecha }.toSet()
            if (diasLocales != diasRemotos) {
                val dias = dto.diasTrabajados.map { it.toEntity(entidad.localId) }
                pagoDao.reemplazarDias(entidad.localId, dias)
            }
        }
    }

    private suspend fun pullSplits(api: AbysApi) {
        val remoto = api.listarSplits().data ?: return
        val pagosPorServerId = pagoDao.getAll().associateBy { it.serverId }
        val cuentasPorServerId = cuentaDao.getAll().associateBy { it.serverId }
        val locales = splitDao.getAll().associateBy { it.localId }

        for (dto in remoto) {
            val pago = pagosPorServerId[dto.pagoId] ?: continue
            val entidad = dto.toEntity(pago.localId)
            val existente = locales[entidad.localId]
            if (existente != null && existente.syncState.isPending) continue
            splitDao.upsert(entidad)
            val transacciones = dto.transacciones.map { tx ->
                tx.toEntity(entidad.localId, tx.cuentaId?.let { cuentasPorServerId[it]?.localId })
            }
            splitDao.reemplazarTransacciones(entidad.localId, transacciones)
        }
    }

    private suspend fun pullSettings(api: AbysApi) {
        val remoto = api.obtenerSplitSettings().data ?: return
        val existente = settingDao.get(CLAVE_MODO_DEFAULT)
        if (existente != null && existente.syncState.isPending) return
        settingDao.upsert(
            AppSettingEntity(
                clave = CLAVE_MODO_DEFAULT,
                valor = remoto.modoDefault,
                updatedAt = System.currentTimeMillis(),
                syncState = SyncState.SYNCED,
            ),
        )
    }

    private suspend fun registrarEstado(error: String?) {
        val estado = syncStateDao.get()
        syncStateDao.upsert(
            com.mikylab.abys.data.local.entity.SyncStateEntity(
                id = 1,
                ultimoSyncOk = if (error == null) System.currentTimeMillis() else estado?.ultimoSyncOk,
                ultimoIntento = System.currentTimeMillis(),
                ultimoError = error,
                pendientes = estado?.pendientes ?: 0,
            ),
        )
    }

    companion object {
        const val CLAVE_MODO_DEFAULT = "split_modo_default"
    }
}
